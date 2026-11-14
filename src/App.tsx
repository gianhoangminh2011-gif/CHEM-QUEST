
import { useState } from 'react';
import PhaserGame from './game/PhaserGame';

type Panel = 'quest' | 'codex' | 'bag';

function App() {
  const [activePanel, setActivePanel] = useState<Panel>('quest');

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
            <div className="progress-number">01 <span>/ 10</span></div>
            <div className="progress-track">
              <div className="progress-fill" />
            </div>
            <p className="progress-caption">Your adventure begins.</p>
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
            <PhaserGame />
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
                Begin your journey and explore the mysterious Emerald Frontier.
              </p>
              <div className="quest-objective">
                <span>OBJECTIVE</span>
                <p>Explore the surrounding area</p>
              </div>
              <div className="quest-reward">
                <span>REWARD</span>
                <strong>+100 XP</strong>
              </div>
            </>
          )}

          {activePanel === 'codex' && (
            <>
              <div className="quest-icon">⚛</div>
              <h3>Element Codex</h3>
              <p className="info-description">
                Your scientific encyclopedia. Discover chemical elements and
                record their properties as you progress.
              </p>
              <div className="quest-objective">
                <span>DISCOVERED ELEMENTS</span>
                <p>0 elements recorded</p>
              </div>
            </>
          )}

          {activePanel === 'bag' && (
            <>
              <div className="quest-icon">▣</div>
              <h3>Explorer's Bag</h3>
              <p className="info-description">
                Important items and discoveries collected during your journey
                will appear here.
              </p>
              <div className="quest-objective">
                <span>ITEMS COLLECTED</span>
                <p>Your inventory is empty.</p>
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
