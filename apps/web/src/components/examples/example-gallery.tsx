'use client';

import { useEffect, useState } from 'react';
import {
  assessExample,
  evidenceCatalog,
  exampleIds,
  exampleProfiles,
  type ExampleId,
  type ExampleProfile,
  type FitLabel
} from '@khomeeasy/scoring-engine';
import { useFormatter, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { EvidenceBadge } from '@/components/compliance/evidence-badge';

const STORAGE_KEY = 'khomeeasy.hidden-example-ids';

function isExampleId(value: unknown): value is ExampleId {
  return typeof value === 'string' && (exampleIds as readonly string[]).includes(value);
}

function readHidden(): ExampleId[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isExampleId);
  } catch {
    return [];
  }
}

function FitMark({ fit }: { fit: FitLabel }) {
  const t = useTranslations('Examples');
  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold">
      {fit === 'incomplete' ? (
        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 shrink-0">
          <rect x="2.5" y="2.5" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.5 1.5" />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 shrink-0">
          <path d="M8 2.2 14.2 13.5H1.8L8 2.2Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )}
      {t(`fit.${fit}`)}
    </span>
  );
}

function ProfileFacts({ profile }: { profile: ExampleProfile }) {
  const t = useTranslations('Examples');
  const format = useFormatter();
  const facts: { label: string; value: string }[] = [];

  if (profile.areaSqm !== null) {
    facts.push({ label: t('factArea'), value: `${format.number(profile.areaSqm)} m²` });
  }
  if (profile.gardenSqm !== null) {
    facts.push({ label: t('factGarden'), value: `${format.number(profile.gardenSqm)} m²` });
  }
  if (profile.guestRooms !== null) {
    facts.push({ label: t('factRooms'), value: format.number(profile.guestRooms) });
  }
  if (profile.buildings !== null && profile.buildings > 1) {
    facts.push({ label: t('factBuildings'), value: t('severalBuildings') });
  }
  if (profile.adults !== null) {
    const parts = [t('adults', { count: profile.adults })];
    if (profile.children) {
      parts.push(t('children', { count: profile.children }));
    }
    if (profile.dogs) {
      parts.push(t('dogs', { count: profile.dogs }));
    }
    facts.push({ label: t('factHousehold'), value: parts.join(', ') });
  }

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {facts.map((fact) => (
        <div key={fact.label}>
          <dt className="text-sm font-semibold">{fact.label}</dt>
          <dd className="text-muted">{fact.value}</dd>
        </div>
      ))}
      <div>
        <dt className="text-sm font-semibold">{t('factBudget')}</dt>
        <dd className="text-muted">{t('budgetMissing')}</dd>
      </div>
    </dl>
  );
}

