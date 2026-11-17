import type { GameplayState } from '../state/GameplayState';
import {
  getElementRecordsForResources,
  type ElementRecord,
} from '../elements/ElementCatalog';
import {
  isAnalysed,
  type ResearchSample,
} from '../chemistry/ChemistrySystem';

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
 * Creates a read-only inventory projection from GameplayState.
 *
 * This module does not mutate gameplay state,
 * write to storage, or introduce new save fields.
 */
export function getInventorySnapshot(
  state: GameplayState
): InventorySnapshot {
  const resourceCounts = new Map<string, number>();

  for (const resourceId of state.collectedResourceIds) {
    if (
      typeof resourceId !== 'string' ||
      resourceId.trim().length === 0
    ) {
      continue;
    }

    resourceCounts.set(
      resourceId,
      (resourceCounts.get(resourceId) ?? 0) + 1
    );
  }

  const elementRecords = getElementRecordsForResources(
    [...resourceCounts.keys()]
  );

  const elementByResourceId = new Map(
    elementRecords.map((element) => [
      element.resourceId,
      element,
    ])
  );

  const resources: ResourceInventoryEntry[] = [
    ...resourceCounts.entries(),
  ].map(([id, quantity]) => ({
    id,
    quantity,
    element: elementByResourceId.get(id) ?? null,
  }));

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