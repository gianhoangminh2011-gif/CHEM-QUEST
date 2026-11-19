
import type { GameplayState } from '../state/GameplayState';
import {
  getElementRecordsForResources,
  type ElementRecord,
} from '../elements/ElementCatalog';
import {
  isAnalysed,
  type ResearchSample,
} from '../chemistry/ChemistrySystem';
import type { RuntimeInventoryState } from './RuntimeInventorySystem';

export interface ResourceInventoryEntry {
  id: string;
  quantity: number;
  element: ElementRecord | null;
}

export interface ResearchInventoryEntry {
  id: string;
  sourceId: string;
  sampleType: ResearchSample['sampleType'];
  displayName: string;
  analysed: boolean;
}

export interface InventorySnapshot {
  resources: ResourceInventoryEntry[];
  researchSamples: ResearchInventoryEntry[];
  totalResourceTypes: number;
  totalResourceQuantity: number;
  totalResearchSamples: number;
  analysedSamples: number;
  unanalysedSamples: number;
}

/**
 * RuntimeInventoryState is the canonical source for consumable resources.
 * GameplayState remains the source for research samples and analysis.
 * Historical collectedResourceIds are not used to rebuild current stock.
 */
export function getInventorySnapshot(
  state: GameplayState,
  runtimeInventory: RuntimeInventoryState
): InventorySnapshot {
  const resourceEntries = Object.entries(runtimeInventory.resources)
    .filter(
      ([id, quantity]) =>
        typeof id === 'string' &&
        id.trim() === id &&
        Number.isSafeInteger(quantity) &&
        quantity > 0
    )
    .sort(([a], [b]) => a.localeCompare(b));

  const elementRecords = getElementRecordsForResources(
    resourceEntries.map(([id]) => id)
  );

  const elementByResourceId = new Map(
    elementRecords.map((element) => [element.resourceId, element])
  );

  const resources: ResourceInventoryEntry[] = resourceEntries.map(
    ([id, quantity]) => ({
      id,
      quantity,
      element: elementByResourceId.get(id) ?? null,
    })
  );

  const researchSamples: ResearchInventoryEntry[] =
    Object.keys(state.researchSamplesById)
      .sort()
      .flatMap((id) => {
        const sample = state.researchSamplesById[id];

        if (!sample || sample.id !== id) {
          return [];
        }

        return [{
          id: sample.id,
          sourceId: sample.sourceId,
          sampleType: sample.sampleType,
          displayName: sample.displayName,
          analysed: isAnalysed(state, sample.id),
        }];
      });

  const analysedSamples = researchSamples.filter(
    (sample) => sample.analysed
  ).length;

  const totalResourceQuantity = resources.reduce(
    (total, resource) => total + resource.quantity,
    0
  );

  return {
    resources,
    researchSamples,
    totalResourceTypes: resources.length,
    totalResourceQuantity,
    totalResearchSamples: researchSamples.length,
    analysedSamples,
    unanalysedSamples:
      researchSamples.length - analysedSamples,
  };
}
