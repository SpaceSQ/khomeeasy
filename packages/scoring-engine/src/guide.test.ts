import { describe, expect, it } from 'vitest';
import { applyChoice, assessHouse, openingSteps, parseDescription } from './guide';

describe('guided reading of a villa description', () => {
  it('reads a Chinese new-build description item by item without asking what it already knows', () => {
    const brief = parseDescription('刚买的新建别墅，600平方米，1500平方米花园，两个孩子，两条狗，要照明和空调');
    expect(brief.kind).toBe('detached_house');
    expect(brief.build).toBe('new_build');
    expect(brief.areaSqm).toBe(600);
    expect(brief.gardenSqm).toBe(1500);
    expect(brief.children).toBe(2);
    expect(brief.dogs).toBe(2);
    expect(brief.priorities).toEqual(expect.arrayContaining(['lighting', 'hvac']));
    const steps = openingSteps(brief);
    expect(steps[0]).toMatchObject({ kind: 'confirm', slot: 'kind' });
    expect(steps.some((step) => step.kind === 'choose' && step.slot === 'area')).toBe(false);
    expect(steps.some((step) => step.kind === 'choose' && step.slot === 'phase')).toBe(true);
    expect(steps.at(-1)).toMatchObject({ kind: 'result' });
  });

  it('marks a finished low-budget DIY brief as low fit', () => {
    const parsed = parseDescription('旧别墅已经住了，封墙，预算5000以下，自己动手');
    const brief = applyChoice(parsed, 'phase', 'finished');
    expect(assessHouse(brief).fit).toBe('low');
  });

  it('marks an open high-budget anti-lock-in brief as high fit', () => {
    let brief = parseDescription('新建别墅，毛坯，预算15000以上，要多品牌，以后能换服务商');
    brief = applyChoice(brief, 'phase', 'shell');
    const result = assessHouse(brief);
    expect(result.fit).toBe('high');
    expect(result.wiring).toBe('open_with_shell');
  });

  it('keeps a hotel out of the detached-house price', () => {
    const brief = parseDescription('五星级酒店，300间客房，要苹果手机和语音');
    const result = assessHouse(brief);
    expect(brief.kind).toBe('hotel');
    expect(brief.guestRooms).toBe(300);
    expect(result.fit).toBe('outside_house_model');
    expect(result.budget).toBe('none');
    expect(result.evidence).not.toContain('budget');
  });
});
