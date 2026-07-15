import React from 'react';
import type { Exercise, Language, Member, RecommendationExercise } from '../../types';
import { MetricPill, REPORT, ReportFooter, ReportHeader, reportPageStyle } from './reportTheme';

interface PlanPageProps { member: Member; lang: Language; studioName: string; }

type DisplayExercise = Partial<RecommendationExercise> & Exercise;

const DEFAULT_PHASE_1: DisplayExercise[] = [
  { name: '呼吸与对线扫描', nameEn: 'Breathing alignment scan', description: '仰卧屈膝完成缓慢呼吸，观察头、胸廓和骨盆自然回到舒适位置。', descriptionEn: 'Use slow breathing in a supported supine position and let the head, rib cage, and pelvis settle comfortably.', sets: '2 组 × 5 次呼吸', tempo: '呼气 5–6 秒', tempoEn: '5–6 s exhale', equipment: '瑜伽垫（可选）', equipmentEn: 'Mat (optional)', cues: ['下颌放松', '呼吸保持连贯'], cuesEn: ['Relax the jaw', 'Keep breathing continuous'], regression: '使用头枕。', regressionEn: 'Use a head support.', progression: '改为坐姿完成。', progressionEn: 'Progress to sitting.' },
  { name: '镜前站姿对线', nameEn: 'Mirror standing alignment', description: '在镜前调整双脚承重、骨盆和肩带位置，建立可重复的站姿感觉。', descriptionEn: 'Use mirror feedback to organise foot loading, pelvis, and shoulder position into a repeatable stance.', sets: '2 组 × 30–45 秒', tempo: '自然呼吸', tempoEn: 'Natural breathing', equipment: '镜面', equipmentEn: 'Mirror', cues: ['双脚均匀承重', '肩颈保持放松'], cuesEn: ['Load both feet evenly', 'Keep neck and shoulders relaxed'], regression: '扶墙完成。', regressionEn: 'Use wall support.', progression: '加入交替抬脚。', progressionEn: 'Add alternating foot lifts.' },
];

const DEFAULT_PHASE_2: DisplayExercise[] = [
  { name: '对称站姿负重转移', nameEn: 'Symmetrical weight shift', description: '缓慢向左右脚转移重量，再回到双脚均匀承重。', descriptionEn: 'Shift slowly between feet and return to even bilateral loading.', sets: '2–3 组 × 8 次/侧', tempo: '3 秒移入，3 秒回中', tempoEn: '3 s shift, 3 s return', equipment: '无需器械', equipmentEn: 'No equipment', cues: ['脚掌稳定着地', '躯干保持平稳'], cuesEn: ['Keep feet grounded', 'Keep the trunk steady'], regression: '扶墙并缩小范围。', regressionEn: 'Use wall support and less range.', progression: '加入轻重量。', progressionEn: 'Add a light load.' },
  { name: '髋铰链动作练习', nameEn: 'Hip-hinge drill', description: '练习髋部向后移动，同时保持头、胸廓和骨盆协同。', descriptionEn: 'Move the hips back while coordinating the head, rib cage, and pelvis.', sets: '3 组 × 8 次', tempo: '3 秒下，2 秒起', tempoEn: '3 s down, 2 s up', equipment: '木棍或墙面', equipmentEn: 'Dowel or wall', cues: ['脚掌保持稳定', '动作来自髋部'], cuesEn: ['Keep feet stable', 'Move from the hips'], regression: '缩小动作范围。', regressionEn: 'Reduce range.', progression: '抱持轻重量。', progressionEn: 'Add a light goblet load.' },
];

