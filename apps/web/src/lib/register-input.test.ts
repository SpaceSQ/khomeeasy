import assert from 'node:assert/strict';
import { parseRegisterBody } from './register-input.ts';

const installer = {
  email: 'Contractor@Example.com',
  password: 'long-enough',
  role: 'installer',
  fullName: 'Ada',
  companyName: 'Ada GmbH',
  city: 'Berlin',
  postalCode: '10115',
  countryCode: 'DE',
  streetAddress: 'Torstrasse',
  houseNumber: '1',
  locale: 'de-DE'
};

const parsed = parseRegisterBody(installer);
assert.equal(parsed?.email, 'contractor@example.com');
assert.equal(parsed?.role, 'installer');
assert.equal(parseRegisterBody({ ...installer, password: 'short' }), null);
assert.equal(parseRegisterBody({ ...installer, houseNumber: '' }), null);
assert.equal(parseRegisterBody({ ...installer, role: 'homeowner', houseNumber: '' })?.role, 'homeowner');
assert.equal(parseRegisterBody({ ...installer, role: 'admin' }), null);
