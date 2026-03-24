import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

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
    const { segments, subjectPrompt, apiKey, textModel } = await req.json();
    if (!segments?.length || !subjectPrompt) return NextResponse.json({ error: "缺少参数" }, { status: 400 });

    const resolvedKey = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!resolvedKey) return NextResponse.json({ error: "请先填写 API 密钥" }, { status: 400 });

    const model = textModel || "claude-sonnet-4-20250514";
    const provider = getProvider(model);

    const segList = segments.map((s: { id: string; prompt: string }) => `ID: ${s.id}\n提示词: ${s.prompt}`).join("\n\n");

    const prompt = `你是一位配图编导。以下是一组配图提示词，以及一个参考主体的描述。
请判断哪些画面中应该出现这个主体（如与主体相关的场景、互动画面），哪些不需要（如纯空镜、远景风光、物品特写、抽象概念画面）。

参考主体：${subjectPrompt}

提示词列表：
${segList}

返回 JSON 数组，每个元素：{"id": "段落ID", "useSubject": true/false}
只返回 JSON 数组。`;

    let responseText: string;

    if (provider === "anthropic") {
      const client = new Anthropic({ apiKey: resolvedKey });
      const message = await client.messages.create({ model, max_tokens: 1024, messages: [{ role: "user", content: prompt }] });
      const c = message.content[0];
      if (c.type !== "text") throw new Error("AI 返回格式错误");
      responseText = c.text;
    } else {
      const baseUrl = PROVIDER_BASE_URLS[provider];
      if (!baseUrl) throw new Error(`不支持的平台: ${provider}`);
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${resolvedKey}` },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], max_tokens: 1024 }),
      });
      if (!res.ok) throw new Error("分析失败");
      const data = await res.json();
      responseText = data.choices?.[0]?.message?.content || "";
    }

    let jsonText = responseText.trim();
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonText = jsonMatch[1].trim();
    const arrMatch = jsonText.match(/\[[\s\S]*\]/);
    if (!arrMatch) throw new Error("AI 返回格式错误");

    const assignments = JSON.parse(arrMatch[0]);
    return NextResponse.json({ assignments });
  } catch (error) {
    console.error("Assign subject error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "分析失败" }, { status: 500 });
  }
}
