# NeonFit Posture Fusion — 完整执行计划

## 项目目标

将两个现有项目融合为一个统一的健身房/工作室管理工具：
- **NeonFit Studio Manager**（React 19 + Vite + Tailwind CSS 仪表盘）
- **Posture Assessment**（Flask + MediaPipe 体态评估系统）

最终产出：一个面向平板/桌面端的教练管理平台，核心功能是为每位会员生成 3-4 页的 PDF 训练报告（含训练记录 + 体态评估 + AI 建议）。

---

## 一、技术架构

```
┌─────────────────────────────────────────────────────────┐
│                    前端 (React 19 + Vite)                 │
│  UI: Tailwind CSS (Zinc-950 深色主题 + Lime-500 点缀)     │
│  路由: react-router-dom (HashRouter)                      │
│  图表: Recharts                                          │
│  PDF: @react-pdf/renderer 或 jsPDF + html2canvas          │
│  数据: IndexedDB (Dexie.js 封装) → 未来可选 Supabase      │
├─────────────────────────────────────────────────────────┤
│                    后端 (Python Flask)                     │
│  体态检测: MediaPipe Pose (本地运行)                       │
│  图像预处理: OpenCV (CLAHE + 多次推理融合)                  │
│  API: RESTful JSON                                       │
├─────────────────────────────────────────────────────────┤
│                    AI 服务层 (可配置)                      │
│  文字报告/建议: Gemini / DeepSeek / Kimi / OpenAI 兼容    │
│  视觉分析: Gemini Pro Vision (可选增强)                    │
│  体态检测: MediaPipe (本地，不走云端)                       │
└─────────────────────────────────────────────────────────┘
```

---

## 二、数据模型

### 前端 TypeScript 类型定义

```typescript
// 会员
interface Member {
  id: string;
  name: string;
  avatar: string;
  joinDate: string; // YYYY-MM-DD
  gender: 'male' | 'female';
  heightCm: number;
  workouts: Workout[];
  assessments: PostureAssessment[];
  photoUrl?: string;
}

// 训练记录
interface Workout {
  id: string;
  date: string; // YYYY-MM-DD
  exercise: string;
  weight: number; // kg
  sets: number;
  reps: number;
}

// 体态评估
interface PostureAssessment {
  id: string;
  date: string; // YYYY-MM-DD
  frontImage: string; // base64 或 blob URL
  sideImage: string;
  backImage?: string;
  report: PostureReport;
  correctionPlan: CorrectionPlan;
  aiRecommendation?: string;
}

// 体态报告
interface PostureReport {
  score: number; // 0-100
  confidence: number;
  issues: PostureIssue[];
}

interface PostureIssue {
  name: string; // 如 "高低肩"
  nameEn: string; // 如 "Shoulder Height Imbalance"
  value: number;
  unit: string;
  severity: '正常' | '中度' | '严重' | '低置信度';
  description: string;
  descriptionEn: string;
  exercises: string[];
  confidence: number;
}

// 矫正计划
interface CorrectionPlan {
  week1_2: Exercise[];
  week3_4: Exercise[];
}

interface Exercise {
  name: string;
  description: string;
  sets: string; // 如 "3x15" 或 "3x30s"
}

// AI 配置
interface AIProviderConfig {
  provider: 'gemini' | 'deepseek' | 'kimi' | 'openai-compatible';
  apiKey: string;
  baseUrl: string;
  modelName: string;
}
```

---

## 三、页面结构与路由

```
/ (根路由)
├── LoginPage          — 登录页
├── Dashboard          — 主仪表盘 (选中会员后显示)
│   ├── MetricCards    — 月训练次数 / 最大重量 / 总容量
│   ├── HistoryChart   — 训练趋势图 (Recharts)
│   ├── WorkoutForm    — 记录训练 (仅教练)
│   └── WorkoutHistory — 训练历史列表
├── PostureAssess      — 体态评估页 ⭐ 新增
│   ├── PhotoUpload    — 三张照片上传区
│   ├── AnalysisResult — 评分 + 问题列表 + 严重度
│   └── CorrectionPlan — 4周矫正方案
├── MemberReport       — 综合报告页 ⭐ 新增
│   ├── ReportPreview  — PDF 预览
│   └── ExportButton   — 导出 PDF
├── AIAdvisor          — AI 教练建议
└── Settings           — 设置页 ⭐ 新增
    ├── AIConfig       — AI 提供商配置
    ├── StudioConfig   — 工作室名称/Logo
    └── DataManage     — 数据导入导出
```

