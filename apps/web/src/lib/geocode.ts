export type GeocodedPoint = {
  latitude: number;
  longitude: number;
};

export async function geocodeAddress(input: {
  street: string;
  houseNumber?: string;
  city: string;
  postalCode: string;
  countryCode: string;
}): Promise<GeocodedPoint | null> {
  const country = input.countryCode.trim().toLowerCase();
  const queries = [
    [input.street, input.houseNumber, input.postalCode, input.city, country].filter(Boolean).join(', '),
    [input.street, input.postalCode, input.city, country].filter(Boolean).join(', '),
    [input.postalCode, input.city, country].filter(Boolean).join(', ')
  ];

  for (const query of queries) {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    url.searchParams.set('q', query);
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'KHomeEasy/1.0 (distance matching; contact via the product website)'
      }
    });
    if (!response.ok) {
      continue;
    }
    const rows = (await response.json()) as { lat?: string; lon?: string }[];
    const latitude = Number(rows[0]?.lat);
    const longitude = Number(rows[0]?.lon);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }

  return null;
}
