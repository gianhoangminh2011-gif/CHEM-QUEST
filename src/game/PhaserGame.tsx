import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import {
  subscribeGameplayState,
  type GameplayState,
} from './state/GameplayState';

interface PhaserGameProps {
  onGameplayStateChange: (state: GameplayState) => void;
}

function PhaserGame({
  onGameplayStateChange,
}: PhaserGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;

    const unsubscribe = subscribeGameplayState(
      onGameplayStateChange
    );

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
      unsubscribe();
      game.destroy(true);
    };
  }, [onGameplayStateChange]);

  return <div ref={containerRef} className="phaser-game" />;
}

export default PhaserGame;