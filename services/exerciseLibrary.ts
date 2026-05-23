/**
 * 体态矫正运动库 — 当 AI 不可用时提供基于规则的矫正方案（中英双语）
 */

import type { CorrectionPlan, Exercise } from '../types';

export interface FallbackCorrectionPlan {
  issueKeywords: string[];
  plan: CorrectionPlan;
}

function ex(name: string, nameEn: string, description: string, descriptionEn: string, sets: string): Exercise {
  return { name, nameEn, description, descriptionEn, sets };
}

export const CORRECTION_LIBRARY: FallbackCorrectionPlan[] = [
  {
    issueKeywords: ['高低肩', 'shoulder', '肩膀', '肩'],
    plan: {
      week1_2: [
        ex('单侧哑铃推举', 'Unilateral Dumbbell Press', '纠正肩部肌力不平衡，弱侧加练', 'Correct shoulder imbalance', '3x10'),
        ex('侧平举', 'Lateral Raise', '均衡发展三角肌中束', 'Balanced deltoid development', '3x15'),
        ex('站姿划船', 'Upright Row', '加强上背部稳定性', 'Upper back stability', '3x12'),
        ex('猫牛式伸展', 'Cat-Cow Stretch', '放松脊柱和肩部紧张', 'Release spine tension', '3x10 breaths'),
      ],
      week3_4: [
        ex('弹力带面拉', 'Band Face Pull', '加强肩后束和肩袖', 'Rear delt & rotator cuff', '3x15'),
        ex('单臂农夫行走', 'Unilateral Farmers Walk', '核心+单侧负重稳定', 'Core + unilateral load', '3x30m'),
        ex('泡沫轴胸椎松动', 'Foam Roller T-Spine', '改善胸椎灵活性', 'Thoracic mobility', '2 min'),
        ex('Y-T-W-L 训练', 'Y-T-W-L Drill', '全方位肩袖强化', 'Rotator cuff strengthening', '3x8 each'),
      ],
    },
  },
  {
    issueKeywords: ['头前引', 'neck', '颈部', '颈椎', 'CVA'],
    plan: {
      week1_2: [
        ex('下颌内收', 'Chin Tuck', '激活深层颈屈肌，纠正头部前伸', 'Activate deep neck flexors', '3x10'),
        ex('弹力带颈后伸展', 'Band Neck Extension', '强化颈后肌群', 'Posterior neck strength', '3x12'),
        ex('仰卧颈部放松', 'Supine Neck Release', '用毛巾垫颈仰卧5分钟', 'Towel under neck 5 min', '2x5 min'),
        ex('胸锁乳突肌拉伸', 'SCM Stretch', '缓慢侧倾头部拉伸', 'Slow lateral neck stretch', '3x30s each'),
      ],
      week3_4: [
        ex('墙天使', 'Wall Angel', '核心稳定 + 颈胸联动', 'Core + neck-thoracic', '3x10'),
        ex('俯身颈部抗阻', 'Prone Neck Resistance', '弹力带辅助练习', 'Band-assisted', '3x12'),
        ex('普拉提式头部抬起', 'Pilates Head Lift', '仰卧慢速抬离地面', 'Slow supine head lift', '3x10'),
        ex('日常姿势训练', 'Posture Habit Drill', '每小时做10次下颌内收', '10 chin tucks hourly', 'All day'),
      ],
    },
  },
  {
    issueKeywords: ['含胸', '圆肩', 'chest', '胸', 'round'],
    plan: {
      week1_2: [
        ex('胸肌拉伸', 'Chest Stretch', '门框式胸肌和肱二头肌拉伸', 'Doorway chest stretch', '3x30s'),
        ex('弹力带面拉', 'Band Face Pull', '加强肩后束和菱形肌', 'Rear delt & rhomboids', '3x15'),
        ex('俯身飞鸟', 'Bent-Over Fly', '激活菱形肌和中下斜方', 'Rhomboids & mid-low traps', '3x12'),
        ex('泡沫轴胸椎伸展', 'Foam Roller T-Extension', '仰卧在泡沫轴上前后滚动', 'Roll on foam roller', '2 min'),
      ],
      week3_4: [
        ex('Push-up Plus', 'Push-up Plus', '俯卧撑结束位加上肩胛前伸', 'Scapular protraction at top', '3x10'),
        ex('弹力带水平外展', 'Band Horizontal Abduction', '加强肩袖外旋肌', 'Rotator cuff external', '3x15'),
        ex('坐姿划船', 'Seated Cable Row', '宽握距强调菱形肌', 'Wide grip rhomboids', '3x12'),
        ex('前锯肌激活', 'Serratus Activation', '肩胛骨贴墙滑动', 'Scapular wall slides', '3x10'),
      ],
    },
  },
  {
    issueKeywords: ['骨盆', 'pelvic', '倾斜', 'tilt'],
    plan: {
      week1_2: [
        ex('臀桥', 'Glute Bridge', '激活臀大肌，纠正前倾', 'Glute activation', '3x15'),
        ex('平板支撑', 'Plank', '核心稳定训练', 'Core stability', '3x30s'),
        ex('髋屈肌拉伸', 'Hip Flexor Stretch', '半跪姿拉伸髂腰肌', 'Half-kneeling stretch', '3x30s each'),
        ex('猫式伸展', 'Cat Stretch', '提高腰椎灵活性', 'Lumbar mobility', '3x10 breaths'),
      ],
      week3_4: [
        ex('单腿硬拉', 'Single-Leg Deadlift', '加强后链肌群', 'Posterior chain', '3x10 each'),
        ex('死虫式', 'Dead Bug', '核心抗旋转', 'Anti-rotation core', '3x12 each'),
        ex('臀推', 'Hip Thrust', '强力激活臀大肌', 'Powerful glute activation', '3x12'),
        ex('髂胫束泡沫轴放松', 'IT Band Foam Roll', '放松大腿外侧', 'Release lateral thigh', '2 min each'),
      ],
    },
  },
  {
    issueKeywords: ['膝', 'knee', 'O型', 'X型', '腿'],
    plan: {
      week1_2: [
        ex('靠墙静蹲', 'Wall Sit', '加强股四头肌，膝关节稳定', 'Quad strength & knee stability', '3x45s'),
        ex('蚌式开合', 'Clamshell', '激活臀中肌', 'Gluteus medius activation', '3x15 each'),
        ex('单腿站立', 'Single-Leg Stand', '增强本体感觉和下肢稳定', 'Proprioception & stability', '3x30s each'),
        ex('腘绳肌拉伸', 'Hamstring Stretch', '坐姿体前屈拉伸', 'Seated forward bend', '3x30s'),
      ],
      week3_4: [
        ex('保加利亚分腿蹲', 'Bulgarian Split Squat', '单侧力量和稳定', 'Unilateral strength', '3x10 each'),
        ex('侧向弹力带走', 'Lateral Band Walk', '臀中肌强化', 'Glute med strengthening', '3x15 each'),
        ex('单腿臀桥', 'Single-Leg Glute Bridge', '后链肌群单侧加强', 'Unilateral posterior chain', '3x10 each'),
        ex('小腿肌群拉伸', 'Calf Stretch', '下犬式拉伸小腿', 'Downward dog stretch', '3x30s'),
      ],
    },
  },
];

