import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const FULL_PROMPT = `你是一位专业的文章分析师。请将以下文章按场景进行极细粒度分段。

要求：
- 每 1-2 句话就切分为一个独立场景，确保几乎每句话都对应一个画面
- 这是视频脚本级别的分段，每个段落对应一个短镜头（2-5 秒）
- 每个段落需要：场景标签（具体、有画面感）和情绪标签（准确反映情感基调）

以 JSON 数组格式返回，每个元素包含：
- text: 段落原文
- sceneTag: 场景标签
- emotionTag: 情绪标签

只返回 JSON 数组，不要其他内容。`;

const COUNTED_PROMPT = (count: number) => `你是一位专业的文章分析师。请将以下文章均匀分为 ${count} 个段落。

要求：
- 必须恰好分为 ${count} 个段落
- 每个段落长度尽量均匀
- 在语义自然的位置切分，避免断句不完整
- 每个段落需要：场景标签（具体、有画面感）和情绪标签（准确反映情感基调）

以 JSON 数组格式返回，每个元素包含：
- text: 段落原文
- sceneTag: 场景标签
- emotionTag: 情绪标签

只返回 JSON 数组，不要其他内容。`;

// OpenAI-compatible API base URLs
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

async function callClaude(prompt: string, model: string, apiKey: string): Promise<string> {
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });
  const content = message.content[0];
  if (content.type !== "text") throw new Error("AI 返回格式错误");
  return content.text;
}

async function callOpenAICompatible(prompt: string, model: string, apiKey: string, baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    let msg = "文本处理失败";
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
    const { articleText, apiKey, textModel, mode, imageCount } = await req.json();

    if (!articleText || articleText.trim().length === 0) {
      return NextResponse.json({ error: "请输入文章内容" }, { status: 400 });
    }

    const resolvedKey = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!resolvedKey) {
      return NextResponse.json({ error: "请在 API 设置中填写密钥" }, { status: 400 });
    }

    const model = textModel || "claude-sonnet-4-20250514";
    const provider = getProvider(model);
    const systemPrompt = mode === "counted" && imageCount ? COUNTED_PROMPT(imageCount) : FULL_PROMPT;
    const userPrompt = `${systemPrompt}\n\n文章内容：\n${articleText}`;

    const responseText = provider === "anthropic"
      ? await callClaude(userPrompt, model, resolvedKey)
      : await callOpenAICompatible(userPrompt, model, resolvedKey, PROVIDER_BASE_URLS[provider]);

    let jsonText = responseText.trim();
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonText = jsonMatch[1].trim();

    const segments = JSON.parse(jsonText);
    const result = segments.map((seg: { text: string; sceneTag: string; emotionTag: string }, i: number) => ({
      id: `seg-${Date.now()}-${i}`,
      text: seg.text,
      sceneTag: seg.sceneTag,
      emotionTag: seg.emotionTag,
      prompt: "",
    }));

    return NextResponse.json({ segments: result });
  } catch (error) {
    console.error("Segment error:", error);
    const msg = error instanceof Error ? error.message : "分段失败";
    const isAuth = msg.includes("401") || msg.includes("authentication") || msg.includes("密钥无效");
    return NextResponse.json({ error: isAuth ? "API 密钥无效，请检查智能分段的密钥设置" : msg }, { status: isAuth ? 401 : 500 });
  }
}
