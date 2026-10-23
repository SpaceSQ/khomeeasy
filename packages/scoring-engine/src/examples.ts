export const exampleIds = [
  'villa-family',
  'renovation-care',
  'estate-outdoor',
  'hotel-rooms',
  'designer-energy'
] as const;

export type ExampleId = (typeof exampleIds)[number];

export type ExampleKind = 'detached_house' | 'estate' | 'hotel';
export type BuildType = 'new_build' | 'renovation' | 'unspecified';
export type ConstructionPhase = 'design' | 'shell' | 'finished' | 'unspecified';
export type Priority =
  | 'lighting'
  | 'shading'
  | 'hvac'
  | 'outdoor_lighting'
  | 'terrace_av'
  | 'security'
  | 'care_alerting'
  | 'energy'
  | 'wall_plates'
  | 'guest_rooms'
  | 'apple_voice'
  | 'appearance';

export type ExampleProfile = {
  id: ExampleId;
  kind: ExampleKind;
  build: BuildType;
  phase: ConstructionPhase;
  areaSqm: number | null;
  gardenSqm: number | null;
  adults: number | null;
  children: number | null;
  dogs: number | null;
  guestRooms: number | null;
  buildings: number | null;
  budgetStated: boolean;
  lockInStated: boolean;
  priorities: readonly Priority[];
  specifiedPlateBrand: 'basalte' | null;
  existingSystem: 'ir_alarm' | null;
  carbonGoal: boolean;
};

/** Intake band from the handover: under 120, 120–250, over 250 square metres. */
export const TYPICAL_HOUSE_AREA_MAX_SQM = 250;

export const exampleProfiles: readonly ExampleProfile[] = [
  {
    id: 'villa-family',
    kind: 'detached_house',
    build: 'new_build',
    phase: 'design',
    areaSqm: 600,
    gardenSqm: 1500,
    adults: 2,
    children: 2,
    dogs: 2,
    guestRooms: null,
    buildings: 1,
    budgetStated: false,
    lockInStated: false,
    priorities: ['lighting', 'shading', 'hvac', 'outdoor_lighting'],
    specifiedPlateBrand: null,
    existingSystem: null,
    carbonGoal: false
  },
  {
    id: 'renovation-care',
    kind: 'detached_house',
    build: 'renovation',
    phase: 'finished',
    areaSqm: 300,
    gardenSqm: null,
    adults: 2,
    children: 0,
    dogs: 0,
    guestRooms: null,
    buildings: 1,
    budgetStated: false,
    lockInStated: false,
    priorities: ['security', 'care_alerting', 'hvac'],
    specifiedPlateBrand: null,
    existingSystem: 'ir_alarm',
    carbonGoal: false
  },
  {
    id: 'estate-outdoor',
    kind: 'estate',
    build: 'unspecified',
    phase: 'unspecified',
    areaSqm: 2000,
    gardenSqm: null,
    adults: null,
    children: null,
    dogs: null,
    guestRooms: null,
    buildings: 2,
    budgetStated: false,
    lockInStated: false,
    priorities: ['outdoor_lighting', 'terrace_av', 'lighting', 'appearance'],
    specifiedPlateBrand: null,
    existingSystem: null,
    carbonGoal: false
  },
  {
    id: 'hotel-rooms',
    kind: 'hotel',
    build: 'unspecified',
    phase: 'unspecified',
    areaSqm: null,
    gardenSqm: null,
    adults: null,
    children: null,
    dogs: null,
    guestRooms: 300,
    buildings: 1,
    budgetStated: false,
    lockInStated: false,
    priorities: ['guest_rooms', 'appearance', 'apple_voice', 'hvac', 'lighting'],
    specifiedPlateBrand: null,
    existingSystem: null,
    carbonGoal: false
  },
  {
    id: 'designer-energy',
    kind: 'detached_house',
    build: 'unspecified',
    phase: 'unspecified',
    areaSqm: null,
    gardenSqm: null,
    adults: 1,
    children: 0,
    dogs: 0,
    guestRooms: null,
    buildings: 1,
    budgetStated: false,
    lockInStated: false,
    priorities: ['energy', 'wall_plates', 'lighting'],
    specifiedPlateBrand: 'basalte',
    existingSystem: null,
    carbonGoal: true
  }
];
