export type AccountRole = 'homeowner' | 'installer';

export type RegisterInput = {
  email: string;
  password: string;
  role: AccountRole;
  fullName: string;
  companyName: string;
  city: string;
  postalCode: string;
  countryCode: 'DE' | 'AT' | 'CH' | 'GB';
  streetAddress: string;
  houseNumber: string;
  locale: 'de-DE' | 'en-GB';
  areaSqm: number | null;
  floors: number | null;
  roomCount: number | null;
};

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function positive(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(text(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function country(value: unknown): RegisterInput['countryCode'] | null {
  const code = text(value).toUpperCase();
  return code === 'DE' || code === 'AT' || code === 'CH' || code === 'GB' ? code : null;
}

/** Reads the registration body. The password is returned only for Supabase Auth and is not stored. */
export function parseRegisterBody(body: unknown): RegisterInput | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const record = body as Record<string, unknown>;
  const email = text(record.email).toLowerCase();
  const password = typeof record.password === 'string' ? record.password : '';
  const role = record.role === 'installer' || record.role === 'homeowner' ? record.role : null;
  const countryCode = country(record.countryCode) ?? 'DE';
  const locale = record.locale === 'en-GB' || record.locale === 'de-DE' ? record.locale : 'de-DE';
  const input: RegisterInput = {
    email,
    password,
    role: role ?? 'homeowner',
    fullName: text(record.fullName),
    companyName: text(record.companyName),
    city: text(record.city),
    postalCode: text(record.postalCode),
    countryCode,
    streetAddress: text(record.streetAddress),
    houseNumber: text(record.houseNumber),
    locale,
    areaSqm: positive(record.areaSqm),
    floors: positive(record.floors),
    roomCount: positive(record.roomCount)
  };
  if (!role || !email.includes('@') || email.length > 320 || password.length < 8 || password.length > 128) {
    return null;
  }
  if (!input.streetAddress || !input.city || !input.postalCode) {
    return null;
  }
  if (role === 'installer' && (!input.companyName || !input.fullName || !input.houseNumber)) {
    return null;
  }
  return input;
}
