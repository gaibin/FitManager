/**
 * 动作标准化库 — 标准名称 + 别名映射 + 模糊匹配，避免重复
 */

// 标准动作名 → 别名列表
export const EXERCISE_DICTIONARY: { name: string; aliases: string[]; category: string }[] = [
  // 下半身
  { name: 'Squat', aliases: ['深蹲', 'squat', 'back squat', 'barbell squat', '杠铃深蹲', '自由深蹲', '深蹲架', 'sqt'], category: 'legs' },
  { name: 'Goblet Squat', aliases: ['高脚杯深蹲', 'goblet squat', '哑铃深蹲', 'dumbbell squat', 'db squat'], category: 'legs' },
  { name: 'Front Squat', aliases: ['前蹲', 'front squat', '颈前深蹲', 'fs'], category: 'legs' },
  { name: 'Bulgarian Split Squat', aliases: ['保加利亚分腿蹲', 'bulgarian squat', 'bss', '分腿蹲', '保加利亚蹲', 'split squat'], category: 'legs' },
  { name: 'Lunge', aliases: ['箭步蹲', 'lunge', '弓步蹲', 'lunges', 'walking lunge', '步行弓步'], category: 'legs' },
  { name: 'Leg Press', aliases: ['腿举', 'leg press', '倒蹬', '蹬腿', '腿推', 'legpress'], category: 'legs' },
  { name: 'Leg Curl', aliases: ['腿弯举', 'leg curl', '俯卧腿弯举', 'hamstring curl', '屈腿'], category: 'legs' },
  { name: 'Leg Extension', aliases: ['腿屈伸', 'leg extension', '坐姿腿屈伸', 'quad extension'], category: 'legs' },
  { name: 'Romanian Deadlift', aliases: ['罗马尼亚硬拉', 'rdl', 'romanian deadlift', '直腿硬拉', 'Romanian DL'], category: 'legs' },
  { name: 'Hip Thrust', aliases: ['臀推', 'hip thrust', '杠铃臀推', 'barbell hip thrust', '臀桥', 'glute bridge'], category: 'legs' },
  { name: 'Calf Raise', aliases: ['提踵', 'calf raise', '小腿提踵', '站姿提踵', '坐姿提踵', 'calf'], category: 'legs' },

  // 胸部
  { name: 'Bench Press', aliases: ['卧推', 'bench press', '杠铃卧推', 'barbell bench', '平板卧推', 'bp', 'bench'], category: 'chest' },
  { name: 'Incline Bench Press', aliases: ['上斜卧推', 'incline bench', 'incline press', '上斜杠铃卧推'], category: 'chest' },
  { name: 'Dumbbell Bench Press', aliases: ['哑铃卧推', 'db bench', 'dumbbell bench press', 'db press'], category: 'chest' },
  { name: 'Incline Dumbbell Press', aliases: ['上斜哑铃卧推', 'incline db press', '上斜哑铃推'], category: 'chest' },
  { name: 'Chest Fly', aliases: ['飞鸟', 'chest fly', '哑铃飞鸟', 'cable fly', '绳索飞鸟', '蝴蝶机', 'pec deck', 'fly'], category: 'chest' },
  { name: 'Dip', aliases: ['双杠臂屈伸', 'dip', '双杠', '臂屈伸', 'dips'], category: 'chest' },
  { name: 'Push Up', aliases: ['俯卧撑', 'push up', 'pushup', 'push-ups', '俯卧'], category: 'chest' },

  // 背部
  { name: 'Deadlift', aliases: ['硬拉', 'deadlift', 'conventional deadlift', '传统硬拉', 'dl', 'dead lift'], category: 'back' },
  { name: 'Sumo Deadlift', aliases: ['相扑硬拉', 'sumo deadlift', 'sumo dl'], category: 'back' },
  { name: 'Barbell Row', aliases: ['杠铃划船', 'barbell row', '俯身划船', 'bent over row', 'bb row', '划船'], category: 'back' },
  { name: 'Dumbbell Row', aliases: ['哑铃划船', 'dumbbell row', '单臂划船', 'db row', 'one arm row'], category: 'back' },
  { name: 'Pull Up', aliases: ['引体向上', 'pull up', 'pullup', '引体', '宽握引体', '正手引体', 'pull-ups'], category: 'back' },
  { name: 'Chin Up', aliases: ['反手引体向上', 'chin up', 'chinup', '反手引体', '窄握引体'], category: 'back' },
  { name: 'Lat Pulldown', aliases: ['高位下拉', 'lat pulldown', '背阔下拉', '下拉', 'pulldown', 'lat pull'], category: 'back' },
  { name: 'Seated Cable Row', aliases: ['坐姿划船', 'seated row', 'cable row', '绳索划船', '坐姿绳索划船'], category: 'back' },
  { name: 'T-Bar Row', aliases: ['t杠划船', 't-bar row', 't bar row', 't杠'], category: 'back' },
  { name: 'Face Pull', aliases: ['面拉', 'face pull', '弹力带面拉', '绳索面拉', 'band face pull'], category: 'back' },

  // 肩部
  { name: 'Overhead Press', aliases: ['推举', 'overhead press', 'ohp', '杠铃推举', '站姿推举', 'barbell ohp', 'shoulder press'], category: 'shoulders' },
  { name: 'Dumbbell Shoulder Press', aliases: ['哑铃推举', 'db shoulder press', '坐姿哑铃推举', 'db ohp'], category: 'shoulders' },
  { name: 'Lateral Raise', aliases: ['侧平举', 'lateral raise', '哑铃侧平举', 'db lateral', '侧举'], category: 'shoulders' },
  { name: 'Front Raise', aliases: ['前平举', 'front raise', '哑铃前平举', 'db front raise'], category: 'shoulders' },
  { name: 'Rear Delt Fly', aliases: ['后束飞鸟', 'rear delt fly', '反向飞鸟', '俯身飞鸟', '后束'], category: 'shoulders' },
  { name: 'Arnold Press', aliases: ['阿诺德推举', 'arnold press', '旋转推举'], category: 'shoulders' },
  { name: 'Shrug', aliases: ['耸肩', 'shrug', '哑铃耸肩', 'barbell shrug', '杠铃耸肩'], category: 'shoulders' },

  // 手臂
  { name: 'Barbell Curl', aliases: ['杠铃弯举', 'barbell curl', 'bb curl', '二头弯举', '弯举'], category: 'arms' },
  { name: 'Dumbbell Curl', aliases: ['哑铃弯举', 'db curl', 'dumbbell curl', '交替弯举', '锤式弯举', 'hammer curl'], category: 'arms' },
  { name: 'Preacher Curl', aliases: ['牧师凳弯举', 'preacher curl', '斜板弯举'], category: 'arms' },
  { name: 'Tricep Pushdown', aliases: ['三头下压', 'tricep pushdown', '绳索下压', 'cable pushdown', '三头绳索'], category: 'arms' },
  { name: 'Skull Crusher', aliases: ['碎颅者', 'skull crusher', '仰卧臂屈伸', '杠铃臂屈伸', 'ez bar extension'], category: 'arms' },
  { name: 'Close Grip Bench', aliases: ['窄距卧推', 'close grip bench', '窄握卧推', 'cg bench'], category: 'arms' },

  // 核心
  { name: 'Plank', aliases: ['平板支撑', 'plank', '平板', '肘支撑'], category: 'core' },
  { name: 'Crunch', aliases: ['卷腹', 'crunch', '仰卧起坐', 'sit up', '腹部卷腹'], category: 'core' },
  { name: 'Hanging Leg Raise', aliases: ['悬垂举腿', 'hanging leg raise', '悬垂抬腿', 'leg raise'], category: 'core' },
  { name: 'Russian Twist', aliases: ['俄罗斯转体', 'russian twist', '坐姿转体'], category: 'core' },
  { name: 'Dead Bug', aliases: ['死虫式', 'dead bug', 'deadbug'], category: 'core' },
  { name: 'Ab Wheel', aliases: ['健腹轮', 'ab wheel', '腹肌轮', '滚轮'], category: 'core' },

  // 有氧/体能
  { name: 'Running', aliases: ['跑步', 'running', '慢跑', 'jogging', '有氧跑', 'cardio run'], category: 'cardio' },
  { name: 'Burpee', aliases: ['波比跳', 'burpee', 'burpees', '立卧撑'], category: 'cardio' },
  { name: 'Jump Rope', aliases: ['跳绳', 'jump rope', 'skipping', 'rope'], category: 'cardio' },
  { name: 'Rowing', aliases: ['划船机', 'rowing', 'rowing machine', 'erg', 'concept2'], category: 'cardio' },
  { name: 'Cycling', aliases: ['骑行', 'cycling', 'bike', '动感单车', '单车', 'spin bike'], category: 'cardio' },
  { name: 'Kettlebell Swing', aliases: ['壶铃摇摆', 'kettlebell swing', 'kb swing', '壶铃'], category: 'cardio' },
  { name: 'Box Jump', aliases: ['跳箱', 'box jump', '跳箱子', 'box jumps'], category: 'cardio' },
  { name: 'Mountain Climber', aliases: ['登山者', 'mountain climber', '登山步', '登山跑'], category: 'cardio' },
];

