import { describe, expect, it } from 'vitest';
import { distanceUnitForCountry, matchInstallersByDistance, type MatchableInstaller } from './distance';

const origin = { latitude: 48.137, longitude: 11.575 };

function installer(partial: Partial<MatchableInstaller> & Pick<MatchableInstaller, 'id' | 'latitude'>): MatchableInstaller {
  return {
    companyName: partial.id,
    city: 'München',
    postalCode: '80331',
    knxOfficialRank: 'Silver',
    verifiedProjectsCount: 0,
    avgResponseHours: null,
    longitude: origin.longitude,
    publicStreet: 'Beispielstraße 1',
    ...partial
  };
}

describe('distance matching', () => {
  it('uses miles only for the UK', () => {
    expect(distanceUnitForCountry('gb')).toBe('mi');
    expect(distanceUnitForCountry('DE')).toBe('km');
  });

  it('widens the radius until a contractor is inside, and stops after 500', () => {
    const near = installer({ id: 'near', latitude: origin.latitude + 8 / 111 });
    const far = installer({ id: 'far', latitude: origin.latitude + 600 / 111 });
    const result = matchInstallersByDistance(origin, [far, near], 'km');
    expect(result.radius).toBe(10);
    expect(result.matches.map((item) => item.id)).toEqual(['near']);
  });

  it('does not match anyone beyond 500 kilometres', () => {
    const far = installer({ id: 'far', latitude: origin.latitude + 620 / 111 });
    const result = matchInstallersByDistance(origin, [far], 'km');
    expect(result.radius).toBeNull();
    expect(result.matches).toEqual([]);
  });

  it('orders by distance, then official rank, verified projects, and response time', () => {
    const platinum = installer({
      id: 'platinum',
      latitude: origin.latitude + 3 / 111,
      knxOfficialRank: 'Platinum',
      verifiedProjectsCount: 1,
      avgResponseHours: 40
    });
    const goldFast = installer({
      id: 'gold-fast',
      latitude: origin.latitude + 3 / 111,
      knxOfficialRank: 'Gold',
      verifiedProjectsCount: 4,
      avgResponseHours: 5
    });
    const goldSlow = installer({
      id: 'gold-slow',
      latitude: origin.latitude + 3 / 111,
      knxOfficialRank: 'Gold',
      verifiedProjectsCount: 9,
      avgResponseHours: 30
    });
    const closerSilver = installer({
      id: 'closer',
      latitude: origin.latitude + 1 / 111,
      knxOfficialRank: 'Silver'
    });
    const result = matchInstallersByDistance(origin, [goldSlow, closerSilver, platinum, goldFast], 'km');
    expect(result.matches.map((item) => item.id)).toEqual(['closer', 'platinum', 'gold-slow', 'gold-fast']);
  });
});
