
export const CREATURE_GROUPS = [
  "CG-01",
  "CG-02",
  "CG-03",
  "CG-04",
  "CG-05",
  "CG-06",
] as const;

export type CreatureGroup = (typeof CREATURE_GROUPS)[number];

export const CREATURE_TIERS = [
  "PHAM_CHUNG",
  "LINH_CHUNG",
  "HUYEN_CHUNG",
  "DIA_CHUNG",
  "THIEN_CHUNG",
  "THANH_CHUNG",
] as const;

export type CreatureTier = (typeof CREATURE_TIERS)[number];

export const CULTIVATION_REALMS = [
  "KHAI_VAT_CANH",
  "NGUYEN_TO_CANH",
  "NGUYEN_TU_CANH",
  "HAT_NHAN_CANH",
  "DIEN_VAN_CANH",
  "TUAN_HOAN_CANH",
  "LIEN_KET_CANH",
  "PHAN_TU_CANH",
  "CAU_TRUC_CANH",
  "DUNG_DICH_CANH",
  "PHAN_UNG_CANH",
  "DINH_LUONG_CANH",
  "NHIET_HOA_CANH",
  "DONG_HOA_CANH",
  "CAN_BANG_CANH",
  "DIEN_HOA_CANH",
  "VAN_HOA_CANH",
  "HOA_DAO_CANH",
] as const;

export type CultivationRealm =
  (typeof CULTIVATION_REALMS)[number];

export const AWAKENING_STAGES = [
  "SO_TINH",
  "KHAI_TINH",
  "LINH_TINH",
  "CHAN_TINH",
] as const;

export type AwakeningStage =
  (typeof AWAKENING_STAGES)[number];

export const EVOLUTION_STAGES = [
  "KHOI_SINH",
  "LINH_HOA",
  "TIEN_HOA",
  "CHAN_THE",
  "CUC_THE",
] as const;

export type EvolutionStage =
  (typeof EVOLUTION_STAGES)[number];

export const TALENT_CATEGORIES = [
  "TAL-E",
  "TAL-S",
  "TAL-R",
  "TAL-C",
  "TAL-G",
] as const;

export type TalentCategory =
  (typeof TALENT_CATEGORIES)[number];

export const TALENT_GRADES = [
  "SO_CAP",
  "TRUNG_CAP",
  "CAO_CAP",
  "HIEM_CAP",
  "TRUYEN_THUYET",
  "THAN_THOAI",
] as const;

export type TalentGrade =
  (typeof TALENT_GRADES)[number];

export const AFFINITY_LEVELS = [
  "VO_CAM",
  "SO_CAM",
  "CAM_UNG",
  "TUONG_HOP",
  "CONG_HUONG",
  "BAN_NGUYEN",
] as const;

export type AffinityLevel =
  (typeof AFFINITY_LEVELS)[number];

export const ABILITY_CATEGORIES = [
  "ATTACK",
  "DEFENSE",
  "SUPPORT",
  "ELEMENTAL",
  "RESEARCH",
  "SPECIAL",
] as const;

export type AbilityCategory =
  (typeof ABILITY_CATEGORIES)[number];

export const ABILITY_PROGRESS = [
  "LOCKED",
  "UNLOCKED",
  "PRACTICED",
  "MASTERED",
  "TRANSCENDENT",
] as const;

export type AbilityProgress =
  (typeof ABILITY_PROGRESS)[number];

export const SPECIES_STATUSES = [
  "DRAFT",
  "VALIDATING",
  "REVIEW",
  "APPROVED",
  "ACTIVE",
  "DEPRECATED",
  "ARCHIVED",
] as const;

export type SpeciesStatus =
  (typeof SPECIES_STATUSES)[number];

export interface CreatureTalent {
  id: string;
  category: TalentCategory;
  grade: TalentGrade;
  innate: boolean;
  description?: string;
}

export interface CreatureAffinity {
  elementId: string;
  level: AffinityLevel;
  primary: boolean;
}

export interface CreatureAbility {
  id: string;
  category: AbilityCategory;
  progress: AbilityProgress;
}

export interface SpeciesEvolutionBranch {
  id: string;
  targetSpeciesId: string;
  requirements: readonly string[];
}

export interface SpeciesDefinition {
  id: string;
  name: string;
  group: CreatureGroup;
  tier: CreatureTier;
  status: SpeciesStatus;
  traits: readonly string[];
  compatibility: readonly string[];
  evolutionBranches: readonly SpeciesEvolutionBranch[];
  version: number;
}

export interface CreatureProfile {
  id: string;
  speciesId: string;
  cultivationRealm: CultivationRealm;
  awakeningStage: AwakeningStage;
  evolutionStage: EvolutionStage;
  talents: readonly CreatureTalent[];
  affinities: readonly CreatureAffinity[];
  abilities: readonly CreatureAbility[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ContractIssue {
  code: string;
  path: string;
  message: string;
}

export interface ContractValidationResult {
  valid: boolean;
  issues: readonly ContractIssue[];
}

const ID_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,63}$/;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOneOf<T extends readonly string[]>(
  value: unknown,
  values: T,
): value is T[number] {
  return (
    typeof value === "string" &&
    (values as readonly string[]).includes(value)
  );
}

function issue(
  code: string,
  path: string,
  message: string,
): ContractIssue {
  return Object.freeze({ code, path, message });
}

function result(
  issues: ContractIssue[],
): ContractValidationResult {
  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze(issues),
  });
}

