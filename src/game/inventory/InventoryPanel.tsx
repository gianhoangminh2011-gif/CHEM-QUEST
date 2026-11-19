import { useState } from 'react';
import type { ElementRecord } from '../elements/ElementCatalog';
import type { ResearchSample } from '../chemistry/ChemistrySystem';

interface InventoryPanelProps {
  resources: Readonly<Record<string, number>>;
  elements: readonly ElementRecord[];
  researchSamples: readonly ResearchSample[];
}

export default function InventoryPanel({
  resources,
  elements,
  researchSamples,
}: InventoryPanelProps) {
  const [selectedResourceId, setSelectedResourceId] =
    useState<string | null>(null);

  const entries = Object.entries(resources);

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

  return (
    <>
      <div className="quest-icon">▣</div>

      <h3>Explorer's Bag</h3>

      <p className="info-description">
        Select a collected resource to inspect its information.
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
              onClick={() => setSelectedResourceId(resourceId)}
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
          </>
        )}
      </div>

      <div className="quest-objective">
        <span>RESEARCH SAMPLES</span>

        {researchSamples.length === 0 && (
          <p>No research samples collected.</p>
        )}

        {researchSamples.map((sample) => (
          <div key={sample.id}>
            <p>
              <strong>{sample.displayName}</strong>
            </p>
            <p>STATUS: COLLECTED</p>
            <p>SAMPLE ID: {sample.id}</p>
          </div>
        ))}
      </div>
    </>
  );
}