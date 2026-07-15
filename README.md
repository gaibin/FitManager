# NeonFit Studio Manager

专为健身房教练打造的一体化管理工具。融合会员训练追踪与 **标志点辅助摄影测量 V2**，支持证据照片、2.5D 骨架和 PDF 报告。V2 用于健身筛查与个人趋势，不是医学诊断或多相机三角测量。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite 6 |
| 样式 | Tailwind CSS（CDN） |
| 数据 | IndexedDB（Dexie.js）— 本地优先，可选 Supabase |
| 图表 | Recharts |
| PDF | jsPDF + html2canvas |
| AI | Gemini / DeepSeek / Kimi（可配置） |
| 后端 | Python Flask + MediaPipe（体态检测，独立运行） |

---

## 项目架构

```
neonfit-studio-manager/
│
├── index.html                    # HTML 入口：挂载 root + Tailwind CDN
├── index.tsx                     # React 挂载点：ReactDOM.createRoot
├── App.tsx                       # 路由根组件（HashRouter）
│                                 #   路由: / /posture /report /settings
├── types.ts                      # 全部 TypeScript 类型定义
│                                 #   Member, Workout, PostureAssessment,
│                                 #   PostureReport, PostureIssue,
│                                 #   CorrectionPlan, Exercise, AIProviderConfig
├── constants.ts                  # 双语翻译字典（180+ 条）+ 种子数据初始化
├── vite.config.ts                # Vite 配置：base='./', 别名 @/, 端口 3000
├── tsconfig.json                 # TypeScript 配置：ES2022, react-jsx
├── .env.example                  # 环境变量模板
├── package.json                  # 前端依赖声明
│
├── 📁 components/                # ========== React UI 组件 ==========
│
│   ├── LoginPage.tsx             # 登录页面（Supabase 认证）
│   ├── Sidebar.tsx               # 侧边栏：导航菜单 + 会员列表 + 用户信息
│   ├── Dashboard.tsx             # 仪表盘主页：统计卡片 + 趋势图 + 训练表单
│   ├── MetricCard.tsx            # 统计卡片组件（月训练/最大重量/总容量）
│   ├── WorkoutForm.tsx           # 记录训练表单（日期/动作/重量/组/次）
│   ├── WorkoutHistory.tsx        # 训练历史列表（按月份筛选）
│   ├── HistoryChart.tsx          # 训练趋势图（Recharts LineChart）
│   ├── AIAdvisor.tsx             # AI 教练建议组件（调用 Kimi API）
│   ├── ImageUpload.tsx           # 会员体态照片上传组件
│   ├── PostureAssess.tsx         # 体态评估页面：上传3张照片 + 评分环形图
│   │                             #   + 问题列表 + 4周矫正方案 Tab
│   ├── MemberReport.tsx          # PDF 报告预览 + 导出（含进度条）
│   ├── Settings.tsx              # 设置页面（3个 Tab: AI/工作室/数据管理）
│   │
│   ├── 📁 Report/                # PDF 5 页专业报告组件
│   │   ├── CoverPage.tsx         # P1 执行摘要：会员信息、训练量与评估摘要
│   │   ├── PosturePage.tsx       # P2 证据：原比例真人三视图、节点与角度线
│   │   ├── FindingsPage.tsx      # P3 量化结果：方向、不确定度、置信度与训练优先级
│   │   ├── PlanPage.tsx          # P4 处方：第1–2周控制、第3–4周负荷整合
│   │   └── HistoryPage.tsx       # P5 训练记录、执行审计与复评准备
│   │
│   └── 📁 Settings/              # 设置子组件
│       └── AIConfig.tsx          # AI 提供商：Gemini/DeepSeek/Kimi 切换 + API Key 配置 + 测试连接
│
├── 📁 services/                  # ========== 数据与服务层 ==========
│
│   ├── localDatabase.ts          # IndexedDB（Dexie.js）本地数据库
│   │                             #   - 表: members, workouts, assessments, configs
│   │                             #   - 方法: getMembers, addMember, deleteMember,
│   │                             #     addWorkouts, updateWorkout, deleteWorkout
│   │                             #     saveAssessment, getAssessments, deleteAssessment
│   │                             #     saveAIConfig, getAIConfig, getStudioConfig
│   ├── cloudDatabase.ts          # Supabase 云端数据库（同接口，云端模式使用）
│   ├── mockDatabase.ts           # 内存模拟数据库（demo 模式，含20个种子会员）
│   ├── authService.ts            # 登录认证（Supabase users 表 + SHA-256）
│   ├── postureService.ts         # Flask 后端 API 封装
│   │                             #   - /api/analyze（体态分析）
│   │                             #   - /api/health（健康检查）
│   │                             #   - 超时 15s + 错误处理
│   ├── aiProvider.ts             # AI 抽象层：统一接口 generateText()
│   │                             #   - GeminiProvider（@google/genai）
│   │                             #   - OpenAICompatibleProvider（REST API）
│   │                             #   - createAIProvider() 工厂函数
│   │                             #   - testAIProvider() 连接测试
│   ├── exerciseLibrary.ts        # 规则引擎矫正方案（AI 不可用时 fallback）
│   │                             #   - 5种常见体态问题 + 默认方案
│   │                             #   - matchCorrectionPlan() 按关键词匹配
│   ├── pdfGenerator.ts           # PDF 生成：html2canvas 截图 → jsPDF 拼接 → 下载
│   ├── excelService.ts           # 训练记录导出为 .xlsx 文件
│   ├── geminiService.ts          # Kimi API 调用（旧版，供 AIAdvisor 使用）
│   ├── supabaseClient.ts         # Supabase 客户端初始化
│   ├── seedData.ts               # 种子数据：20个会员 + 渐进式训练记录
│   └── createUsersTable.sql      # Supabase 建表 SQL
│
├── 📁 backend/                   # ========== Python Flask 后端 ==========
│   ├── app.py                    # Flask API 服务
│   │                             #   POST /api/analyze — 体态分析（3张照片）
│   │                             #   POST /api/analyze/keypoints — 关键点分析
│   │                             #   GET  /api/health — 服务健康检查
│   │                             #   POST /api/food/analyze — 食物热量识别
│   │                             #   GET  /api/food/config — 食物分析配置
│   ├── posture_analyzer.py       # MediaPipe Pose 体态分析引擎（~54KB）
│   │                             #   检测项目：高低肩/头前引/含胸/骨盆/膝等
│   ├── food_analyzer.py          # 食物热量识别（MobileNetV2 + ONNX）
│   ├── requirements.txt          # Python 依赖
│   └── 📁 models/                # ML 模型文件
│       ├── imagenet_classes.txt  # ImageNet 类别标签
│       └── mobilenetv2-7.onnx   # ONNX 模型（14MB, gitignored）
│
├── 📁 assets/
│   └── dashboard-preview.png     # 仪表盘预览图
│
├── 📁 scripts/
│   ├── generatePasswordHash.cjs  # 密码哈希生成脚本（CommonJS）
│   └── generatePasswordHash.js   # 密码哈希生成脚本（ESM）
│
└── EXECUTION_PLAN.md             # 完整融合执行计划文档
```

