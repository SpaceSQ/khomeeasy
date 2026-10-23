KHomeEasy 欧洲 KNX 智能家居项目 —— Cursor 开发交底书 (Technical Handover Spec)1. 项目定位与核心设计宪章 (Project Charter)项目代号：KHomeEasy目标市场：首发 DACH 德语区（德国、奥地利，支持 de-DE / en-GB），后续扩展瑞士与英国。不含北美与中国市场。   一句话定位：让不懂 KNX 的欧洲独栋业主，在 30 分钟内搞清“KNX 适不适合我家、大概要花多少钱、该问服务商什么”，生成标准化需求书（RFQ）对接 3 家本地合格 KNX 服务商，并在报价对比、合同、验收各环节拥有一位“中立懂行的朋友”。   终端形态：Web 优先（Next.js 响应式，承载 SEO 与建筑师大屏协作 + 服务商工作台） + iOS/Android 轻客户端（Expo / React Native，面向业主随身陪伴与推送），共享 Supabase 后端。   五大合规与安全铁律（必须写入系统底层逻辑与 Prompt）：中立排序（EU P2B 条例 & Omnibus 指令）：服务商匹配排序仅依据客观参数（地理距离、KNX 官方等级、验证案例数、响应时间），严禁竞价排名。任何付费推广位必须硬编码标记 Sponsored。   证据分级（E1–E4）：所有展示给用户的方案对照与服务商事实，必须绑定证据徽章（E1 官方/法规 > E3 平台核验 > E2 厂商目录 > E4 公开未核验），前端必须用“形状+文字”双重区分（满足 WCAG 2.2 AA 无障碍标准），且支持点击查看来源 URL 与核实日期。   德国 UWG §4 防诋毁与 GDPR 第 14 条：对服务商只展示可引用的客观事实卡片，严禁 AI 生成主观评分（如“专业度 4.5 星”）。未认领的 Silver 级伙伴严禁展示联系方式（与 KNX 官方地图保持一致）。   欧盟 AI Act 第 50 条透明度：AI 对话、AI 报价解析、AI 摘要首次出现时必须显著声明“由 AI 生成”，且接口返回的数据结构及导出文件需携带机器可读元数据标记（如 ai_generated: true）。   安全与法律免责红线（德国 NAV §13 / 英国 Part P）：系统严禁输出任何 230V 市电接线图、配电箱改造指南或 ETS 软件具体编程步骤。触及此类问题一律触发固定拦截模板：“须由持证电工或合格 KNX Partner 完成”。KNX 文字提及需在页脚全局声明商标归属（KNX and ETS are registered trademarks of KNX Association cvba Belgium），未获书面许可前严禁使用 KNX 官方 Logo 图标。   2. 极简低风险收费方案设计 (Low-Risk Monetization Strategy)为了在早期实现“最易执行、法律风险最小、快速获得预期现金流”，MVP 阶段摒弃复杂的交易抽佣和按条计费，采用以下纯工具化收费架构：收费对象产品包名称价格设定（假设）核心交付物与权限为什么最易执行且法律风险最低？C 端业主Free Tier（免费引流层）€0M1 8题适配问诊、中立系统对照（KNX vs Loxone vs Matter）、M2 房间卡片点选、M3 粗略预算区间预览。   零门槛承接德语区 SEO 流量（如搜索 KNX Kosten Einfamilienhaus），快速完成用户注册与项目建档。   C 端业主Project Pro Pass（项目全周期通行证，一次性买断）€79 / 项目（一次性付费，非订阅）1. 导出带防锁死条款的专业德/英双语 标准 RFQ（PDF + 专属在线回填链接）；   2. 解锁 3 家报价结构化对比引擎（M6） 与追问清单生成；   3. 解锁 防锁定合同要点与 ETS/Keyring 交付物验收清单（M7）。   1. 痛点极痛：花 €79 避免在 €20,000 的项目里被坑或漏拿 .knxkeys 密钥（参考奥地利最高院 OGH 8Ob121/15z 判例痛点），业主付费意愿极强；   2. 法律定性纯粹：属于售卖“数字文档模板与比价软件工具”，不构成工程居间或法律咨询，无连带纠纷；   3. 开发极简：一个 Stripe Checkout / Apple IAP 单次购买状态位 is_pro_unlocked = true 即可控制全局权限。B 端服务商Basic Claim（免费认领档）€0认领公开档案、更正事实卡片、上传资质证照（升 E3 级）、每年免费接收并回复最多 2 份业主主动发来的 RFQ。解决双边市场冷启动问题，配合 GDPR 第 14 条告知邮件邀请 DACH 区 4,300+ 家 Gold/Platinum 伙伴零成本入驻。   B 端服务商Partner Workbench Pro（专业工作台 SaaS 订阅）€89 / 月（早期创始伙伴前 6 个月免费）1. 无限量接收业主定向发送的标准化 RFQ 并使用结构化报价工具；   2. 展示经核验的 E3 级实景案例库与“创始伙伴”徽章（严禁影响自然排序）；   3. 区域市场预算热度分析看板。   1. 彻底规避线索退费扯皮：不按条卖线索，只收固定 SaaS 软件月费（开具标准欧盟 B2B Reverse Charge 发票）；2. 合规透明：不买排名，完全符合欧盟 P2B 条例第 5 条要求。   3. 推荐技术栈 (Tech Stack for Cursor)为了最大化复用你们现有的工程经验，并兼顾 Web 端（SEO/建筑师/服务商工作台）与 App 端（业主随身使用）：Monorepo 架构：Turborepo (apps/web, apps/mobile, packages/shared-types, packages/scoring-engine)Web 端（主力端 & B 端工作台）：Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, next-intl (德语 de / 英语 en 国际化)   移动 App 端（C 端业主陪伴）：React Native (Expo SDK 51+), Expo Router, NativeWind后端与数据库：Supabase (PostgreSQL — 强制部署于法兰克福 eu-central-1 节点以满足 GDPR, Supabase Auth, pgvector 向量检索, Storage)   核心确定性引擎：纯 TypeScript 编写的 packages/scoring-engine（负责适配度计算、设备点位粗估、预算区间计算、报价差异高亮，严禁让 LLM 直接口算价格）   AI 与文档处理：OpenAI API / Claude API（仅用于受控 RAG 问答、事实卡片摘要改写、报价单追问建议），@react-pdf/renderer（服务端生成德/英双语标准 RFQ 与验收清单 PDF）   支付集成：Stripe（Web 端支持欧洲主流 SEPA、Klarna、信用卡及 B2B 订阅发票） + RevenueCat（iOS/Android 端内购解锁 Project Pro Pass）4. 核心数据库 Schema 设计 (Supabase PostgreSQL)可直接让 Cursor 在 supabase/migrations/0001_init_khomeeasy.sql 中执行：SQL-- 启用必要扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 证据等级枚举 (E1: 官方/法规, E2: 厂商官方, E3: 平台核验, E4: 公开未核验)
CREATE TYPE evidence_level AS ENUM ('E1', 'E2', 'E3', 'E4');
CREATE TYPE project_stage AS ENUM ('cognition', 'planning', 'rfq_sent', 'quoting', 'contracting', 'construction', 'handover', 'maintenance');
CREATE TYPE knx_partner_rank AS ENUM ('Silver', 'Gold', 'Platinum');