---

## 四、PDF 报告结构（3-4 页）

### 第 1 页：封面 + 会员概览
```
┌──────────────────────────────────────┐
│  [工作室 Logo / 名称]                 │
│                                      │
│  会员训练报告                          │
│  ─────────────────                   │
│  姓名: 张三                           │
│  入会日期: 2024-03-15                 │
│  评估日期: 2025-05-18                 │
│                                      │
│  ┌─────────┐ ┌─────────┐ ┌────────┐ │
│  │ 本月训练 │ │ 最大重量 │ │ 总容量  │ │
│  │   12次   │ │  85 kg  │ │ 42.5k  │ │
│  └─────────┘ └─────────┘ └────────┘ │
│                                      │
│  [训练容量趋势图 - 最近6个月]          │
│                                      │
└──────────────────────────────────────┘
```

### 第 2 页：体态评估结果
```
┌──────────────────────────────────────┐
│  体态评估                             │
│  综合评分: 72 / 100                   │
│                                      │
│  ┌────────┐ ┌────────┐ ┌────────┐   │
│  │ 正面照  │ │ 侧面照  │ │ 背面照  │   │
│  │(标注)   │ │(标注)   │ │(标注)   │   │
│  └────────┘ └────────┘ └────────┘   │
│                                      │
│  检测结果:                            │
│  ⚠️ 高低肩: 3.2° (中度)              │
│  🔴 头前引: CVA 41° (严重)            │
│  ⚠️ 含胸圆肩: 10.2% (中度)           │
│  ✅ 骨盆倾斜: 1.8° (正常)            │
│  ...                                 │
└──────────────────────────────────────┘
```

### 第 3 页：矫正训练方案
```
┌──────────────────────────────────────┐
│  4周矫正训练方案                       │
│                                      │
│  ▎第1-2周 (放松激活)                   │
│  ├─ 下颌内收 3x10                    │
│  ├─ 胸肌拉伸 3x30s                   │
│  ├─ 弹力带面拉 3x15                  │
│  └─ 胸椎伸展 3x10                    │
│                                      │
│  ▎第3-4周 (强化整合)                   │
│  ├─ 墙天使 3x10                      │
│  ├─ 俯身 Y-T-W 3x10                 │
│  └─ Push-up Plus 3x10               │
│                                      │
│  ▎AI 综合建议                         │
│  "根据您的训练记录，近期以推类动作为主   │
│   (卧推、肩推)，建议增加拉类动作比例... │
│   结合体态评估发现的含胸圆肩问题..."     │
│                                      │
└──────────────────────────────────────┘
```

### 第 4 页（可选）：训练记录明细
```
┌──────────────────────────────────────┐
│  近期训练记录                          │
│                                      │
│  日期       动作        重量  组×次    │
│  ─────────────────────────────────   │
│  05-15  卧推          80kg  4×8      │
│  05-15  哑铃飞鸟      16kg  3×12     │
│  05-13  深蹲          100kg 5×5      │
│  05-13  腿举          120kg 4×10     │
│  ...                                 │
│                                      │
│  ─────────────────────────────────   │
│  [工作室名称] | 生成日期: 2025-05-18  │
└──────────────────────────────────────┘
```

---

## 五、实现步骤（按优先级排序）

### Phase 1: 基础架构改造（1-2天）

1. **路由系统升级**
   - 从单页面改为多页面路由 (react-router-dom)
   - 侧边栏增加导航: 仪表盘 / 体态评估 / 报告导出 / 设置

2. **本地数据层**
   - 安装 `dexie` (IndexedDB 封装库)
   - 创建 `services/localDatabase.ts`，实现与 cloudDatabase.ts 相同的接口
   - 数据表: members, workouts, posture_assessments, ai_config
   - 环境变量 `VITE_DB_MODE=local` 时使用本地存储

