
import { useCallback, useEffect, useRef, useState } from 'react';
import PhaserGame from './game/PhaserGame';
import LabPanel from './game/LabPanel';
import {
  createGameplayState,
  type GameplayState,
} from './game/state/GameplayState';
import { saveGameplayState } from './game/state/GameplaySaveService';
import {
  FIRST_DISCOVERY_QUEST,
  getQuestProgress,
} from './game/quests/QuestSystem';
import { getElementRecordsForResources } from './game/elements/ElementCatalog';
import RuntimeInventoryPanel from './game/inventory/RuntimeInventoryPanel';
import {
  collectRuntimeResource,
  createRuntimeInventory,
  removeRuntimeResource,
  type RuntimeInventoryState,
} from './game/inventory/RuntimeInventorySystem';
import { InventoryTransactionService } from './game/inventory/InventoryTransactionService';
import { CraftingTransactionAdapter } from './game/crafting/CraftingTransactionAdapter';
import {
  isAnalysed,
  type AnalysisResult,
  type ChemistryBridge,
  type ResearchSample,
} from './game/chemistry/ChemistrySystem';

type Panel = 'quest' | 'codex' | 'bag' | 'lab';

function App() {
  const [activePanel, setActivePanel] = useState<Panel>('quest');

  const [gameplayState, setGameplayState] =
    useState<GameplayState>(createGameplayState);

  const [hasReceivedGameplayState, setHasReceivedGameplayState] =
    useState(false);

  const [chemistryBridge, setChemistryBridge] =
    useState<ChemistryBridge | null>(null);

  const [runtimeInventory, setRuntimeInventory] =
    useState<RuntimeInventoryState>(createRuntimeInventory);

  const [hasHydratedRuntimeInventory, setHasHydratedRuntimeInventory] =
    useState(false);

  const processedCrystalIds = useRef(new Set<string>());

  const inventoryTransactions =
    useRef<InventoryTransactionService | null>(null);

  const craftingTransactions =
    useRef<CraftingTransactionAdapter | null>(null);

  const inventoryRemovalSequence = useRef(0);

  const inventorySyncFailed = useRef(false);

  const handleGameplayStateChange = useCallback(
    (nextState: GameplayState) => {
      setGameplayState(nextState);
      setHasReceivedGameplayState(true);
    },
    []
  );

  const handleChemistryBridgeChange = useCallback(
    (bridge: ChemistryBridge | null) => {
      setChemistryBridge(bridge);
    },
    []
  );

  const handleRemoveResource = useCallback(
    (resourceId: string) => {
      const service = inventoryTransactions.current;

      if (!service || !hasHydratedRuntimeInventory) {
        return {
          success: false,
          message: 'Inventory service is not initialized.',
        };
      }

      const snapshot = service.getSnapshot();

      const transition = removeRuntimeResource(
        snapshot.inventory,
        resourceId,
        1,
      );

      if (!transition.ok) {
        const messages = {
          INVALID_RESOURCE_ID: 'Invalid resource ID.',
          INVALID_QUANTITY: 'Invalid removal quantity.',
          INSUFFICIENT_RESOURCE: 'Not enough resources to remove.',
        };

        return {
          success: false,
          message: transition.error
            ? messages[transition.error]
            : 'Unable to remove resource.',
        };
      }

      inventoryRemovalSequence.current += 1;

      const transactionId =
        `inventory-remove-${Date.now()}-${inventoryRemovalSequence.current}`;

      const result = service.applyInventoryChange(
        transactionId,
        'system-inventory-remove',
        transition.state,
        snapshot.revision,
      );

      if (!result.success) {
        return {
          success: false,
          message: result.message,
        };
      }

      setRuntimeInventory(service.getSnapshot().inventory);

      return {
        success: true,
        message: 'Removed 1 resource.',
      };
    },
    [hasHydratedRuntimeInventory],
  );

  const handleCraftingTransaction = useCallback(
    (transactionId: string, recipeId: string) => {
      const service = inventoryTransactions.current;
      const adapter = craftingTransactions.current;

      if (!service || !adapter) {
        return {
          success: false as const,
          error: 'PERSISTENCE_UNAVAILABLE' as const,
          message: 'Crafting inventory service is not initialized.',
        };
      }

      const snapshotBefore = service.getSnapshot();

      const result = adapter.execute(
        transactionId,
        recipeId,
        snapshotBefore.revision,
      );

      if (result.success) {
        setRuntimeInventory(service.getSnapshot().inventory);
      }

      return result;
    },
    [],
  );

  useEffect(() => {
    if (!hasReceivedGameplayState || hasHydratedRuntimeInventory) {
      return;
    }

    let initialInventory = createRuntimeInventory();

    for (const resourceId of gameplayState.collectedResourceIds) {
      if (!resourceId.startsWith('crystal-')) continue;

      const result = collectRuntimeResource(
        initialInventory,
        resourceId,
      );

      if (result.ok) {
        initialInventory = result.state;
      }
    }

    try {
      const service = new InventoryTransactionService(initialInventory);

      inventoryTransactions.current = service;
      craftingTransactions.current =
        new CraftingTransactionAdapter(service);

      const restoredInventory = service.getSnapshot().inventory;

      setRuntimeInventory(restoredInventory);

      // Historical collection events must not be replayed after hydration.
      // This prevents removed resources from being collected again on reload.
      for (const resourceId of gameplayState.collectedResourceIds) {
        if (resourceId.startsWith('crystal-')) {
          processedCrystalIds.current.add(resourceId);
        }
      }

      setHasHydratedRuntimeInventory(true);
    } catch (error) {
      console.error(
        'CHEM QUEST: Runtime inventory initialization failed.',
        error,
      );
    }
  }, [
    hasReceivedGameplayState,
    hasHydratedRuntimeInventory,
    gameplayState.collectedResourceIds,
  ]);

  useEffect(() => {
    if (!hasHydratedRuntimeInventory) return;

    const service = inventoryTransactions.current;

    inventorySyncFailed.current = false;

    if (!service) {
      inventorySyncFailed.current = true;
      return;
    }

    let changed = false;

    for (const resourceId of gameplayState.collectedResourceIds) {
      if (
        !resourceId.startsWith('crystal-') ||
        processedCrystalIds.current.has(resourceId)
      ) {
        continue;
      }

      const snapshot = service.getSnapshot();

      const transition = collectRuntimeResource(
        snapshot.inventory,
        resourceId,
      );

      if (!transition.ok) {
        inventorySyncFailed.current = true;
        console.error(
          'CHEM QUEST: Invalid world collection event.',
          resourceId,
          transition.error,
        );
        continue;
      }

      const result = service.applyInventoryChange(
        `world-collect-${resourceId}`,
        'system-world-collection',
        transition.state,
        snapshot.revision,
      );

      if (!result.success) {
        inventorySyncFailed.current = true;
        console.error(
          'CHEM QUEST: World collection transaction failed.',
          result.error,
          result.message,
        );
        continue;
      }

      processedCrystalIds.current.add(resourceId);
      changed = true;
    }

    if (changed) {
      setRuntimeInventory(service.getSnapshot().inventory);
    }
  }, [
    hasHydratedRuntimeInventory,
    gameplayState.collectedResourceIds,
  ]);

  useEffect(() => {
    if (
      !hasReceivedGameplayState ||
      !hasHydratedRuntimeInventory ||
      inventorySyncFailed.current
    ) {
      return;
    }

    saveGameplayState(gameplayState);
  }, [
    gameplayState,
    hasReceivedGameplayState,
    hasHydratedRuntimeInventory,
  ]);

  const crystalCount = gameplayState.collectedResourceIds.length;

  const researchSamples: ResearchSample[] = Object.values(
    gameplayState.researchSamplesById
  );

  const analysisResults: AnalysisResult[] = Object.values(
    gameplayState.analysisResultsBySampleId
  );

  const analysedSampleIds = researchSamples
    .filter((sample) => isAnalysed(gameplayState, sample.id))
    .map((sample) => sample.id);

  const questProgress = getQuestProgress(
    FIRST_DISCOVERY_QUEST,
    gameplayState
  );

  const totalQuestObjectives = FIRST_DISCOVERY_QUEST.objectives.reduce(
    (sum, objective) => sum + objective.targetCount,
    0
  );

  const totalQuestProgress = questProgress.objectives.reduce(
    (sum, objective) => sum + objective.currentCount,
    0
  );

  const progressPercentage =
    totalQuestObjectives > 0
      ? Math.min(
          (totalQuestProgress / totalQuestObjectives) * 100,
          100
        )
      : 0;

  const elementRecords = getElementRecordsForResources(
    gameplayState.collectedResourceIds
  );

  const unmappedResourceCount =
    crystalCount - elementRecords.length;

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">CQ</div>
          <div>
            <h1>CHEM QUEST</h1>
            <p>THE ALCHEMY ADVENTURE</p>
          </div>
        </div>

        <div className="player-info">
          <span className="status-dot" />
          <span>FIELD EXPLORER</span>
          <strong>LV. 01</strong>
        </div>
      </header>

      <section className="welcome">
        <div>
          <p className="eyebrow">WELCOME, EXPLORER</p>
          <h2>Discover the world of chemistry.</h2>
          <p className="welcome-text">
            Explore mysterious lands, collect elements and master the science
            behind every discovery.
          </p>
        </div>
        <div className="welcome-symbol">⚗</div>
      </section>

      <section className="game-layout">
        <aside className="side-panel">
          <p className="panel-label">YOUR JOURNEY</p>

          <button
            className={activePanel === 'quest' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActivePanel('quest')}
          >
            <span>◇</span> Quest Log
          </button>

          <button
            className={activePanel === 'codex' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActivePanel('codex')}
          >
            <span>▤</span> Element Codex
          </button>

          <button
            className={activePanel === 'bag' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActivePanel('bag')}
          >
            <span>▣</span> Inventory
          </button>

          <button
            className={activePanel === 'lab' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActivePanel('lab')}
          >
            <span>⚗</span> Research Lab
          </button>

          <div className="side-divider" />

          <div className="progress-card">
            <p className="panel-label">EXPLORER PROGRESS</p>
            <div className="progress-number">
              {String(totalQuestProgress).padStart(2, '0')}
              <span>
                {' / '}
                {String(totalQuestObjectives).padStart(2, '0')}
              </span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="progress-caption">
              {questProgress.completed
                ? 'Discovery objectives completed.'
                : 'Keep exploring and collecting.'}
            </p>
          </div>
        </aside>

        <div className="game-column">
          <div className="game-heading">
            <div>
              <p className="eyebrow">WORLD 01 · THE BEGINNING</p>
              <h2>Emerald Frontier</h2>
            </div>
            <span className="world-status">
              <span className="status-dot" /> EXPLORATION
            </span>
          </div>

          <section className="game-container">
            <PhaserGame
              onGameplayStateChange={handleGameplayStateChange}
              onChemistryBridgeChange={handleChemistryBridgeChange}
            />
          </section>

          <div className="game-footer">
            <span>WASD / ARROW KEYS</span>
            <span>MOVE YOUR EXPLORER</span>
          </div>
        </div>

        <aside className="info-panel">
          <p className="panel-label">
            {activePanel === 'quest'
              ? 'CURRENT QUEST'
              : activePanel === 'codex'
                ? 'ELEMENT CODEX'
                : activePanel === 'bag'
                  ? 'INVENTORY'
                  : 'RESEARCH LAB'}
          </p>

          {activePanel === 'quest' && (
            <>
              <div className="quest-icon">✧</div>
              <h3>{FIRST_DISCOVERY_QUEST.title}</h3>
              <p className="info-description">
                {FIRST_DISCOVERY_QUEST.description}
              </p>

              <div className="quest-objective">
                <span>OBJECTIVES</span>
                {questProgress.objectives.map((objective) => (
                  <p key={objective.id}>
                    {objective.description}: {objective.currentCount}/
                    {objective.targetCount}
                    {objective.completed ? ' ✓' : ''}
                  </p>
                ))}
              </div>

              <div className="quest-reward">
                <span>QUEST STATUS</span>
                <strong>
                  {questProgress.completed ? 'COMPLETED' : 'IN PROGRESS'}
                </strong>
              </div>
            </>
          )}

          {activePanel === 'codex' && (
            <>
              <div className="quest-icon">⚛</div>
              <h3>Element Codex</h3>
              <p className="info-description">
                Collected samples are recorded with their current identification
                status.
              </p>

              <div className="quest-objective">
                <span>COLLECTED SAMPLES · {elementRecords.length}</span>

                {elementRecords.length === 0 && (
                  <p>No crystals collected yet.</p>
                )}

                {elementRecords.map((element) => (
                  <div key={element.id}>
                    <p>
                      <strong>{element.symbol}</strong> · {element.name}
                    </p>
                    <p>{element.classification}</p>
                    <p>{element.description}</p>
                    <p>
                      STATUS: {element.identificationStatus.toUpperCase()}
                    </p>
                    {element.atomicNumber !== null && (
                      <p>ATOMIC NUMBER: {element.atomicNumber}</p>
                    )}
                  </div>
                ))}

                {unmappedResourceCount > 0 && (
                  <p>
                    {unmappedResourceCount} collected resource record(s) are
                    not yet in the catalog.
                  </p>
                )}
              </div>
            </>
          )}

          {activePanel === 'bag' && (
            <RuntimeInventoryPanel
              inventory={runtimeInventory}
              elements={elementRecords}
              researchSamples={researchSamples}
              onCraftingTransaction={handleCraftingTransaction}
              onRemoveResource={handleRemoveResource}
            />
          )}

          {activePanel === 'lab' && (
            <LabPanel
              bridge={chemistryBridge}
              researchSamples={researchSamples}
              analysisResults={analysisResults}
              analysedSampleIds={analysedSampleIds}
            />
          )}
        </aside>
      </section>

      <footer className="app-footer">
        <span>CHEM QUEST</span>
        <span>LEARN · EXPLORE · DISCOVER</span>
        <span>VERSION 0.1.0</span>
      </footer>
    </main>
  );
}

export default App;