function validateId(
  value: unknown,
  path: string,
  issues: ContractIssue[],
): void {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) {
    issues.push(
      issue("INVALID_ID", path, "ID format is invalid."),
    );
  }
}

function validateStringArray(
  value: unknown,
  path: string,
  issues: ContractIssue[],
): void {
  if (!Array.isArray(value)) {
    issues.push(
      issue("INVALID_ARRAY", path, "Expected an array."),
    );
    return;
  }

  value.forEach((item, index) => {
    if (!isNonEmptyString(item)) {
      issues.push(
        issue(
          "INVALID_ARRAY_ITEM",
          `${path}[${index}]`,
          "Array item must be a non-empty string.",
        ),
      );
    }
  });
}

export function validateSpeciesDefinition(
  value: unknown,
): ContractValidationResult {
  const issues: ContractIssue[] = [];

  if (!isRecord(value)) {
    return result([
      issue("INVALID_OBJECT", "$", "Species must be an object."),
    ]);
  }

  validateId(value.id, "id", issues);

  if (!isNonEmptyString(value.name)) {
    issues.push(issue("INVALID_NAME", "name", "Name is required."));
  }

  if (!isOneOf(value.group, CREATURE_GROUPS)) {
    issues.push(
      issue("INVALID_GROUP", "group", "Unknown creature group."),
    );
  }

  if (!isOneOf(value.tier, CREATURE_TIERS)) {
    issues.push(
      issue("INVALID_TIER", "tier", "Unknown creature tier."),
    );
  }

  if (!isOneOf(value.status, SPECIES_STATUSES)) {
    issues.push(
      issue("INVALID_STATUS", "status", "Unknown species status."),
    );
  }

  validateStringArray(value.traits, "traits", issues);
  validateStringArray(value.compatibility, "compatibility", issues);

  if (
    typeof value.version !== "number" ||
    !Number.isSafeInteger(value.version) ||
    value.version < 1
  ) {
    issues.push(
      issue("INVALID_VERSION", "version", "Version must be a positive integer."),
    );
  }

  if (!Array.isArray(value.evolutionBranches)) {
    issues.push(
      issue(
        "INVALID_BRANCHES",
        "evolutionBranches",
        "Evolution branches must be an array.",
      ),
    );
  } else {
    value.evolutionBranches.forEach((branch, index) => {
      const path = `evolutionBranches[${index}]`;

      if (!isRecord(branch)) {
        issues.push(
          issue("INVALID_BRANCH", path, "Branch must be an object."),
        );
        return;
      }

      validateId(branch.id, `${path}.id`, issues);
      validateId(
        branch.targetSpeciesId,
        `${path}.targetSpeciesId`,
        issues,
      );
      validateStringArray(
        branch.requirements,
        `${path}.requirements`,
        issues,
      );
    });
  }

  return result(issues);
}