3. **数据模型扩展**
   - types.ts 中增加 PostureAssessment, PostureReport, PostureIssue, CorrectionPlan 等类型
   - Member 接口增加 gender, heightCm, assessments[] 字段

### Phase 2: 体态评估集成（2-3天）

4. **Flask 后端整合**
   - 将 posture_assessment/backend/ 复制到项目中作为子目录
   - 确保 Flask 服务可独立启动 (python backend/app.py)
   - 前端通过 `VITE_POSTURE_API_URL` 环境变量配置后端地址

5. **体态评估页面**
   - 新建 `components/PostureAssess.tsx`
   - 三区域照片上传 (拖拽 + 点击)
   - 上传后显示预览缩略图
   - "开始分析" 按钮 → 调用 Flask API → 显示结果
   - 结果展示: 评分环形图 + 问题列表 (严重度颜色标记)

6. **矫正计划展示**
   - 新建 `components/CorrectionPlan.tsx`
   - 从 posture_assessment 的 EXERCISE_LIBRARY 迁移到前端
   - 分 week1-2 / week3-4 两个 Tab 展示
   - 每个动作显示: 名称、描述、组次

### Phase 3: AI 服务层（1-2天）

7. **AI Provider 抽象层**
   - 新建 `services/aiProvider.ts`
   - 统一接口:
     ```typescript
     interface AIProvider {
       generateText(prompt: string, context?: string): Promise<string>;
       analyzeImage?(images: string[], prompt: string): Promise<string>;
     }
     ```
   - 实现 GeminiProvider (已有基础)
   - 实现 OpenAICompatibleProvider (兼容 DeepSeek/Kimi)
   - 工厂函数根据配置创建对应 Provider

8. **AI 配置页面**
   - 新建 `components/Settings/AIConfig.tsx`
   - 表单: 选择提供商 → 填写 API Key / Base URL / Model
   - "测试连接" 按钮验证配置
   - 配置保存到 IndexedDB

9. **AI 建议生成**
   - 体态评估完成后，自动调用 AI 生成综合建议
   - Prompt 模板: 传入体态问题 + 最近10条训练记录
   - 失败时 fallback 到规则引擎的矫正方案

### Phase 4: PDF 报告导出（2-3天）⭐ 核心

10. **PDF 生成方案选择**
    - 推荐方案: `jsPDF` + `html2canvas`
      - 优点: 可以直接渲染 React 组件为 PDF，保持深色主题
      - 安装: `npm install jspdf html2canvas`
    - 备选方案: `@react-pdf/renderer`
      - 优点: 纯 React 声明式，矢量输出
      - 缺点: 不支持 Tailwind，需要重写样式

11. **报告预览页面**
    - 新建 `components/MemberReport.tsx`
    - 在页面中用 React 组件渲染报告的 4 个 section
    - 每个 section 对应 PDF 的一页
    - 预览模式: 在浏览器中展示报告内容
    - 导出模式: 点击按钮 → html2canvas 截图 → jsPDF 拼接 → 下载

12. **报告内容组件**
    - `components/Report/CoverPage.tsx` — 封面 + 统计卡片 + 趋势图
    - `components/Report/PosturePage.tsx` — 体态照片 + 评分 + 问题列表
    - `components/Report/PlanPage.tsx` — 矫正方案 + AI 建议
    - `components/Report/HistoryPage.tsx` — 训练记录明细表格

13. **PDF 样式**
    - 深色背景 (Zinc-950)，Lime-500 点缀
    - A4 尺寸 (210mm × 297mm)
    - 字体: 中文用系统字体，英文用 Inter/sans-serif
    - 每页有页眉(工作室名) + 页脚(页码 + 日期)

### Phase 5: 稳定性与体验优化（1-2天）

14. **错误处理**
    - Flask 后端: 所有接口统一错误格式 `{ success: false, error: "..." }`
    - 前端: 全局错误边界 (ErrorBoundary)
    - 网络请求: 超时处理 (15s)、重试机制 (最多2次)
    - 图片上传: 格式/大小/分辨率前端预校验

