import { describe, expect, it } from 'vitest';
import { assessExample, evidenceCatalog } from './assess-example';
import { exampleProfiles } from './examples';

const byId = Object.fromEntries(exampleProfiles.map((profile) => [profile.id, profile]));

describe('five example households', () => {
  it('does not price the new 600 m² villa from the typical house band', () => {
    const result = assessExample(byId['villa-family']!);
    expect(result.fit).toBe('incomplete');
    expect(result.wiring).toBe('open_with_shell');
    expect(result.tier).toBe('better');
    expect(result.budget).toBe('typical_house_context');
    expect(result.reasons).toContain('garden_outside_room_cards');
    expect(result.reasons).toContain('area_above_typical_band');
    expect(result.reasons).toContain('budget_not_stated');
    expect(result.points).toContain('bus_during_shell');
    expect(result.points).toContain('pets_not_devices');
    expect(result).not.toHaveProperty('totalEur');
  });

  it('treats the occupied 30-year house as a closed wiring window, not a medical product', () => {
    const result = assessExample(byId['renovation-care']!);
    expect(result.fit).toBe('incomplete');
    expect(result.wiring).toBe('closed_finished');
    expect(result.reasons).toContain('walls_already_closed');
    expect(result.reasons).toContain('care_is_not_a_diagnosis');
    expect(result.reasons).toContain('existing_ir_alarm');
    expect(result.points).toContain('do_not_strip_all_walls');
    expect(result.points).toContain('write_old_alarm_into_request');
    expect(result.functions).toContain('call_point');
  });

  it('keeps the multi-building estate out of the detached-house price', () => {
    const result = assessExample(byId['estate-outdoor']!);
    expect(result.fit).toBe('outside_house_model');
    expect(result.tier).toBe('best');
    expect(result.budget).toBe('none');
    expect(result.wiring).toBe('multi_building');
    expect(result.evidence).not.toContain('budget');
    expect(result.functions).toContain('terrace_av');
    expect(result.functions).toContain('outdoor_lighting');
    expect(result.points).toContain('separate_project_per_building');
  });

  it('refuses a house budget and an unverified Apple claim for the hotel', () => {
    const result = assessExample(byId['hotel-rooms']!);
    expect(result.fit).toBe('outside_house_model');
    expect(result.tier).toBeNull();
    expect(result.budget).toBe('none');
    expect(result.evidence).toEqual(['handover']);
    expect(result.reasons).toContain('apple_voice_not_verified');
    expect(result.points).toContain('do_not_print_house_price');
    expect(result.points).toContain('not_a_three_quote_house');
    expect(result.functions.join(' ')).not.toMatch(/homekit|siri/i);
  });

  it('records Basalte and energy without a zero-carbon figure', () => {
    const result = assessExample(byId['designer-energy']!);
    expect(result.fit).toBe('incomplete');
    expect(result.tier).toBe('best');
    expect(result.wiring).toBe('unspecified');
    expect(result.reasons).toContain('plate_brand_is_basalte');
    expect(result.reasons).toContain('zero_carbon_not_a_result');
    expect(result.reasons).toContain('energy_sits_in_best');
    expect(result.evidence).toContain('basalte');
    expect(evidenceCatalog.basalte.sourceUrl).toBe('https://www.basalte.be/en/product/sentido');
    expect(result.points).toContain('carbon_needs_the_building');
    expect(result.points).toContain('no_bus_promise_without_phase');
  });
});