export function validateCreatureProfile(
  value: unknown,
): ContractValidationResult {
  const issues: ContractIssue[] = [];

  if (!isRecord(value)) {
    return result([
      issue("INVALID_OBJECT", "$", "Creature profile must be an object."),
    ]);
  }

  validateId(value.id, "id", issues);
  validateId(value.speciesId, "speciesId", issues);

  if (!isOneOf(value.cultivationRealm, CULTIVATION_REALMS)) {
    issues.push(
      issue(
        "INVALID_REALM",
        "cultivationRealm",
        "Unknown cultivation realm.",
      ),
    );
  }

  if (!isOneOf(value.awakeningStage, AWAKENING_STAGES)) {
    issues.push(
      issue(
        "INVALID_AWAKENING",
        "awakeningStage",
        "Unknown awakening stage.",
      ),
    );
  }

  if (!isOneOf(value.evolutionStage, EVOLUTION_STAGES)) {
    issues.push(
      issue(
        "INVALID_EVOLUTION",
        "evolutionStage",
        "Unknown evolution stage.",
      ),
    );
  }

  for (const field of ["talents", "affinities", "abilities"] as const) {
    if (!Array.isArray(value[field])) {
      issues.push(
        issue("INVALID_ARRAY", field, `${field} must be an array.`),
      );
    }
  }

  if (
    typeof value.version !== "number" ||
    !Number.isSafeInteger(value.version) ||
    value.version < 1
  ) {
    issues.push(
      issue("INVALID_VERSION", "version", "Version must be a positive integer."),
    );
  }

  for (const field of ["createdAt", "updatedAt"] as const) {
    if (
      typeof value[field] !== "string" ||
      Number.isNaN(Date.parse(value[field] as string))
    ) {
      issues.push(
        issue("INVALID_TIMESTAMP", field, "Expected a valid ISO date."),
      );
    }
  }

  if (Array.isArray(value.talents)) {
    value.talents.forEach((talent, index) => {
      const path = `talents[${index}]`;

      if (!isRecord(talent)) {
        issues.push(issue("INVALID_TALENT", path, "Talent must be an object."));
        return;
      }

      validateId(talent.id, `${path}.id`, issues);

      if (!isOneOf(talent.category, TALENT_CATEGORIES)) {
        issues.push(
          issue("INVALID_TALENT_CATEGORY", `${path}.category`, "Unknown talent category."),
        );
      }

      if (!isOneOf(talent.grade, TALENT_GRADES)) {
        issues.push(
          issue("INVALID_TALENT_GRADE", `${path}.grade`, "Unknown talent grade."),
        );
      }

      if (typeof talent.innate !== "boolean") {
        issues.push(
          issue("INVALID_INNATE_FLAG", `${path}.innate`, "Expected boolean."),
        );
      }
    });
  }

  if (Array.isArray(value.affinities)) {
    value.affinities.forEach((affinity, index) => {
      const path = `affinities[${index}]`;

      if (!isRecord(affinity)) {
        issues.push(
          issue("INVALID_AFFINITY", path, "Affinity must be an object."),
        );
        return;
      }

      if (!isNonEmptyString(affinity.elementId)) {
        issues.push(
          issue("INVALID_ELEMENT_ID", `${path}.elementId`, "Element ID is required."),
        );
      }

      if (!isOneOf(affinity.level, AFFINITY_LEVELS)) {
        issues.push(
          issue("INVALID_AFFINITY_LEVEL", `${path}.level`, "Unknown affinity level."),
        );
      }

      if (typeof affinity.primary !== "boolean") {
        issues.push(
          issue("INVALID_PRIMARY_FLAG", `${path}.primary`, "Expected boolean."),
        );
      }
    });

    const primaryCount = value.affinities.filter(
      (item) => isRecord(item) && item.primary === true,
    ).length;

    if (primaryCount > 1) {
      issues.push(
        issue(
          "MULTIPLE_PRIMARY_AFFINITIES",
          "affinities",
          "Only one primary affinity is allowed.",
        ),
      );
    }
  }

  if (Array.isArray(value.abilities)) {
    value.abilities.forEach((ability, index) => {
      const path = `abilities[${index}]`;

      if (!isRecord(ability)) {
        issues.push(
          issue("INVALID_ABILITY", path, "Ability must be an object."),
        );
        return;
      }

      validateId(ability.id, `${path}.id`, issues);

      if (!isOneOf(ability.category, ABILITY_CATEGORIES)) {
        issues.push(
          issue("INVALID_ABILITY_CATEGORY", `${path}.category`, "Unknown ability category."),
        );
      }

      if (!isOneOf(ability.progress, ABILITY_PROGRESS)) {
        issues.push(
          issue("INVALID_ABILITY_PROGRESS", `${path}.progress`, "Unknown ability progress."),
        );
      }
    });
  }

  return result(issues);
}

export function validateSpeciesReferences(
  profile: unknown,
  species: readonly SpeciesDefinition[],
): ContractValidationResult {
  const profileResult = validateCreatureProfile(profile);

  if (!profileResult.valid || !isRecord(profile)) {
    return profileResult;
  }

  const issues: ContractIssue[] = [];
  const speciesIds = new Set(species.map((item) => item.id));

  if (!speciesIds.has(profile.speciesId as string)) {
    issues.push(
      issue(
        "UNKNOWN_SPECIES_REFERENCE",
        "speciesId",
        "Creature references a Species that does not exist.",
      ),
    );
  }

  return result(issues);
}

export function buildSpeciesCatalogue(
  input: unknown,
): {
  valid: boolean;
  species: readonly SpeciesDefinition[];
  issues: readonly ContractIssue[];
} {
  if (!Array.isArray(input)) {
    return Object.freeze({
      valid: false,
      species: Object.freeze([]),
      issues: Object.freeze([
        issue("INVALID_CATALOGUE", "$", "Catalogue must be an array."),
      ]),
    });
  }

  const issues: ContractIssue[] = [];
  const ids = new Set<string>();

  input.forEach((item, index) => {
    const validation = validateSpeciesDefinition(item);

    validation.issues.forEach((entry) => {
      issues.push(
        issue(entry.code, `[${index}].${entry.path}`, entry.message),
      );
    });

    if (isRecord(item) && typeof item.id === "string") {
      if (ids.has(item.id)) {
        issues.push(
          issue("DUPLICATE_SPECIES_ID", `[${index}].id`, "Duplicate Species ID."),
        );
      }
      ids.add(item.id);
    }
  });

  const valid = issues.length === 0;

  return Object.freeze({
    valid,
    species: Object.freeze(
      valid
        ? input.map((item) => Object.freeze({ ...item })) as SpeciesDefinition[]
        : [],
    ),
    issues: Object.freeze(issues),
  });
}
