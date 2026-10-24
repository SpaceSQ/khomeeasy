'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { PurchaseAccountView, PurchaseReceiptView } from '@khomeeasy/shared-types';

export function PurchaseReceipts({ accessToken }: { accessToken: string }) {
  const t = useTranslations('Purchase');
  const locale = useLocale();
  const [account, setAccount] = useState<PurchaseAccountView | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/apple/purchases', { headers: { authorization: `Bearer ${accessToken}` } })
      .then(async (response) => {
        if (!response.ok || cancelled) {
          return;
        }
        const body = (await response.json()) as PurchaseAccountView;
        if (!cancelled) {
          setAccount(body);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return (
    <div className="flex flex-col gap-3">
      <p className="leading-7">{t('websiteNote')}</p>
      {account && account.receipts.length > 0 ? (
        <ul className="space-y-3">
          {account.receipts.map((receipt) => (
            <li key={receipt.transactionId} className="rounded-lg border border-line bg-white p-4">
              <ReceiptLine label={t('receiptProduct')} value={receipt.productKind === 'project_pass' ? t('ownerProduct') : t('contractorProduct')} />
              <ReceiptLine label={t('receiptPrice')} value={formatPrice(receipt, locale)} />
              <ReceiptLine label={t('receiptDate')} value={formatWhen(receipt.purchasedAt, locale)} />
              <ReceiptLine label={t('receiptTransaction')} value={receipt.transactionId} />
              {receipt.projectTitle ? <p className="leading-7">{t('unlockedFor', { title: receipt.projectTitle })}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ReceiptLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="leading-7">
      <span className="font-semibold">{label}</span>
      {value ? `: ${value}` : null}
    </p>
  );
}

function formatWhen(value: string, locale: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function formatPrice(receipt: PurchaseReceiptView, locale: string): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'de-DE', {
    style: 'currency',
    currency: receipt.currency || 'EUR'
  }).format(receipt.priceMilliunits / 1000);
}
