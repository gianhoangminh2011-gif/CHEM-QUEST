// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';
import {
  createGameplayState,
  updateGameplayState,
  type GameplayState,
} from './game/state/GameplayState';
import {
  GAMEPLAY_SAVE_KEY,
  loadGameplaySave,
} from './game/state/GameplaySaveService';
import {
  RUNTIME_INVENTORY_SAVE_KEY,
  loadRuntimeInventorySnapshot,
} from './game/inventory/RuntimeInventorySaveService';
import { InventoryTransactionService } from './game/inventory/InventoryTransactionService';