-- 1. 用户表 (业主 / 建筑师 / 服务商管理员)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('homeowner', 'architect', 'installer', 'admin')) DEFAULT 'homeowner',
  full_name TEXT,
  locale TEXT DEFAULT 'de-DE', -- 'de-DE', 'en-GB'
  country_code TEXT DEFAULT 'DE', -- 'DE', 'AT', 'CH', 'GB'
  postal_code TEXT, -- 隐私最小化：仅存邮编，精确地址不入库
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 业主项目表 (核心状态机)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Mein KNX Projekt',
  stage project_stage NOT NULL DEFAULT 'cognition',
  build_type TEXT NOT NULL CHECK (build_type IN ('new_build', 'renovation', 'unsure')),
  construction_phase TEXT CHECK (construction_phase IN ('design', 'shell_construction', 'finished')), -- 毛坯阶段布线窗口极关键
  area_sqm INTEGER,
  selected_tier TEXT CHECK (selected_tier IN ('good', 'better', 'best')) DEFAULT 'better',
  fit_assessment_json JSONB, -- 存储 M1 的 8 道题答案与适配结论
  budget_estimate_json JSONB, -- 存储 M3 计算出的区间与来源引用
  is_pro_unlocked BOOLEAN DEFAULT FALSE, -- 是否已支付 €79 解锁 Project Pro Pass
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 房间与功能卡片表 (M2)
CREATE TABLE project_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  room_type TEXT NOT NULL, -- 'living_room', 'bedroom', 'kitchen', 'bathroom', 'hallway', 'technical_room'
  room_name TEXT NOT NULL,
  wiring_feasibility TEXT DEFAULT 'wired_possible' CHECK (wiring_feasibility IN ('wired_possible', 'rf_only', 'unsure')), -- 改造场景专用
  features_json JSONB NOT NULL DEFAULT '{}'::jsonb, 
  -- 示例: {"lighting": "dimming", "shading": "blinds", "hvac": "floor_heating", "sensors": ["presence", "co2"]}
  sort_order INTEGER DEFAULT 0
);

