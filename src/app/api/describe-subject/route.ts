import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const PROMPT = `请详细描述这张图片中的主体，用于后续 AI 绘画时保持主体一致性。

主体可以是任何东西：真人、卡通角色、动物、毛毡玩偶、黏土人物、3D 角色、物品、吉祥物等。请根据实际内容描述。

如果是人物/角色，描述：外貌特征、发型发色、服装、配饰、气质
如果是动物/玩偶，描述：种类、颜色、材质（毛毡/黏土/毛绒等）、表情、体态、装饰
如果是物品/其他，描述：形状、颜色、材质、纹理、尺寸感、风格特征

输出一段简洁的描述（不超过 150 字），直接描述特征，不要分条目，适合直接嵌入绘画提示词中使用。`;

const PROVIDER_BASE_URLS: Record<string, string> = {
  volcengine: "https://ark.cn-beijing.volces.com/api/v3",
  deepseek: "https://api.deepseek.com",
  qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  moonshot: "https://api.moonshot.cn/v1",
  zhipu: "https://open.bigmodel.cn/api/paas/v4",
  openrouter: "https://openrouter.ai/api/v1",
};

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

export async function POST(req: NextRequest) {
  try {
    const { imageDataUrl, apiKey, textModel } = await req.json();
    if (!imageDataUrl) return NextResponse.json({ error: "缺少图片" }, { status: 400 });

    const resolvedKey = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!resolvedKey) return NextResponse.json({ error: "请先填写 API 密钥" }, { status: 400 });

    const provider = getProvider(textModel || "claude-sonnet-4-20250514");
    let description: string;

    if (provider === "anthropic") {
      const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) throw new Error("无效的图片数据");
      const client = new Anthropic({ apiKey: resolvedKey });
      const message = await client.messages.create({
        model: textModel || "claude-sonnet-4-20250514",
        max_tokens: 512,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: match[1] as "image/jpeg", data: match[2] } },
          { type: "text", text: PROMPT },
        ]}],
      });
      const c = message.content[0];
      if (c.type !== "text") throw new Error("AI 返回格式错误");
      description = c.text;
    } else {
      const baseUrl = PROVIDER_BASE_URLS[provider];
      if (!baseUrl) throw new Error(`不支持的平台: ${provider}`);
      const visionModel = VISION_MODELS[provider] || textModel;
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${resolvedKey}` },
        body: JSON.stringify({
          model: visionModel,
          messages: [{ role: "user", content: [
            { type: "image_url", image_url: { url: imageDataUrl } },
            { type: "text", text: PROMPT },
          ]}],
          max_tokens: 512,
        }),
      });
      if (!res.ok) { const t = await res.text(); let msg = "主体分析失败"; try { msg = JSON.parse(t).error?.message || msg; } catch {} throw new Error(msg); }
      const data = await res.json();
      description = data.choices?.[0]?.message?.content;
      if (!description) throw new Error("AI 返回格式错误");
    }

    return NextResponse.json({ description: description.trim() });
  } catch (error) {
    console.error("Describe subject error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "主体分析失败" }, { status: 500 });
  }
}
