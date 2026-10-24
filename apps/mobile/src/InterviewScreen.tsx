import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
import { ModuleHelpLink } from './HelpScreen';
import { PurchasePanel } from './PurchasePanel';
import { saveDesign } from './storage';

type Lookup = (path: string) => string;

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

export function InterviewScreen({
  locale,
  t,
  onOpenHelp
}: {
  locale: 'de' | 'en';
  t: Lookup;
  onOpenHelp: () => void;
}) {
  const [description, setDescription] = useState('');
  const [started, setStarted] = useState(false);
  const [brief, setBrief] = useState<HouseBrief | null>(null);
  const [steps, setSteps] = useState<GuideStep[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Priority[]>([]);
  const [saved, setSaved] = useState(false);

  function begin() {
    const next = parseDescription(description);
    const queue = openingSteps(next);
    setBrief(next);
    setSteps(queue);
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
    <View style={styles.stack}>
      <Text style={styles.title}>{t('Guide.title')}</Text>
      <Text style={styles.body}>{t('Guide.prompt')}</Text>
      {!started ? (
        <View style={styles.stack}>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={t('Guide.placeholder')}
            placeholderTextColor="#8A8178"
            multiline
            style={styles.input}
            accessibilityLabel={t('Guide.prompt')}
          />
          <Pressable
            accessibilityRole="button"
            disabled={description.trim().length === 0}
            style={[styles.primary, description.trim().length === 0 ? styles.disabled : null]}
            onPress={begin}
          >
            <Text style={styles.primaryText}>{t('Guide.read')}</Text>
          </Pressable>
        </View>
      ) : null}

      {started && step && step.kind !== 'result' ? (
        <Text style={styles.meta}>
          {index + 1} / {steps.length}
        </Text>
      ) : null}

      {started && step?.kind === 'confirm' ? (
        <View style={styles.card}>
          <Text style={styles.heading}>{t(`Guide.slots.${step.slot}`)}</Text>
          <Text style={styles.body}>{t(`Guide.options.${step.optionId}`)}</Text>
          <Text style={styles.body}>{t('Guide.confirmAsk')}</Text>
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              style={styles.primary}
              onPress={() => brief && goAfter(brief, step.slot)}
            >
              <Text style={styles.primaryText}>{t('Guide.confirm')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={styles.secondary}
              onPress={() => {
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
              <Text style={styles.secondaryText}>{t('Guide.reject')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {started && (step?.kind === 'confirmArea' || step?.kind === 'confirmGarden') ? (
        <View style={styles.card}>
          <Text style={styles.heading}>
            {(step.kind === 'confirmArea' ? t('Guide.areaKnown') : t('Guide.gardenKnown')).replace('{area}', String(step.area))}
          </Text>
          <Text style={styles.body}>{t('Guide.confirmAsk')}</Text>
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              style={styles.primary}
              onPress={() => brief && goAfter(brief, step.kind === 'confirmArea' ? 'area' : 'garden')}
            >
              <Text style={styles.primaryText}>{t('Guide.confirm')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={styles.secondary}
              onPress={() => {
                if (!brief || step.kind !== 'confirmArea') {
                  if (brief && step?.kind === 'confirmGarden') {
                    const cleared = clearSlot(brief, 'garden');
                    goAfter(cleared, 'area');
                  }
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
              <Text style={styles.secondaryText}>{t('Guide.reject')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {started && step?.kind === 'choose' ? (
        <View style={styles.card}>
          <Text style={styles.heading}>{t(`Guide.slots.${step.slot}`)}</Text>
          {step.optionIds.map((optionId) => (
            <Pressable
              key={optionId}
              accessibilityRole="button"
              style={styles.secondary}
              onPress={() => brief && goAfter(applyChoice(brief, step.slot, optionId), step.slot)}
            >
              <Text style={styles.secondaryText}>{t(`Guide.options.${optionId}`)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {started && step?.kind === 'priorities' ? (
        <View style={styles.card}>
          <Text style={styles.heading}>{t('Guide.prioritiesTitle')}</Text>
          {priorityIds.map((optionId) => {
            const on = picked.includes(optionId);
            return (
              <Pressable
                key={optionId}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={on ? styles.primary : styles.secondary}
                onPress={() =>
                  setPicked((current) =>
                    current.includes(optionId) ? current.filter((item) => item !== optionId) : [...current, optionId]
                  )
                }
              >
                <Text style={on ? styles.primaryText : styles.secondaryText}>{t(`Guide.options.${optionId}`)}</Text>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="button"
            style={styles.primary}
            onPress={() => {
              if (!brief) {
                return;
              }
              goAfter(applyPriorities(brief, picked), 'priorities');
            }}
          >
            <Text style={styles.primaryText}>{t('Guide.continue')}</Text>
          </Pressable>
        </View>
      ) : null}

      {assessment && brief ? (
        <View style={styles.card}>
          <Text style={styles.heading}>{t('Guide.resultTitle')}</Text>
          <Text style={styles.body}>{t(`Examples.fit.${assessment.fit}`)}</Text>
          <Text style={styles.body}>
            {t('Examples.wiringLabel')}: {t(`Examples.wiring.${assessment.wiring}`)}
          </Text>
          {assessment.reasons.map((code) => (
            <Text key={code} style={styles.body}>
              · {t(`Examples.reasons.${code}`)}
            </Text>
          ))}
          {assessment.functions.map((code) => (
            <Text key={code} style={styles.body}>
              · {t(`Examples.functions.${code}`)}
            </Text>
          ))}
          {assessment.points.map((code) => (
            <Text key={code} style={styles.body}>
              {t(`Examples.points.${code}`)}
            </Text>
          ))}
          {assessment.budget === 'typical_house_context' ? (
            <Text style={styles.fine}>{t('Examples.budgetContext')}</Text>
          ) : (
            <Text style={styles.body}>{t('Examples.noHousePrice')}</Text>
          )}
          {assessment.evidence.map((id) => (
            <Text key={id} style={styles.fine}>
              {evidenceCatalog[id].level} · {evidenceCatalog[id].sourceUrl}
            </Text>
          ))}
          <Text style={styles.fine}>{t('Examples.limit')}</Text>
          <Pressable
            accessibilityRole="button"
            style={styles.primary}
            onPress={() => {
              const title = brief.description.trim().slice(0, 80) || t('Guide.title');
              saveDesign({ title, brief })
                .then(() => setSaved(true))
                .catch(() => undefined);
            }}
          >
            <Text style={styles.primaryText}>{t('Guide.save')}</Text>
          </Pressable>
          {saved ? <Text style={styles.body}>{t('Guide.saved')}</Text> : null}
          <PurchasePanel
            role="homeowner"
            locale={locale}
            t={t}
            designTitle={brief.description.trim().slice(0, 80) || t('Purchase.defaultProjectTitle')}
            buildType={brief.build}
            constructionPhase={brief.phase}
            areaSqm={brief.areaSqm}
            onBeforePurchase={() => {
              const title = brief.description.trim().slice(0, 80) || t('Purchase.defaultProjectTitle');
              return saveDesign({ title, brief }).then(() => setSaved(true));
            }}
          />
        </View>
      ) : null}
      <ModuleHelpLink label={t('Help.moduleLink')} onPress={onOpenHelp} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  card: { gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D2C8', borderRadius: 12, padding: 16 },
  title: { fontSize: 28, fontWeight: '600', color: '#1C1917' },
  heading: { fontSize: 18, fontWeight: '700', color: '#1C1917' },
  body: { fontSize: 16, lineHeight: 24, color: '#3F3A36' },
  fine: { fontSize: 13, lineHeight: 20, color: '#3F3A36' },
  meta: { fontSize: 14, fontWeight: '700', color: '#1C1917' },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#1C1917',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1C1917',
    textAlignVertical: 'top',
    backgroundColor: '#fff'
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primary: { alignSelf: 'flex-start', backgroundColor: '#1C1917', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12 },
  primaryText: { color: '#F6F3EE', fontWeight: '700' },
  secondary: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#1C1917',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  secondaryText: { color: '#1C1917', fontWeight: '600' },
  disabled: { opacity: 0.4 }
});
