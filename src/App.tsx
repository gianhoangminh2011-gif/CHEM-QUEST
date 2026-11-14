
import { useEffect, useRef } from 'react';
import PhaserGame from './game/PhaserGame';

function App() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    return () => {
      gameRef.current?.replaceChildren();
    };
  }, []);

  return (
    <main className="app">
      <header className="game-header">
        <h1>CHEM QUEST</h1>
        <p>Explore • Discover • Master Chemistry</p>
      </header>

      <section className="game-container" ref={gameRef}>
        <PhaserGame />
      </section>
    </main>
  );
}

export default App;
