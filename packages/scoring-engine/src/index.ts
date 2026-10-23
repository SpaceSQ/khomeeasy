export {
  exampleIds,
  exampleProfiles,
  TYPICAL_HOUSE_AREA_MAX_SQM,
  type ExampleId,
  type ExampleProfile,
  type ExampleKind,
  type Priority
} from './examples';
export {
  assessExample,
  evidenceCatalog,
  type ExampleAssessment,
  type EvidenceId,
  type FitLabel,
  type BudgetTreatment,
  type TierSuggestion,
  type WiringWindow
} from './assess-example';
export {
  DISTANCE_STEPS,
  distanceBetween,
  distanceUnitForCountry,
  matchInstallersByDistance,
  type DistanceMatch,
  type DistanceUnit,
  type MatchableInstaller
} from './distance';
export {
  applyChoice,
  applyPriorities,
  assessHouse,
  clearSlot,
  emptyBrief,
  openingSteps,
  parseDescription,
  type GuideStep,
  type HouseBrief
} from './guide';