// 根据用户输入匹配标准名称
export function normalizeExercise(input: string): string {
  if (!input || !input.trim()) return '';
  const clean = input.trim();

  // 精确匹配标准名
  const exact = EXERCISE_DICTIONARY.find(
    e => e.name.toLowerCase() === clean.toLowerCase()
  );
  if (exact) return exact.name;

  // 别名匹配
  for (const entry of EXERCISE_DICTIONARY) {
    const allNames = [entry.name, ...entry.aliases];
    for (const alias of allNames) {
      if (alias.toLowerCase() === clean.toLowerCase()) return entry.name;
      if (alias.toLowerCase().includes(clean.toLowerCase()) && clean.length >= 3) return entry.name;
      if (clean.toLowerCase().includes(alias.toLowerCase()) && alias.length >= 3) return entry.name;
    }
  }

  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

// 翻译矫正动作名：中文 → 英文
export function translateExerciseName(name: string, lang: string): string {
  if (lang === 'en') {
    const entry = EXERCISE_DICTIONARY.find(
      e => e.name.toLowerCase() === name.toLowerCase()
    );
    if (entry) return entry.name; // dictionary name is already English
    return name; // fallback
  }
  return name; // zh: keep original
}

// 翻译矫正动作描述
const DESC_TRANSLATIONS: Record<string, { en: string }> = {
  '纠正肩部肌力不平衡，弱侧加练': { en: 'Correct shoulder muscle imbalance, focus on weaker side' },
  '均衡发展三角肌中束': { en: 'Balanced development of medial deltoid' },
  '加强上背部稳定性': { en: 'Strengthen upper back stability' },
  '放松脊柱和肩部紧张': { en: 'Relieve spine and shoulder tension' },
  '加强肩后束和肩袖': { en: 'Strengthen rear delts and rotator cuff' },
  '核心+单侧负重稳定': { en: 'Core + unilateral load stability' },
  '改善胸椎灵活性': { en: 'Improve thoracic spine mobility' },
  '全方位肩袖强化': { en: 'Full range rotator cuff strengthening' },
  '激活深层颈屈肌，纠正头部前伸': { en: 'Activate deep neck flexors, correct forward head' },
  '强化颈后肌群': { en: 'Strengthen posterior neck muscles' },
  '用毛巾垫颈仰卧5分钟': { en: 'Lie on back with towel under neck for 5 min' },
  '缓慢侧倾头部拉伸': { en: 'Slow lateral neck stretch' },
  '核心稳定 + 颈胸联动': { en: 'Core stability + neck-thoracic coordination' },
  '弹力带辅助练习': { en: 'Resistance band assisted exercise' },
  '仰卧慢速抬离地面': { en: 'Slow supine head lift from ground' },
  '每小时做10次下颌内收': { en: '10 chin tucks every hour' },
  '门框式胸肌和肱二头肌拉伸': { en: 'Doorway chest and bicep stretch' },
  '加强肩后束和菱形肌': { en: 'Strengthen rear delts and rhomboids' },
  '激活菱形肌和中下斜方': { en: 'Activate rhomboids and mid-low traps' },
  '仰卧在泡沫轴上前后滚动': { en: 'Roll on foam roller supine' },
  '俯卧撑结束位加上肩胛前伸': { en: 'Push-up with scapular protraction at top' },
  '加强肩袖外旋肌': { en: 'Strengthen rotator cuff external rotators' },
  '宽握距强调菱形肌': { en: 'Wide grip to emphasize rhomboids' },
  '肩胛骨贴墙滑动': { en: 'Scapular wall slides' },
  '激活臀大肌，纠正前倾': { en: 'Activate glutes, correct anterior tilt' },
  '核心稳定训练': { en: 'Core stability training' },
  '半跪姿拉伸髂腰肌': { en: 'Half-kneeling hip flexor stretch' },
  '提高腰椎灵活性': { en: 'Improve lumbar spine mobility' },
  '加强后链肌群': { en: 'Strengthen posterior chain' },
  '核心抗旋转': { en: 'Anti-rotation core exercise' },
  '强力激活臀大肌': { en: 'Powerful glute activation' },
  '放松大腿外侧': { en: 'Release lateral thigh' },
  '加强股四头肌，膝关节稳定': { en: 'Strengthen quads, stabilize knee' },
  '激活臀中肌': { en: 'Activate gluteus medius' },
  '增强本体感觉和下肢稳定': { en: 'Enhance proprioception and lower body stability' },
  '坐姿体前屈拉伸': { en: 'Seated forward bend hamstring stretch' },
  '单侧力量和稳定': { en: 'Unilateral strength and stability' },
  '臀中肌强化': { en: 'Gluteus medius strengthening' },
  '后链肌群单侧加强': { en: 'Unilateral posterior chain strengthening' },
  '下犬式拉伸小腿': { en: 'Downward dog calf stretch' },
  '改善筋膜健康和灵活性': { en: 'Improve fascial health and mobility' },
  '平板支撑 + 死虫式': { en: 'Plank + dead bug' },
  '纠正圆肩含胸': { en: 'Correct rounded shoulders' },
  '激活臀部改善骨盆位': { en: 'Activate glutes to improve pelvic position' },
  '体前负重，控制深度': { en: 'Front-loaded, controlled depth' },
  '加强背部肌群': { en: 'Strengthen back muscles' },
  '单侧力量平衡': { en: 'Unilateral strength balance' },
  '整体协调和柔韧': { en: 'Overall coordination and flexibility' },
};

export function translateExerciseDescription(desc: string, lang: string): string {
  if (lang === 'en') {
    const t = DESC_TRANSLATIONS[desc];
    return t ? t.en : desc;
  }
  return desc;
}

// 根据输入搜索匹配建议
export function suggestExercises(query: string, limit = 8): { name: string; category: string }[] {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase();
  const results: { name: string; category: string; score: number }[] = [];

  for (const entry of EXERCISE_DICTIONARY) {
    // 标准名匹配得分
    if (entry.name.toLowerCase() === q) { results.push({ name: entry.name, category: entry.category, score: 100 }); continue; }
    if (entry.name.toLowerCase().startsWith(q)) { results.push({ name: entry.name, category: entry.category, score: 80 }); continue; }
    if (entry.name.toLowerCase().includes(q)) { results.push({ name: entry.name, category: entry.category, score: 50 }); continue; }

    // 别名匹配
    for (const alias of entry.aliases) {
      if (alias.toLowerCase() === q) { results.push({ name: entry.name, category: entry.category, score: 90 }); break; }
      if (alias.toLowerCase().startsWith(q)) { results.push({ name: entry.name, category: entry.category, score: 60 }); break; }
      if (alias.toLowerCase().includes(q)) { results.push({ name: entry.name, category: entry.category, score: 30 }); break; }
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(r => ({ name: r.name, category: r.category }));
}
