---
name: 看拼音写汉字练习纸
description: A4 letterpress-style worksheet generator for Chinese primary school. Editor-grade tool, paper as the artifact.
colors:
  ink: "oklch(28% 0.012 250)"
  ink-soft: "oklch(45% 0.010 250)"
  ink-muted: "oklch(60% 0.008 250)"
  line: "oklch(85% 0.005 250)"
  line-soft: "oklch(92% 0.004 250)"
  surface: "oklch(99% 0.003 250)"
  surface-recessed: "oklch(96% 0.005 250)"
  surface-page: "oklch(96% 0.006 230)"
  paper: "oklch(98.5% 0.006 80)"
  paper-ink: "oklch(20% 0.005 250)"
  paper-rule: "oklch(56% 0.005 250)"
  paper-rule-soft: "oklch(70% 0.005 250)"
  paper-trace: "oklch(20% 0.005 250 / 0.22)"
  accent: "oklch(42% 0.045 220)"
  accent-deep: "oklch(35% 0.050 220)"
  accent-tint: "oklch(95% 0.012 220)"
  accent-glow: "oklch(42% 0.045 220 / 0.18)"
  caution: "oklch(85% 0.120 80)"
  caution-tint: "oklch(97% 0.040 80)"
  caution-deep: "oklch(40% 0.080 60)"
  danger: "oklch(48% 0.160 25)"
typography:
  ui-display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.005em"
  ui-label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "14px"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "normal"
  ui-body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  ui-hint:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  paper-title:
    fontFamily: "'Kaiti SC', 'STKaiti', 'KaiTi', 'Noto Serif CJK SC', serif"
    fontSize: "21pt"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.02em"
  paper-meta:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "10.5pt"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  paper-pinyin:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "13pt"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.01em"
  paper-cell:
    fontFamily: "'Kaiti SC', 'STKaiti', 'KaiTi', 'Noto Serif CJK SC', serif"
    fontSize: "24pt"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "6px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "18px"
  xl: "22px"
  page-pad: "14mm"
  cell: "13.2mm"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    typography: "{typography.ui-label}"
    rounded: "{rounded.md}"
    padding: "0 13px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.accent-deep}"
  button-secondary:
    backgroundColor: "{colors.surface-recessed}"
    textColor: "{colors.ink}"
    typography: "{typography.ui-label}"
    rounded: "{rounded.md}"
    padding: "0 13px"
    height: "40px"
  button-secondary-hover:
    backgroundColor: "{colors.line-soft}"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.ui-body}"
    rounded: "{rounded.md}"
    padding: "0 11px"
    height: "40px"
  input-field-focus:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
  chip-word:
    backgroundColor: "{colors.surface-recessed}"
    textColor: "{colors.ink}"
    typography: "{typography.ui-body}"
    rounded: "{rounded.md}"
    padding: "0 11px"
    height: "38px"
  chip-word-polyphone:
    backgroundColor: "{colors.caution-tint}"
    textColor: "{colors.ink}"
  pill-candidate:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.ui-hint}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
    height: "22px"
  pill-candidate-selected:
    backgroundColor: "{colors.accent-tint}"
    textColor: "{colors.accent-deep}"
  badge-polyphone:
    backgroundColor: "{colors.caution-tint}"
    textColor: "{colors.caution-deep}"
    typography: "{typography.ui-hint}"
    rounded: "{rounded.pill}"
    padding: "1px 7px"
  page-paper:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.paper-ink}"
    rounded: "0"
    padding: "14mm 14mm 13mm"
    width: "210mm"
    height: "297mm"
---

# Design System: 看拼音写汉字练习纸

## 1. Overview

**Creative North Star: "排字工作台 (The Press Composer)"**

