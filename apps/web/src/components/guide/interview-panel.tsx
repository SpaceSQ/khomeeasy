'use client';

import { useState } from 'react';
import {
  applyChoice,
  applyPriorities,
  assessHouse,
  clearSlot,
  evidenceCatalog,
  openingSteps,
  parseDescription,
  type GuideStep,
  type HouseBrief,
  type Priority
} from '@khomeeasy/scoring-engine';
import { useTranslations } from 'next-intl';
import { EvidenceBadge } from '@/components/compliance/evidence-badge';
import { Link } from '@/i18n/navigation';

const priorityIds = [
  'lighting',
  'shading',
  'hvac',
  'outdoor_lighting',
  'security',
  'care_alerting',
  'energy',
  'wall_plates'
] as const satisfies readonly Priority[];

const draftKey = 'khomeeasy.web-designs';

function stepSlot(step: GuideStep): string | null {
  if (step.kind === 'confirm' || step.kind === 'choose') {
    return step.slot;
  }
  if (step.kind === 'confirmArea') {
    return 'area';
  }
  if (step.kind === 'confirmGarden') {
    return 'garden';
  }
  if (step.kind === 'priorities') {
    return 'priorities';
  }
  return null;
}

export function InterviewPanel() {
  const guide = useTranslations('Guide');
  const examples = useTranslations('Examples');
  const help = useTranslations('Help');
  const [description, setDescription] = useState('');
  const [started, setStarted] = useState(false);
  const [brief, setBrief] = useState<HouseBrief | null>(null);
  const [steps, setSteps] = useState<GuideStep[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Priority[]>([]);
  const [saved, setSaved] = useState(false);

  function begin() {
    const next = parseDescription(description);
    setBrief(next);
    setSteps(openingSteps(next));
    setIndex(0);
    setPicked(next.priorities);
    setStarted(true);
    setSaved(false);
  }

  function goAfter(nextBrief: HouseBrief, slot: string) {
    const queue = openingSteps(nextBrief);
    const at = queue.findIndex((step) => stepSlot(step) === slot);
    setBrief(nextBrief);
    setSteps(queue);
    setIndex(at >= 0 ? Math.min(at + 1, queue.length - 1) : 0);
  }

  const step = steps[index];
  const assessment = brief && step?.kind === 'result' ? assessHouse(brief) : null;

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <h2 className="font-serif text-3xl font-semibold">{guide('title')}</h2>
      <p className="leading-7">{guide('prompt')}</p>
      {!started ? (
        <>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={guide('placeholder')}
            aria-label={guide('prompt')}
            className="min-h-32 rounded-lg border border-ink bg-white p-3 text-base"
          />
          <button
            type="button"
            disabled={description.trim().length === 0}
            onClick={begin}
            className="inline-flex min-h-11 items-center self-start rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper disabled:opacity-40"
          >
            {guide('read')}
          </button>
        </>
      ) : null}
      {started && step && step.kind !== 'result' ? (
        <p className="text-sm font-semibold">
          {index + 1} / {steps.length}
        </p>
      ) : null}
      {started && step?.kind === 'confirm' ? (
        <section className="flex flex-col gap-3 rounded-lg border border-line bg-white p-5">
          <h3 className="text-lg font-semibold">{guide(`slots.${step.slot}`)}</h3>
          <p>{guide(`options.${step.optionId}`)}</p>
          <p>{guide('confirmAsk')}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-paper" onClick={() => brief && goAfter(brief, step.slot)}>
              {guide('confirm')}
            </button>
            <button
              type="button"
              className="min-h-11 rounded-full border border-ink px-4 text-sm font-semibold"
              onClick={() => {
                if (!brief) {
                  return;
                }
                const cleared = clearSlot(brief, step.slot);
                const queue = openingSteps(cleared);
                setBrief(cleared);
                setSteps(queue);
                const at = queue.findIndex((item) => item.kind === 'choose' && item.slot === step.slot);
                setIndex(at >= 0 ? at : 0);
              }}
            >
              {guide('reject')}
            </button>
          </div>
        </section>
      ) : null}
      {started && (step?.kind === 'confirmArea' || step?.kind === 'confirmGarden') ? (
        <section className="flex flex-col gap-3 rounded-lg border border-line bg-white p-5">
          <h3 className="text-lg font-semibold">
            {(step.kind === 'confirmArea' ? guide('areaKnown') : guide('gardenKnown')).replace('{area}', String(step.area))}
          </h3>
          <p>{guide('confirmAsk')}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-paper"
              onClick={() => brief && goAfter(brief, step.kind === 'confirmArea' ? 'area' : 'garden')}
            >
              {guide('confirm')}
            </button>
            <button
              type="button"
              className="min-h-11 rounded-full border border-ink px-4 text-sm font-semibold"
              onClick={() => {
                if (!brief) {
                  return;
                }
                if (step.kind === 'confirmGarden') {
                  goAfter(clearSlot(brief, 'garden'), 'area');
                  return;
                }
                const cleared = clearSlot(brief, 'area');
                const queue = openingSteps(cleared);
                setBrief(cleared);
                setSteps(queue);
                const at = queue.findIndex((item) => item.kind === 'choose' && item.slot === 'area');
                setIndex(at >= 0 ? at : 0);
              }}
            >
              {guide('reject')}
            </button>
          </div>
        </section>
      ) : null}
      {started && step?.kind === 'choose' ? (
        <section className="flex flex-col gap-3 rounded-lg border border-line bg-white p-5">
          <h3 className="text-lg font-semibold">{guide(`slots.${step.slot}`)}</h3>
          {step.optionIds.map((optionId) => (
            <button
              key={optionId}
              type="button"
              className="min-h-11 self-start rounded-full border border-ink px-4 text-sm font-semibold"
              onClick={() => brief && goAfter(applyChoice(brief, step.slot, optionId), step.slot)}
            >
              {guide(`options.${optionId}`)}
            </button>
          ))}
        </section>
      ) : null}
      {started && step?.kind === 'priorities' ? (
        <section className="flex flex-col gap-3 rounded-lg border border-line bg-white p-5">
          <h3 className="text-lg font-semibold">{guide('prioritiesTitle')}</h3>
          {priorityIds.map((optionId) => {
            const on = picked.includes(optionId);
            return (
              <button
                key={optionId}
                type="button"
                aria-pressed={on}
                className={on ? 'min-h-11 self-start rounded-full bg-ink px-4 text-sm font-semibold text-paper' : 'min-h-11 self-start rounded-full border border-ink px-4 text-sm font-semibold'}
                onClick={() =>
                  setPicked((current) => (current.includes(optionId) ? current.filter((item) => item !== optionId) : [...current, optionId]))
                }
              >
                {guide(`options.${optionId}`)}
              </button>
            );
          })}
          <button
            type="button"
            className="min-h-11 self-start rounded-full bg-ink px-4 text-sm font-semibold text-paper"
            onClick={() => brief && goAfter(applyPriorities(brief, picked), 'priorities')}
          >
            {guide('continue')}
          </button>
        </section>
      ) : null}
      {assessment && brief ? (
        <section className="flex flex-col gap-3 rounded-lg border border-line bg-white p-5">
          <h3 className="text-lg font-semibold">{guide('resultTitle')}</h3>
          <p>{examples(`fit.${assessment.fit}`)}</p>
          <p>
            {examples('wiringLabel')}: {examples(`wiring.${assessment.wiring}`)}
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {assessment.reasons.map((code) => (
              <li key={code}>{examples(`reasons.${code}`)}</li>
            ))}
          </ul>
          <ul className="list-disc space-y-1 pl-5">
            {assessment.functions.map((code) => (
              <li key={code}>{examples(`functions.${code}`)}</li>
            ))}
          </ul>
          <ol className="list-decimal space-y-1 pl-5">
            {assessment.points.map((code) => (
              <li key={code}>{examples(`points.${code}`)}</li>
            ))}
          </ol>
          {assessment.budget === 'typical_house_context' ? <p>{examples('budgetContext')}</p> : <p className="font-semibold">{examples('noHousePrice')}</p>}
          {assessment.evidence.map((id) => (
            <EvidenceBadge key={id} level={evidenceCatalog[id].level} sourceUrl={evidenceCatalog[id].sourceUrl} verifiedAt={evidenceCatalog[id].verifiedAt} />
          ))}
          <p className="text-sm leading-6 text-muted">{examples('limit')}</p>
          <button
            type="button"
            className="inline-flex min-h-11 items-center self-start rounded-full bg-ink px-4 text-sm font-semibold text-paper"
            onClick={() => {
              const title = brief.description.trim().slice(0, 80) || guide('title');
              const existing = window.localStorage.getItem(draftKey);
              let parsed: unknown = [];
              try {
                parsed = existing ? JSON.parse(existing) : [];
              } catch {
                parsed = [];
              }
              const drafts = Array.isArray(parsed) ? parsed : [];
              window.localStorage.setItem(draftKey, JSON.stringify([{ title, brief, updatedAt: new Date().toISOString() }, ...drafts].slice(0, 20)));
              setSaved(true);
            }}
          >
            {guide('save')}
          </button>
          {saved ? <p>{guide('saved')}</p> : null}
        </section>
      ) : null}
      <Link href="/help#fit" className="inline-flex min-h-11 items-center font-semibold underline decoration-ink/30 underline-offset-4">
        {help('moduleLink')}
      </Link>
    </div>
  );
}
