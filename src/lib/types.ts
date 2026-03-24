import type { Lang } from "./i18n";

export type Step = 1 | 2 | 3 | 4;

export interface ApiConfig {
  textApiKey: string;
  imageApiKey: string;
  providerKeys: Record<string, string>; // provider -> api key, auto-saved
}

export interface StyleConfig {
  visualStyle: string;
  colorTone: string;
  aspectRatio: string;
  imageTool: string;
  platform: string;
  imageModel: string;
}

export interface StylePreset {
  id: string;
  name: string;
  config: Omit<StyleConfig, "imageModel">;
  skillText?: string;
  skillImageDataUrl?: string;
}

export interface SavedSkill {
  id: string;
  name: string;
  text: string;
  imageDataUrl?: string;
}

export interface Segment {
  id: string;
  text: string;
  sceneTag: string;
  emotionTag: string;
  prompt: string;
  isGeneratingImage?: boolean;
  imageUrl?: string;
  imageHistory?: string[];
  imageError?: string;
  shouldIllustrate?: boolean;
  useSubject?: boolean;
}

export type IllustrationMode = "full" | "counted" | "manual";

export interface AppState {
  step: Step;
  articleText: string;
  styleConfig: StyleConfig;
  apiConfig: ApiConfig;
  textModel: string;
  segments: Segment[];
  styleLock: string;
  isSegmenting: boolean;
  isGeneratingPrompts: boolean;
  error: string | null;
  lang: Lang;
  illustrationMode: IllustrationMode;
  customPresets: StylePreset[];
  skillText: string;
  savedSkills: SavedSkill[];
  imageCount: number;
  customRatio: boolean;
  watermark: boolean;
  imageResolution: string;
  manualSegments: { id: string; text: string }[];
  skillImageDataUrl: string;
  subjectImageDataUrl: string;
  subjectPrompt: string;
  infographicMode: boolean;
}

export const DEFAULT_TEXT_MODEL = "doubao-seed-2-0-pro-260215";

export const DEFAULT_STYLE_CONFIG: StyleConfig = {
  visualStyle: "摄影写实",
  colorTone: "正常",
  aspectRatio: "16:9",
  imageTool: "通用",
  platform: "通用",
  imageModel: "doubao-seedream-4-5-251128",
};

export const DEFAULT_API_CONFIG: ApiConfig = {
  textApiKey: "",
  imageApiKey: "",
  providerKeys: {},
};

export const VISUAL_STYLES = ["摄影写实", "插画", "水彩", "3D渲染", "扁平", "像素", "黏土风格", "毛毡风格", "3D皮克斯", "赛博朋克", "日系动漫", "油画", "素描线稿", "蒸汽波"];
export const COLOR_TONES = ["正常", "暖色调", "冷色调", "黑白", "高饱和", "柔和淡彩"];
export const ASPECT_RATIOS = ["1:1", "4:3", "3:4", "16:9", "9:16", "21:9"];
// Extended ratios supported by Nano Banana / Gemini (fal.ai & Google)
export const EXTENDED_RATIOS = ["1:1", "4:3", "3:4", "16:9", "9:16", "21:9", "4:1", "1:4", "8:1", "1:8"];
export const IMAGE_TOOLS = ["通用", "Midjourney", "即梦 Jimeng", "DALL·E", "Flux"];
export const PLATFORMS = ["通用", "微信公众号", "小红书", "博客"];

// --- Text model provider configs ---
export interface ProviderConfig {
  baseUrl: string;
  name: string;
  nameEn: string;
}