15. **加载状态**
    - 体态分析: 进度条 + "正在分析正面照..." 等阶段提示
    - PDF 生成: 进度指示器
    - AI 建议: 流式输出或 skeleton loading

16. **离线支持**
    - Service Worker 缓存静态资源
    - IndexedDB 存储所有业务数据
    - 离线时隐藏需要网络的功能 (AI 建议)，其余正常使用

17. **性能优化**
    - 图片压缩: 上传前压缩到 1920px 宽度以内
    - 懒加载: 训练历史分页加载
    - 体态照片: 存储为 blob，不用 base64 字符串

---

## 六、关键依赖包

```json
{
  "新增依赖": {
    "dexie": "^4.0.0",           // IndexedDB 封装
    "jspdf": "^2.5.1",           // PDF 生成
    "html2canvas": "^1.4.1",     // DOM 截图
    "react-dropzone": "^14.2.0"  // 拖拽上传
  },
  "已有依赖(保留)": {
    "@google/genai": "^1.38.0",
    "react": "^19.2.3",
    "react-router-dom": "^7.12.0",
    "recharts": "^3.6.0",
    "xlsx": "latest"
  },
  "后端(Python)": {
    "mediapipe": "0.10.14",
    "opencv-python": "4.10.0.84",
    "numpy": "1.26.4",
    "flask": "3.0.3",
    "flask-cors": "4.0.1"
  }
}
```

---

## 七、环境变量

```env
# .env.local
VITE_DB_MODE=local                          # local | cloud
VITE_POSTURE_API_URL=http://localhost:5000   # Flask 后端地址
VITE_AI_PROVIDER=gemini                     # gemini | deepseek | kimi | openai
VITE_GEMINI_API_KEY=你的Key
VITE_DEEPSEEK_API_KEY=你的Key               # 可选
VITE_DEEPSEEK_BASE_URL=https://api.deepseek.com  # 可选

# 未来云端模式
VITE_SUPABASE_URL=                          # 留空则不启用
VITE_SUPABASE_ANON_KEY=
```

---

## 八、文件结构（融合后）

```
neonfit-studio-manager/
├── backend/                          # Flask 体态分析后端
│   ├── app.py
│   ├── posture_analyzer.py
│   ├── food_analyzer.py
│   ├── models/
│   └── requirements.txt
├── components/
│   ├── AIAdvisor.tsx                 # 已有
│   ├── HistoryChart.tsx              # 已有
│   ├── ImageUpload.tsx               # 已有
│   ├── LoginPage.tsx                 # 已有
│   ├── MetricCard.tsx                # 已有
│   ├── Sidebar.tsx                   # 改造: 增加导航项
│   ├── WorkoutForm.tsx               # 已有
│   ├── WorkoutHistory.tsx            # 已有
│   ├── PostureAssess.tsx             # ⭐ 新增: 体态评估页
│   ├── CorrectionPlan.tsx            # ⭐ 新增: 矫正方案
│   ├── MemberReport.tsx              # ⭐ 新增: 报告预览+导出
│   ├── Settings/                     # ⭐ 新增
│   │   ├── AIConfig.tsx
│   │   ├── StudioConfig.tsx
│   │   └── DataManage.tsx
│   └── Report/                       # ⭐ 新增: PDF 报告组件
│       ├── CoverPage.tsx
│       ├── PosturePage.tsx
│       ├── PlanPage.tsx
│       └── HistoryPage.tsx
├── services/
│   ├── authService.ts                # 已有
│   ├── cloudDatabase.ts              # 已有 (云端模式)
│   ├── mockDatabase.ts               # 已有
│   ├── localDatabase.ts              # ⭐ 新增: IndexedDB
│   ├── postureService.ts             # ⭐ 新增: 调用 Flask API
│   ├── aiProvider.ts                 # ⭐ 新增: AI 抽象层
│   ├── pdfGenerator.ts               # ⭐ 新增: PDF 生成
│   ├── exerciseLibrary.ts            # ⭐ 新增: 运动库数据
│   ├── geminiService.ts              # 已有 (改造为 Provider)
│   └── supabaseClient.ts             # 已有
├── App.tsx                           # 改造: 增加路由
├── types.ts                          # 改造: 增加体态类型
├── constants.ts                      # 改造: 增加翻译
├── index.html
├── package.json
└── vite.config.ts
```