-- 4. 服务商目录表 (M5 & B端工作台)
CREATE TABLE installers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claimed_by_user_id UUID REFERENCES profiles(id),
  company_name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  service_radius_km INTEGER DEFAULT 50,
  knx_official_rank knx_partner_rank NOT NULL,
  is_contact_public BOOLEAN DEFAULT FALSE, -- Silver 默认为 FALSE，严格遵守官方隐私限制
  public_email TEXT,
  public_website TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
  is_founding_partner BOOLEAN DEFAULT FALSE,
  avg_response_hours INTEGER,
  verified_projects_count INTEGER DEFAULT 0,
  gdpr_art14_notified_at TIMESTAMPTZ, -- 记录 GDPR 第14条告知时间
  opted_out BOOLEAN DEFAULT FALSE, -- 服务商一键下架标志
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 服务商事实卡片表 (幻觉控制与 UWG 合规核心)
CREATE TABLE installer_fact_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  installer_id UUID NOT NULL REFERENCES installers(id) ON DELETE CASCADE,
  fact_category TEXT NOT NULL, -- 'official_rank', 'brand_cert', 'cedia_member', 'grid_registration', 'verified_case'
  fact_text_de TEXT NOT NULL,
  fact_text_en TEXT NOT NULL,
  evidence evidence_level NOT NULL,
  source_url TEXT NOT NULL,
  verified_at DATE NOT NULL,
  expires_at DATE NOT NULL, -- 默认 90 天有效期，过期降级或隐藏
  is_disputed BOOLEAN DEFAULT FALSE
);

-- 6. 标准化询价单 (RFQ - M4)
CREATE TABLE rfqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  rfq_version INTEGER DEFAULT 1,
  mandatory_deliverables_json JSONB NOT NULL DEFAULT '{
    "ets_project_file": true,
    "project_password": true,
    "bcu_password": true,
    "knx_secure_keyring": true,
    "group_address_doc": true,
    "handover_training": true
  }'::jsonb, -- 防锁定核心默认必选项
  disclosed_fields_json JSONB NOT NULL, -- 用户明确勾选授权披露给服务商的字段
  share_token TEXT UNIQUE NOT NULL, -- 供服务商免登录/登录后结构化回填的加密 Token
  pdf_storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 结构化报价与对比表 (M6)
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  installer_id UUID NOT NULL REFERENCES installers(id),
  status TEXT DEFAULT 'invited' CHECK (status IN ('invited', 'viewed', 'submitted', 'declined')),
  decline_reason TEXT,
  -- 强制分项结构化报价 (单位: EUR/GBP/CHF)
  currency TEXT DEFAULT 'EUR',
  cost_materials NUMERIC(10,2),        -- 硬件材料费
  cost_ets_programming NUMERIC(10,2),  -- ETS 编程费
  ets_programming_hours NUMERIC(6,1),  -- 预估编程工时
  ets_hourly_rate NUMERIC(6,2),        -- 编程时薪
  cost_installation NUMERIC(10,2),     -- 布线与安装费
  cost_commissioning NUMERIC(10,2),    -- 现场调试与文档费
  total_price NUMERIC(10,2) GENERATED ALWAYS AS (
    COALESCE(cost_materials,0) + COALESCE(cost_ets_programming,0) + COALESCE(cost_installation,0) + COALESCE(cost_commissioning,0)
  ) STORED,
  proposed_brands TEXT[],              -- 如 ['MDT', 'Gira', 'JUNG']
  commits_ets_handover BOOLEAN DEFAULT FALSE, -- 是否承诺移交 ETS 源文件
  commits_keyring_handover BOOLEAN DEFAULT FALSE, -- 是否承诺移交 .knxkeys
  warranty_months INTEGER DEFAULT 24,
  raw_pdf_path TEXT,
  submitted_at TIMESTAMPTZ
);

