export type Lang = "zh" | "en";

const translations = {
  // Nav
  "nav.title": { zh: "AI Article Illustrator", en: "AI Article Illustrator" },
  "nav.subtitle": { zh: "全文配图助手", en: "Article Illustrator" },
  "nav.apiSettings": { zh: "API 设置", en: "API Settings" },
  "nav.lang": { zh: "EN", en: "中" },

  // Page header
  "header.title": { zh: "全文配图助手", en: "Article Illustrator" },
  "header.desc": { zh: "粘贴文章内容，一键生成全文配图", en: "Paste your article, generate illustrations in one click" },
  "header.generate": { zh: "一键生成", en: "Generate" },
  "header.segmenting": { zh: "分段中...", en: "Segmenting..." },
  "header.generating": { zh: "生成提示词...", en: "Generating prompts..." },
  "header.copyAll": { zh: "复制全部", en: "Copy All" },
  "header.copied": { zh: "已复制", en: "Copied" },
  "header.exportMd": { zh: "导出 Markdown", en: "Export Markdown" },
  "header.exportJson": { zh: "导出 JSON", en: "Export JSON" },
  "header.reset": { zh: "重置", en: "Reset" },

  // API Settings
  "api.title": { zh: "API 密钥设置", en: "API Key Settings" },
  "api.configured": { zh: "API 密钥已配置", en: "API Keys Configured" },
  "api.configuredDesc": { zh: "点击展开修改密钥", en: "Click to expand and edit keys" },
  "api.notConfigured": { zh: "请先配置 API 密钥", en: "Please configure API keys first" },
  "api.notConfiguredDesc": { zh: "需要填写 API 密钥才能使用", en: "API keys required to get started" },
  "api.collapse": { zh: "收起", en: "Collapse" },
  "api.desc": { zh: "为不同功能模块分别配置 API 密钥。密钥仅保存在浏览器本地。", en: "Configure API keys for each module. Keys are stored locally in your browser only." },
  "api.segment": { zh: "智能分段", en: "Smart Segmentation" },
  "api.segmentDesc": { zh: "用于文章语义分段", en: "For article segmentation" },
  "api.prompt": { zh: "提示词生成", en: "Prompt Generation" },
  "api.promptDesc": { zh: "用于生成配图提示词", en: "For image prompt generation" },
  "api.image": { zh: "图片生成", en: "Image Generation" },
  "api.imageDesc": { zh: "用于生成配图", en: "For image generation" },
  "api.reuseHint": { zh: "相同平台的密钥只需填一个，其余自动复用。", en: "For the same platform, fill in one key and the rest will auto-reuse." },

  // Input
  "input.title": { zh: "文章内容", en: "Article Content" },
  "input.placeholder": { zh: "在这里粘贴文章全文或脚本内容...", en: "Paste your article or script content here..." },
  "input.chars": { zh: "字", en: "chars" },

  // Mode
  "mode.full": { zh: "全文配图", en: "Full Illustration" },
  "mode.fullDesc": { zh: "每个段落都生成配图", en: "Generate image for every segment" },
  "mode.selective": { zh: "精选配图", en: "Selective" },
  "mode.selectiveDesc": { zh: "仅为关键段落生成配图", en: "Generate images for key segments only" },

  // Style
  "style.title": { zh: "风格配置", en: "Style Config" },
  "style.visual": { zh: "视觉风格", en: "Visual Style" },
  "style.color": { zh: "色彩基调", en: "Color Tone" },
  "style.ratio": { zh: "画面比例", en: "Aspect Ratio" },
  "style.tool": { zh: "提示词格式", en: "Prompt Format" },
  "style.platform": { zh: "目标平台", en: "Platform" },
  "style.imageModel": { zh: "图片模型", en: "Image Model" },
  "style.preset": { zh: "风格预设", en: "Style Preset" },
  "style.savePreset": { zh: "保存当前风格", en: "Save Current Style" },
  "style.presetName": { zh: "预设名称", en: "Preset Name" },

  // Presets
  "preset.none": { zh: "自定义", en: "Custom" },
  "preset.wechat": { zh: "公众号插画", en: "WeChat Illustration" },
  "preset.xhs": { zh: "小红书配图", en: "Xiaohongshu Style" },
  "preset.cinematic": { zh: "电影质感", en: "Cinematic" },
  "preset.minimal": { zh: "极简扁平", en: "Minimal Flat" },

  // Visual styles
  "vs.photo": { zh: "摄影写实", en: "Photography" },
  "vs.illustration": { zh: "插画", en: "Illustration" },
  "vs.watercolor": { zh: "水彩", en: "Watercolor" },
  "vs.3d": { zh: "3D渲染", en: "3D Render" },
  "vs.flat": { zh: "扁平", en: "Flat" },
  "vs.pixel": { zh: "像素", en: "Pixel Art" },

  // Color tones
  "ct.warm": { zh: "暖色调", en: "Warm" },
  "ct.cool": { zh: "冷色调", en: "Cool" },
  "ct.bw": { zh: "黑白", en: "B&W" },
  "ct.vivid": { zh: "高饱和", en: "Vivid" },
  "ct.pastel": { zh: "柔和淡彩", en: "Pastel" },

  // Platforms
  "pl.general": { zh: "通用", en: "General" },
  "pl.wechat": { zh: "微信公众号", en: "WeChat" },
  "pl.xhs": { zh: "小红书", en: "Xiaohongshu" },
  "pl.blog": { zh: "博客", en: "Blog" },

  // Segment card
  "card.prompt": { zh: "配图提示词", en: "Image Prompt" },
  "card.save": { zh: "保存", en: "Save" },
  "card.cancel": { zh: "取消", en: "Cancel" },
  "card.generateImage": { zh: "生成配图", en: "Generate Image" },
  "card.generating": { zh: "生成中...", en: "Generating..." },
  "card.regenerate": { zh: "重新生成", en: "Regenerate" },

  // Results
  "results.segments": { zh: "个段落", en: "segments" },
  "results.loading": { zh: "正在智能分段...", en: "Segmenting article..." },
  "results.loadingPrompts": { zh: "正在生成配图提示词...", en: "Generating image prompts..." },
  "results.error": { zh: "出错了", en: "Error" },
  "results.generateAll": { zh: "一键生成全部配图", en: "Generate All Images" },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Lang): string {
  return translations[key]?.[lang] || key;
}

export const VISUAL_STYLES_I18N: Record<string, TranslationKey> = {
  "摄影写实": "vs.photo",
  "插画": "vs.illustration",
  "水彩": "vs.watercolor",
  "3D渲染": "vs.3d",
  "扁平": "vs.flat",
  "像素": "vs.pixel",
};
