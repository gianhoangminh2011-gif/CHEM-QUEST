import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import {
  subscribeGameplayState,
  type GameplayState,
} from './state/GameplayState';
import {
  CHEMISTRY_BRIDGE_CLEARED_EVENT,
  CHEMISTRY_BRIDGE_READY_EVENT,
  CHEMISTRY_BRIDGE_REGISTRY_KEY,
  type ChemistryBridge,
} from './chemistry/ChemistrySystem';

interface PhaserGameProps {
  onGameplayStateChange: (state: GameplayState) => void;
  onChemistryBridgeChange: (
    bridge: ChemistryBridge | null
  ) => void;
  onCollectResource: (resourceId: string) => boolean;
}

function PhaserGame({
  onGameplayStateChange,
  onChemistryBridgeChange,
  onCollectResource,
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
      scene: [new BootScene(onCollectResource)],
      physics: {
        default: 'arcade',
        arcade: {
          debug: false,
        },
      },
    });

    const handleBridgeReady = (
      bridge?: ChemistryBridge
    ) => {
      if (bridge) {
        onChemistryBridgeChange(bridge);
      }
    };

    const handleBridgeCleared = () => {
      onChemistryBridgeChange(null);
    };

    game.events.on(
      CHEMISTRY_BRIDGE_READY_EVENT,
      handleBridgeReady
    );

    game.events.on(
      CHEMISTRY_BRIDGE_CLEARED_EVENT,
      handleBridgeCleared
    );

    const existingBridge = game.registry.get(
      CHEMISTRY_BRIDGE_REGISTRY_KEY
    ) as ChemistryBridge | undefined;

    if (existingBridge) {
      handleBridgeReady(existingBridge);
    }

    return () => {
      game.events.off(
        CHEMISTRY_BRIDGE_READY_EVENT,
        handleBridgeReady
      );

      game.events.off(
        CHEMISTRY_BRIDGE_CLEARED_EVENT,
        handleBridgeCleared
      );

      unsubscribe();
      onChemistryBridgeChange(null);
      game.destroy(true);
    };
  }, [
    onGameplayStateChange,
    onChemistryBridgeChange,
    onCollectResource,
  ]);

  return <div ref={containerRef} className="phaser-game" />;
}

export default PhaserGame;