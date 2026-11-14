
import { useCallback, useState } from 'react';
import PhaserGame from './game/PhaserGame';
import {
  createGameplayState,
  type GameplayState,
} from './game/state/GameplayState';
import {
  FIRST_DISCOVERY_QUEST,
  getQuestProgress,
} from './game/quests/QuestSystem';
import { getElementRecordsForResources } from './game/elements/ElementCatalog';

type Panel = 'quest' | 'codex' | 'bag';

function App() {
  const [activePanel, setActivePanel] = useState<Panel>('quest');
  const [gameplayState, setGameplayState] =
    useState<GameplayState>(createGameplayState);

  const handleGameplayStateChange = useCallback(
    (nextState: GameplayState) => {
      setGameplayState(nextState);
    },
    []
  );

  const crystalCount = gameplayState.collectedResourceIds.length;
  const sampleCount = gameplayState.analyzedSampleIds.length;
  const totalDiscoveries = crystalCount + sampleCount;

  const questProgress = getQuestProgress(
    FIRST_DISCOVERY_QUEST,
    gameplayState
  );

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

          <div className="side-divider" />

          <div className="progress-card">
            <p className="panel-label">EXPLORER PROGRESS</p>
            <div className="progress-number">
              {String(totalDiscoveries).padStart(2, '0')}
              <span> / 04</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min((totalDiscoveries / 4) * 100, 100)}%`,
                }}
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
                : 'INVENTORY'}
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
            <>
              <div className="quest-icon">▣</div>
              <h3>Explorer's Bag</h3>
              <p className="info-description">
                Resources collected during your journey.
              </p>

              <div className="quest-objective">
                <span>COLLECTED RESOURCES</span>
                <p>
                  {crystalCount === 0
                    ? 'Your inventory is empty.'
                    : `${crystalCount} crystal resource(s) collected.`}
                </p>
              </div>

              <div className="quest-objective">
                <span>ANALYZED SAMPLES</span>
                <p>{sampleCount} mineral sample(s) analyzed.</p>
              </div>
            </>
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