---

## 快速开始

### 1. 前端

```bash
npm install
cp .env.example .env.local
npm run dev           # → http://localhost:3000
```

`.env.local` 中的关键配置：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_DB_MODE` | 数据模式: `mock`(演示) / `local`(本地) / `cloud`(云端) | `mock` |
| `VITE_POSTURE_API_URL` | Flask 后端地址 | `http://localhost:5000` |
| `VITE_POSTURE_V2_ENABLED` | 教练试点功能开关 | `true` |
| `VITE_KIMI_API_KEY` | Kimi API Key（AI 教练用） | — |

**数据模式说明：**

- `mock` — 内存模拟，加载 20 个种子会员数据，无需任何配置即可使用
- `local` — IndexedDB 本地存储，刷新不丢数据，离线可用
- `cloud` — Supabase 云端，需配置 `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`

### 2. Flask 后端（体态分析）

```bash
cd backend
pip install -r requirements.txt    # 首次需要（含 mediapipe + opencv）
python app.py                      # → http://localhost:5000
```

V2 后端可用环境变量：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `POSTURE_V2_ENABLED` | 后端功能开关，`false` 时 V2 接口返回 404 | `true` |
| `POSE_LANDMARKER_MODEL` | MediaPipe `pose_landmarker_heavy.task` 绝对路径 | 未配置时使用 legacy heavy |
| `POSTURE_VALIDATED_METRICS` | 已通过本项目可靠性门槛的指标 ID，逗号分隔 | 空（全部实验性） |

未通过试点验证的指标仍展示原始角度与不确定度，并保持 `validated=false`、`trackable=false`，不进入趋势指数。趋势可比性与训练处方相互独立：只要评估成功，系统就会按统一的角度排序、问卷、训练经验、器械和频率生成教练参考处方；照片是否标准化只影响连续趋势比较。模型配置见 `backend/models/pose_landmarker/README.md`，试点统计见 `backend/validation/README.md`。

> 体态分析是可选功能，不启动后端时系统其他功能仍可正常使用。

### 3. AI 配置（可选）

在设置页（Settings → AI Config）配置：

- **Gemini**: 选择 Gemini，输入 API Key 即可（免费额度可用）
- **DeepSeek / Kimi**: 选择后填写 API Key + Base URL + Model Name
- 不配置 AI 时，系统使用规则引擎提供矫正方案，功能不受影响

---

## 数据模型

### Member（会员）

```typescript
{
  id: string;            // UUID
  name: string;          // 姓名
  avatar: string;        // 头像 URL
  joinDate: string;      // 入会日期 YYYY-MM-DD
  gender: 'male' | 'female';
  heightCm: number;      // 身高 (cm)
  workouts: Workout[];   // 训练记录
  assessments: PostureAssessment[];  // 体态评估记录
}
```

### PostureAssessment（体态评估）

```typescript
{
  id: string;
  date: string;
  frontImage: string;    // base64 缩略图
  sideImage: string;
  backImage?: string;
  schemaVersion: 2;
  protocolVersion: string;
  report: PostureReport;             // 原始角度 + 可空趋势指数
  capture: PostureCapture;           // 协议和质量状态
  views: Record<string, PostureViewResult>; // 节点、标志点、坐标变换
  measurements: PostureMeasurement[];
  reconstruction: PostureReconstruction;   // 2.5D 估算
  recommendation: PostureRecommendation;   // 教练审核草案
}
```

---

## 常见问题

**Q: 页面打开是空白/乱码？**  
A: 检查网络连接。旧版 index.html 使用了 `esm.sh` CDN 加载 React 库，已移除该配置。如果使用旧版本，请更新 index.html 确保没有 import map。

**Q: 登录页面无法跳过？**  
A: 开发模式下 `App.tsx` 最上方有 `const DEV_SKIP_AUTH = true`，设置为 `true` 即可绕过登录直接使用管理员面板。

**Q: 体态分析按钮没反应？**  
A: 确保 Flask 后端已启动（`python backend/app.py`），且 `.env.local` 中 `VITE_POSTURE_API_URL` 指向正确的地址（默认 `http://localhost:5000`）。

**Q: AI 建议无法生成？**  
A: 在设置页配置 API Key，或检查网络能否访问对应的 AI 服务。没有 API Key 时系统仍可正常使用，仅 AI 建议功能不可用。
