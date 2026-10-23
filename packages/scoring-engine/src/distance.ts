export const DISTANCE_STEPS = [5, 10, 20, 50, 100, 200, 500] as const;

export type DistanceUnit = 'km' | 'mi';

export type PartnerRank = 'Silver' | 'Gold' | 'Platinum';

export type MatchableInstaller = {
  id: string;
  companyName: string;
  city: string;
  postalCode: string;
  knxOfficialRank: PartnerRank;
  verifiedProjectsCount: number;
  avgResponseHours: number | null;
  latitude: number;
  longitude: number;
  publicStreet: string | null;
};

export type DistanceMatch = MatchableInstaller & {
  distance: number;
};

const EARTH_KM = 6371;
const KM_PER_MILE = 1.609344;
const RANK_ORDER: Record<PartnerRank, number> = { Platinum: 0, Gold: 1, Silver: 2 };

export function distanceUnitForCountry(countryCode: string): DistanceUnit {
  return countryCode.trim().toUpperCase() === 'GB' ? 'mi' : 'km';
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function distanceBetween(
  origin: { latitude: number; longitude: number },
  target: { latitude: number; longitude: number },
  unit: DistanceUnit
): number {
  const latitudeDelta = toRadians(target.latitude - origin.latitude);
  const longitudeDelta = toRadians(target.longitude - origin.longitude);
  const originLat = toRadians(origin.latitude);
  const targetLat = toRadians(target.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLat) * Math.cos(targetLat) * Math.sin(longitudeDelta / 2) ** 2;
  const kilometers = 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(haversine)));
  return unit === 'mi' ? kilometers / KM_PER_MILE : kilometers;
}

function compareMatches(left: DistanceMatch, right: DistanceMatch): number {
  if (left.distance !== right.distance) {
    return left.distance - right.distance;
  }
  const rank = RANK_ORDER[left.knxOfficialRank] - RANK_ORDER[right.knxOfficialRank];
  if (rank !== 0) {
    return rank;
  }
  if (left.verifiedProjectsCount !== right.verifiedProjectsCount) {
    return right.verifiedProjectsCount - left.verifiedProjectsCount;
  }
  const leftHours = left.avgResponseHours ?? Number.POSITIVE_INFINITY;
  const rightHours = right.avgResponseHours ?? Number.POSITIVE_INFINITY;
  return leftHours - rightHours;
}

export function matchInstallersByDistance(
  origin: { latitude: number; longitude: number },
  installers: readonly MatchableInstaller[],
  unit: DistanceUnit
): { radius: (typeof DISTANCE_STEPS)[number] | null; unit: DistanceUnit; matches: DistanceMatch[] } {
  const located = installers
    .filter((installer) => Number.isFinite(installer.latitude) && Number.isFinite(installer.longitude))
    .map((installer) => ({
      ...installer,
      distance: distanceBetween(origin, installer, unit)
    }));

  for (const radius of DISTANCE_STEPS) {
    const matches = located.filter((installer) => installer.distance <= radius).sort(compareMatches);
    if (matches.length > 0) {
      return { radius, unit, matches };
    }
  }

  return { radius: null, unit, matches: [] };
}
