
import type {
  ContractIssue,
  SpeciesDefinition,
} from "./CreatureRealmContracts";

export interface EvolutionGraphValidationResult {
  valid: boolean;
  issues: readonly ContractIssue[];
}

function makeIssue(
  code: string,
  path: string,
  message: string,
): ContractIssue {
  return Object.freeze({ code, path, message });
}

function result(
  issues: ContractIssue[],
): EvolutionGraphValidationResult {
  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze(issues),
  });
}

/**
 * Validates the structural integrity of a Species evolution graph.
 *
 * Checks:
 * - Duplicate Species IDs.
 * - Duplicate evolution branch IDs across the graph.
 * - Unknown evolution targets.
 * - Self-referencing evolution branches.
 * - Directed evolution cycles.
 *
 * This validator does not execute or mutate evolution gameplay.
 */
export function validateEvolutionGraph(
  species: readonly SpeciesDefinition[],
): EvolutionGraphValidationResult {
  const issues: ContractIssue[] = [];
  const speciesById = new Map<string, SpeciesDefinition>();
  const branchIds = new Set<string>();
  const adjacency = new Map<string, string[]>();

  // Index Species and detect duplicate IDs.
  species.forEach((entry, index) => {
    if (speciesById.has(entry.id)) {
      issues.push(
        makeIssue(
          "DUPLICATE_SPECIES_ID",
          `[${index}].id`,
          `Duplicate Species ID: ${entry.id}.`,
        ),
      );
      return;
    }

    speciesById.set(entry.id, entry);
    adjacency.set(entry.id, []);
  });

  // Validate every evolution edge.
  species.forEach((entry, speciesIndex) => {
    const sourceId = entry.id;

    entry.evolutionBranches.forEach((branch, branchIndex) => {
      const path =
        `[${speciesIndex}].evolutionBranches[${branchIndex}]`;

      if (branchIds.has(branch.id)) {
        issues.push(
          makeIssue(
            "DUPLICATE_EVOLUTION_BRANCH_ID",
            `${path}.id`,
            `Evolution branch ID is duplicated: ${branch.id}.`,
          ),
        );
      } else {
        branchIds.add(branch.id);
      }

      if (branch.targetSpeciesId === sourceId) {
        issues.push(
          makeIssue(
            "SELF_EVOLUTION_REFERENCE",
            `${path}.targetSpeciesId`,
            "A Species cannot evolve into itself.",
          ),
        );
        return;
      }

      if (!speciesById.has(branch.targetSpeciesId)) {
        issues.push(
          makeIssue(
            "UNKNOWN_EVOLUTION_TARGET",
            `${path}.targetSpeciesId`,
            `Unknown evolution target: ${branch.targetSpeciesId}.`,
          ),
        );
        return;
      }

      adjacency.get(sourceId)?.push(branch.targetSpeciesId);
    });
  });

  // Detect directed cycles using depth-first search.
  // 0 = unvisited, 1 = currently visiting, 2 = completed.
  const state = new Map<string, 0 | 1 | 2>();
  const stack: string[] = [];
  const reportedCycles = new Set<string>();

  function visit(id: string): void {
    state.set(id, 1);
    stack.push(id);

    for (const targetId of adjacency.get(id) ?? []) {
      const targetState = state.get(targetId) ?? 0;

      if (targetState === 0) {
        visit(targetId);
        continue;
      }

      if (targetState === 1) {
        const cycleStart = stack.indexOf(targetId);
        const cycle = [
          ...stack.slice(cycleStart),
          targetId,
        ];

        // Canonicalize the cycle to avoid duplicate reports
        // when the same directed cycle is encountered again.
        const cycleNodes = cycle.slice(0, -1);
        const rotations = cycleNodes.map((_, index) => {
          const rotated = [
            ...cycleNodes.slice(index),
            ...cycleNodes.slice(0, index),
          ];

          return rotated.join(" -> ");
        });

        const canonical = rotations.sort()[0];

        if (!reportedCycles.has(canonical)) {
          reportedCycles.add(canonical);

          issues.push(
            makeIssue(
              "EVOLUTION_CYCLE_DETECTED",
              "evolutionBranches",
              `Evolution cycle detected: ${cycle.join(" -> ")}.`,
            ),
          );
        }
      }
    }

    stack.pop();
    state.set(id, 2);
  }

  for (const id of adjacency.keys()) {
    if ((state.get(id) ?? 0) === 0) {
      visit(id);
    }
  }

  return result(issues);
}