export function ExampleGallery() {
  const t = useTranslations('Examples');
  const tHelp = useTranslations('Help');
  const [hidden, setHidden] = useState<ExampleId[]>([]);

  useEffect(() => {
    setHidden(readHidden());
  }, []);

  function persist(next: ExampleId[]) {
    setHidden(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  const visible = exampleProfiles.filter((profile) => !hidden.includes(profile.id));

  return (
    <section id="examples" className="border-b border-line bg-white/70" aria-labelledby="examples-heading">
      <div className="mx-auto max-w-page px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brass">{t('eyebrow')}</p>
        <h2 id="examples-heading" className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          {t('title')}
        </h2>
        <p className="mt-4 max-w-3xl leading-7 text-muted">{t('lede')}</p>

        {visible.length === 0 ? (
          <div className="mt-8 rounded-lg border border-line bg-white p-6">
            <p className="leading-7">{t('empty')}</p>
            <button
              type="button"
              className="mt-4 inline-flex min-h-11 items-center rounded-full border border-ink px-5 py-2 text-sm font-semibold"
              onClick={() => persist([])}
            >
              {t('restore')}
            </button>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-4">
            {hidden.length > 0 ? (
              <button
                type="button"
                className="self-start text-sm font-semibold underline decoration-ink/30 underline-offset-4"
                onClick={() => persist([])}
              >
                {t('restore')}
              </button>
            ) : null}
            {visible.map((profile) => {
              const result = assessExample(profile);
              return (
                <article key={profile.id} data-example-id={profile.id} className="rounded-lg border border-line bg-white p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-serif text-2xl font-semibold leading-snug">{t(`cases.${profile.id}.title`)}</h3>
                      <p className="mt-2 leading-7 text-muted">{t(`cases.${profile.id}.story`)}</p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-ink px-4 py-2 text-sm font-semibold"
                      onClick={() => persist([...hidden, profile.id])}
                    >
                      {t('remove')}
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                    <FitMark fit={result.fit} />
                    <span className="text-sm font-semibold">
                      {t('tierLabel')}: {result.tier ? t(`tier.${result.tier}`) : t('tier.none')}
                    </span>
                    <span className="text-sm font-semibold">
                      {t('wiringLabel')}: {t(`wiring.${result.wiring}`)}
                    </span>
                  </div>

                  <details className="mt-4 border-t border-line pt-4">
                    <summary className="cursor-pointer text-sm font-semibold underline decoration-ink/30 underline-offset-4">
                      {t('openScheme')}
                    </summary>
                    <div className="mt-5 grid gap-8">
                      <ProfileFacts profile={profile} />
                      <div>
                        <h4 className="font-semibold">{t('whyTitle')}</h4>
                        <ul className="mt-2 list-disc space-y-2 pl-5 leading-7">
                          {result.reasons.map((code) => (
                            <li key={code}>{t(`reasons.${code}`)}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold">{t('schemeTitle')}</h4>
                        <ul className="mt-2 list-disc space-y-2 pl-5 leading-7">
                          {result.functions.map((code) => (
                            <li key={code}>{t(`functions.${code}`)}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold">{t('pointsTitle')}</h4>
                        <ol className="mt-2 list-decimal space-y-2 pl-5 leading-7">
                          {result.points.map((code) => (
                            <li key={code}>{t(`points.${code}`)}</li>
                          ))}
                        </ol>
                      </div>
                      <div className="space-y-4">
                        {result.budget === 'typical_house_context' ? (
                          <div className="space-y-2">
                            <EvidenceBadge
                              level={evidenceCatalog.budget.level}
                              sourceUrl={evidenceCatalog.budget.sourceUrl}
                              verifiedAt={evidenceCatalog.budget.verifiedAt}
                            />
                            <p className="leading-7">{t('budgetContext')}</p>
                            {profile.areaSqm !== null && profile.areaSqm > 250 ? (
                              <p className="leading-7">{t('areaAbove')}</p>
                            ) : null}
                          </div>
                        ) : (
                          <p className="leading-7 font-semibold">{t('noHousePrice')}</p>
                        )}
                        {result.evidence.includes('basalte') ? (
                          <div className="space-y-2">
                            <EvidenceBadge
                              level={evidenceCatalog.basalte.level}
                              sourceUrl={evidenceCatalog.basalte.sourceUrl}
                              verifiedAt={evidenceCatalog.basalte.verifiedAt}
                            />
                            <p className="leading-7">{t('basalteNote')}</p>
                          </div>
                        ) : null}
                        {result.evidence.includes('handover') ? (
                          <div className="space-y-2">
                            <EvidenceBadge
                              level={evidenceCatalog.handover.level}
                              sourceUrl={evidenceCatalog.handover.sourceUrl}
                              verifiedAt={evidenceCatalog.handover.verifiedAt}
                            />
                            <p className="leading-7">{t('handoverNote')}</p>
                          </div>
                        ) : null}
                      </div>
                      <p className="text-sm leading-6 text-muted">{t('limit')}</p>
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
        )}
        <p className="mt-8">
          <Link href="/help#examples" className="inline-flex min-h-11 items-center font-semibold underline decoration-ink/30 underline-offset-4">
            {tHelp('moduleLink')}
          </Link>
        </p>
      </div>
    </section>
  );
}
