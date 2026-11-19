
import {
  removeRuntimeResource,
  type RuntimeInventoryState,
} from './RuntimeInventorySystem';
import type { ElementRecord } from '../elements/ElementCatalog';
import type { ResearchSample } from '../chemistry/ChemistrySystem';

interface RuntimeInventoryPanelProps {
  inventory: RuntimeInventoryState;
  onInventoryChange: (nextInventory: RuntimeInventoryState) => void;
  elements: readonly ElementRecord[];
  researchSamples: readonly ResearchSample[];
}

function RuntimeInventoryPanel({
  inventory,
  onInventoryChange,
  elements,
  researchSamples,
}: RuntimeInventoryPanelProps) {
  const resources = Object.entries(inventory.resources);

  const totalQuantity = resources.reduce(
    (total, [, quantity]) => total + quantity,
    0,
  );

  const handleRemove = (resourceId: string) => {
    const result = removeRuntimeResource(inventory, resourceId, 1);

    if (result.ok) {
      onInventoryChange(result.state);
    }
  };

  return (
    <section className="inventory-panel">
      <h3>Explorer's Bag</h3>

      <p className="info-description">
        Manage your collected resources.
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
                disabled={quantity <= 0}
                onClick={() => handleRemove(resourceId)}
                style={{
                  display: 'block',
                  width: '100%',
                  minHeight: '44px',
                  padding: '10px',
                  background: '#d5b878',
                  color: '#192820',
                  border: '1px solid #d5b878',
                  borderRadius: '6px',
                  fontFamily: 'inherit',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: quantity > 0 ? 'pointer' : 'not-allowed',
                  boxSizing: 'border-box',
                }}
              >
                Remove 1
              </button>
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