-- 8. 合同与交付物验收清单表 (M7)
CREATE TABLE handover_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('contract_signing', 'final_acceptance')),
  items_json JSONB NOT NULL, -- 逐项打勾状态：ETS文件、密码、Keyring、点位表、照片存档
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
5. 核心功能模块与算法逻辑规范 (M1–M7 & M10)在 Cursor 中开发 packages/scoring-engine 时，请严格按照以下确定性逻辑实现：5.1 M1：KNX 适配判断与中立系统对照引擎输入（8 道问诊题）：   房屋性质（新建 / 深度翻新 / 已完工局部改造）   当前所处阶段（建筑设计期 / 毛坯水电前 / 已封墙）   房屋面积与房间数（<120㎡ / 120–250㎡ / >250㎡）   核心诉求优先级（照明调光、电动遮阳、分室地暖温控、能源管理光伏联动、家庭影院）   预算心理区间（<€5k / €5k–15k / €15k–30k / >€30k）   长期抗锁定诉求（“即使原安装商倒闭，10 年后换任何一家电工都能维护，且有 500+ 品牌可选”）   对自己动手（DIY）的态度（完全交给专业电工 vs 喜欢自己折腾脚本）   所在国家/邮编   确定性判定规则：若 已封墙 且 预算 < €5k 且 喜欢自己折腾 $\rightarrow$ 适配度：低（推荐 Matter / Aqara / Home Assistant）。   若 新建/深度翻新 且 预算 €5k–10k 且 对多品牌互通无执念 $\rightarrow$ 适配度：中（并列展示 KNX 入门档 与 Loxone 独栋套装起价约 €5,000 的对照）。   若 新建/毛坯水电前 且 预算 ≥ €15k 且 强抗锁定诉求 $\rightarrow$ 适配度：高（强烈推荐 KNX TP 双绞线方案，并高亮提示“必须在毛坯阶段与强电同步预埋绿色总线”）。   输出约束：对照表（KNX vs Loxone vs Control4 vs Matter）不打综合总分，每格必须携带 EvidenceBadge（如 E1: ISO/IEC 14543-3、E4: Bau-Lex 2025）。   5.2 M2 & M3：房间卡片与 Good / Better / Best 预算区间引擎降维交互：禁止让用户选择“8路开关执行器”或“DALI 网关”。用户只按房间勾选功能开关（如客厅：调光照明 + 百叶窗控制 + 恒温控制）。   三档动态映射算法：Good（实用基础档）：仅覆盖核心回路开关、基础电动卷帘、重点区域温控。   Better（主流舒适档，默认高亮“适合大多数新建独栋”）：增加重点区域调光、全屋单房间独立温控、墙面多键智能面板与基础场景、人体存在感应。   Best（全能旗舰档）：全屋 DALI/调光色温、气象站追光遮阳联动、CO₂/温湿度新风联动、中控屏可视化及光伏/充电桩能源管理。   预算区间计算公式（以德国独栋为例，严禁输出精确到个位的单一数字）：   底层锚定公开核实基准（如德国 Bau-Lex 2025 口径：材料 €5k–15k + ETS 编程 €2k–5k + 布线安装 €3k–10k = 合计 €10k–30k；英国 Home Automate 口径：4 卧整屋起价 £28,000）。   根据用户所选房间卡片折算出的估算点位数（Actuator Channels + Sensors）与厂商公开目录标价（MDT / Gira / ABB / JUNG 的 E2 级目录标价）进行交叉校验，输出 [Low_Bound, High_Bound] 区间（步进取整到 €500）。   强制UI标注：价格卡片下方必须固定显示小字声明：“基于公开行业数据（Bau-Lex 2025 / KNX Planning Guide 调查）及厂商目录标价粗估，不含灯具与窗帘电机本体，非最终成交价，不确定性幅度 ±25%”。   5.3 M4：防锁死标准化需求书（RFQ）生成器用户支付 €79（或处于测试白名单）后解锁导出。   生成一份德/英双语 PDF 及一个带唯一 share_token 的 Web 链接（如 khomeeasy.eu/rfq/fill/[token]）。   核心护城河条款（默认全部勾选，用户若取消勾选需弹窗红色风险警告）：   完工尾款支付前，服务商必须移交完整的 ETS6 项目导出文件（.knxproj）；   必须移交 ETS 项目管理员密码 与 设备 BCU 密码（引用奥地利最高法院判例 OGH 8Ob121/15z 精神，防止捆绑效应 Knebelungseffekt）；   若使用加密设备，必须移交 KNX Secure 密钥环文件（.knxkeys）及全部设备 25 位 FDSK 出厂证书；   要求服务商必须按 “硬件材料 / ETS 编程工时与单价 / 布线安装 / 现场调试与文档” 四个标准篮子分项回填报价。   5.4 M6：多家报价结构化对比与追问引擎当最多 3 家服务商通过专属链接回填报价后，系统自动生成横向对比矩阵：   缺项高亮：对照 RFQ 房间功能清单，标出哪家漏报了某个房间的温控或传感器。   异常偏离提示：若某家“ETS 编程费”显著低于 €1,500 或高于 €6,000，标记黄色提示“偏离区域常见区间（€2k–5k）”。   交付物风险红灯：若某服务商将 commits_ets_handover 或 commits_keyring_handover 设为 false，直接标红警告：“⚠️ 存在后期运维被锁死风险，未来接入 Home Assistant 或更换服务商将极其困难”。   通俗追问清单生成：一键生成一段得体的德语/英语邮件草稿，供业主复制发给服务商追问差异点。   5.5 M10：受控 RAG AI 顾问（严格防幻觉与 AI Act 合规）交互入口：全局悬浮抽屉，携带当前所在页面（如 M1 对照表、M3 预算页、M6 比价页）的 JSON 上下文。   合规拦截器（Guardrails）：会话首屏固定横幅：🤖 欧盟 AI 法案（Article 50）披露：您正在与 KHomeEasy AI 顾问交互，所有回答均基于平台经核实的知识库生成并附带来源引用。   意图分类器检测到“怎么接 230V 线”、“ETS 怎么设置组地址参数”、“帮我审合同法律效力”时，直接短路返回预设安全模板，不调用大模型生成自由文本。   6. 给 Cursor 的全局规则配置文件 (.cursorrules)请在项目根目录创建 .cursorrules 文件，将以下内容完整粘贴进去，让 Cursor 在写每一行代码时都严格受控：Markdown# KHomeEasy - Cursor AI Development Rules (.cursorrules)

