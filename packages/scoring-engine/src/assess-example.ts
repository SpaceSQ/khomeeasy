import {
  TYPICAL_HOUSE_AREA_MAX_SQM,
  type ExampleProfile,
  type Priority
} from './examples';

export type FitLabel = 'incomplete' | 'outside_house_model' | 'low' | 'medium' | 'high';
export type WiringWindow = 'open_with_shell' | 'closed_finished' | 'multi_building' | 'not_a_house' | 'unspecified';
export type TierSuggestion = 'better' | 'best' | null;
export type BudgetTreatment = 'typical_house_context' | 'none';
export type EvidenceId = 'budget' | 'basalte' | 'handover';

export type ExampleAssessment = {
  fit: FitLabel;
  wiring: WiringWindow;
  tier: TierSuggestion;
  budget: BudgetTreatment;
  reasons: readonly string[];
  functions: readonly string[];
  points: readonly string[];
  evidence: readonly EvidenceId[];
};

export const evidenceCatalog = {
  budget: {
    level: 'E4',
    sourceUrl: 'https://bau-lex.de/knx',
    verifiedAt: '2026-10-20'
  },
  basalte: {
    level: 'E2',
    sourceUrl: 'https://www.basalte.be/en/product/sentido',
    verifiedAt: '2026-10-22'
  },
  handover: {
    level: 'E1',
    sourceUrl:
      'https://www.ris.bka.gv.at/Dokumente/Justiz/JJT_20151125_OGH0002_0080OB00121_15Z0000_000/JJT_20151125_OGH0002_0080OB00121_15Z0000_000.html',
    verifiedAt: '2026-10-20'
  }
} as const;

const functionByPriority: Record<Priority, string> = {
  lighting: 'dim_living',
  shading: 'shading',
  hvac: 'room_climate',
  outdoor_lighting: 'outdoor_lighting',
  terrace_av: 'terrace_av',
  security: 'intrusion_alert',
  care_alerting: 'call_point',
  energy: 'energy_metering',
  wall_plates: 'basalte_plates',
  guest_rooms: 'guest_room_light',
  apple_voice: 'guest_controls',
  appearance: 'scenes'
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function houseFunctions(profile: ExampleProfile): string[] {
  const fromPriorities = profile.priorities.map((priority) => {
    if (profile.kind === 'hotel' && priority === 'lighting') {
      return 'guest_room_light';
    }
    if (profile.kind === 'hotel' && priority === 'hvac') {
      return 'guest_room_climate';
    }
    return functionByPriority[priority];
  });
  const extra: string[] = [];
  if (profile.priorities.includes('care_alerting')) {
    extra.push('night_presence');
  }
  if (profile.priorities.includes('energy')) {
    extra.push('pv_ev');
  }
  if (profile.existingSystem === 'ir_alarm') {
    extra.push('record_existing_alarm');
  }
  if (profile.priorities.includes('guest_rooms')) {
    extra.push('guest_room_climate', 'stable_operation');
  }
  return unique([...fromPriorities, ...extra]);
}

export function assessExample(profile: ExampleProfile): ExampleAssessment {
  if (profile.kind === 'hotel') {
    return {
      fit: 'outside_house_model',
      wiring: 'not_a_house',
      tier: null,
      budget: 'none',
      reasons: unique([
        'hotel_outside_model',
        ...(profile.priorities.includes('apple_voice') ? ['apple_voice_not_verified'] : []),
        ...(profile.priorities.includes('appearance') ? ['finish_is_a_requirement'] : []),
        'budget_not_stated'
      ]),
      functions: houseFunctions(profile),
      points: unique([
        'do_not_print_house_price',
        ...(profile.priorities.includes('apple_voice') ? ['apple_voice_as_question'] : []),
        'not_a_three_quote_house',
        'documentation_handover',
        'qualified_contractor',
        'no_wiring_steps'
      ]),
      evidence: ['handover']
    };
  }

  if (profile.kind === 'estate') {
    return {
      fit: 'outside_house_model',
      wiring: 'multi_building',
      tier: 'best',
      budget: 'none',
      reasons: unique([
        'several_buildings',
        'outdoor_light_and_av',
        'house_band_does_not_apply',
        'budget_not_stated'
      ]),
      functions: unique([...houseFunctions(profile), 'climate_per_building']),
      points: unique([
        'separate_project_per_building',
        'outdoor_specified_by_partner',
        'no_bus_layout_from_us',
        'handover_per_building',
        'do_not_print_house_price',
        'no_wiring_steps'
      ]),
      evidence: ['handover']
    };
  }

  const wiring: WiringWindow =
    profile.phase === 'finished'
      ? 'closed_finished'
      : profile.phase === 'design' || profile.phase === 'shell'
        ? 'open_with_shell'
        : 'unspecified';

  const reasons = unique([
    ...(profile.build === 'new_build' && wiring === 'open_with_shell' ? ['new_build_bus_with_mains'] : []),
    ...(profile.phase === 'finished' ? ['walls_already_closed'] : []),
    ...(profile.phase === 'unspecified' ? ['phase_not_stated'] : []),
    ...(profile.areaSqm !== null && profile.areaSqm > TYPICAL_HOUSE_AREA_MAX_SQM
      ? ['area_above_typical_band']
      : []),
    ...(profile.gardenSqm !== null && profile.gardenSqm > 0 ? ['garden_outside_room_cards'] : []),
    ...(profile.priorities.includes('care_alerting') ? ['care_is_not_a_diagnosis'] : []),
    ...(profile.existingSystem === 'ir_alarm' ? ['existing_ir_alarm'] : []),
    ...(profile.priorities.includes('energy') ? ['energy_sits_in_best'] : []),
    ...(profile.specifiedPlateBrand === 'basalte' ? ['plate_brand_is_basalte'] : []),
    ...(profile.carbonGoal ? ['zero_carbon_not_a_result'] : []),
    ...(!profile.budgetStated ? ['budget_not_stated'] : []),
    ...(!profile.lockInStated ? ['lock_in_not_stated'] : [])
  ]);

  const points = unique([
    ...(wiring === 'open_with_shell' ? ['bus_during_shell'] : []),
    ...(wiring === 'closed_finished' ? ['prefer_rf_or_short_routes', 'do_not_strip_all_walls'] : []),
    ...(wiring === 'unspecified' ? ['no_bus_promise_without_phase'] : []),
    ...(profile.gardenSqm !== null && profile.gardenSqm > 0 ? ['garden_as_own_package'] : []),
    ...(profile.dogs !== null && profile.dogs > 0 ? ['pets_not_devices'] : []),
    ...(profile.priorities.includes('hvac') ? ['climate_by_qualified_trade'] : []),
    ...(profile.existingSystem === 'ir_alarm' ? ['write_old_alarm_into_request'] : []),
    ...(profile.specifiedPlateBrand === 'basalte' ? ['put_brand_in_request'] : []),
    ...(profile.carbonGoal ? ['carbon_needs_the_building'] : []),
    'ets_handover',
    'no_wiring_steps'
  ]);

  const evidence: EvidenceId[] = ['budget', 'handover'];
  if (profile.specifiedPlateBrand === 'basalte') {
    evidence.push('basalte');
  }

  return {
    fit: 'incomplete',
    wiring,
    tier: profile.priorities.includes('energy') ? 'best' : 'better',
    budget: 'typical_house_context',
    reasons,
    functions: houseFunctions(profile),
    points,
    evidence
  };
}
