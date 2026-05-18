/**
 * 体态矫正运动库 — 当 AI 不可用时提供基于规则的矫正方案
 */

import type { CorrectionPlan, Exercise } from '../types';

export interface FallbackCorrectionPlan {
  issueKeywords: string[]; // 匹配体态问题名称的关键词
  plan: CorrectionPlan;
}

// 基于规则的矫正方案库
export const CORRECTION_LIBRARY: FallbackCorrectionPlan[] = [
  {
    issueKeywords: ['高低肩', 'shoulder', '肩膀', '肩'],
    plan: {
      week1_2: [
        { name: '单侧哑铃推举', description: '纠正肩部肌力不平衡，弱侧加练', sets: '3x10 (弱侧)' },
        { name: '侧平举', description: '均衡发展三角肌中束', sets: '3x15' },
        { name: '站姿划船', description: '加强上背部稳定性', sets: '3x12' },
        { name: '猫牛式伸展', description: '放松脊柱和肩部紧张', sets: '3x10次深呼吸' },
      ],
      week3_4: [
        { name: '弹力带面拉', description: '加强肩后束和肩袖', sets: '3x15' },
        { name: '单臂农夫行走', description: '核心+单侧负重稳定', sets: '3x30m' },
        { name: '泡沫轴胸椎松动', description: '改善胸椎灵活性', sets: '2分钟' },
        { name: 'Y-T-W-L 训练', description: '全方位肩袖强化', sets: '3x8 (每个动作)' },
      ],
    },
  },
  {
    issueKeywords: ['头前引', 'neck', '颈部', '颈椎', 'CVA'],
    plan: {
      week1_2: [
        { name: '下颌内收', description: '激活深层颈屈肌，纠正头部前伸', sets: '3x10' },
        { name: '弹力带颈后伸展', description: '强化颈后肌群', sets: '3x12' },
        { name: '仰卧颈部放松', description: '用毛巾垫颈仰卧5分钟', sets: '2x5分钟' },
        { name: '胸锁乳突肌拉伸', description: '缓慢侧倾头部拉伸', sets: '每侧3x30s' },
      ],
      week3_4: [
        { name: '墙天使', description: '核心稳定 + 颈胸联动', sets: '3x10' },
        { name: '俯身颈部抗阻', description: '弹力带辅助练习', sets: '3x12' },
        { name: '普拉提式头部抬起', description: '仰卧慢速抬离地面', sets: '3x10' },
        { name: '日常姿势训练', description: '每小时做10次下颌内收', sets: '全天提醒' },
      ],
    },
  },
  {
    issueKeywords: ['含胸', '圆肩', 'chest', '胸', 'round'],
    plan: {
      week1_2: [
        { name: '胸肌拉伸', description: '门框式胸肌和肱二头肌拉伸', sets: '3x30s' },
        { name: '弹力带面拉', description: '加强肩后束和菱形肌', sets: '3x15' },
        { name: '俯身飞鸟', description: '激活菱形肌和中下斜方', sets: '3x12' },
        { name: '泡沫轴胸椎伸展', description: '仰卧在泡沫轴上前后滚动', sets: '2分钟' },
      ],
      week3_4: [
        { name: 'Push-up Plus', description: '俯卧撑结束位加上肩胛前伸', sets: '3x10' },
        { name: '弹力带水平外展', description: '加强肩袖外旋肌', sets: '3x15' },
        { name: '坐姿划船', description: '宽握距强调菱形肌', sets: '3x12' },
        { name: '前锯肌激活', description: '肩胛骨贴墙滑动', sets: '3x10' },
      ],
    },
  },
  {
    issueKeywords: ['骨盆', 'pelvic', '倾斜', 'tilt'],
    plan: {
      week1_2: [
        { name: '臀桥', description: '激活臀大肌，纠正前倾', sets: '3x15' },
        { name: '平板支撑', description: '核心稳定训练', sets: '3x30s' },
        { name: '髋屈肌拉伸', description: '半跪姿拉伸髂腰肌', sets: '每侧3x30s' },
        { name: '猫式伸展', description: '提高腰椎灵活性', sets: '3x10次深呼吸' },
      ],
      week3_4: [
        { name: '单腿硬拉', description: '加强后链肌群', sets: '3x10 (每侧)' },
        { name: '死虫式', description: '核心抗旋转', sets: '3x12 (每侧)' },
        { name: '臀推', description: '强力激活臀大肌', sets: '3x12' },
        { name: '髂胫束泡沫轴放松', description: '放松大腿外侧', sets: '每侧2分钟' },
      ],
    },
  },
  {
    issueKeywords: ['膝', 'knee', 'O型', 'X型', '腿'],
    plan: {
      week1_2: [
        { name: '靠墙静蹲', description: '加强股四头肌，膝关节稳定', sets: '3x45s' },
        { name: '蚌式开合', description: '激活臀中肌', sets: '每侧3x15' },
        { name: '单腿站立', description: '增强本体感觉和下肢稳定', sets: '每侧3x30s' },
        { name: '腘绳肌拉伸', description: '坐姿体前屈拉伸', sets: '3x30s' },
      ],
      week3_4: [
        { name: '保加利亚分腿蹲', description: '单侧力量和稳定', sets: '3x10 (每侧)' },
        { name: '侧向弹力带走', description: '臀中肌强化', sets: '3x15步 (每侧)' },
        { name: '单腿臀桥', description: '后链肌群单侧加强', sets: '3x10 (每侧)' },
        { name: '小腿肌群拉伸', description: '下犬式拉伸小腿', sets: '3x30s' },
      ],
    },
  },
];