export const TEXT_PROVIDERS: Record<string, ProviderConfig> = {
  volcengine: { baseUrl: "https://ark.cn-beijing.volces.com/api/v3", name: "火山引擎", nameEn: "Volcengine" },
  anthropic: { baseUrl: "", name: "Anthropic", nameEn: "Anthropic" },
  deepseek: { baseUrl: "https://api.deepseek.com", name: "DeepSeek", nameEn: "DeepSeek" },
  qwen: { baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", name: "通义千问", nameEn: "Qwen (DashScope)" },
  moonshot: { baseUrl: "https://api.moonshot.cn/v1", name: "Moonshot", nameEn: "Moonshot" },
  zhipu: { baseUrl: "https://open.bigmodel.cn/api/paas/v4", name: "智谱AI", nameEn: "Zhipu AI" },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", name: "OpenRouter", nameEn: "OpenRouter" },
};

export const IMAGE_PROVIDERS: Record<string, ProviderConfig> = {
  volcengine: { baseUrl: "https://ark.cn-beijing.volces.com/api/v3", name: "火山引擎", nameEn: "Volcengine" },
  fal: { baseUrl: "https://fal.run", name: "fal.ai", nameEn: "fal.ai" },
  google: { baseUrl: "https://generativelanguage.googleapis.com/v1beta", name: "Google", nameEn: "Google" },
};

export const TEXT_MODELS = [
  // Volcengine Doubao
  { id: "doubao-1-5-pro-32k-250115", name: "Doubao 1.5 Pro 32K", provider: "volcengine", desc: "强力均衡", descEn: "Powerful" },
  { id: "doubao-1-5-pro-256k-250115", name: "Doubao 1.5 Pro 256K", provider: "volcengine", desc: "超长文本", descEn: "Long Text" },
  { id: "doubao-1-5-lite-32k-250115", name: "Doubao 1.5 Lite 32K", provider: "volcengine", desc: "轻快低价", descEn: "Fast Cheap" },
  { id: "doubao-1-5-thinking-pro-250415", name: "Doubao 1.5 Thinking Pro", provider: "volcengine", desc: "深度推理", descEn: "Reasoning" },
  { id: "doubao-seed-2-0-pro-260215", name: "Doubao Seed 2.0 Pro", provider: "volcengine", desc: "综合最强", descEn: "Best" },
  { id: "doubao-pro-32k-241215", name: "Doubao Pro 32K", provider: "volcengine", desc: "稳定可靠", descEn: "Stable" },
  { id: "doubao-lite-32k-241215", name: "Doubao Lite 32K", provider: "volcengine", desc: "极致省钱", descEn: "Budget" },
  // DeepSeek
  { id: "deepseek-chat", name: "DeepSeek V3", provider: "deepseek", desc: "强力通用", descEn: "Powerful" },
  { id: "deepseek-reasoner", name: "DeepSeek R1", provider: "deepseek", desc: "深度推理", descEn: "Reasoning" },
  // Qwen (通义千问 / DashScope)
  { id: "qwen-max", name: "Qwen Max", provider: "qwen", desc: "综合最强", descEn: "Best" },
  { id: "qwen-plus", name: "Qwen Plus", provider: "qwen", desc: "均衡高效", descEn: "Balanced" },
  { id: "qwen-turbo", name: "Qwen Turbo", provider: "qwen", desc: "极速响应", descEn: "Fastest" },
  // Moonshot / Kimi
  { id: "kimi-k2.5", name: "Kimi K2.5", provider: "moonshot", desc: "综合最强", descEn: "Best" },
  { id: "kimi-k2", name: "Kimi K2", provider: "moonshot", desc: "代码擅长", descEn: "Code" },
  { id: "moonshot-v1-32k", name: "Moonshot V1 32K", provider: "moonshot", desc: "稳定可靠", descEn: "Stable" },
  // Zhipu GLM
  { id: "glm-4-plus", name: "GLM-4 Plus", provider: "zhipu", desc: "综合最强", descEn: "Best" },
  { id: "glm-4-flash", name: "GLM-4 Flash", provider: "zhipu", desc: "免费快速", descEn: "Free Fast" },
  { id: "glm-4-air", name: "GLM-4 Air", provider: "zhipu", desc: "均衡高效", descEn: "Balanced" },
  // Anthropic Claude
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", provider: "anthropic", desc: "均衡高效", descEn: "Balanced" },
  { id: "claude-opus-4-20250514", name: "Claude Opus 4", provider: "anthropic", desc: "综合最强", descEn: "Best" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", provider: "anthropic", desc: "极速低价", descEn: "Fast Cheap" },
  // OpenRouter (一个 Key 用所有模型)
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", provider: "openrouter", desc: "via OpenRouter", descEn: "via OpenRouter" },
  { id: "anthropic/claude-opus-4", name: "Claude Opus 4", provider: "openrouter", desc: "via OpenRouter", descEn: "via OpenRouter" },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "openrouter", desc: "via OpenRouter", descEn: "via OpenRouter" },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "openrouter", desc: "via OpenRouter", descEn: "via OpenRouter" },
  { id: "deepseek/deepseek-chat", name: "DeepSeek V3", provider: "openrouter", desc: "via OpenRouter", descEn: "via OpenRouter" },
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1", provider: "openrouter", desc: "via OpenRouter", descEn: "via OpenRouter" },
  { id: "qwen/qwen-max", name: "Qwen Max", provider: "openrouter", desc: "via OpenRouter", descEn: "via OpenRouter" },
];

