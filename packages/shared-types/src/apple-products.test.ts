import { describe, expect, it } from 'vitest';
import {
  PARTNER_WORKBENCH_MONTHLY_ID,
  PROJECT_PRO_PASS_ID,
  allowsProjectUnlock,
  chooseProjectForPass,
  isStoreKitJws,
  productKindForId,
  subscriptionIsActive
} from './apple-products';

describe('product ids', () => {
  it('keeps the consumable and the monthly subscription distinct', () => {
    expect(productKindForId(PROJECT_PRO_PASS_ID)).toBe('project_pass');
    expect(productKindForId(PARTNER_WORKBENCH_MONTHLY_ID)).toBe('workbench_subscription');
    expect(productKindForId('com.gzzhijia.khomeeasy.other')).toBeNull();
  });
});

describe('project pass binding', () => {
  it('creates a project when the owner has none', () => {
    expect(
      chooseProjectForPass({ projects: [], requestedProjectId: null, designTitle: 'Villa am See' })
    ).toEqual({ kind: 'create', title: 'Villa am See' });
  });

  it('selects an existing project that is still locked', () => {
    expect(
      chooseProjectForPass({
        projects: [{ id: 'a', title: 'Villa', unlocked: false }],
        requestedProjectId: null,
        designTitle: 'Other'
      })
    ).toEqual({ kind: 'existing', id: 'a' });
  });

  it('does not reuse an unlocked project for a second pass', () => {
    expect(
      chooseProjectForPass({
        projects: [{ id: 'a', title: 'Villa', unlocked: true }],
        requestedProjectId: 'a',
        designTitle: 'Villa two'
      })
    ).toEqual({ kind: 'create', title: 'Villa two' });
  });

  it('prefers the requested locked project', () => {
    expect(
      chooseProjectForPass({
        projects: [
          { id: 'a', title: 'One', unlocked: false },
          { id: 'b', title: 'Two', unlocked: false }
        ],
        requestedProjectId: 'b',
        designTitle: 'Two'
      })
    ).toEqual({ kind: 'existing', id: 'b' });
  });
});

describe('subscription and restore', () => {
  it('treats expiry and revocation as inactive', () => {
    expect(
      subscriptionIsActive({
        expiresAt: '2020-01-01T00:00:00.000Z',
        revokedAt: null,
        now: Date.parse('2026-01-01T00:00:00.000Z')
      })
    ).toBe(false);
    expect(
      subscriptionIsActive({
        expiresAt: '2027-01-01T00:00:00.000Z',
        revokedAt: '2026-01-01T00:00:00.000Z',
        now: Date.parse('2026-06-01T00:00:00.000Z')
      })
    ).toBe(false);
    expect(
      subscriptionIsActive({
        expiresAt: '2027-01-01T00:00:00.000Z',
        revokedAt: null,
        now: Date.parse('2026-06-01T00:00:00.000Z')
      })
    ).toBe(true);
  });

  it('does not unlock a project from a restored consumable', () => {
    expect(allowsProjectUnlock('restore', 'project_pass')).toBe(false);
    expect(allowsProjectUnlock('restore', 'workbench_subscription')).toBe(false);
    expect(allowsProjectUnlock('purchase', 'project_pass')).toBe(true);
    expect(allowsProjectUnlock('purchase', 'workbench_subscription')).toBe(false);
  });
});

describe('signed transaction shape', () => {
  it('rejects anything that is not a compact JWS', () => {
    expect(isStoreKitJws('not-a-receipt')).toBe(false);
    expect(isStoreKitJws(`${'a'.repeat(20)}.${'b'.repeat(20)}`)).toBe(false);
    expect(isStoreKitJws(`${'a'.repeat(20)}.${'b'.repeat(20)}.${'c'.repeat(20)}`)).toBe(true);
  });
});