想象一位铅字工人在公表厂灯下排版：每个汉字都是一块铅，调位、留白、校正都是仪式。屏幕上的左侧设置区是工作台、是工具箱；右侧的 A4 纸是正在排版的成品。所有 UI 元素的存在，是为了让那张纸更准确、更安静地落到纸面上。一旦设置完成，工作台就退到背后，纸张和字才是主角。

色彩克制到接近无色：UI 使用偏冷的深墨与浅瓷灰，主调是一种近于中文出版物里"墨青"的低饱和深青色，只在按钮、聚焦圈、选中态出现，从不喧哗。纸张本身用一抹暖白瓷色，与冷调 UI 形成区分，暗示"这是要打印的实物"。多音字校对区是工作台上的红头校对笔：用一抹琥珀色，提醒"这里需要看一眼"，不强迫不闪烁。

This system explicitly rejects: K12 在线教育产品的能量色 + 满屏卡片堆叠；学校 OA / 教育局信息系统的老旧蓝灰；Duolingo 路子的玩具化与弹性动画；开发者工具的黑背景 + 霓虹潮品。中文教学场景下，谁打开都不应出戏。

**Key Characteristics:**
- 工作台冷、纸张暖：全局 UI 偏冷调灰，纸张唯一暖白瓷色
- 主调"墨青"低饱和（OKLCH chroma ≤ 0.05），只用于交互可达的位置
- Flat-by-default：除 A4 预览纸的柔和阴影外，全局无阴影、无浮起
- 中文排版优先：拉丁字母与数字尺寸服务汉字，不喧宾夺主
- 工作台与成品视觉割裂：UI 颜色绝对不渗进打印输出

## 2. Colors

低饱和、偏冷调灰墨为底，墨青作单一行动色，琥珀作单一警示色，纸面独立暖白瓷。除墨青和琥珀外，全部 chroma ≤ 0.012。

> 颜色源以 OKLCH 为准（写在 frontmatter 中），目的是让低饱和色在不同显示器与打印机上保持一致。Stitch 的 linter 会就 OKLCH 给出 warning 而非 error，是预期行为；不要把 frontmatter 改回 hex。`.impeccable/design.json` 同步保存色阶 ramps。

### Primary
- **墨青 / Ink Cyan** (`oklch(42% 0.045 220)`)：唯一行动色。出现在主按钮、聚焦边框、选中候选拼音。任意一屏中占比 ≤ 8%。
- **墨青·深 / Ink Cyan Deep** (`oklch(35% 0.050 220)`)：主按钮 hover / pressed、链接 hover、选中态文字。
- **墨青·浅瓷 / Ink Cyan Wash** (`oklch(95% 0.012 220)`)：仅作选中态背景。绝不用作大面积装饰。

### Secondary (caution, not decorative)
- **琥珀 / Caution Amber** (`oklch(85% 0.12 80)`)：多音字提示边框。系统中唯一的警示色，不可挪用作其它角色。
- **琥珀·浅 / Caution Wash** (`oklch(97% 0.04 80)`)：多音字 chip 与 badge 背景。
- **琥珀·深 / Caution Ink** (`oklch(40% 0.08 60)`)：多音字 badge 文字与候选音节强调色。

### Neutral
- **墨 / Ink** (`oklch(28% 0.012 250)`)：UI 主文字、表单文字、标题。
- **墨·柔 / Ink Soft** (`oklch(45% 0.010 250)`)：次级文字、表单 label 颜色。
- **墨·灰 / Ink Muted** (`oklch(60% 0.008 250)`)：hint、status、占位符。
- **瓷 / Surface** (`oklch(99% 0.003 250)`)：controls 面板背景、表单输入背景。微微偏冷。
- **瓷·凹 / Surface Recessed** (`oklch(96% 0.005 250)`)：次按钮、字词 chip、详情区背景。
- **瓷·页 / Surface Page** (`oklch(96% 0.006 230)`)：浏览器外层背景。冷于纸张，让纸跳出来。
- **细线 / Line** (`oklch(85% 0.005 250)`)：表单与 chip 边框、面板分隔线。
- **细线·柔 / Line Soft** (`oklch(92% 0.004 250)`)：section 分隔、disclosure 边框。