---

## 九、给 DeepSeek AI 的执行提示词

以下是你可以直接复制给 DeepSeek 的提示词，让它接管执行：

---

```
你是一个高级全栈开发工程师。我需要你帮我将两个现有项目融合为一个统一的健身房管理工具。请严格按照以下要求执行。

## 项目背景

我有两个项目需要融合：
1. NeonFit Studio Manager — React 19 + Vite + Tailwind CSS 的健身工作室管理仪表盘
2. Posture Assessment — Python Flask + MediaPipe 的体态评估系统

融合后的工具面向健身房教练，核心功能是：
- 管理会员训练记录
- 上传3张体态照片（正面/侧面/背面）进行AI体态评估
- 为每位会员导出3-4页的PDF训练报告

## 技术栈

- 前端: React 19 + TypeScript + Vite + Tailwind CSS
- 后端: Python Flask (体态检测用 MediaPipe，本地运行)
- 数据存储: IndexedDB (Dexie.js)，本地优先
- PDF生成: jsPDF + html2canvas
- AI: Gemini API (训练建议文字生成)，可配置切换到 DeepSeek/Kimi
- 图表: Recharts
- UI主题: 深色 (Zinc-950 背景, Lime-500 点缀, zinc-100 文字)

## 你需要做的事情（按顺序）

### Step 1: 数据层改造
- 在 services/ 下创建 localDatabase.ts，使用 Dexie.js 封装 IndexedDB
- 实现与现有 cloudDatabase.ts 相同的接口 (getMembers, addMember, deleteMember, addWorkouts, updateWorkout, deleteWorkout)
- 新增体态评估相关方法: saveAssessment, getAssessments, deleteAssessment
- 在 types.ts 中新增类型: PostureAssessment, PostureReport, PostureIssue, CorrectionPlan, Exercise, AIProviderConfig
- Member 接口增加: gender ('male'|'female'), heightCm (number), assessments (PostureAssessment[])

### Step 2: 路由与导航
- App.tsx 改为多页面路由结构 (react-router-dom HashRouter)
- 路由: / → 仪表盘, /posture → 体态评估, /report → 报告导出, /settings → 设置
- Sidebar.tsx 增加导航项: 仪表盘、体态评估、报告导出、设置
- 当前选中的导航项高亮 (Lime-500)

### Step 3: 体态评估页面
- 新建 components/PostureAssess.tsx
- 三个照片上传区域 (正面/侧面/背面)，支持拖拽和点击上传
- 上传后显示预览缩略图
- 输入身高(cm)和性别
- "开始分析"按钮 → POST 到 Flask 后端 /api/analyze
- 分析结果展示: 环形评分图(0-100) + 问题列表(颜色标记严重度)
- 矫正方案展示: 分 week1-2 / week3-4 两个Tab

### Step 4: AI Provider 抽象层
- 新建 services/aiProvider.ts
- 定义统一接口: generateText(prompt, context?) → Promise<string>
- 实现 GeminiProvider: 调用 @google/genai
- 实现 OpenAICompatibleProvider: 兼容 DeepSeek/Kimi (POST /v1/chat/completions)
- 工厂函数: createAIProvider(config: AIProviderConfig) → AIProvider
- 新建 components/Settings/AIConfig.tsx: 配置表单 + 测试连接按钮

### Step 5: PDF 报告生成 ⭐ 最重要
- 新建 services/pdfGenerator.ts
- 新建 components/MemberReport.tsx (报告预览页)
- 新建 components/Report/ 目录下4个组件:
  - CoverPage.tsx: 工作室名 + 会员信息 + 3个统计卡片 + 6个月趋势图
  - PosturePage.tsx: 体态评分 + 3张照片(带标注) + 问题列表
  - PlanPage.tsx: 4周矫正方案 + AI综合建议文字
  - HistoryPage.tsx: 最近训练记录表格
- PDF生成流程:
  1. 渲染4个Report组件到隐藏的DOM容器 (每个固定A4尺寸)
  2. html2canvas 逐页截图
  3. jsPDF 将截图拼接为PDF
  4. 触发浏览器下载: "{会员名}_Report_{日期}.pdf"
- 报告样式: 深色背景(#09090b), Lime点缀(#a3e635), 白色文字
- 每页有页眉(工作室名) + 页脚(页码 + 生成日期)

### Step 6: 稳定性增强
- 全局 ErrorBoundary 组件，捕获渲染错误显示友好提示
- 网络请求统一封装: 超时15s, 失败重试1次, 统一错误格式
- 图片上传前端校验: 格式(JPEG/PNG), 大小(<10MB), 分辨率(>640x480)
- 图片压缩: 上传前用 canvas 压缩到 1920px 宽度以内
- 体态分析加载状态: 进度提示 "正在检测关键点..."
- PDF生成加载状态: 进度条
- AI请求失败时 fallback 到规则引擎矫正方案
- IndexedDB 存储异常时的错误提示

### Step 7: 双语支持扩展
- constants.ts 的 TRANSLATIONS 增加所有新增页面的翻译
- 体态问题名称双语: 高低肩/Shoulder Height Imbalance 等
- PDF报告跟随当前语言设置
- 设置页面的标签双语

## 重要约束

1. 保持现有 NeonFit 的 UI 风格不变 (深色主题, Lime点缀)
2. 所有新组件使用 Tailwind CSS，不引入额外 CSS 框架
3. 数据默认存本地 (IndexedDB)，不强制要求网络
4. Flask 后端独立运行，前端通过环境变量配置地址
5. AI 功能是增强项，没有 API Key 时系统仍可正常使用
6. 代码中文注释，变量名英文
7. 每个新文件顶部加简要注释说明用途

## 现有代码参考

- 现有数据库接口参考: services/cloudDatabase.ts
- 现有 AI 调用参考: services/geminiService.ts
- 现有 UI 组件风格参考: components/MetricCard.tsx, components/Sidebar.tsx
- 体态分析 API 接口: POST /api/analyze, body: { front_image, side_image, back_image, height_cm, gender }
- 体态分析返回格式: { success: true, data: { score, confidence, issues: [{name, value, unit, severity, description, exercises}] } }

请从 Step 1 开始，逐步实现。每完成一个 Step，告诉我完成了什么，然后继续下一个。
```