export const IMAGE_MODELS = [
  // Volcengine Seedream
  { id: "doubao-seedream-5-0-lite", name: "Seedream 5.0 Lite", provider: "volcengine", desc: "智能理解", descEn: "Smart" },
  { id: "doubao-seedream-4-5-251128", name: "Seedream 4.5", provider: "volcengine", desc: "稳定高清", descEn: "Stable HD" },
  { id: "doubao-seedream-4-0-250828", name: "Seedream 4.0", provider: "volcengine", desc: "成熟可靠", descEn: "Reliable" },
  { id: "doubao-seedream-3-0-t2i-250415", name: "Seedream 3.0", provider: "volcengine", desc: "轻快低价", descEn: "Fast Cheap" },
  { id: "doubao-seedream-2-0-t2i", name: "Seedream 2.0", provider: "volcengine", desc: "中英双语", descEn: "Bilingual" },
  // Google Gemini (原版 Nano Banana，直连 Google API)
  { id: "gemini-3-pro-image-preview", name: "Gemini 3 Pro Image (= Nano Banana Pro)", provider: "google", desc: "精细高质", descEn: "Fine Quality" },
  { id: "gemini-3.1-flash-image-preview", name: "Gemini 3.1 Flash Image (= Nano Banana 2)", provider: "google", desc: "快速出图", descEn: "Fast Gen" },
  { id: "gemini-2.5-flash-image", name: "Gemini 2.5 Flash Image (= Nano Banana)", provider: "google", desc: "极致省钱", descEn: "Budget" },
  // fal.ai
  { id: "nano-banana-pro", name: "Nano Banana Pro (fal)", provider: "fal", desc: "精细高质", descEn: "Fine Quality" },
  { id: "nano-banana-2", name: "Nano Banana 2 (fal)", provider: "fal", desc: "快速出图", descEn: "Fast Gen" },
  { id: "nano-banana", name: "Nano Banana (fal)", provider: "fal", desc: "极致省钱", descEn: "Budget" },
  { id: "fal-seedream-4.5", name: "Seedream 4.5 (fal)", provider: "fal", desc: "稳定高清", descEn: "Stable HD" },
  { id: "fal-seedream-5", name: "Seedream 5.0 (fal)", provider: "fal", desc: "智能理解", descEn: "Smart" },
];

export const BUILT_IN_PRESETS: StylePreset[] = [
  { id: "wechat", name: "公众号插画", config: { visualStyle: "插画", colorTone: "柔和淡彩", aspectRatio: "4:3", imageTool: "通用", platform: "微信公众号" } },
  { id: "xhs", name: "小红书配图", config: { visualStyle: "摄影写实", colorTone: "高饱和", aspectRatio: "3:4", imageTool: "通用", platform: "小红书" } },
  { id: "cinematic", name: "电影质感", config: { visualStyle: "摄影写实", colorTone: "冷色调", aspectRatio: "16:9", imageTool: "Midjourney", platform: "通用" } },
  { id: "minimal", name: "极简扁平", config: { visualStyle: "扁平", colorTone: "柔和淡彩", aspectRatio: "16:9", imageTool: "通用", platform: "博客" } },
];