export const DEFAULT_CORRECTION_PLAN: CorrectionPlan = {
  week1_2: [
    ex('泡沫轴全身放松', 'Full-Body Foam Roll', '改善筋膜健康和灵活性', 'Fascial health & mobility', '10 min'),
    ex('核心激活', 'Core Activation', '平板支撑 + 死虫式', 'Plank + dead bug', '3x30s + 3x10'),
    ex('弹力带面拉', 'Band Face Pull', '纠正圆肩含胸', 'Correct rounded shoulders', '3x15'),
    ex('臀桥', 'Glute Bridge', '激活臀部改善骨盆位', 'Glute activation', '3x15'),
  ],
  week3_4: [
    ex('深蹲', 'Squat', '体前负重，控制深度', 'Front-loaded, controlled', '3x12'),
    ex('俯身划船', 'Bent-Over Row', '加强背部肌群', 'Back strengthening', '3x12'),
    ex('保加利亚分腿蹲', 'Bulgarian Split Squat', '单侧力量平衡', 'Unilateral balance', '3x10 each'),
    ex('瑜伽太阳致敬式', 'Sun Salutation', '整体协调和柔韧', 'Coordination & flexibility', '5 rounds'),
  ],
};

export function matchCorrectionPlan(issueNames: string[]): CorrectionPlan {
  for (const entry of CORRECTION_LIBRARY) {
    for (const name of issueNames) {
      if (entry.issueKeywords.some(kw => name.toLowerCase().includes(kw.toLowerCase()))) return entry.plan;
    }
  }
  return DEFAULT_CORRECTION_PLAN;
}

export function generateDefaultRecommendation(issues: string[], lang: 'en' | 'zh'): string {
  if (issues.length === 0) {
    return lang === 'zh'
      ? '未检测到明显体态问题。请保持良好的训练习惯，注意动作规范，定期进行体态评估。'
      : 'No significant postural issues detected. Maintain good training habits and schedule regular assessments.';
  }
  return lang === 'zh'
    ? `检测到以下问题：${issues.join('、')}。建议每周安排2-3次矫正训练，优先改善最严重的问题，4周后重新评估。`
    : `Detected issues: ${issues.join(', ')}. Schedule 2-3 correction sessions per week, prioritize the most severe issue, and reassess in 4 weeks.`;
}
