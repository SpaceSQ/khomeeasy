import type { Database } from './database';

export type KnxPartnerRank = Database['public']['Enums']['knx_partner_rank'];

export type InstallerContactVisibility = {
  knx_official_rank: KnxPartnerRank;
  claimed_by_user_id: string | null;
};

/**
 * Unclaimed Silver partners must not have email, phone, or a street address shown.
 * Gold and Platinum stay visible. A claimed Silver partner may publish contact details.
 */
export function canExposeInstallerContact(installer: InstallerContactVisibility): boolean {
  const unclaimedSilver =
    installer.knx_official_rank === 'Silver' && installer.claimed_by_user_id == null;
  return !unclaimedSilver;
}
