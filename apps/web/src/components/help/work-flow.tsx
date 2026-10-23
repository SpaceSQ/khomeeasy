import { getTranslations } from 'next-intl/server';

const ownerSteps = [
  ['guide', 'free'],
  ['examples', 'free'],
  ['fit', 'free'],
  ['rooms', 'free'],
  ['save', 'free'],
  ['pass', 'paid'],
  ['files', 'paid'],
  ['site', 'outside']
] as const;

const installerSteps = [
  ['claim', 'free'],
  ['quota', 'free'],
  ['pass', 'paid'],
  ['quotes', 'paid'],
  ['rank', 'rule']
] as const;

function Mark({ kind, label }: { kind: 'free' | 'paid' | 'outside' | 'rule'; label: string }) {
  const shape =
    kind === 'paid' ? 'h-3 w-3 rounded-full border-2 border-ink' : kind === 'outside' ? 'h-0 w-0 border-x-8 border-b-[14px] border-x-transparent border-b-ink' : kind === 'rule' ? 'h-3 w-3 rotate-45 border-2 border-ink' : 'h-3 w-3 border-2 border-ink';

  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
      <span className={shape} aria-hidden="true" />
      {label}
    </span>
  );
}

function Lane({
  title,
  steps,
  labels,
  marks
}: {
  title: string;
  steps: readonly (readonly [string, 'free' | 'paid' | 'outside' | 'rule'])[];
  labels: (id: string) => string;
  marks: Record<'free' | 'paid' | 'outside' | 'rule', string>;
}) {
  return (
    <section aria-label={title}>
      <h3 className="font-serif text-2xl font-semibold">{title}</h3>
      <ol className="mt-4 border-l-2 border-ink/30 pl-4">
        {steps.map(([id, kind], index) => (
          <li key={id} className="relative pb-4">
            <span className="absolute -left-[1.4rem] top-3 h-3 w-3 rounded-full border-2 border-ink bg-paper" aria-hidden="true" />
            <div className="rounded-lg border border-ink bg-white px-4 py-3">
              <p className="text-sm font-semibold text-muted">{String(index + 1).padStart(2, '0')}</p>
              <p className="mt-1 font-semibold leading-6">{labels(id)}</p>
              <p className="mt-2">
                <Mark kind={kind} label={marks[kind]} />
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export async function WorkFlow() {
  const t = await getTranslations('Help');
  const marks = {
    free: t('markFree'),
    paid: t('markPaid'),
    outside: t('markOutside'),
    rule: t('markRule')
  };

  return (
    <div>
      <h2 className="font-serif text-3xl font-semibold tracking-tight">{t('flowTitle')}</h2>
      <p className="mt-3 max-w-3xl leading-7">{t('flowLede')}</p>
      <div className="mt-8 flex justify-center">
        <p className="rounded-lg border-2 border-ink bg-white px-5 py-3 text-center font-serif text-xl font-semibold">{t('center')}</p>
      </div>
      <div className="mx-auto mt-2 hidden h-8 w-px bg-ink/40 sm:block" aria-hidden="true" />
      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <Lane title={t('ownerLane')} steps={ownerSteps} labels={(id) => t(`ownerSteps.${id}`)} marks={marks} />
        <Lane title={t('installerLane')} steps={installerSteps} labels={(id) => t(`installerSteps.${id}`)} marks={marks} />
      </div>
    </div>
  );
}