### Paper Palette (print-grade only)
专属于 A4 预览与打印输出的色。**这些色绝不在 UI 中出现，UI 色也绝不进入纸面。**
- **纸 / Paper** (`oklch(98.5% 0.006 80)`)：A4 纸张本色。暖白瓷，区别于冷调 UI。
- **纸·墨 / Paper Ink** (`oklch(20% 0.005 250)`)：纸面正文与汉字。
- **纸·尺 / Paper Rule** (`oklch(56% 0.005 250)`)：田字格、米字格、横线的实线边。
- **纸·尺·虚 / Paper Rule Soft** (`oklch(70% 0.005 250)`)：田字格中线、米字格对角线（虚线）。
- **纸·描 / Paper Trace** (`oklch(20% 0.005 250 / 0.22)`)：描红字、抄写范字的浅灰描红色。

### 危险
- **危险 / Danger** (`oklch(48% 0.160 25)`)：仅用于 status 错误文字。系统中除多音字琥珀外的第二种饱和色，使用频率极低。

### Named Rules

**The One Voice Rule.** 墨青在任意一屏中占比 ≤ 8%。它的稀有正是它能引导眼睛的原因。当你想"再加一处墨青让它更有品牌感"时，删掉一处而非新增。

**The Two-World Rule.** UI 调色板和 Paper 调色板是两个独立的世界，不共用任何 token。UI 端的任何颜色（包括聚焦圈、按钮、警示）都绝不能在 .page 容器内出现；纸面的颜色（暖白瓷、灰墨实线）也不在 UI 控件上出现。两个世界的视觉割裂正是"工作台 / 成品"隐喻的具象化。

**The Caution-Solo Rule.** 琥珀只用在多音字相关元素上（chip 边框、badge、候选音节）。不要拿琥珀去做"待办事项""快捷入口"这类与多音字无关的标注。

## 3. Typography

**UI Font:** 系统栈 `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif`
**Paper Body / Pinyin Font:** 同上系统栈（与 UI 同栈，但出现在纸面上时尺寸与字距单独控制）
**Paper Display Font:** `'Kaiti SC', 'STKaiti', 'KaiTi', 'Noto Serif CJK SC', serif`（楷体）

**Character:** UI 端用系统中文 sans 是为了零加载、最大可读；纸张端用楷体是为了贴近"老师在黑板上写示范字"的手写感，也是孩子练字时心里的范字模样。两者刻意分工：UI 干净、扁平、像编辑器；纸面有手写温度、像范字纸。

> Linux 与部分 Windows 安装可能没有 Kaiti SC / STKaiti，回退到 `Noto Serif CJK SC` 后再到通用 serif。回退路径若再失败，纸面会变成宋体，会破坏"楷体范字"的隐喻。打包时如果加自托管字体，**只加 Kaiti**；不要为 UI 加 web font，编辑器气质来自系统字而不是定制字。

### Hierarchy
- **UI Display** (h1，22px, weight 600, line-height 1.25)：仅页面顶部 `<h1>看拼音写汉字练习纸</h1>` 一处。它本身就是品牌位。
- **UI Label** (14px, weight 650, line-height 1.4)：表单 label、按钮文字、section 标题。weight 650 不是 700：在中文里 700 太黑，650 在 PingFang SC 上仍能拉出层级感而不显粗野。
- **UI Body** (14px, weight 400, line-height 1.55)：input 输入文字、textarea、chip 内文字。
- **UI Hint** (12px, weight 400, line-height 1.45)：所有 `.hint` `.status` 提示文字。**不允许低于 12px**：家长老花会先在这里出问题。
- **Paper Title** (楷体, 21pt, weight 700, letter-spacing 0.02em)：纸面标题"看拼音写汉字"。
- **Paper Meta** (10.5pt, weight 400)：纸面姓名 / 日期 / 班级。
- **Paper Pinyin** (13pt, weight 400, letter-spacing 0.01em)：每个字格上方的拼音。声调符号必须可读，不可压字号至 12pt 以下。
- **Paper Cell** (楷体, 24pt)：田字格 / 米字格 / 横线格内的范字。
- **Paper Line Cell** (楷体, 23pt)：横线格变体内字号略小，因横线格视觉宽度更大。

