import { assessExample, type ExampleAssessment, type FitLabel } from './assess-example';
import {
  type BuildType,
  type ConstructionPhase,
  type ExampleKind,
  type ExampleProfile,
  type Priority
} from './examples';

export type BudgetChoice = 'unstated' | 'under_5k' | 'from_5k_to_15k' | 'from_15k' | 'over_30k';
export type LockChoice = 'unstated' | 'strong' | 'none';
export type AreaBand = 'under_120' | 'between_120_250' | 'over_250' | null;

export type HouseBrief = {
  description: string;
  kind: ExampleKind | null;
  build: BuildType | null;
  phase: ConstructionPhase | null;
  areaSqm: number | null;
  areaBand: AreaBand;
  gardenSqm: number | null;
  adults: number | null;
  children: number | null;
  dogs: number | null;
  guestRooms: number | null;
  buildings: number | null;
  budget: BudgetChoice;
  lockIn: LockChoice;
  diy: boolean | null;
  priorities: Priority[];
  specifiedPlateBrand: 'basalte' | null;
  existingSystem: 'ir_alarm' | null;
  carbonGoal: boolean;
};

export type GuideStep =
  | { kind: 'confirm'; slot: string; optionId: string }
  | { kind: 'confirmArea'; area: number }
  | { kind: 'confirmGarden'; area: number }
  | { kind: 'choose'; slot: string; optionIds: readonly string[] }
  | { kind: 'priorities' }
  | { kind: 'result' };

const kindOptions = ['detached_house', 'estate', 'hotel'] as const;
const buildOptions = ['new_build', 'renovation', 'unsure'] as const;
const phaseOptions = ['design', 'shell', 'finished', 'unsure'] as const;
const areaOptions = ['under_120', 'between_120_250', 'over_250'] as const;
const budgetOptions = ['under_5k', 'from_5k_to_15k', 'from_15k', 'over_30k'] as const;
const lockOptions = ['strong', 'none'] as const;
const diyOptions = ['professional', 'self'] as const;

export function emptyBrief(): HouseBrief {
  return {
    description: '',
    kind: null,
    build: null,
    phase: null,
    areaSqm: null,
    areaBand: null,
    gardenSqm: null,
    adults: null,
    children: null,
    dogs: null,
    guestRooms: null,
    buildings: null,
    budget: 'unstated',
    lockIn: 'unstated',
    diy: null,
    priorities: [],
    specifiedPlateBrand: null,
    existingSystem: null,
    carbonGoal: false
  };
}