---

## 十、注意事项

1. **Flask 后端需要单独启动** — 前端开发时需要 `python backend/app.py` 在后台运行
2. **MediaPipe 依赖较重** — 首次安装 `pip install mediapipe opencv-python` 可能需要几分钟
3. **PDF 深色主题** — html2canvas 截图时确保背景色正确渲染，可能需要设置 `backgroundColor` 参数
4. **图片存储** — IndexedDB 存储 base64 图片会占用较多空间，建议压缩后存储，或使用 Blob
5. **Gemini Vision** — 如果想让 Gemini 直接看体态照片给建议（而不只是看数据），需要用 `gemini-pro-vision` 模型
6. **DeepSeek 不支持图片** — DeepSeek 只能处理文字，体态分析必须走 MediaPipe，DeepSeek 只能用来生成文字建议

---

## 十一、验收标准

- [ ] 能添加会员、记录训练、查看统计图表（现有功能保持正常）
- [ ] 能上传3张体态照片并获得评分和问题列表
- [ ] 能查看4周矫正训练方案
- [ ] 能配置 AI 提供商并获得 AI 训练建议
- [ ] 能导出3-4页的 PDF 报告（含训练统计 + 体态评估 + 矫正方案）
- [ ] PDF 报告视觉效果专业，深色主题，排版整洁
- [ ] 中英文切换正常，PDF 跟随语言
- [ ] 离线状态下除 AI 功能外其余正常使用
- [ ] 平板端（iPad 横屏）布局正常，触控友好
