
import { useCallback, useEffect, useRef, useState } from 'react';
import PhaserGame from './game/PhaserGame';
import LabPanel from './game/LabPanel';
import PracticePanel from './game/PracticePanel';
import PeriodicTable from './game/elements/PeriodicTable';
import {
  createGameplayState,
  updateGameplayState,
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
import { loadRuntimeInventorySnapshot } from './game/inventory/RuntimeInventorySaveService';
import { CraftingTransactionAdapter } from './game/crafting/CraftingTransactionAdapter';
import {
  REACTION_REGISTRY_ENTRIES,
} from './game/chemistry/ReactionRegistry';
import {
  ReactionExecutionService,
} from './game/chemistry/ReactionExecutionService';
import {
  isAnalysed,
  type AnalysisResult,
  type ChemistryBridge,
  type ResearchSample,
} from './game/chemistry/ChemistrySystem';

type Panel =
  | 'quest'
  | 'codex'
  | 'periodic-table'
  | 'bag'
  | 'lab'
  | 'practice';

const approvedReactions = REACTION_REGISTRY_ENTRIES
  .filter((entry) => entry.approvalStatus === 'APPROVED')
  .map((entry) => entry.reaction);

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

  const reactionExecution =
    useRef<ReactionExecutionService | null>(null);

  const inventoryRemovalSequence = useRef(0);

  const handleGameplayStateChange = useCallback(
    (nextState: GameplayState) => {
      setGameplayState(nextState);
      setHasReceivedGameplayState(true);
    },
    [],
  );

  const handleChemistryBridgeChange = useCallback(
    (bridge: ChemistryBridge | null) => {
      setChemistryBridge(bridge);
    },
    [],
  );

  const handleCollectResource = useCallback(
    (resourceId: string): boolean => {
      const service = inventoryTransactions.current;

      if (!service || !hasHydratedRuntimeInventory) {
        return false;
      }

      if (processedCrystalIds.current.has(resourceId)) {
        return true;
      }

      const transactionId = `world-collect-${resourceId}`;
      const existing = service.getTransaction(transactionId);

      if (existing) {
        if (existing.status === 'ROLLED_BACK') {
          return false;
        }

        if (existing.status === 'PREPARED') {
          const recovered = service.commit(transactionId);

          if (
            !recovered.success ||
            recovered.record.status !== 'COMMITTED'
          ) {
            console.error(
              'CHEM QUEST: World collection recovery failed.',
              recovered.success
                ? recovered.record.status
                : recovered.error,
              recovered.success ? '' : recovered.message,
            );

            return false;
          }
        }

        processedCrystalIds.current.add(resourceId);
        setRuntimeInventory(service.getSnapshot().inventory);
        return true;
      }

      const snapshot = service.getSnapshot();

      const transition = collectRuntimeResource(
        snapshot.inventory,
        resourceId,
      );

      if (!transition.ok) {
        console.error(
          'CHEM QUEST: Invalid world collection event.',
          resourceId,
          transition.error,
        );
        return false;
      }

      const result = service.applyInventoryChange(
        transactionId,
        'system-world-collection',
        transition.state,
        snapshot.revision,
      );

      if (!result.success || result.record.status !== 'COMMITTED') {
        console.error(
          'CHEM QUEST: World collection transaction failed.',
          result.success ? result.record.status : result.error,
          result.success ? '' : result.message,
        );
        return false;
      }

      processedCrystalIds.current.add(resourceId);
      setRuntimeInventory(service.getSnapshot().inventory);

      return true;
    },
    [hasHydratedRuntimeInventory],
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

  const handleReactionExecution = useCallback(
    (reactionId: string, transactionId: string) => {
      const service = inventoryTransactions.current;
      const executor = reactionExecution.current;

      if (
        !service ||
        !executor ||
        !hasHydratedRuntimeInventory
      ) {
        return {
          success: false as const,
          error: 'INVALID_REQUEST' as const,
          message: 'Reaction inventory service is not initialized.',
        };
      }

      const result = executor.execute(
        reactionId,
        transactionId,
      );

      if (result.success) {
        setRuntimeInventory(service.getSnapshot().inventory);
      }

      return result;
    },
    [hasHydratedRuntimeInventory],
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

      // Reaction execution must use the same durable inventory service.
      reactionExecution.current =
        new ReactionExecutionService(service);

      const durableSnapshot = loadRuntimeInventorySnapshot();

      const removedResourceIds = new Set<string>();

      for (const transaction of service.getTransactions()) {
        if (
          transaction.status !== 'COMMITTED' ||
          transaction.reactionId !== 'system-inventory-remove'
        ) {
          continue;
        }

        for (const [resourceId, previousQuantity] of Object.entries(
          transaction.inventoryBefore,
        )) {
          const nextQuantity =
            transaction.inventoryAfter[resourceId] ?? 0;

          if (previousQuantity > nextQuantity) {
            removedResourceIds.add(resourceId);
          }
        }
      }

      let reconciledGameplayState = gameplayState;
      let currentSnapshot = service.getSnapshot();

      for (const transaction of service.getTransactions()) {
        if (
          transaction.status !== 'COMMITTED' ||
          transaction.reactionId !== 'system-world-collection' ||
          !transaction.transactionId.startsWith('world-collect-')
        ) {
          continue;
        }

        const resourceId = transaction.transactionId.slice(
          'world-collect-'.length,
        );

        if (!resourceId.startsWith('crystal-')) continue;

        if (
          !reconciledGameplayState.collectedResourceIds.includes(resourceId)
        ) {
          reconciledGameplayState = updateGameplayState(
            reconciledGameplayState,
            {
              type: 'COLLECT_RESOURCE',
              id: resourceId,
            },
          );
        }

        processedCrystalIds.current.add(resourceId);
      }

      for (const resourceId of reconciledGameplayState.collectedResourceIds) {
        if (!resourceId.startsWith('crystal-')) continue;

        const collectionTransaction = service.getTransaction(
          `world-collect-${resourceId}`,
        );

        const existsInDurableInventory =
          (currentSnapshot.inventory.resources[resourceId] ?? 0) > 0;

        if (
          collectionTransaction?.status === 'COMMITTED' ||
          collectionTransaction?.status === 'ROLLED_BACK' ||
          existsInDurableInventory ||
          removedResourceIds.has(resourceId)
        ) {
          processedCrystalIds.current.add(resourceId);
          continue;
        }

        if (collectionTransaction?.status === 'PREPARED') {
          continue;
        }

        const transition = collectRuntimeResource(
          currentSnapshot.inventory,
          resourceId,
        );

        if (!transition.ok) {
          throw new Error(
            `Unable to reconcile legacy resource: ${resourceId}`,
          );
        }

        const result = service.applyInventoryChange(
          `world-collect-${resourceId}`,
          'system-world-collection',
          transition.state,
          currentSnapshot.revision,
        );

        if (!result.success || result.record.status !== 'COMMITTED') {
          throw new Error(
            result.success
              ? `Collection reconciliation was not committed: ${resourceId}`
              : result.message,
          );
        }

        processedCrystalIds.current.add(resourceId);
        currentSnapshot = service.getSnapshot();
      }

      setGameplayState(reconciledGameplayState);
      setRuntimeInventory(service.getSnapshot().inventory);
      setHasHydratedRuntimeInventory(true);

      if (durableSnapshot === null) {
        console.info(
          'CHEM QUEST: Initialized inventory from gameplay history.',
        );
      }
    } catch (error) {
      console.error(
        'CHEM QUEST: Runtime inventory initialization failed.',
        error,
      );
    }
  }, [
    hasReceivedGameplayState,
    hasHydratedRuntimeInventory,
    gameplayState,
  ]);

  useEffect(() => {
    if (!hasReceivedGameplayState || !hasHydratedRuntimeInventory) {
      return;
    }

    const saved = saveGameplayState(gameplayState);

    if (!saved) {
      console.error('CHEM QUEST: Gameplay save failed.');
    }
  }, [
    gameplayState,
    hasReceivedGameplayState,
    hasHydratedRuntimeInventory,
  ]);

  const crystalCount = gameplayState.collectedResourceIds.length;

  const researchSamples: ResearchSample[] = Object.values(
    gameplayState.researchSamplesById,
  );

  const analysisResults: AnalysisResult[] = Object.values(
    gameplayState.analysisResultsBySampleId,
  );

  const analysedSampleIds = researchSamples
    .filter((sample) => isAnalysed(gameplayState, sample.id))
    .map((sample) => sample.id);

  const questProgress = getQuestProgress(
    FIRST_DISCOVERY_QUEST,
    gameplayState,
  );

  const totalQuestObjectives = FIRST_DISCOVERY_QUEST.objectives.reduce(
    (sum, objective) => sum + objective.targetCount,
    0,
  );

  const totalQuestProgress = questProgress.objectives.reduce(
    (sum, objective) => sum + objective.currentCount,
    0,
  );

  const progressPercentage =
    totalQuestObjectives > 0
      ? Math.min(
          (totalQuestProgress / totalQuestObjectives) * 100,
          100,
        )
      : 0;

  const elementRecords = getElementRecordsForResources(
    gameplayState.collectedResourceIds,
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
            className={
              activePanel === 'periodic-table'
                ? 'nav-item active'
                : 'nav-item'
            }
            onClick={() => setActivePanel('periodic-table')}
          >
            <span>⚛</span> Periodic Table
          </button>

          <button
            className={
              activePanel === 'practice' ? 'nav-item active' : 'nav-item'
            }
            onClick={() => setActivePanel('practice')}
          >
            <span>✎</span> Chemistry Practice
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
              <p className="eyebrow">
                {activePanel === 'periodic-table'
                  ? 'CHEMISTRY DATABASE'
                  : activePanel === 'practice'
                    ? 'LEARNING CENTER'
                    : 'WORLD 01 · THE BEGINNING'}
              </p>
              <h2>
                {activePanel === 'periodic-table'
                  ? 'Periodic Table'
                  : activePanel === 'practice'
                    ? 'Chemistry Practice'
                    : 'Emerald Frontier'}
              </h2>
            </div>

            {activePanel !== 'periodic-table' &&
              activePanel !== 'practice' && (
                <span className="world-status">
                  <span className="status-dot" /> EXPLORATION
                </span>
              )}
          </div>

          <section className="game-container">
            {activePanel === 'practice' ? (
              <PracticePanel />
            ) : activePanel === 'periodic-table' ? (
              <PeriodicTable />
            ) : (
              <PhaserGame
                onGameplayStateChange={handleGameplayStateChange}
                onChemistryBridgeChange={handleChemistryBridgeChange}
                onCollectResource={handleCollectResource}
              />
            )}
          </section>

          {activePanel !== 'periodic-table' &&
            activePanel !== 'practice' && (
              <div className="game-footer">
                <span>WASD / ARROW KEYS</span>
                <span>MOVE YOUR EXPLORER</span>
              </div>
            )}
        </div>

        <aside className="info-panel">
          <p className="panel-label">
            {activePanel === 'quest'
              ? 'CURRENT QUEST'
              : activePanel === 'codex'
                ? 'ELEMENT CODEX'
                : activePanel === 'periodic-table'
                  ? 'PERIODIC TABLE'
                  : activePanel === 'practice'
                    ? 'CHEMISTRY PRACTICE'
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
                <span>COLLECTED RESOURCES · {crystalCount}</span>

                {crystalCount === 0 && (
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

          {activePanel === 'periodic-table' && (
            <>
              <div className="quest-icon">⚛</div>
              <h3>118 Elements</h3>
              <p className="info-description">
                Explore the periodic table, search by element name, symbol or
                atomic number, and inspect scientific properties.
              </p>
            </>
          )}

          {activePanel === 'practice' && (
            <>
              <div className="quest-icon">✎</div>
              <h3>Learning Center</h3>
              <p className="info-description">
                Practice chemistry using published questions and approved
                answer keys. Questions without verification and approval
                remain unavailable.
              </p>
            </>
          )}

          {activePanel === 'bag' && (
            <RuntimeInventoryPanel
              inventory={runtimeInventory}
              elements={elementRecords}
              researchSamples={researchSamples}
              onCraftingTransaction={handleCraftingTransaction}
              onRemoveResource={handleRemoveResource}
              approvedReactions={approvedReactions}
              onReactionExecution={handleReactionExecution}
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
