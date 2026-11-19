
import { useState } from 'react';
import type { ElementRecord } from '../elements/ElementCatalog';
import type { ResearchSample } from '../chemistry/ChemistrySystem';
import {
  removeResource,
  type InventoryState,
} from './InventorySystem';

interface InventoryPanelProps {
  inventory: InventoryState;
  onInventoryChange: (next: InventoryState) => void;
  elements: readonly ElementRecord[];
  researchSamples: readonly ResearchSample[];
}

export default function InventoryPanel({
  inventory,
  onInventoryChange,
  elements,
  researchSamples,
}: InventoryPanelProps) {
  const [selectedResourceId, setSelectedResourceId] =
    useState<string | null>(null);
  const [message, setMessage] = useState('');

  const entries = Object.entries(inventory.resources);

  const totalResources = entries.reduce(
    (sum, [, quantity]) => sum + quantity,
    0
  );

  const selectedEntry =
    entries.find(([id]) => id === selectedResourceId) ??
    entries[0];

  const selectedElement = selectedEntry
    ? elements.find(
        (element) => element.resourceId === selectedEntry[0]
      )
    : undefined;

  function handleRemoveResource() {
    if (!selectedEntry) return;

    const [resourceId] = selectedEntry;

    const result = removeResource(
      inventory,
      resourceId,
      1
    );

    if (!result.ok) {
      setMessage(`Remove failed: ${result.error}`);
      return;
    }

    onInventoryChange(result.state);
    setMessage('Removed 1 resource.');

    if (result.state.resources[resourceId] === undefined) {
      setSelectedResourceId(null);
    }
  }

  return (
    <>
      <div className="quest-icon">▣</div>

      <h3>Explorer's Bag</h3>

      <p className="info-description">
        Select a collected resource to inspect and manage it.
      </p>

      <div className="quest-objective">
        <span>RESOURCE SUMMARY</span>
        <p>RESOURCE TYPES: {entries.length}</p>
        <p>TOTAL RESOURCES: {totalResources}</p>
        <p>RESEARCH SAMPLES: {researchSamples.length}</p>
      </div>

      <div className="quest-objective">
        <span>COLLECTED RESOURCES</span>

        {entries.length === 0 && (
          <p>Your inventory is empty.</p>
        )}

        {entries.map(([resourceId, quantity]) => {
          const element = elements.find(
            (record) => record.resourceId === resourceId
          );

          const selected = selectedEntry?.[0] === resourceId;

          return (
            <button
              key={resourceId}
              type="button"
              onClick={() => {
                setSelectedResourceId(resourceId);
                setMessage('');
              }}
              aria-pressed={selected}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '10px',
                margin: '8px 0',
                border: selected
                  ? '2px solid #c5a059'
                  : '1px solid #777',
                borderRadius: '6px',
                cursor: 'pointer',
                background: selected
                  ? 'rgba(197, 160, 89, 0.12)'
                  : 'transparent',
                color: 'inherit',
              }}
            >
              <strong>
                {element?.name ?? 'Unidentified Crystal'}
              </strong>
              <p>Quantity: ×{quantity}</p>
              <p>{resourceId}</p>
            </button>
          );
        })}
      </div>

      <div className="quest-objective">
        <span>RESOURCE DETAILS</span>

        {!selectedEntry && (
          <p>Collect a crystal to view its details.</p>
        )}

        {selectedEntry && (
          <>
            <p>
              <strong>
                {selectedElement?.name ?? 'Unidentified Crystal'}
              </strong>
            </p>
            <p>RESOURCE ID: {selectedEntry[0]}</p>
            <p>QUANTITY: {selectedEntry[1]}</p>

            {selectedElement ? (
              <>
                <p>SYMBOL: {selectedElement.symbol}</p>
                <p>
                  CLASSIFICATION: {selectedElement.classification}
                </p>
                <p>{selectedElement.description}</p>
                <p>
                  IDENTIFICATION STATUS:{' '}
                  {selectedElement.identificationStatus.toUpperCase()}
                </p>
              </>
            ) : (
              <p>Catalog information is not available.</p>
            )}

            <button
              type="button"
              onClick={handleRemoveResource}
            >
              Remove 1
            </button>
          </>
        )}

        {message && <p role="status">{message}</p>}
      </div>

      <div className="quest-objective">
        <span>CRAFTING</span>
        <p>No approved crafting recipes are available yet.</p>
        <button type="button" disabled>
          Crafting unavailable
        </button>
      </div>

      <div className="quest-objective">
        <span>RESEARCH SAMPLES</span>

        {researchSamples.length === 0 && (
          <p>No research samples collected.</p>
        )}

        {researchSamples.map((sample) => (
          <div key={sample.id}>
            <p><strong>{sample.displayName}</strong></p>
            <p>STATUS: COLLECTED</p>
            <p>SAMPLE ID: {sample.id}</p>
          </div>
        ))}
      </div>
    </>
  );
}
