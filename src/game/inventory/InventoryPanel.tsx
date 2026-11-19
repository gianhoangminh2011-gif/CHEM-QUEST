
import {
  removeResource,
  type InventoryState,
} from './InventorySystem';
import type { ElementRecord } from '../elements/ElementCatalog';
import type { ResearchSample } from '../chemistry/ChemistrySystem';

interface InventoryPanelProps {
  inventory: InventoryState;
  onInventoryChange: (nextInventory: InventoryState) => void;
  elements: readonly ElementRecord[];
  researchSamples: readonly ResearchSample[];
}

function InventoryPanel({
  inventory,
  onInventoryChange,
  elements,
  researchSamples,
}: InventoryPanelProps) {
  const resources = Object.entries(inventory.resources);

  const handleRemove = (resourceId: string) => {
    const result = removeResource(inventory, resourceId, 1);

    if (result.ok) {
      onInventoryChange(result.state);
    }
  };

  return (
    <section className="inventory-panel">
      <h3>Resource Inventory</h3>
      <p className="info-description">
        Manage your collected resources.
      </p>

      <div className="quest-objective">
        <strong>RESOURCES · {resources.length}</strong>

        {resources.length === 0 ? (
          <p>Your inventory is empty.</p>
        ) : (
          resources.map(([resourceId, quantity]) => (
            <div
              key={resourceId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '10px',
                marginTop: '8px',
                border: '1px solid #777',
                borderRadius: '8px',
              }}
            >
              <div>
                <strong>{resourceId}</strong>
                <p style={{ margin: '4px 0' }}>
                  Quantity: {quantity}
                </p>
              </div>

              <button
                type="button"
                disabled={quantity <= 0}
                onClick={() => handleRemove(resourceId)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  border: '1px solid #999',
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
            <p>
              {element.symbol} · {element.name}
            </p>
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

export default InventoryPanel;