function includesAny(text: string, phrases: readonly string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

function firstNumber(chunk: string): number | null {
  const match = chunk.match(/(\d+(?:[.,]\d+)?)/);
  if (!match?.[1]) {
    return null;
  }
  const value = Number(match[1].replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

function zhCount(token: string): number | null {
  const map: Record<string, number> = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5 };
  if (map[token]) {
    return map[token];
  }
  const value = Number(token);
  return Number.isFinite(value) ? value : null;
}

export function parseDescription(text: string): HouseBrief {
  const brief = emptyBrief();
  brief.description = text.trim();
  const raw = text.toLowerCase();

  if (includesAny(raw, ['hotel', '酒店'])) {
    brief.kind = 'hotel';
  } else if (includesAny(raw, ['estate', 'anwesen', '庄园', '好几栋', '多栋', '多幢'])) {
    brief.kind = 'estate';
    brief.buildings = 2;
  } else if (includesAny(raw, ['villa', 'haus', 'house', '别墅', '独栋', 'einfamilien'])) {
    brief.kind = 'detached_house';
    brief.buildings = 1;
  }

  if (includesAny(raw, ['neubau', 'new build', '新建', '新买', '刚买'])) {
    brief.build = 'new_build';
  } else if (includesAny(raw, ['sanierung', 'renov', '翻新', '装修', '改造', '旧'])) {
    brief.build = 'renovation';
  }

  if (includesAny(raw, ['rohbau', 'shell', '毛坯'])) {
    brief.phase = 'shell';
  } else if (includesAny(raw, ['planung', 'design phase', '设计阶段', '还在设计'])) {
    brief.phase = 'design';
  } else if (includesAny(raw, ['fertig', '封墙', '已完工', '住了', '入住', '旧房'])) {
    brief.phase = 'finished';
  }

  const chunks = raw.split(/[,，。.;；\n]/);
  for (const chunk of chunks) {
    const amount = firstNumber(chunk);
    if (amount === null) {
      continue;
    }
    if (includesAny(chunk, ['garten', 'garden', '花园', '院子'])) {
      brief.gardenSqm = amount;
    } else if (includesAny(chunk, ['zimmer', 'rooms', '客房', '房间']) && brief.kind === 'hotel') {
      brief.guestRooms = amount;
    } else if (brief.areaSqm === null && includesAny(chunk, ['m²', 'm2', 'qm', '平方米', '平米', 'sqm', '别墅', 'haus', 'wohn'])) {
      brief.areaSqm = amount;
    }
  }

  const people = raw.matchAll(/([一二两三四五]|\d+)\s*(?:个|位|条)?\s*(孩子|小孩|儿童|狗|犬|大人|成人|老人)/g);
  for (const match of people) {
    const count = zhCount(match[1] ?? '');
    const who = match[2] ?? '';
    if (count === null) {
      continue;
    }
    if (includesAny(who, ['孩子', '小孩', '儿童'])) {
      brief.children = count;
    } else if (includesAny(who, ['狗', '犬'])) {
      brief.dogs = count;
    } else {
      brief.adults = count;
    }
  }
  if (includesAny(raw, ['夫妇', '夫妻', 'couple']) && brief.adults === null) {
    brief.adults = 2;
  }
  if (includesAny(raw, ['kinder', 'children', 'kids'])) {
    const match = raw.match(/(\d+)\s*(?:kinder|children|kids)/);
    if (match?.[1]) {
      brief.children = Number(match[1]);
    }
  }
  if (includesAny(raw, ['hund', 'dog'])) {
    const match = raw.match(/(\d+)\s*(?:hunde|hund|dogs|dog)/);
    if (match?.[1]) {
      brief.dogs = Number(match[1]);
    }
  }

  const priorities: Priority[] = [];
  const add = (priority: Priority) => {
    if (!priorities.includes(priority)) {
      priorities.push(priority);
    }
  };
  if (includesAny(raw, ['licht', 'lighting', 'dimm', '照明', '调光'])) {
    add('lighting');
  }
  if (includesAny(raw, ['jalous', 'raffstore', 'blind', '遮阳', '窗帘'])) {
    add('shading');
  }
  if (includesAny(raw, ['heizung', 'klima', 'hvac', '地暖', '空调', '温控', '采暖'])) {
    add('hvac');
  }
  if (includesAny(raw, ['außen', 'outdoor', '花园灯', '室外', '庭院灯', '路径灯'])) {
    add('outdoor_lighting');
  }
  if (includesAny(raw, ['terrasse', 'terrace', '影音', '音响', '家庭影院'])) {
    add('terrace_av');
  }
  if (includesAny(raw, ['alarm', 'security', '安防', '报警', '防盗'])) {
    add('security');
  }
  if (includesAny(raw, ['pflege', 'elder', '养老', '老人', '监护'])) {
    add('care_alerting');
  }
  if (includesAny(raw, ['photovoltaik', 'energie', 'energy', '光伏', '能源', '充电', '低碳', '零碳'])) {
    add('energy');
  }
  if (includesAny(raw, ['schalter', 'panel', '开关', '面板', 'basalte', '巴萨'])) {
    add('wall_plates');
  }
  if (includesAny(raw, ['iphone', 'ipad', 'siri', '苹果', '语音'])) {
    add('apple_voice');
  }
  brief.priorities = priorities;

  if (includesAny(raw, ['basalte', '巴萨'])) {
    brief.specifiedPlateBrand = 'basalte';
  }
  if (includesAny(raw, ['infrarot', '红外'])) {
    brief.existingSystem = 'ir_alarm';
  }
  if (includesAny(raw, ['零碳', '低碳', 'kohlenstoff', 'zero carbon', 'low carbon'])) {
    brief.carbonGoal = true;
  }

  if (includesAny(raw, ['under €5', 'unter 5', '5000以下', '5千以下', '<5'])) {
    brief.budget = 'under_5k';
  } else if (includesAny(raw, ['over €30', 'über 30', '3万以上', '>30'])) {
    brief.budget = 'over_30k';
  } else if (includesAny(raw, ['€15', '15.000', '15000', '1.5万', '15k'])) {
    brief.budget = 'from_15k';
  } else if (includesAny(raw, ['€5', '5.000', '5000', '5千'])) {
    brief.budget = 'from_5k_to_15k';
  }

  if (includesAny(raw, ['herstellerfrei', 'anti-lock', '换服务商', '不绑定', '多品牌'])) {
    brief.lockIn = 'strong';
  } else if (includesAny(raw, ['egal', '无所谓', '不在意品牌'])) {
    brief.lockIn = 'none';
  }

  if (includesAny(raw, ['diy', 'selber', '自己动手', '自己装'])) {
    brief.diy = true;
  } else if (includesAny(raw, ['fachbetrieb', 'elektriker', '电工', '交给专业', '专业公司'])) {
    brief.diy = false;
  }

  if (brief.areaSqm !== null && brief.areaSqm > 250) {
    brief.areaBand = 'over_250';
  } else if (brief.areaSqm !== null && brief.areaSqm >= 120) {
    brief.areaBand = 'between_120_250';
  } else if (brief.areaSqm !== null) {
    brief.areaBand = 'under_120';
  }

  return brief;
}

export function openingSteps(brief: HouseBrief): GuideStep[] {
  const steps: GuideStep[] = [];
  if (brief.kind) {
    steps.push({ kind: 'confirm', slot: 'kind', optionId: brief.kind });
  } else {
    steps.push({ kind: 'choose', slot: 'kind', optionIds: kindOptions });
  }
  if (brief.kind === 'hotel') {
    steps.push({ kind: 'priorities' });
    steps.push({ kind: 'result' });
    return steps;
  }
  if (brief.build && brief.build !== 'unspecified') {
    steps.push({ kind: 'confirm', slot: 'build', optionId: brief.build });
  } else {
    steps.push({ kind: 'choose', slot: 'build', optionIds: buildOptions });
  }
  if (brief.kind === 'estate') {
    steps.push({ kind: 'priorities' });
    steps.push({ kind: 'result' });
    return steps;
  }
  if (brief.phase && brief.phase !== 'unspecified') {
    steps.push({ kind: 'confirm', slot: 'phase', optionId: brief.phase });
  } else {
    steps.push({ kind: 'choose', slot: 'phase', optionIds: phaseOptions });
  }
  if (brief.areaSqm !== null) {
    steps.push({ kind: 'confirmArea', area: brief.areaSqm });
  } else {
    steps.push({ kind: 'choose', slot: 'area', optionIds: areaOptions });
  }
  if (brief.gardenSqm !== null) {
    steps.push({ kind: 'confirmGarden', area: brief.gardenSqm });
  }
  steps.push({ kind: 'priorities' });
  if (brief.budget === 'unstated') {
    steps.push({ kind: 'choose', slot: 'budget', optionIds: budgetOptions });
  } else {
    steps.push({ kind: 'confirm', slot: 'budget', optionId: brief.budget });
  }
  if (brief.lockIn === 'unstated') {
    steps.push({ kind: 'choose', slot: 'lock', optionIds: lockOptions });
  } else {
    steps.push({ kind: 'confirm', slot: 'lock', optionId: brief.lockIn });
  }
  if (brief.diy === null) {
    steps.push({ kind: 'choose', slot: 'diy', optionIds: diyOptions });
  } else {
    steps.push({ kind: 'confirm', slot: 'diy', optionId: brief.diy ? 'self' : 'professional' });
  }
  steps.push({ kind: 'result' });
  return steps;
}

export function clearSlot(brief: HouseBrief, slot: string): HouseBrief {
  const next = { ...brief, priorities: [...brief.priorities] };
  if (slot === 'kind') {
    next.kind = null;
  } else if (slot === 'build') {
    next.build = null;
  } else if (slot === 'phase') {
    next.phase = null;
  } else if (slot === 'area') {
    next.areaSqm = null;
    next.areaBand = null;
  } else if (slot === 'garden') {
    next.gardenSqm = null;
  } else if (slot === 'budget') {
    next.budget = 'unstated';
  } else if (slot === 'lock') {
    next.lockIn = 'unstated';
  } else if (slot === 'diy') {
    next.diy = null;
  }
  return next;
}

export function applyChoice(brief: HouseBrief, slot: string, optionId: string): HouseBrief {
  const next = { ...brief, priorities: [...brief.priorities] };
  if (slot === 'kind' && (kindOptions as readonly string[]).includes(optionId)) {
    next.kind = optionId as ExampleKind;
    next.buildings = optionId === 'estate' ? 2 : 1;
  } else if (slot === 'build' && (buildOptions as readonly string[]).includes(optionId)) {
    next.build = optionId === 'unsure' ? 'unspecified' : (optionId as BuildType);
  } else if (slot === 'phase' && (phaseOptions as readonly string[]).includes(optionId)) {
    next.phase = optionId === 'unsure' ? 'unspecified' : (optionId as ConstructionPhase);
  } else if (slot === 'area' && (areaOptions as readonly string[]).includes(optionId)) {
    next.areaBand = optionId as AreaBand;
    next.areaSqm = optionId === 'under_120' ? 100 : optionId === 'between_120_250' ? 180 : 300;
  } else if (slot === 'budget' && (budgetOptions as readonly string[]).includes(optionId)) {
    next.budget = optionId as BudgetChoice;
  } else if (slot === 'lock' && (lockOptions as readonly string[]).includes(optionId)) {
    next.lockIn = optionId as LockChoice;
  } else if (slot === 'diy') {
    next.diy = optionId === 'self';
  }
  return next;
}

export function applyPriorities(brief: HouseBrief, priorities: readonly Priority[]): HouseBrief {
  return { ...brief, priorities: [...priorities] };
}

function toProfile(brief: HouseBrief): ExampleProfile {
  return {
    id: 'villa-family',
    kind: brief.kind ?? 'detached_house',
    build: brief.build ?? 'unspecified',
    phase: brief.phase ?? 'unspecified',
    areaSqm: brief.areaSqm,
    gardenSqm: brief.gardenSqm,
    adults: brief.adults,
    children: brief.children,
    dogs: brief.dogs,
    guestRooms: brief.guestRooms,
    buildings: brief.buildings,
    budgetStated: brief.budget !== 'unstated',
    lockInStated: brief.lockIn !== 'unstated',
    priorities: brief.priorities,
    specifiedPlateBrand: brief.specifiedPlateBrand,
    existingSystem: brief.existingSystem,
    carbonGoal: brief.carbonGoal
  };
}

function decideFit(brief: HouseBrief, fallback: FitLabel): FitLabel {
  if (fallback === 'outside_house_model') {
    return fallback;
  }
  const openPhase = brief.phase === 'design' || brief.phase === 'shell';
  const newOrRenovation = brief.build === 'new_build' || brief.build === 'renovation';
  const highBudget = brief.budget === 'from_15k' || brief.budget === 'over_30k';
  if (brief.phase === 'finished' && brief.budget === 'under_5k' && brief.diy === true) {
    return 'low';
  }
  if (newOrRenovation && brief.budget === 'from_5k_to_15k' && brief.lockIn === 'none') {
    return 'medium';
  }
  if (openPhase && highBudget && brief.lockIn === 'strong') {
    return 'high';
  }
  return 'incomplete';
}

export function assessHouse(brief: HouseBrief): ExampleAssessment {
  const assessment = assessExample(toProfile(brief));
  const areaAbove = brief.areaBand === 'over_250' || (brief.areaSqm !== null && brief.areaSqm > 250);
  const reasons = areaAbove
    ? [...new Set([...assessment.reasons, 'area_above_typical_band'])]
    : assessment.reasons.filter((reason) => reason !== 'area_above_typical_band' || brief.areaSqm !== null);
  return {
    ...assessment,
    fit: decideFit(brief, assessment.fit),
    reasons
  };
}