You are the Lead Full-Stack Architect building **KHomeEasy**, a neutral European KNX Smart Home Project Decision & Dual-Sided Installer Marketplace platform targeting DACH (Germany, Austria, Switzerland) and the UK.

## 1. Core Architecture & Tech Stack
- **Monorepo**: Turborepo with `apps/web` (Next.js 14 App Router, TypeScript, Tailwind, shadcn/ui, next-intl) and `apps/mobile` (Expo / React Native).
- **Backend**: Supabase (PostgreSQL hosted in Frankfurt `eu-central-1`, Auth, Storage, pgvector).
- **Business Logic**: All price calculations, KNX point estimations, and system fit scoring MUST live in `packages/scoring-engine` using pure, deterministic TypeScript functions. NEVER use LLMs to calculate budgets or totals.
- **Languages**: First-class i18n support for German (`de-DE`) and English (`en-GB`). Never hardcode UI strings; always use translation keys.

## 2. Strict Legal, Regulatory & Safety Guardrails (NON-NEGOTIABLE)
1. **Evidence Grading (E1-E4) & WCAG 2.2 AA**:
   - Every factual claim, system comparison cell, budget range, and installer credential MUST render with an `<EvidenceBadge level="E1|E2|E3|E4" sourceUrl="..." verifiedAt="YYYY-MM-DD" />` component.
   - Badges MUST use distinct geometric shapes + text labels (not just color) to comply with WCAG 2.2 AA.
