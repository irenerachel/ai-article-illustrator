import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const ANALYSIS_PROMPT = `你是一位资深的视觉风格分析师。请分析这张图片的视觉风格，输出一段可以直接用于 AI 绘画提示词的风格描述。

第一步（内心判断，不要输出）：这张图属于什么风格类型？
- 如果是摄影/写实类 → 重点分析色调、光影、摄影参数、器材风格
- 如果是插画/手绘类 → 重点分析画风流派、笔触特征、线条风格
- 如果是 3D/渲染类 → 重点分析渲染风格、材质质感、光照模型
- 如果是特殊工艺类（毛毡、黏土、纸雕、像素、蒸汽波等）→ 必须在开头明确写出工艺/风格关键词（如"毛毡风格"、"黏土质感"、"像素艺术"），然后分析材质纹理、色彩特点

第二步，根据风格类型，用自然语言描述以下维度（自然融入，不分条）：

**所有风格通用：**
- 风格关键词（必须明确写出，如：毛毡风格、3D皮克斯风格、赛博朋克、日系水彩、电影胶片感等）
- 色彩调性（色温、饱和度、主色调、调色风格）
- 光影氛围（光源、明暗、阴影特征）
- 材质与质感（表面纹理、触感、粗糙/光滑/柔软/坚硬）
- 情绪氛围（温暖/冷峻/梦幻/童趣/复古等）

**摄影类额外分析：**
- 摄影参数推测（焦段、光圈、景深）
- 器材风格推测（富士/徕卡/索尼等成像特征）

**非摄影类额外分析：**
- 工艺/技法特征（如毛毡的纤维感、黏土的手工痕迹、3D的卡通渲染）
- 细节程度（极简/精细/手工感）

严格禁止：
- 不要描述画面中的人物、角色、动物或任何具体主体
- 不要描述具体场景内容
- 不要描述构图方式和镜头角度

输出一段完整的自然语言描述，开头必须包含风格关键词，200 字左右，不要 Markdown，不分条。`;

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
