import { describe, expect, it } from 'vitest';
import type { PostureAssessment } from '../types';
import { buildPostureSeries } from './postureSeries';

const assessment = (
  id: string,
  date: string,
  score: number | null,
  schemaVersion?: 1 | 2,
  trendIndex?: number | null,
  comparable = true,
): PostureAssessment => ({
  id,
  date,
  schemaVersion,
  frontImage: '',
  sideImage: '',
  report: { score, trendIndex, confidence: 0.9, issues: [] },
  correctionPlan: { week1_2: [], week3_4: [] },
  capture: schemaVersion === 2
    ? { mode: 'guided', standardized: comparable, comparable, quality: {} }
    : undefined,
});

describe('buildPostureSeries', () => {
  it('never mixes legacy scores into a V2 trend series', () => {
    const result = buildPostureSeries([
      assessment('old', '2026-01-01', 82, 1),
      assessment('base', '2026-02-01', null, 2, null),
      assessment('follow', '2026-03-01', 75, 2, 75),
    ]);
    expect(result.version).toBe('v2');
    expect(result.points).toEqual([{ date: '2026-03-01', value: 75, confidence: 0.9 }]);
  });

  it('marks the first comparable V2 assessment as baseline only', () => {
    const result = buildPostureSeries([
      assessment('base', '2026-02-01', null, 2, null),
    ]);
    expect(result.baselineOnly).toBe(true);
    expect(result.points).toHaveLength(0);
  });

  it('does not establish a formal trend baseline from approximate uploads', () => {
    const result = buildPostureSeries([
      assessment('upload', '2026-02-01', null, 2, null, false),
    ]);
    expect(result.baselineOnly).toBe(false);
  });
});