// Volcengine size mapping (Seedream 5.0 Lite requires >= 3,686,400 px)
export const VOLC_SIZE_MAP: Record<string, string> = {
  "1:1": "1920x1920", "4:3": "2560x1920", "3:4": "1920x2560",
  "16:9": "2560x1440", "9:16": "1440x2560", "21:9": "2560x1097",
};

// fal.ai model paths
export const FAL_MODEL_MAP: Record<string, string> = {
  "nano-banana-pro": "fal-ai/nano-banana-pro",
  "nano-banana-2": "fal-ai/nano-banana-2",
  "nano-banana": "fal-ai/nano-banana",
  "fal-seedream-4.5": "fal-ai/bytedance/seedream/v4.5/text-to-image",
  "fal-seedream-5": "fal-ai/bytedance/seedream/v5/lite/text-to-image",
};

export const FAL_SIZE_MAP: Record<string, string> = {
  "1:1": "square_hd", "4:3": "landscape_4_3", "3:4": "portrait_4_3",
  "16:9": "landscape_16_9", "9:16": "portrait_16_9", "21:9": "landscape_16_9",
};

// Google Gemini aspect ratio mapping (Gemini accepts these directly)
export const GEMINI_ASPECT_RATIOS = ["1:1", "4:3", "16:9", "3:4", "9:16"];

// Resolution options per provider
export const RESOLUTION_OPTIONS: Record<string, { value: string; label: string }[]> = {
  fal: [
    { value: "1K", label: "1K" },
    { value: "2K", label: "2K" },
    { value: "4K", label: "4K" },
  ],
  google: [
    { value: "512", label: "512px" },
    { value: "1K", label: "1K" },
    { value: "2K", label: "2K" },
    { value: "4K", label: "4K" },
  ],
  volcengine: [
    { value: "1K", label: "标准" },
    { value: "2K", label: "高清" },
  ],
};

// Volcengine size mapping per resolution tier
export const VOLC_RESOLUTION_SIZES: Record<string, Record<string, string>> = {
  "1K": { "1:1": "1024x1024", "4:3": "1152x864", "3:4": "864x1152", "16:9": "1280x720", "9:16": "720x1280", "21:9": "1280x549" },
  "2K": { "1:1": "1920x1920", "4:3": "2560x1920", "3:4": "1920x2560", "16:9": "2560x1440", "9:16": "1440x2560", "21:9": "2560x1097" },
};

export function getDefaultResolution(provider: string): string {
  if (provider === "google") return "1K";
  if (provider === "fal") return "1K";
  return "2K"; // volcengine default to 2K (Seedream 5.0 Lite requires it)
}

// Helper: get text model provider
export function getTextModelProvider(modelId: string): string {
  const m = TEXT_MODELS.find(m => m.id === modelId);
  if (m) return m.provider;
  if (modelId.includes("/")) return "openrouter";
  if (modelId.startsWith("claude-")) return "anthropic";
  if (modelId.startsWith("doubao-")) return "volcengine";
  if (modelId.startsWith("deepseek-")) return "deepseek";
  if (modelId.startsWith("qwen-")) return "qwen";
  if (modelId.startsWith("moonshot-") || modelId.startsWith("kimi-")) return "moonshot";
  if (modelId.startsWith("glm-")) return "zhipu";
  return "volcengine";
}

// Helper: get image model provider
export function getImageModelProvider(modelId: string): string {
  const m = IMAGE_MODELS.find(m => m.id === modelId);
  if (m) return m.provider;
  if (modelId.startsWith("doubao-")) return "volcengine";
  if (modelId.startsWith("gemini-")) return "google";
  return "fal";
}
