import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

interface SegmentInput {
  id: string;
  text: string;
  sceneTag: string;
  emotionTag: string;
}

interface StyleConfig {
  visualStyle: string;
  colorTone: string;
  aspectRatio: string;
  imageTool: string;
  platform: string;
}

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
    let msg = "生成失败";
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
    const { segments, styleConfig, apiKey, textModel, mode, skillText, subjectPrompt, infographicMode } = (await req.json()) as {
      segments: SegmentInput[];
      styleConfig: StyleConfig;
      apiKey?: string;
      textModel?: string;
      mode?: string;
      skillText?: string;
      subjectPrompt?: string;
      infographicMode?: boolean;
    };

    if (!segments || segments.length === 0) {
      return NextResponse.json({ error: "没有可生成的段落" }, { status: 400 });
    }

    const resolvedKey = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!resolvedKey) {
      return NextResponse.json({ error: "请在 API 设置中填写密钥" }, { status: 400 });
    }

    const model = textModel || "claude-sonnet-4-20250514";
    const provider = getProvider(model);
    const styleLock = `${styleConfig.visualStyle} · ${styleConfig.colorTone} · ${styleConfig.aspectRatio}`;

    const segDescs = segments.map((seg, i) =>
      `段落 ${i + 1} (ID: ${seg.id}):\n文本: ${seg.text}\n场景: ${seg.sceneTag}\n情绪: ${seg.emotionTag}`
    ).join("\n\n");

    const selectiveInstructions = "";

    const skillInstructions = skillText
      ? `\n\n## 风格参考\n所有提示词必须严格遵循此风格指南：\n${skillText}`
      : "";

    const subjectInstructions = subjectPrompt
      ? `\n\n## 参考主体\n以下是用户设定的主体角色，需要出现主体的画面请自然融入此角色：\n${subjectPrompt}\n注意：不是每张图都需要主体，空镜、景物、远景等画面不要强行加入主体。根据段落内容自然判断。`
      : "";

    const infographicInstructions = infographicMode
      ? `\n\n## 智能信息图模式
请智能判断每个段落适合哪种配图方式：

**信息图（适用于包含数据、流程、对比、列表、统计等内容的段落）：**
- 包含数据可视化元素（图表、流程图、图标、统计数字等）
- 使用清晰的排版层次和信息结构
- 从文本中提取关键数据或要点，以可视化方式呈现
- 需要在图片上显示的文字内容，必须用双引号""括住，例如："关键数据"
- 严禁将画面比例、色号、技术参数当做图片上的文字内容

**纯插图（适用于叙事、描写、抒情、场景类段落）：**
- 正常生成场景画面，不需要文字和数据元素
- 按常规插图方式处理

你需要逐段判断，不要把所有段落都做成信息图，只有真正适合信息图的才用信息图风格。`
      : "";

    const userPrompt = `你是一位资深的视觉导演和 AI 绘画提示词专家。你的任务是为文章的每个段落构思一个最能传达该段落核心意境的画面，并输出精准的绘画提示词。

## 风格锁定（最高优先级）
视觉风格：${styleConfig.visualStyle}
色彩基调：${styleConfig.colorTone}
画面比例：${styleConfig.aspectRatio}

⚠️ 极其重要：每一条提示词都必须在开头明确包含"${styleConfig.visualStyle}"这个风格关键词。
例如如果风格是"毛毡风格"，则每条提示词必须以"毛毡风格，"开头；如果是"3D皮克斯"，则以"3D皮克斯风格，"开头。
这是强制要求，不可省略。
${skillInstructions}${subjectInstructions}${infographicInstructions}

## 文章段落

${segDescs}

## 你的思考过程（内心完成，不要输出）

对每个段落，你需要：
1. **抓核心意象**：这段文字最打动人的画面是什么？不是翻译文字，而是找到最有视觉冲击力的那个瞬间
2. **选择镜头**：这个画面用什么视角最好？俯拍的壮阔？平视的亲近？仰拍的压迫？微距的细腻？
3. **构建场景**：画面中有什么具体的物体、人物、环境？它们之间的空间关系是什么？
4. **定义光影**：什么样的光线最能强化情绪？清晨的柔光？正午的硬光？逆光的剪影？霓虹的反射？
5. **锁定氛围**：这张图给人的第一感觉应该是什么？温暖？孤独？紧张？宁静？

## 提示词输出规则

- 每条提示词描述一个单一的静态画面
- 禁止动态叙述（"依次展现""从...到..."）
- 要具体：不要写"美丽的风景"，要写"雾气弥漫的竹林小径，晨光从竹叶缝隙洒下金色光斑"
- 要有层次：前景、中景、背景
- 要有质感：材质、纹理、温度感
- 要有光影：光源方向、阴影形态
- 提示词以中文输出

## 每条提示词必须包含的要素（缺一不可）
1. 风格关键词（开头）：${styleConfig.visualStyle}
2. 色彩基调：${styleConfig.colorTone === "正常" ? "自然色彩" : styleConfig.colorTone}${infographicMode ? "\n3. 如果该段落适合信息图，在提示词中注明"信息图风格"" : ""}${skillText ? "\n" + (infographicMode ? "4" : "3") + ". 风格参考中的关键风格特征" : ""}

## 提示词结构
[${styleConfig.visualStyle}风格] + [色调：${styleConfig.colorTone === "正常" ? "自然" : styleConfig.colorTone}] + [画面主体] + [场景环境] + [光影氛围] + [材质质感]

以 JSON 数组返回，每个元素：
- id: 段落ID
- prompt: 提示词（80-150字，必须包含风格和色调关键词）
- shouldIllustrate: 是否需要配图 (boolean)

只返回 JSON 数组。`;

    const responseText = provider === "anthropic"
      ? await callClaude(userPrompt, model, resolvedKey)
      : await callOpenAICompatible(userPrompt, model, resolvedKey, PROVIDER_BASE_URLS[provider]);

    let jsonText = responseText.trim();
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonText = jsonMatch[1].trim();

    const prompts = JSON.parse(jsonText);
    return NextResponse.json({ prompts, styleLock });
  } catch (error) {
    console.error("Generate prompts error:", error);
    const msg = error instanceof Error ? error.message : "生成提示词失败";
    const isAuth = msg.includes("401") || msg.includes("authentication") || msg.includes("密钥无效");
    return NextResponse.json({ error: isAuth ? "API 密钥无效，请检查提示词生成的密钥设置" : msg }, { status: isAuth ? 401 : 500 });
  }
}
