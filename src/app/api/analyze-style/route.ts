import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const ANALYSIS_PROMPT = `你是一位资深摄影师和调色师。请分析这张图片的视觉风格，用一段流畅的自然语言描述出来，像在给另一位摄影师讲解"这张图是怎么拍出来的、怎么调出来的"。

描述应涵盖以下维度（自然融入，不要分条列举）：
- 整体画风和视觉基调（写实摄影、胶片感、电影画面、日系清新、欧美时尚、赛博朋克等）
- 色彩处理细节（色温偏向、饱和度高低、主色调和辅色调、调色风格如莫兰迪/青橙对比/复古胶片色彩等）
- 光影氛围（光源类型和方向、明暗对比强弱、阴影浓淡、是否有光晕/丁达尔效应/雾气感等）
- 画面质感（颗粒感强弱、锐度、是否柔焦、哑光还是光泽感、是否有暗角）
- 情绪氛围（温暖治愈、冷峻疏离、梦幻朦胧、沉稳大气、复古怀旧等）
- 摄影参数推测（推测可能使用的焦段如 35mm/85mm、光圈如 f/1.4 大虚化或 f/8 全锐、景深深浅、快门速度感觉）
- 器材风格推测（偏向哪类相机的成像特征，如富士经典负片模拟、徕卡高反差德味、索尼锐利数码感、哈苏中画幅细腻感等）

严格禁止：
- 不要描述画面中的人物、角色、动物或任何具体主体的外貌
- 不要描述具体场景内容（如"街道""森林""咖啡厅"等）
- 不要描述构图方式和镜头角度
- 只输出"风格滤镜 + 摄影参数"层面的内容

输出一段完整的自然语言描述，200 字左右，不要用 Markdown 格式，不要分条，不要加标题。`;

const PROVIDER_BASE_URLS: Record<string, string> = {
  volcengine: "https://ark.cn-beijing.volces.com/api/v3",
  deepseek: "https://api.deepseek.com",
  qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  moonshot: "https://api.moonshot.cn/v1",
  zhipu: "https://open.bigmodel.cn/api/paas/v4",
  openrouter: "https://openrouter.ai/api/v1",
};

// Vision-capable model per provider (must support image input)
const VISION_MODELS: Record<string, string> = {
  volcengine: "doubao-1-5-vision-pro-32k-250115",
  deepseek: "deepseek-chat",
  qwen: "qwen-vl-max",
  zhipu: "glm-4v-plus",
  moonshot: "kimi-k2.5",
  openrouter: "google/gemini-2.5-flash",
};

function getProvider(model: string): string {
  if (model.includes("/")) return "openrouter";
  if (model.startsWith("claude-")) return "anthropic";
  if (model.startsWith("doubao-")) return "volcengine";
  if (model.startsWith("deepseek-")) return "deepseek";
  if (model.startsWith("qwen-")) return "qwen";
  if (model.startsWith("moonshot-") || model.startsWith("kimi-")) return "moonshot";
  if (model.startsWith("glm-")) return "zhipu";
  return "volcengine";
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) throw new Error("无效的图片数据");
  return { mediaType: match[1], data: match[2] };
}

async function analyzeWithClaude(imageDataUrl: string, model: string, apiKey: string): Promise<string> {
  const { mediaType, data } = parseDataUrl(imageDataUrl);
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data } },
        { type: "text", text: ANALYSIS_PROMPT },
      ],
    }],
  });
  const content = message.content[0];
  if (content.type !== "text") throw new Error("AI 返回格式错误");
  return content.text;
}

async function analyzeWithOpenAI(imageDataUrl: string, model: string, apiKey: string, baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageDataUrl } },
          { type: "text", text: ANALYSIS_PROMPT },
        ],
      }],
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    let msg = "风格分析失败";
    try { msg = JSON.parse(text).error?.message || msg; } catch {}
    if (res.status === 401) msg = "API 密钥无效";
    throw new Error(msg);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI 返回格式错误");
  return content;
}

export async function POST(req: NextRequest) {
  try {
    const { imageDataUrl, apiKey, textModel } = await req.json();
    if (!imageDataUrl) return NextResponse.json({ error: "缺少图片" }, { status: 400 });

    const resolvedKey = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!resolvedKey) return NextResponse.json({ error: "请先填写 API 密钥" }, { status: 400 });

    const provider = getProvider(textModel || "claude-sonnet-4-20250514");
    // Always use vision-capable model for image analysis
    const visionModel = VISION_MODELS[provider] || textModel || "claude-sonnet-4-20250514";

    let description: string;
    if (provider === "anthropic") {
      description = await analyzeWithClaude(imageDataUrl, textModel || "claude-sonnet-4-20250514", resolvedKey);
    } else {
      const baseUrl = PROVIDER_BASE_URLS[provider];
      if (!baseUrl) return NextResponse.json({ error: `不支持的平台: ${provider}` }, { status: 400 });
      description = await analyzeWithOpenAI(imageDataUrl, visionModel, resolvedKey, baseUrl);
    }

    return NextResponse.json({ description });
  } catch (error) {
    console.error("Analyze style error:", error);
    const msg = error instanceof Error ? error.message : "风格分析失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