2. **German UWG §4 & GDPR Art. 14 (Installer Profiles)**:
   - NEVER generate or display subjective AI ratings/scores (e.g., "4.5/5 professionalism") for installers.
   - Installer profiles may ONLY display verifiable `installer_fact_cards` with source URLs and expiration dates.
   - If an installer has `knx_official_rank === 'Silver'` and `claimed_by_user_id === null`, NEVER expose their email, phone, or street address in the API or UI.
3. **EU P2B Regulation & Omnibus Directive (Ranking Transparency)**:
   - Installer sorting must ONLY use transparent parameters: `distance`, `knx_official_rank`, `verified_projects_count`, and `avg_response_hours`.
   - Paid subscriptions (`subscription_tier === 'pro'`) MUST NEVER boost organic ranking score. Any paid placement must be explicitly separated and badged as `Sponsored`.
4. **EU AI Act Article 50 Compliance**:
   - Any AI chat interface or AI-generated summary must display a clear disclosure banner and attach machine-readable metadata (`data-ai-generated="true"` in HTML, and standard XMP/metadata in generated PDFs).
5. **Electrical Safety & Legal Boundaries (German NAV §13 / UK Part P)**:
   - NEVER generate DIY 230V wiring instructions, distribution board (Verteilerkasten) layouts, or step-by-step ETS programming tutorials.
   - Always append legal disclaimers to contract/handover checklists: "For informational purposes only; does not constitute legal advice."
6. **KNX Trademark Compliance**:
   - Do NOT use the official KNX Association logo image anywhere in the UI until a license flag is enabled. Include the mandatory footer text: "KNX and ETS are registered trademarks of KNX Association cvba Belgium."

