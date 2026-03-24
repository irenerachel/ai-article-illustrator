# AI Article Illustrator - 全文配图生成器

AI 驱动的文章智能配图工具。粘贴文章内容，自动分段并为每个场景生成配图提示词和图片。

## 功能特性

### 多平台模型支持

**文本处理（语言模型）**

| 平台 | 模型 |
|------|------|
| 火山引擎 | Doubao 1.5 Pro 32K/256K、Lite 32K、Thinking Pro、Seed 2.0 Pro、Pro 32K、Lite 32K |
| DeepSeek | V3、R1（推理） |
| 通义千问 | Qwen Max、Plus、Turbo |
| Moonshot | Kimi K2.5、K2、Moonshot V1 32K |
| 智谱AI | GLM-4 Plus、Flash、Air |
| Anthropic | Claude Sonnet 4、Opus 4、Haiku 4.5 |
| OpenRouter | 一个 Key 调用以上所有模型 |

**图片生成**

| 平台 | 模型 |
|------|------|
| 火山引擎 | Seedream 5.0 Lite、4.5、4.0、3.0、2.0 |
| Google 原版 | Gemini 3 Pro Image（= Nano Banana Pro）、Gemini 3.1 Flash Image（= Nano Banana 2）、Gemini 2.5 Flash Image（= Nano Banana） |
| fal.ai | Nano Banana Pro、Nano Banana 2、Nano Banana、Seedream 4.5/5.0 |

### 配图模式

- **全文配图** — 每 1-2 句话切分一个场景，每个场景都生成配图
- **分段配图** — 指定配图数量，文章均匀分段

### 风格参考（Skill）

- 上传 `.txt` / `.md` 文件或手动输入风格描述
- 支持拖拽上传
- 可命名保存多个 Skill，本地持久化，随时加载切换

### 图片比例

- 通用比例：`1:1` `4:3` `3:4` `16:9` `9:16` `21:9`
- Nano Banana / Gemini 扩展比例：`4:1` `1:4` `8:1` `1:8`
- 每张配图可单独选择比例

### 其他功能

- **选文配图** — 在结果页选中文章中的一段文字，AI 自动生成提示词
- **图片下载** — 生成的配图可直接下载
- **风格预设** — 内置公众号插画、小红书配图等预设，也可保存自定义预设
- **导出** — 提示词导出为 Markdown 或 JSON
- **可折叠侧边栏** — 支持折叠为图标模式，宽度可拖拽调整
- **中英双语** — 完整的中文/英文界面切换

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开 `http://localhost:3000`，按照步骤操作：

1. **选择模型 & 填写 API Key**
2. **输入文章内容** — 选择全文配图或分段配图
3. **配置风格** — 视觉风格、色彩基调、画面比例
4. **查看结果** — 编辑提示词、生成配图、下载图片

## 技术栈

- **框架** — Next.js 16 + React 19
- **样式** — Tailwind CSS v4 + Radix UI
- **图标** — Lucide React
- **AI** — Anthropic SDK + OpenAI-compatible APIs
- **状态** — React Context + useReducer
- **语言** — TypeScript

## 数据安全

所有 API 密钥和配置仅保存在浏览器本地（localStorage），不会上传到任何服务器。

## License

MIT
