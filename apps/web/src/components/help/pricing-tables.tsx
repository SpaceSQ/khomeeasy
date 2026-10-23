'use client';

import { useTranslations } from 'next-intl';
import { EvidenceBadge } from '@/components/compliance/evidence-badge';

const ownerOrder = ['fit', 'compare', 'rooms', 'band', 'examples', 'save', 'pdf', 'quotes', 'handover'] as const;
const ownerPaidOnly = new Set<string>(['pdf', 'quotes', 'handover']);

const installerOrder = ['claim', 'quota', 'quote', 'gallery', 'heat', 'rank'] as const;

function cell(t: (path: string) => string, row: string, side: 'free' | 'paid', audience: 'owner' | 'installer'): string {
  if (audience === 'owner') {
    if (side === 'free') {
      return ownerPaidOnly.has(row) ? t('cellNo') : t('cellYes');
    }
    return t('cellYes');
  }
  if (row === 'quota') {
    return side === 'free' ? t('cellTwo') : t('cellUnlimited');
  }
  if (row === 'quote') {
    return side === 'free' ? t('cellWithinTwo') : t('cellYes');
  }
  if (row === 'gallery' || row === 'heat') {
    return side === 'free' ? t('cellNo') : t('cellYes');
  }
  if (row === 'rank') {
    return t('cellForbidden');
  }
  return t('cellYes');
}

function CompareTable({
  title,
  paidHeader,
  rows,
  audience
}: {
  title: string;
  paidHeader: string;
  rows: readonly string[];
  audience: 'owner' | 'installer';
}) {
  const t = useTranslations('Help');

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <caption className="mb-3 text-left font-serif text-2xl font-semibold text-ink">{title}</caption>
        <thead>
          <tr className="border-b-2 border-ink">
            <th scope="col" className="w-[46%] px-3 py-3 font-semibold">
              {t('tableCapability')}
            </th>
            <th scope="col" className="w-[22%] px-3 py-3 font-semibold">
              {t('tableFree')}
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              {paidHeader}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row} className="border-b border-line align-top">
              <th scope="row" className="px-3 py-3 font-semibold leading-6">
                {t(`${audience}Rows.${row}`)}
              </th>
              <td className="px-3 py-3 leading-6">{cell(t, row, 'free', audience)}</td>
              <td className="px-3 py-3 leading-6">{cell(t, row, 'paid', audience)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PricingTables() {
  const t = useTranslations('Help');

  return (
    <div className="flex flex-col gap-10">
      <CompareTable title={t('ownerTitle')} paidHeader={t('ownerPaid')} rows={ownerOrder} audience="owner" />
      <CompareTable title={t('installerTitle')} paidHeader={t('installerPaid')} rows={installerOrder} audience="installer" />
      <div className="max-w-3xl space-y-3 leading-7">
        <h3 className="font-serif text-2xl font-semibold">{t('paymentTitle')}</h3>
        <p>{t('paymentBody')}</p>
        <p>{t('founding')}</p>
        <p>{t('sponsored')}</p>
        <EvidenceBadge level="E4" sourceUrl={t('priceSource')} verifiedAt={t('priceVerified')} />
        <p>{t('priceNote')}</p>
      </div>
    </div>
  );
}
