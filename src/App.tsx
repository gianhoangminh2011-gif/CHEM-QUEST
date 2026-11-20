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
  type RuntimeInventoryState,
} from './game/inventory/RuntimeInventorySystem';
import {
  loadRuntimeInventory,
  updateRuntimeInventoryPreservingJournal,
} from './game/inventory/RuntimeInventorySaveService';
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

  const handleInventoryChange = useCallback(
    (nextInventory: RuntimeInventoryState) => {
      setRuntimeInventory(nextInventory);

      const saved = updateRuntimeInventoryPreservingJournal(
        nextInventory,
      );

      if (!saved) {
        console.error('CHEM QUEST: Inventory save failed.');
      }
    },
    []
  );

  useEffect(() => {
    if (!hasReceivedGameplayState) return;

    saveGameplayState(gameplayState);
  }, [gameplayState, hasReceivedGameplayState]);

  useEffect(() => {
    if (!hasReceivedGameplayState || hasHydratedRuntimeInventory) {
      return;
    }

    const savedInventory = loadRuntimeInventory();

    if (savedInventory !== null) {
      setRuntimeInventory(savedInventory);
    } else {
      let initialInventory = createRuntimeInventory();

      for (const resourceId of gameplayState.collectedResourceIds) {
        if (!resourceId.startsWith('crystal-')) continue;

        const result = collectRuntimeResource(
          initialInventory,
          resourceId
        );

        if (result.ok) {
          initialInventory = result.state;
        }
      }

      setRuntimeInventory(initialInventory);

      const saved = updateRuntimeInventoryPreservingJournal(
        initialInventory,
      );

      if (!saved) {
        console.error('CHEM QUEST: Initial inventory save failed.');
      }
    }

    for (const resourceId of gameplayState.collectedResourceIds) {
      if (resourceId.startsWith('crystal-')) {
        processedCrystalIds.current.add(resourceId);
      }
    }

    setHasHydratedRuntimeInventory(true);
  }, [
    hasReceivedGameplayState,
    hasHydratedRuntimeInventory,
    gameplayState.collectedResourceIds,
  ]);

  useEffect(() => {
    if (!hasHydratedRuntimeInventory) return;

    let nextInventory = runtimeInventory;
    let changed = false;

    for (const resourceId of gameplayState.collectedResourceIds) {
      if (
        !resourceId.startsWith('crystal-') ||
        processedCrystalIds.current.has(resourceId)
      ) {
        continue;
      }

      const result = collectRuntimeResource(
        nextInventory,
        resourceId
      );

      if (result.ok) {
        nextInventory = result.state;
        processedCrystalIds.current.add(resourceId);
        changed = true;
      }
    }

    if (changed) {
      setRuntimeInventory(nextInventory);

      const saved = updateRuntimeInventoryPreservingJournal(
        nextInventory,
      );

      if (!saved) {
        console.error('CHEM QUEST: Inventory update save failed.');
      }
    }
  }, [
    hasHydratedRuntimeInventory,
    gameplayState.collectedResourceIds,
    runtimeInventory,
  ]);

  useEffect(() => {
    if (!hasHydratedRuntimeInventory) return;

    const saved = updateRuntimeInventoryPreservingJournal(
      runtimeInventory,
    );

    if (!saved) {
      console.error('CHEM QUEST: Inventory synchronization failed.');
    }
  }, [runtimeInventory, hasHydratedRuntimeInventory]);

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
              onInventoryChange={handleInventoryChange}
              elements={elementRecords}
              researchSamples={researchSamples}
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