import { useCallback, useState } from 'react';
import PhaserGame from './game/PhaserGame';
import {
  createGameplayState,
  type GameplayState,
} from './game/state/GameplayState';

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
  const questCompleted = crystalCount >= 3 && sampleCount >= 1;

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
              {questCompleted
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
              <h3>The First Discovery</h3>
              <p className="info-description">
                Explore Emerald Frontier, collect crystals and analyze a
                mineral sample.
              </p>

              <div className="quest-objective">
                <span>OBJECTIVES</span>
                <p>
                  Crystals collected: {crystalCount}/3
                </p>
                <p>
                  Mineral samples analyzed: {sampleCount}/1
                </p>
              </div>

              <div className="quest-reward">
                <span>QUEST STATUS</span>
                <strong>
                  {questCompleted ? 'COMPLETED' : 'IN PROGRESS'}
                </strong>
              </div>
            </>
          )}

          {activePanel === 'codex' && (
            <>
              <div className="quest-icon">⚛</div>
              <h3>Element Codex</h3>
              <p className="info-description">
                Your field discoveries are recorded here as you explore.
              </p>

              <div className="quest-objective">
                <span>COLLECTED CRYSTALS</span>
                <p>{crystalCount} resource records</p>
                {gameplayState.collectedResourceIds.map((id) => (
                  <p key={id}>{id}</p>
                ))}
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