### Named Rules

**The Pinyin-Above-13pt Rule.** 拼音字号永远 ≥ 13pt。声调符号（ā á ǎ à）在 12pt 以下会和元音粘在一起，孩子辨不清四声。这条比"省一行版面"重要。

**The 650-Not-700 Rule.** 中文 UI 标签、按钮、section 标题用 weight 650 而非 700。PingFang SC / Microsoft YaHei 在 700 时笔画过实，破坏"编辑器式安静"的气质；650 是兼顾层级与克制的平衡点。

**The Latin-Serves-Hanzi Rule.** 任何同行内出现的拉丁字母与数字（如"3年级 上册"）尺寸跟随汉字而不另设字号。不允许为"看起来更现代"把数字调成大号 grotesk。

## 4. Elevation

系统是 **flat-by-default**，但有且只有一个例外：A4 预览纸的柔和投影。这个投影是"工作台 / 成品"隐喻的视觉抓手——纸不是漂在 UI 里的元素，它躺在工作台上、有微弱的投影。其它所有元素（按钮、表单、chip、面板、卡片）一律无阴影、无 elevation 层级、无 hover-lift。

### Shadow Vocabulary
- **paper-rest** (`box-shadow: 0 18px 45px oklch(20% 0.005 250 / 0.16)`)：A4 预览纸唯一阴影。柔和、偏低、像桌面台灯下的投影。**只允许出现在 `.page` 元素上。**
- **focus-ring** (`box-shadow: 0 0 0 3px var(--accent-glow)`)：聚焦表单边外的墨青光晕。这不是阴影意义上的 elevation，而是键盘可达的可见反馈。无 lift、无 blur 偏移。

### Named Rules

**The One-Shadow Rule.** 整个系统只有一种内容性阴影：纸张投影。除此之外不允许任何 box-shadow，包括"卡片悬浮""按钮 hover lift""dropdown 悬浮"。如果你想用阴影区分层级，先问这是否能用边框、背景色或留白替代。

**The Print-Strips-Shadow Rule.** 进入 `@media print` 时纸张的投影必须被显式重置为 `none`。打印纸面上的任何阴影都是 bug。

## 5. Components

每个组件先一句性格描述，再罗列形状、配色与状态。所有 UI 组件都不带阴影、不带圆角 ≥ 8px、不使用渐变。

### Buttons
工作台上的工具：明确标记目的，没有冗余装饰。

- **Shape:** 圆角 6px (`{rounded.md}`)，最小高度 40px，水平内边距 13px。
- **Primary** (`button-primary`)：墨青背景 + 白字，weight 650。仅用于"打印 / 保存 PDF"和"加载词库"这类用户最终意图的按钮。每屏 ≤ 2 个 primary。
- **Hover:** 背景换为 墨青·深；不允许 transform、translateY、scale 等位移效果。
- **Secondary** (`button-secondary`)：浅瓷凹背景 + 墨字 + 细线边框。其余功能按钮（重置示例、收起预览）。
- **Focus:** 聚焦光晕 `0 0 0 3px var(--accent-glow)`，不允许换边框颜色。键盘焦点可见为强制要求（WCAG 2.4.7）。

### Inputs / Selects / Textareas
冷静、可读，输入区与按钮等高（40px），降低视觉跳跃。

