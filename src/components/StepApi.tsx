"use client";
import { useApp } from "@/lib/store";
import { TEXT_MODELS, IMAGE_MODELS, TEXT_PROVIDERS, IMAGE_PROVIDERS, getTextModelProvider, getImageModelProvider } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, ArrowRight, MessageSquareText, ImageIcon } from "lucide-react";
import { useState } from "react";

const TEXT_GROUPS = [
  { key: "volcengine", zh: "火山引擎 · 豆包", en: "Volcengine · Doubao" },
  { key: "deepseek", zh: "DeepSeek", en: "DeepSeek" },
  { key: "qwen", zh: "阿里 · 通义千问", en: "Alibaba · Qwen" },
  { key: "moonshot", zh: "Moonshot · Kimi", en: "Moonshot · Kimi" },
  { key: "zhipu", zh: "智谱 · GLM", en: "Zhipu · GLM" },
  { key: "anthropic", zh: "Anthropic · Claude", en: "Anthropic · Claude" },
  { key: "openrouter", zh: "OpenRouter (一个 Key 多模型)", en: "OpenRouter (One Key, Many Models)" },
];

const IMAGE_GROUPS = [
  { key: "volcengine", zh: "火山引擎 · Seedream", en: "Volcengine · Seedream" },
  { key: "google", zh: "Google 原版 (Nano Banana 原始模型)", en: "Google Original (Nano Banana source models)" },
  { key: "fal", zh: "fal.ai (Nano Banana 等)", en: "fal.ai (Nano Banana etc.)" },
];

export function StepApi() {
  const { state, dispatch } = useApp();
  const lang = state.lang;
  const [vis, setVis] = useState({ text: false, image: false });

  const canNext = !!state.apiConfig.textApiKey;

  const textProvider = getTextModelProvider(state.textModel);
  const imageProvider = getImageModelProvider(state.styleConfig.imageModel);

  const tpCfg = TEXT_PROVIDERS[textProvider];
  const ipCfg = IMAGE_PROVIDERS[imageProvider];
  const textProviderLabel = lang === "zh" ? tpCfg?.name : tpCfg?.nameEn;
  const imageProviderLabel = lang === "zh" ? ipCfg?.name : ipCfg?.nameEn;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
          {lang === "zh" ? "第 1 步" : "Step 1"}
        </p>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight">
            {lang === "zh" ? "选择模型 & 配置密钥" : "Select Models & API Keys"}
          </h1>
          <a
            href="https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 rounded-lg border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground transition-colors shrink-0"
          >
            {lang === "zh" ? "推荐模型 →" : "Recommended →"}
          </a>
        </div>
        <p className="text-muted-foreground mt-2 text-sm">
          {lang === "zh"
            ? "为文本处理和图片生成分别选择模型，并填写对应的 API 密钥。密钥仅保存在浏览器本地。"
            : "Select models for text processing and image generation, then enter the corresponding API keys."}
        </p>
      </div>

      <div className="space-y-5">
        {/* Text Model & API */}
        <div className="bg-card rounded-2xl border p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-foreground/5 flex items-center justify-center">
              <MessageSquareText className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">{lang === "zh" ? "文本处理" : "Text Processing"}</p>
              <p className="text-xs text-muted-foreground">{lang === "zh" ? "用于文章分段和提示词生成" : "For article segmentation and prompt generation"}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">{lang === "zh" ? "语言模型" : "Language Model"}</span>
            <Select value={state.textModel} onValueChange={v => dispatch({ type: "SET_TEXT_MODEL", model: v })}>
              <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TEXT_GROUPS.map((g, gi) => {
                  const models = TEXT_MODELS.filter(m => m.provider === g.key);
                  if (models.length === 0) return null;
                  return (
                    <div key={g.key}>
                      {gi > 0 && <div className="border-t my-1" />}
                      <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{lang === "zh" ? g.zh : g.en}</div>
                      {models.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name} <span className="text-muted-foreground text-[10px] ml-1">{lang === "zh" ? m.desc : m.descEn}</span></SelectItem>
                      ))}
                    </div>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">{textProviderLabel} API Key</span>
            <div className="relative">
              <input
                type={vis.text ? "text" : "password"}
                placeholder={lang === "zh" ? `请输入 ${textProviderLabel} API 密钥...` : `Enter ${textProviderLabel} API key...`}
                className="w-full h-12 rounded-xl border bg-background px-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-all"
                value={state.apiConfig.textApiKey}
                onChange={e => dispatch({ type: "SET_API_CONFIG", config: { textApiKey: e.target.value } })}
              />
              <button type="button" onClick={() => setVis(v => ({ ...v, text: !v.text }))} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {vis.text ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Image Model & API */}
        <div className="bg-card rounded-2xl border p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-foreground/5 flex items-center justify-center">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">{lang === "zh" ? "图片生成" : "Image Generation"}</p>
              <p className="text-xs text-muted-foreground">{lang === "zh" ? "用于根据提示词生成配图（可选）" : "For generating images from prompts (optional)"}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">{lang === "zh" ? "图片模型" : "Image Model"}</span>
            <Select value={state.styleConfig.imageModel} onValueChange={v => dispatch({ type: "SET_STYLE", config: { imageModel: v } })}>
              <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {IMAGE_GROUPS.map((g, gi) => {
                  const models = IMAGE_MODELS.filter(m => m.provider === g.key);
                  if (models.length === 0) return null;
                  return (
                    <div key={g.key}>
                      {gi > 0 && <div className="border-t my-1" />}
                      <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{lang === "zh" ? g.zh : g.en}</div>
                      {models.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name} <span className="text-muted-foreground text-[10px] ml-1">{lang === "zh" ? m.desc : m.descEn}</span></SelectItem>
                      ))}
                    </div>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">
              {imageProviderLabel} API Key
              <span className="text-muted-foreground font-normal ml-1">({lang === "zh" ? "可选" : "optional"})</span>
            </span>
            <div className="relative">
              <input
                type={vis.image ? "text" : "password"}
                placeholder={lang === "zh" ? `请输入 ${imageProviderLabel} API 密钥...` : `Enter ${imageProviderLabel} API key...`}
                className="w-full h-12 rounded-xl border bg-background px-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-all"
                value={state.apiConfig.imageApiKey}
                onChange={e => dispatch({ type: "SET_API_CONFIG", config: { imageApiKey: e.target.value } })}
              />
              <button type="button" onClick={() => setVis(v => ({ ...v, image: !v.image }))} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {vis.image ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {textProvider === "volcengine" && imageProvider === "volcengine" && (
              <p className="text-[11px] text-muted-foreground">
                {lang === "zh"
                  ? "💡 默认文本和图片都使用火山引擎，如密钥相同可留空，将自动复用文本密钥。"
                  : "💡 Same platform. Leave empty to reuse the text API key."}
              </p>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => canNext && dispatch({ type: "SET_STEP", step: 2 })}
        disabled={!canNext}
        className="flex items-center gap-2 px-6 py-3 rounded-full bg-foreground text-background font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {lang === "zh" ? "下一步" : "Next"}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
