import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const PROMPT = `你是一位专业的文章分析师。请分析以下文章，判断适合分成多少个段落来配图。

考虑因素：
- 场景切换的频率
- 语义段落的自然边界
- 每个段落应该能对应一个独立的视觉画面
- 不要切得太碎，也不要太粗

请直接返回一个 JSON 对象，格式为：
{"count": 数字, "reason": "简短说明分段理由（一句话）"}

只返回 JSON，不要其他内容。`;

const PROVIDER_BASE_URLS: Record<string, string> = {
  volcengine: "https://ark.cn-beijing.volces.com/api/v3",
  deepseek: "https://api.deepseek.com",
  qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  moonshot: "https://api.moonshot.cn/v1",
  zhipu: "https://open.bigmodel.cn/api/paas/v4",
  openrouter: "https://openrouter.ai/api/v1",
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
    const { articleText, apiKey, textModel } = await req.json();
    if (!articleText?.trim()) return NextResponse.json({ error: "请输入文章内容" }, { status: 400 });

    const resolvedKey = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!resolvedKey) return NextResponse.json({ error: "请先填写 API 密钥" }, { status: 400 });

    const model = textModel || "claude-sonnet-4-20250514";
    const provider = getProvider(model);
    const userPrompt = `${PROMPT}\n\n文章内容：\n${articleText}`;

    let responseText: string;

    if (provider === "anthropic") {
      const client = new Anthropic({ apiKey: resolvedKey });
      const message = await client.messages.create({ model, max_tokens: 256, messages: [{ role: "user", content: userPrompt }] });
      const content = message.content[0];
      if (content.type !== "text") throw new Error("AI 返回格式错误");
      responseText = content.text;
    } else {
      const baseUrl = PROVIDER_BASE_URLS[provider];
      if (!baseUrl) throw new Error(`不支持的平台: ${provider}`);
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${resolvedKey}` },
        body: JSON.stringify({ model, messages: [{ role: "user", content: userPrompt }], max_tokens: 256 }),
      });
      if (!res.ok) { const t = await res.text(); let msg = "分析失败"; try { msg = JSON.parse(t).error?.message || msg; } catch {} throw new Error(msg); }
      const data = await res.json();
      responseText = data.choices?.[0]?.message?.content;
      if (!responseText) throw new Error("AI 返回格式错误");
    }

    let jsonText = responseText.trim();
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonText = jsonMatch[1].trim();

    const result = JSON.parse(jsonText);
    return NextResponse.json({ count: result.count, reason: result.reason });
  } catch (error) {
    console.error("Suggest segments error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "分析失败" }, { status: 500 });
  }
}
