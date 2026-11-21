
import { useState } from 'react';
import type { RuntimeInventoryState } from './RuntimeInventorySystem';
import type { ElementRecord } from '../elements/ElementCatalog';
import type { ResearchSample } from '../chemistry/ChemistrySystem';
import type {
  CraftingTransactionResult,
} from '../crafting/CraftingTransactionAdapter';

interface RuntimeInventoryPanelProps {
  inventory: RuntimeInventoryState;
  elements: readonly ElementRecord[];
  researchSamples: readonly ResearchSample[];
  onCraftingTransaction: (
    transactionId: string,
    recipeId: string,
  ) => CraftingTransactionResult;
  onRemoveResource: (
    resourceId: string,
  ) => {
    success: boolean;
    message?: string;
  };
}

function RuntimeInventoryPanel({
  inventory,
  elements,
  researchSamples,
  onRemoveResource,
}: RuntimeInventoryPanelProps) {
  const [feedback, setFeedback] = useState<{
    resourceId: string;
    message: string;
    success: boolean;
  } | null>(null);

  const resources = Object.entries(inventory.resources);

  const totalQuantity = resources.reduce(
    (total, [, quantity]) => total + quantity,
    0,
  );

  const handleRemove = (resourceId: string) => {
    const result = onRemoveResource(resourceId);

    setFeedback({
      resourceId,
      message: result.message ?? (
        result.success
          ? 'Removed 1 resource.'
          : 'Unable to remove resource.'
      ),
      success: result.success,
    });
  };

  return (
    <section className="inventory-panel">
      <h3>Explorer's Bag</h3>

      <p className="info-description">
        View your collected resources and their current quantities.
      </p>

      <div className="quest-objective">
        <strong>RESOURCES · {totalQuantity}</strong>

        {resources.length === 0 ? (
          <p>Your inventory is empty.</p>
        ) : (
          resources.map(([resourceId, quantity]) => (
            <div
              key={resourceId}
              style={{
                display: 'block',
                width: '100%',
                minWidth: 0,
                padding: '12px',
                marginTop: '10px',
                border: '1px solid #d5b878',
                borderRadius: '8px',
                background: '#20352a',
                boxSizing: 'border-box',
              }}
            >
              <strong
                style={{
                  display: 'block',
                  overflowWrap: 'anywhere',
                  color: '#f0d99d',
                }}
              >
                {resourceId}
              </strong>

              <p style={{ margin: '6px 0 12px' }}>
                Quantity: {quantity}
              </p>

              <button
                type="button"
                onClick={() => handleRemove(resourceId)}
                disabled={quantity <= 0}
              >
                Remove 1
              </button>

              {feedback?.resourceId === resourceId && (
                <p
                  role="status"
                  style={{
                    margin: '8px 0 0',
                    color: feedback.success ? '#a7e3b1' : '#ffaaaa',
                  }}
                >
                  {feedback.message}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      <div className="quest-objective">
        <strong>CRAFTING</strong>
        <p>No approved crafting recipes are available yet.</p>
        <button type="button" disabled>
          Crafting unavailable
        </button>
      </div>

      <div className="quest-objective">
        <strong>ELEMENT RECORDS · {elements.length}</strong>

        {elements.map((element) => (
          <div key={element.id}>
            <p>{element.symbol} · {element.name}</p>
            <p>{element.classification}</p>
            <p>Status: {element.identificationStatus}</p>
          </div>
        ))}
      </div>

      <div className="quest-objective">
        <strong>RESEARCH SAMPLES · {researchSamples.length}</strong>

        {researchSamples.map((sample) => (
          <p key={sample.id}>{sample.id}</p>
        ))}
      </div>
    </section>
  );
}

export default RuntimeInventoryPanel;