- **Style:** 白底 (`{colors.surface}`)、细线边框、6px 圆角，水平内边距 11px。
- **Focus:** 边框换为墨青 + 墨青光晕。不允许换底色，否则会和 chip 选中态冲突。
- **Textarea:** 最小高度 160px，line-height 1.7（中文输入需要更宽松行距），允许垂直 resize。

### Word Chips（拼音校对区）
工作台上正在被校对的字词。每个 chip 是一片"待审"卡片。

- **Default:** 浅瓷凹背景 + 细线边框，6px 圆角，38px 高，水平内边距 11px。
- **Polyphone variant** (`chip-word-polyphone`)：背景换琥珀·浅、边框换琥珀。chip 整体仍保持完整四向边框——**不允许只换 border-left**（那是被绝对禁止的 side-stripe 写法）。
- 多音字 chip 内带一枚琥珀 pill badge（"多音"），与候选音节 pill 一起出现在 chip 下方。

### Polyphone Badge & Candidate Pills
- **Badge "多音":** 琥珀·浅背景，琥珀·深文字，琥珀边框，pill 圆角 (`{rounded.pill}`)，10px 字号 + weight 700。它的存在是为"在密集字词中一眼找到含多音字的项"。
- **Candidate pills:** 候选音节按钮。默认白底、细线·柔边框、4px 圆角、11px 字号；`hover` 加浅灰底；`selected` 切换为墨青·浅瓷背景 + 墨青边框 + 墨青·深文字 + weight 650。pill 后面跟一个例词（如"长大"），用 ink-muted 色弱化。

### Cards / Containers
**默认不要使用卡片。** 这个工具里左侧 controls 是单一面板，section 之间用细线·柔水平分隔，而不是卡片堆叠。如果你忍不住想给某个 section 加 background + border + shadow，请删掉这个想法、回到顶部读 The Flat-By-Default Rule。

唯一被允许的"卡片状"容器是 `quick-bank` 折叠区：浅瓷凹背景 + 细线边框 + 6px 圆角，无阴影。它存在的理由是它是可折叠的次级入口，需要视觉上"自成一区"。

### Section Dividers
section 之间用 `border-top: 1px solid {colors.line-soft}` + `padding: 14px 0`。**不要用 `<hr>`、不要用渐变分隔、不要用居中点缀符号。** 一条 1px 的柔灰线，工厂级简洁。

### Signature Component: A4 Page
整个工具的视觉主体。它是成品、不是 UI。

- **Geometry:** 210mm × 297mm，内边距 14mm/14mm/13mm（顶/侧/底）。固定在屏幕上以"实际尺寸"渲染，便于用户预判打印效果。
- **Background:** 暖白瓷 (`{colors.paper}`)，与冷调 UI 背景形成区分。
- **Shadow:** `paper-rest`，仅屏幕端；打印时由 `@media print` 重置为 `none`。
- **Print parity:** 屏幕预览像素与打印输出 1:1 一致。任何"屏幕上不显示但打印时出现 / 反之"的差异都是 bug。
- **Children:** `.paper-head`（标题 + meta）、`.word-list`（练习区）、`.cell` 与 `.line-cell`。所有子元素只使用 Paper Palette。

### Signature Component: 田字格 / 米字格 (.cell)
中文练字的灵魂格子。

- **Geometry:** 13.2mm × 13.2mm 正方形。
- **Outer border:** 1.2px 实线 (`{colors.paper-rule}`)。
- **Inner crosshair:** `::before` (垂直中线) 与 `::after` (水平中线)，1px 虚线 (`{colors.paper-rule-soft}`)。**这两条虚线是结构性中线，不是装饰性 side-stripe**——这是项目里唯一允许的 `border-left/border-top` 单边写法，因为它们扮演的是"格子内部的辅助线"。任何代码 reviewer 看到这里都不应"修复"它。
- **Mi grid variant:** 加 `.cell.mi`，启用 `.cell-diagonal.forward` 与 `.cell-diagonal.back`（45°/-45°）虚线。
- **Trace mode:** 范字以 `paper-trace`（22% 不透明度的灰墨）渲染，其余格子用 `color: transparent` 隐藏文字。

