
import { useState } from 'react';
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
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');

  const resources = Object.entries(inventory.resources);

  const selectedResource = resources.find(
    ([resourceId]) => resourceId === selectedResourceId
  );

  const handleRemoveOne = () => {
    if (!selectedResource) {
      return;
    }

    const [resourceId] = selectedResource;
    const result = removeResource(inventory, resourceId, 1);

    if (result.ok) {
      onInventoryChange(result.state);

      if (
        result.state.resources[resourceId] === undefined
      ) {
        setSelectedResourceId('');
      }
    }
  };

  return (
    <section className="inventory-panel">
      <div className="quest-icon">▣</div>
      <h3>Resource Inventory</h3>
      <p className="info-description">
        Manage collected resources and review your research samples.
      </p>

      <div className="quest-objective">
        <span>RESOURCES · {resources.length}</span>

        {resources.length === 0 ? (
          <p>Your inventory is empty. Explore to collect crystals.</p>
        ) : (
          resources.map(([resourceId, quantity]) => (
            <button
              key={resourceId}
              type="button"
              className={
                selectedResourceId === resourceId
                  ? 'nav-item active'
                  : 'nav-item'
              }
              onClick={() => setSelectedResourceId(resourceId)}
            >
              <span>◇</span>
              {resourceId}
              <strong>×{quantity}</strong>
            </button>
          ))
        )}
      </div>

      {selectedResource && (
        <div className="quest-reward">
          <span>SELECTED RESOURCE</span>
          <strong>{selectedResource[0]}</strong>
          <p>Quantity: {selectedResource[1]}</p>

          <button
            type="button"
            className="nav-item"
            onClick={handleRemoveOne}
          >
            Remove 1
          </button>
        </div>
      )}

      <div className="quest-objective">
        <span>CRAFTING</span>
        <p>No approved crafting recipes are available yet.</p>
        <button type="button" className="nav-item" disabled>
          Crafting unavailable
        </button>
      </div>

      <div className="quest-objective">
        <span>ELEMENT RECORDS · {elements.length}</span>

        {elements.length === 0 ? (
          <p>No element records available.</p>
        ) : (
          elements.map((element) => (
            <div key={element.id}>
              <p>
                <strong>{element.symbol}</strong> · {element.name}
              </p>
              <p>{element.classification}</p>
              <p>STATUS: {element.identificationStatus.toUpperCase()}</p>
            </div>
          ))
        )}
      </div>

      <div className="quest-objective">
        <span>RESEARCH SAMPLES · {researchSamples.length}</span>

        {researchSamples.length === 0 ? (
          <p>No research samples collected yet.</p>
        ) : (
          researchSamples.map((sample) => (
            <div key={sample.id}>
              <p>
                <strong>{sample.id}</strong>
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default InventoryPanel;
