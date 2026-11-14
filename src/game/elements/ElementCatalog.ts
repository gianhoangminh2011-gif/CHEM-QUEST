
export interface ElementRecord {
  id: string;
  resourceId: string;
  name: string;
  symbol: string;
  atomicNumber: number | null;
  classification: string;
  description: string;
  identificationStatus: 'unidentified' | 'identified';
}

/**
 * Current world crystals are not mapped to real chemical elements yet.
 * Keep them as unidentified fictional samples until approved game data
 * defines their identities. Do not infer atomic numbers or real properties.
 */
export const ELEMENT_CATALOG: readonly ElementRecord[] = [
  {
    id: 'crystal-sample-01',
    resourceId: 'crystal-540-210',
    name: 'Unidentified Crystal 01',
    symbol: '?',
    atomicNumber: null,
    classification: 'Unidentified sample',
    description:
      'A newly collected crystal fragment. Its chemical identity has not yet been established.',
    identificationStatus: 'unidentified',
  },
  {
    id: 'crystal-sample-02',
    resourceId: 'crystal-760-335',
    name: 'Unidentified Crystal 02',
    symbol: '?',
    atomicNumber: null,
    classification: 'Unidentified sample',
    description:
      'A newly collected crystal fragment. Its chemical identity has not yet been established.',
    identificationStatus: 'unidentified',
  },
  {
    id: 'crystal-sample-03',
    resourceId: 'crystal-225-310',
    name: 'Unidentified Crystal 03',
    symbol: '?',
    atomicNumber: null,
    classification: 'Unidentified sample',
    description:
      'A newly collected crystal fragment. Its chemical identity has not yet been established.',
    identificationStatus: 'unidentified',
  },
] as const;

const elementByResourceId = new Map(
  ELEMENT_CATALOG.map((element) => [
    element.resourceId,
    element,
  ])
);

export function getElementRecordsForResources(
  resourceIds: readonly string[]
): ElementRecord[] {
  const seen = new Set<string>();
  const records: ElementRecord[] = [];

  for (const resourceId of resourceIds) {
    if (seen.has(resourceId)) continue;
    seen.add(resourceId);

    const element = elementByResourceId.get(resourceId);
    if (element) records.push(element);
  }

  return records;
}