// 默认通用矫正方案（无法匹配时使用）
export const DEFAULT_CORRECTION_PLAN: CorrectionPlan = {
  week1_2: [
    { name: '泡沫轴全身放松', description: '改善筋膜健康和灵活性', sets: '10分钟' },
    { name: '核心激活', description: '平板支撑 + 死虫式', sets: '3x30s + 3x10' },
    { name: '弹力带面拉', description: '纠正圆肩含胸', sets: '3x15' },
    { name: '臀桥', description: '激活臀部改善骨盆位', sets: '3x15' },
  ],
  week3_4: [
    { name: '深蹲', description: '体前负重，控制深度', sets: '3x12' },
    { name: '俯身划船', description: '加强背部肌群', sets: '3x12' },
    { name: '保加利亚分腿蹲', description: '单侧力量平衡', sets: '3x10 (每侧)' },
    { name: '瑜伽太阳致敬式', description: '整体协调和柔韧', sets: '5轮' },
  ],
};

// 根据体态问题名称匹配矫正方案
export function matchCorrectionPlan(issueNames: string[]): CorrectionPlan {
  for (const entry of CORRECTION_LIBRARY) {
    for (const issueName of issueNames) {
      const match = entry.issueKeywords.some((kw) =>
        issueName.toLowerCase().includes(kw.toLowerCase())
      );
      if (match) return entry.plan;
    }
  }
  return DEFAULT_CORRECTION_PLAN;
}

// 生成 AI 不可用时的默认建议文字
export function generateDefaultRecommendation(issueNames: string[], lang: 'en' | 'zh'): string {
  if (issueNames.length === 0) {
    return lang === 'zh'
      ? '未检测到明显体态问题。请保持良好的训练习惯，注意动作规范，定期进行体态评估。'
      : 'No significant postural issues detected. Maintain good training habits, focus on proper form, and schedule regular posture assessments.';
  }

  const zhTemplate = `根据本次体态评估结果，检测到以下问题：${issueNames.join('、')}。建议：
1. 训练前后充分热身和拉伸，重视推拉动作平衡
2. 每周安排2-3次矫正训练，优先改善最严重的问题
3. 保持日常良好姿势习惯，避免久坐和单侧负荷
4. 建议4周后重新评估，跟踪改善进度`;

  const enTemplate = `Based on the posture assessment, the following issues were detected: ${issueNames.join(', ')}. Recommendations:
1. Warm up thoroughly before workouts and focus on push-pull exercise balance
2. Schedule 2-3 correction training sessions per week, prioritizing the most severe issues
3. Maintain good daily posture habits and avoid prolonged sitting/unilateral loading
4. Schedule a follow-up assessment in 4 weeks to track progress`;

  return lang === 'zh' ? zhTemplate : enTemplate;
}