### Signature Component: 横线格 (.line-cell)
听写纸 / 抄写纸的横线变体。

- **Geometry:** 16mm × 13.2mm，仅底部 1.4px 实线，无四周边框。
- **Trace fill:** 同 cell，使用 `paper-trace`。

### Bank Selectors（内置词库）
两个 select 串联（年级 + 单元），右侧"加载"按钮。第二个 select 在选中第一个之前 disabled。视觉上不强调"步骤感"，因为这只是一次性配置而不是流程。

## 6. Do's and Don'ts

### Do:
- **Do** 把所有颜色定义在 OKLCH，写进 `:root` 的 CSS 自定义属性。frontmatter 的 OKLCH 是 source of truth。
- **Do** 把 UI 调色板与 Paper 调色板物理隔离：纸面元素只引用 `paper-*` 与 `paper-rule-*` 系列。
- **Do** 把所有 hover / focus 状态显式定义。键盘焦点必须可见，使用 `accent-glow` 光晕。
- **Do** 把所有过渡时间控制在 120–180ms，用 `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo) 或 `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quint)。
- **Do** 把多音字提示用三重信号（边框 + 背景 + badge 文字），不依赖单一颜色——色盲用户也要能识别。
- **Do** 把 `prefers-reduced-motion: reduce` 内的过渡时间归零。
- **Do** 把每页 cell 数量（13.2mm × 13.2mm）锁死为打印精度的一部分。如果想做"小格子"模式，在 `.cell` 上加 modifier，**不要全局改 `--cell-size`**。

### Don't:
- **Don't** 让 K12 在线教育产品的能量色（饱和橙、紫、霓粉）出现在任何地方。家长一眼就联想到"被推销课程"。
- **Don't** 套用学校 OA / 教育局信息系统的老旧蓝灰 + 宋体加粗 + 表格密铺。会被认作"班主任装的业务系统"。
- **Don't** 引入 Duolingo 路子的玩具化：emoji 粒子动画、弹性 transform、剧情化合规、能量条、连胜 streak、卷袖子图标。
- **Don't** 切到黑背景 / 霉织风 / 开发者潮品的 dark-mode-by-default + neon + monospace 全文。这是中文教学场景，谁打开都不应出戏。
- **Don't** 用 `border-left` 或 `border-right` 大于 1px 作为 chip / section / alert 的彩色侧边条。`.cell::before` 那条虚线是结构中线、不是这个意图。
- **Don't** 用 `background-clip: text` 渐变文字，包括标题、品牌字。
- **Don't** 给任何 UI 元素加 box-shadow。除 `.page` 之外的阴影一律删除。
- **Don't** 给任何按钮、卡片加 hover-lift 或 hover-scale。位移破坏"工作台稳定"的气质。
- **Don't** 在 chip 或按钮上叠加超过 1 种新颜色。陈列态 = 浅瓷凹 + 墨字 + 细线；选中态 = 墨青·浅瓷 + 墨青·深 + 墨青边框。**两种状态，没有第三种。**
- **Don't** 在打印输出里出现任何 UI 颜色：聚焦圈、按钮高亮、状态文字蓝。`@media print` 必须把它们清掉。
- **Don't** 用 emoji 替代图标。整个系统不应出现 emoji。
- **Don't** 加注册 / 登录 / "PRO" 升级提示 / onboarding 引导 / 工具提示气泡。这是工具，不是产品。
- **Don't** 把拼音字号压到 13pt 以下"为了一行多塞两个字"。声调符号会糊。
- **Don't** 在 frontmatter 里把 OKLCH 改成 hex 来取悦 Stitch linter。warning 是预期的；split source of truth 才是真问题。
