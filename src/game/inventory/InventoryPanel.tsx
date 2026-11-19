
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
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '12px',
                marginTop: '10px',
                border: '1px solid rgba(213, 184, 120, 0.35)',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
              }}
            >
              <div
                style={{
                  flex: '1 1 110px',
                  minWidth: 0,
                  overflowWrap: 'anywhere',
                }}
              >
                <strong>{resourceId}</strong>

                <p style={{ margin: '5px 0 0' }}>
                  Quantity: {quantity}
                </p>
              </div>

              <button
                type="button"
                disabled={quantity <= 0}
                onClick={() => handleRemove(resourceId)}
                style={{
                  flex: '0 0 auto',
                  minHeight: '40px',
                  padding: '8px 14px',
                  border: '1px solid #d5b878',
                  borderRadius: '6px',
                  background: '#d5b878',
                  color: '#192820',
                  font: 'inherit',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: quantity > 0 ? 'pointer' : 'not-allowed',
                  opacity: quantity > 0 ? 1 : 0.5,
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
