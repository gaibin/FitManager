import type { PostureAssessment } from '../types';

export interface PostureSeriesPoint {
  date: string;
  value: number;
  confidence: number;
}

export interface PostureSeries {
  version: 'v2' | 'legacy';
  points: PostureSeriesPoint[];
  baselineOnly: boolean;
}

/**
 * Select one internally comparable series. Once a member has V2 records, old
 * pseudo-scores are never mixed with the personal V2 trend index.
 */
export function buildPostureSeries(assessments: PostureAssessment[]): PostureSeries {
  const hasV2 = assessments.some(assessment => assessment.schemaVersion === 2);
  const v2Baselines = assessments.filter(assessment =>
    assessment.schemaVersion === 2 && assessment.capture?.comparable === true
  );

  const points = assessments
    .filter(assessment => hasV2
      ? assessment.schemaVersion === 2 && assessment.report.trendIndex != null
      : assessment.schemaVersion !== 2 && assessment.report.score != null)
    .map(assessment => ({
      date: assessment.date,
      value: hasV2 ? assessment.report.trendIndex! : assessment.report.score!,
      confidence: assessment.report.confidence,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    version: hasV2 ? 'v2' : 'legacy',
    points,
    baselineOnly: hasV2 && points.length === 0 && v2Baselines.length > 0,
  };
}
