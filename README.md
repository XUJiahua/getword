# 看拼音写汉字练习纸

一个纯静态的 A4 练习纸生成器。打开 `index.html`，粘贴中文字词或一键加载内置词库，即可生成适合打印或保存 PDF 的版面。

## 使用

1. 用浏览器打开 `index.html`。
2. 在左侧输入词语（一行一个），或在"内置词库"中选择年级与单元后点"加载"。
3. 校对拼音；遇到含多音字的词语会自动标黄，下方列出候选读音，点击即可一键替换该字音节。
4. 选择练习模式、格子样式、每页词数。
5. 点击"打印 / 保存 PDF"。

## 功能

- 自动标注拼音，支持手动修改。
- **多音字检测与候选切换**：常见多音字（如 长 / 乐 / 重 / 行 / 还 / 调 / 得 等约 70 个）会在校对区高亮提示，并给出每个读音对应的常见组词。
- **部编版参考词库**：覆盖一到六年级上下册，按"年级 / 册次 + 单元"两级选择；另含四字词和易错形近字两个专题包。
- **可分享 URL**：年级与单元写入 URL hash（如 `#bank=grade4a&unit=u3`），可分享、收藏、回填。
- **已掌握字词过滤**：可录入已掌握字词，并选择在练习纸中隐藏；列表会保存在当前浏览器中。
- **可收起预览**：右侧 A4 预览区可收起，操作区会变宽，状态会保存在当前浏览器中。
- 看拼音写汉字、描红、左范字右抄写、听写纸四种模式。
- 田字格、米字格、横线三种格子样式。
- A4 纵向打印排版。

## 词库说明

内置词库按统编 / 部编小学语文一到六年级常见词语整理，**作为可编辑参考**，与教材实际单元字词表不一定一一对应。不同地区、教材版本和学校进度可能不同；打印前请按老师或教学计划增删校对。专题包（四字词、易错形近字）面向通用复习。

## 拼音库

完整拼音依赖浏览器从 CDN 加载 `pinyin-pro`。如果离线打开，页面仍可使用，但只内置了示例词的一小部分拼音作为降级。

## 笔顺数据

`data/strokes/` 下统一维护词库覆盖的全部 3000 个汉字的笔顺数据，每字一个 JSON：

- 字段：`strokes`（每笔 SVG path）、`medians`（中线坐标，可用于动画）、`radStrokes`（部首笔画索引，可缺省）
- 索引：`data/strokes/index.json` 列出全部字符与版本元信息
- 来源：[chanind/hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) v2.0.1（数据上游 [skishore/makemeahanzi](https://github.com/skishore/makemeahanzi)）
- 许可：Arphic Public License，全文见 `data/strokes/LICENSE.txt`

更新或扩充字表后可重新运行：

```bash
python3 scripts/fetch_strokes.py            # 已下载的字会跳过
python3 scripts/fetch_strokes.py --version 2.0.1 --workers 24
```

## 第三方服务依赖

纯前端静态站，无自建后端、无埋点分析。所有外部资源经 [jsDelivr](https://www.jsdelivr.com/) CDN 加载，单点失效会自动降级。

### 运行时（浏览器加载）

| 服务 | 用途 |
|---|---|
| [pinyin-pro](https://github.com/zh-lx/pinyin-pro) `@3` (npm via jsDelivr) | 汉字转拼音；离线时仅有示例词降级数据 |
| [hanzi-writer](https://github.com/chanind/hanzi-writer) `@3.7` (npm via jsDelivr) | 笔顺动画渲染引擎 |
| [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) `@2.0.1` (npm via jsDelivr) | 单字笔顺 JSON 在线兜底（本地 `data/strokes/` 缺字时拉取） |
| [davinfifield/mp3-chinese-pinyin-sound](https://github.com/davinfifield/mp3-chinese-pinyin-sound) (GitHub via jsDelivr) | 拼音发音 mp3，按 `<拼音><声调>.mp3` 命名 |
| 浏览器内置 Web Speech API | 拼音 mp3 缺失时的 TTS 兜底 |
| [schema.org](https://schema.org/) | JSON-LD 结构化数据的 `@context` |

### 构建时（Python 脚本）

| 服务 | 用途 |
|---|---|
| jsDelivr + [chanind/hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) | `scripts/fetch_strokes.py` 预抓笔顺数据到 `data/strokes/` |
