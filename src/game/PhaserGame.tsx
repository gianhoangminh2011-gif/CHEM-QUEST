
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import BootScene from './scenes/BootScene';

function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: 960,
      height: 600,
      backgroundColor: '#17232d',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [BootScene],
      physics: {
        default: 'arcade',
        arcade: {
          debug: false,
        },
      },
    });

    return () => {
      game.destroy(true);
    };
  }, []);

  return <div ref={containerRef} className="phaser-game" />;
}

export default PhaserGame;