## 3. Monetization Implementation Rules (Low-Risk MVP)
- Do NOT build escrow, transaction commission splitting, or pay-per-lead bidding systems in MVP.
- **C-Side Monetization**: Implement a single one-time payment (`Project Pro Pass`, €79 via Stripe Checkout / RevenueCat) that flips `projects.is_pro_unlocked = true`, unlocking PDF RFQ export, the 3-quote comparison matrix (M6), and the ETS/Keyring handover checklist (M7).
- **B-Side Monetization**: Implement a flat SaaS subscription (`Partner Workbench Pro`, €89/mo via Stripe Billing with EU VAT Reverse Charge support) allowing claimed installers to receive unlimited RFQs and submit structured quotes.
7. Cursor 分步开发执行指令集 (Step-by-Step Prompts)项目初始化后，你可以按以下 5 个阶段（Phases） 依次复制 Prompt 给 Cursor Composer (Cmd + I) 推进开发：Phase 1：搭建基础设施、数据库与证据徽章组件库Prompt 给 Cursor："请读取 .cursorrules 与 PROJECT_BRIEF.md。第一步：初始化 Supabase 迁移文件 0001_init_khomeeasy.sql 并生成对应的 TypeScript 类型定义。第二步：在 apps/web 中配置 next-intl（支持 de 和 en，默认 de），并开发全局核心合规组件：1) <EvidenceBadge/>（支持 E1-E4 四种形状图标+文字+Popover展示来源链接与核实日期，符合 WCAG 2.2 AA）；2) <SafetyDisclaimerBanner/>（含德国 NAV §13 施工资质提示与 KNX 商标声明）；3) <AiActDisclosure/>（符合欧盟 AI Act 第 50 条要求）。"Phase 2：开发确定性方案与预算引擎 (packages/scoring-engine) + M1/M2/M3 页面Prompt 给 Cursor："现在我们在 packages/scoring-engine 中编写纯 TypeScript 的确定性计算模块，严禁调用 LLM：实现 evaluateSystemFit(answers)：接收 M1 的 8 道问诊题，输出适配等级（High/Medium/Low）、3条核心理由、布线时间窗口警告，以及 KNX vs Loxone vs Control4 vs Matter 的结构化对照数据（每项必须带 E1-E4 来源元数据）。实现 calculateBudgetRange(project, rooms, tier)：根据用户添加的房间功能卡片（照明、遮阳、温控、传感器），映射 Good/Better/Best 三档配置，结合德国（Bau-Lex €10k-30k 基准）与英国（£28k 基准）及厂商公开目录标价，计算材料费、ETS 编程费（单列 €2k-5k 区间）、布线安装费的高低带宽，并输出导致超支的 5 个风险因素。在 apps/web 中完成对应的向导式交互界面（包含预算滑杆实时联动房间覆盖状态），确保新用户在 10 分钟内免注册即可走完 M1-M3 并看到初步方案，点击保存时触发 Supabase 注册。"Phase 3：开发 C 端 €79 付费墙与 M4 标准 RFQ 生成器（含防锁死条款）Prompt 给 Cursor："现在开发 M4 标准化需求书（RFQ）模块与 Stripe 一次性付费墙（Project Pro Pass €79）：创建 RFQ 预览页，高亮展示‘防供应商锁定必选项’（移交 .knxproj 源文件、管理员密码、BCU 密码、.knxkeys 安全密钥环、组地址表，并引用奥地利 OGH 8Ob121/15z 判例背景解释为什么重要）。如果用户取消勾选任何一项，弹出红色高风险确认框。添加隐私披露确认面板（地址仅展示邮编，用户逐项勾选同意向服务商披露的字段）。集成 Stripe Checkout 单次支付，支付成功后更新 projects.is_pro_unlocked = true，使用 @react-pdf/renderer 生成德/英双语标准 RFQ PDF，并生成带唯一 share_token 的结构化报价邀请链接。"Phase 4：开发 B 端服务商认领工作台与 M5/M6 结构化报价对比矩阵Prompt 给 Cursor："现在开发 B 端服务商目录（M5）、服务商工作台（Section 8）及多家报价对比引擎（M6）：构建服务商匹配列表页：严格按地理距离、KNX 官方等级（Gold/Platinum）、验证案例数和响应时间排序，附上‘为什么推荐’的可解释标签，并提供‘排序机制说明’弹窗（满足欧盟 P2B 条例第 5 条）。对未认领的 Silver 伙伴隐藏一切联系方式。构建服务商免登录/认领报价回填页（/rfq/fill/[share_token]）：强制服务商按‘硬件材料、ETS编程工时×单价、安装、调试文档’四个字段回填，并明确勾选是否承诺移交 ETS 文件与 .knxkeys 密钥。同时提供服务商认领入口、事实卡片申诉更正表单（SLA 5个工作日）以及 GDPR 第 14 条一键退订下架功能。构建业主端的 M6 报价对比矩阵页：并列展示最多 3 家报价，自动高亮缺项、编程费偏离度，对未承诺移交 ETS/Keyring 的报价亮红灯警告，并一键生成德语/英语追问清单。"Phase 5：开发 M7 合同/验收清单与 M10 受控 RAG AI 顾问Prompt 给 Cursor："最后开发 M7 合同与验收清单及 M10 AI 顾问模块：构建双阶段交互式 Checklist（签约前合同核对清单 + 竣工移交验收清单），支持业主按房间打勾确认功能，逐项核验 ETS 文件、密码、Keyring、接线图与培训是否到位，支持导出 PDF 供双方签字确认（底部强制附带非法律意见免责声明）。构建基于 Supabase pgvector 的受控 RAG 对话接口：仅检索经过人工审核的知识库切片与当前页面的事实卡片。每个回答气泡底部必须渲染所引用的 <EvidenceBadge/>。内置前置安全分类器：一旦检测到用户询问 230V 强电接线、配电箱改造或 ETS 编程实操步骤，立即拦截并返回安全合规提示模板。"💡 给兄弟的落地执行建议：第一批种子数据导入（M0/M1 冷启动）：在 Cursor 跑通上述 MVP 后，先针对慕尼黑、斯图加特、维也纳三个城市，只把 KNX 官方地图中公开了商务联系方式的 Gold 和 Platinum 级服务商 导入 installers 表（严格遵守你报告里的合规底线，不碰 Silver 的隐藏信息）。   人工顾问兜底首批 RFQ：在 B 端服务商还没大规模认领工作台前，只要有德国业主生成了 RFQ（甚至付了 €79 解锁了 Pro Pass），你们后台收到通知后，可以直接以平台顾问身份，拿着这份极其专业的德语标准 RFQ PDF 和在线回填链接，点对点发给当地 3 家 Gold 级服务商邀请报价。对德国电工企业来说，“不用跟不懂行的业主来回扯皮 10 个小时，直接拿到一份连房间点位、预算区间和分项格式都理得清清楚楚的优质独栋项目询价单”，他们点击链接回填报价的动力会非常强！   