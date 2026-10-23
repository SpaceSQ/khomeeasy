import { describe, expect, it } from 'vitest';
import { canExposeInstallerContact } from './installer-visibility';

const claimedId = '6d9f1c2a-4b7e-4f1a-9c3d-2e8b7a6c5d41';

describe('canExposeInstallerContact', () => {
  it('hides contact details for an unclaimed Silver partner', () => {
    expect(
      canExposeInstallerContact({
        knx_official_rank: 'Silver',
        claimed_by_user_id: null
      })
    ).toBe(false);
  });

  it('allows contact details once a Silver partner has claimed the profile', () => {
    expect(
      canExposeInstallerContact({
        knx_official_rank: 'Silver',
        claimed_by_user_id: claimedId
      })
    ).toBe(true);
  });

  it('allows contact details for an unclaimed Gold partner', () => {
    expect(
      canExposeInstallerContact({
        knx_official_rank: 'Gold',
        claimed_by_user_id: null
      })
    ).toBe(true);
  });

  it('allows contact details for an unclaimed Platinum partner', () => {
    expect(
      canExposeInstallerContact({
        knx_official_rank: 'Platinum',
        claimed_by_user_id: null
      })
    ).toBe(true);
  });
});