function ExerciseCard({ exercise, index, lang }: { exercise: DisplayExercise; index: number; lang: Language }) {
  const cues = lang === 'zh' ? exercise.cues : exercise.cuesEn;
  return (
    <div style={{ border: `1px solid ${REPORT.line}`, background: '#FFFFFF', padding: '10px 11px', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <span style={{ width: 19, height: 19, borderRadius: 10, background: REPORT.navy, color: '#FFFFFF', fontSize: 8, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>{index + 1}</span>
          <p style={{ margin: '2px 0 0', color: REPORT.ink, fontSize: 10, lineHeight: 1.2, fontWeight: 800 }}>{lang === 'zh' ? exercise.name : exercise.nameEn}</p>
        </div>
        <span style={{ color: REPORT.blue, fontSize: 8.5, fontWeight: 800, whiteSpace: 'nowrap' }}>{exercise.dose || exercise.sets}</span>
      </div>
      <p style={{ margin: '7px 0 0', color: REPORT.muted, fontSize: 7.7, lineHeight: 1.45 }}>{lang === 'zh' ? exercise.description : exercise.descriptionEn}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginTop: 7, paddingTop: 6, borderTop: `1px solid ${REPORT.line}` }}>
        <span style={{ color: REPORT.muted, fontSize: 7.2 }}><b style={{ color: REPORT.ink }}>Tempo</b> {lang === 'zh' ? exercise.tempo : exercise.tempoEn}</span>
        <span style={{ color: REPORT.muted, fontSize: 7.2 }}><b style={{ color: REPORT.ink }}>{lang === 'zh' ? '器械' : 'Equipment'}</b> {lang === 'zh' ? exercise.equipment : exercise.equipmentEn}</span>
      </div>
      {cues?.length ? <p style={{ margin: '6px 0 0', color: REPORT.navy, fontSize: 7.3, lineHeight: 1.4 }}>{cues.slice(0, 2).join(' · ')}</p> : null}
      {(exercise.regression || exercise.progression) && (
        <div style={{ marginTop: 6, color: REPORT.muted, fontSize: 6.9, lineHeight: 1.35 }}>
          <span><b>{lang === 'zh' ? '退阶' : 'Regress'}:</b> {lang === 'zh' ? exercise.regression : exercise.regressionEn}</span><br />
          <span><b>{lang === 'zh' ? '进阶' : 'Progress'}:</b> {lang === 'zh' ? exercise.progression : exercise.progressionEn}</span>
        </div>
      )}
    </div>
  );
}

const PlanPage: React.FC<PlanPageProps> = ({ member, lang, studioName }) => {
  const assessment = member.assessments?.[0];
  if (!assessment) return <div style={reportPageStyle} />;
  const recommendation = assessment.recommendation;
  const recommendationPhase1 = recommendation?.exercises?.filter(item => item.phase === 'week1_2') || [];
  const recommendationPhase2 = recommendation?.exercises?.filter(item => item.phase === 'week3_4') || [];
  const phase1 = (recommendationPhase1.length ? recommendationPhase1 : assessment.correctionPlan.week1_2.length ? assessment.correctionPlan.week1_2 : DEFAULT_PHASE_1) as DisplayExercise[];
  const phase2 = (recommendationPhase2.length ? recommendationPhase2 : assessment.correctionPlan.week3_4.length ? assessment.correctionPlan.week3_4 : DEFAULT_PHASE_2) as DisplayExercise[];
  const schedule = recommendation?.schedule?.length ? recommendation.schedule : [
    { week: 1, focus: '熟悉动作', focusEn: 'Learn the movements', sessions: 2, effort: 'RPE 3–4/10' },
    { week: 2, focus: '提高重复质量', focusEn: 'Improve repeat quality', sessions: 2, effort: 'RPE 4–5/10' },
    { week: 3, focus: '加入轻负荷', focusEn: 'Add light loading', sessions: 2, effort: 'RPE 4–6/10' },
    { week: 4, focus: '整合与复评', focusEn: 'Integrate and reassess', sessions: 2, effort: 'RPE 5–6/10' },
  ];

  return (
    <div style={reportPageStyle}>
      <ReportHeader studioName={studioName} section="04 · COACH-REVIEW TRAINING PRESCRIPTION" title={lang === 'zh' ? '四周体态训练处方' : 'Four-week posture training prescription'}
        subtitle={lang === 'zh' ? '处方按控制与耐受、负荷与整合两阶段组织。动作质量和症状反应优先于完成次数。' : 'The plan progresses from control and tolerance to loading and integration. Movement quality and symptom response take priority over volume.'} />

      <div style={{ display: 'grid', gridTemplateColumns: '1.45fr repeat(3, .7fr)', gap: 8, marginBottom: 12 }}>
        <MetricPill label={lang === 'zh' ? '四周目标' : '4-week goal'} value={lang === 'zh' ? recommendation?.goal || '基础控制与对称承重' : recommendation?.goalEn || 'Control and symmetrical loading'} />
        <MetricPill label={lang === 'zh' ? '每周频率' : 'Frequency'} value={`${recommendation?.frequencyPerWeek || 2}×`} />
        <MetricPill label={lang === 'zh' ? '单次时长' : 'Duration'} value={`${recommendation?.sessionMinutes || 15} min`} />
        <MetricPill label={lang === 'zh' ? '计划动作' : 'Exercises'} value={`${phase1.length + phase2.length}`} tone="green" />
      </div>

      {schedule.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', border: `1px solid ${REPORT.line}`, marginBottom: 12 }}>
              {schedule.map((week, index) => (
                <div key={week.week} style={{ padding: '9px 10px', borderLeft: index ? `1px solid ${REPORT.line}` : 0, background: index < 2 ? '#F5F9FD' : '#F8F6FC' }}>
                  <p style={{ margin: 0, color: index < 2 ? REPORT.blue : '#6552A3', fontSize: 8, fontWeight: 850, letterSpacing: .8 }}>WEEK {week.week}</p>
                  <p style={{ margin: '4px 0 0', color: REPORT.ink, fontSize: 8, fontWeight: 700, lineHeight: 1.3 }}>{lang === 'zh' ? week.focus : week.focusEn}</p>
                  <p style={{ margin: '4px 0 0', color: REPORT.muted, fontSize: 7 }}>{week.sessions} sessions · {week.effort}</p>
                </div>
              ))}
            </div>
      )}

      <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
              <h3 style={{ margin: 0, color: REPORT.navy, fontSize: 11, fontWeight: 850 }}>{lang === 'zh' ? '阶段 A · 第 1–2 周：控制与耐受' : 'PHASE A · WEEKS 1–2: CONTROL & TOLERANCE'}</h3>
              <span style={{ color: REPORT.muted, fontSize: 7.5 }}>{lang === 'zh' ? '保持 4–5 次余力' : 'Keep 4–5 reps in reserve'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(4, Math.max(phase1.length, 1))}, 1fr)`, gap: 7 }}>
              {phase1.slice(0, 4).map((exercise, index) => <div key={`${exercise.name}-${index}`}><ExerciseCard exercise={exercise} index={index} lang={lang} /></div>)}
            </div>
      </div>

      <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
              <h3 style={{ margin: 0, color: '#6552A3', fontSize: 11, fontWeight: 850 }}>{lang === 'zh' ? '阶段 B · 第 3–4 周：负荷与整合' : 'PHASE B · WEEKS 3–4: LOAD & INTEGRATION'}</h3>
              <span style={{ color: REPORT.muted, fontSize: 7.5 }}>{lang === 'zh' ? '质量稳定后再加负荷' : 'Add load only after stable quality'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(4, Math.max(phase2.length, 1))}, 1fr)`, gap: 7 }}>
              {phase2.slice(0, 4).map((exercise, index) => <div key={`${exercise.name}-${index}`}><ExerciseCard exercise={exercise} index={index} lang={lang} /></div>)}
            </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 10, marginBottom: 11 }}>
        <div style={{ border: `1px solid ${REPORT.line}`, borderLeft: `4px solid ${REPORT.red}`, padding: '10px 12px' }}>
          <p style={{ margin: 0, color: REPORT.red, fontSize: 8.5, fontWeight: 850 }}>{lang === 'zh' ? '停止条件' : 'STOP RULES'}</p>
          <p style={{ margin: '5px 0 0', color: REPORT.muted, fontSize: 7.7, lineHeight: 1.4 }}>{lang === 'zh' ? '疼痛明显增加、麻木、无力、眩晕、放射症状或动作失控时立即停止，并告知教练。' : 'Stop for a clear increase in pain, numbness, weakness, dizziness, radiating symptoms, or loss of control and inform the coach.'}</p>
        </div>
        <div style={{ border: `1px solid ${REPORT.line}`, padding: '10px 12px' }}>
          <p style={{ margin: 0, color: REPORT.navy, fontSize: 8.5, fontWeight: 850 }}>{lang === 'zh' ? '复评安排' : 'REASSESSMENT'}</p>
          <p style={{ margin: '5px 0 0', color: REPORT.muted, fontSize: 7.7, lineHeight: 1.4 }}>{recommendation?.reassessment || (lang === 'zh' ? '第 4 周结束后按同一协议复评。' : 'Reassess after week 4 using the same protocol.')}</p>
        </div>
      </div>

      <div style={{ color: REPORT.muted, fontSize: 7.5, lineHeight: 1.4 }}>
        <b style={{ color: REPORT.ink }}>{lang === 'zh' ? '教练审核：' : 'Coach review: '}</b>
        {lang === 'zh' ? '保存代表教练已核对节点、角度、会员问卷和动作编排，并可据此开展后续课程。' : 'Saving confirms coach review of landmarks, angles, questionnaire, and exercise programming for subsequent sessions.'}
      </div>

      <ReportFooter studioName={studioName} page={4} date={assessment.date} />
    </div>
  );
};

export default PlanPage;
