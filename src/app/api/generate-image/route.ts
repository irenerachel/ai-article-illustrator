import { NextRequest, NextResponse } from "next/server";

const FAL_MODELS: Record<string, string> = {
  "nano-banana-pro": "fal-ai/nano-banana-pro",
  "nano-banana-2": "fal-ai/nano-banana-2",
  "nano-banana": "fal-ai/nano-banana",
  "fal-seedream-4.5": "fal-ai/bytedance/seedream/v4.5/text-to-image",
  "fal-seedream-5": "fal-ai/bytedance/seedream/v5/lite/text-to-image",
};

// Edit endpoints for image-reference generation
const FAL_EDIT_MODELS: Record<string, string> = {
  "nano-banana-pro": "fal-ai/nano-banana-pro/edit",
  "nano-banana-2": "fal-ai/nano-banana-2/edit",
  "nano-banana": "fal-ai/nano-banana/edit",
};

const FAL_SIZES: Record<string, string> = {
  "1:1": "square_hd", "4:3": "landscape_4_3", "3:4": "portrait_4_3",
  "16:9": "landscape_16_9", "9:16": "portrait_16_9", "21:9": "landscape_16_9",
};

// Seedream 5.0 Lite requires >= 3,686,400 pixels
const VOLC_SIZES: Record<string, string> = {
  "1:1": "1920x1920", "4:3": "2560x1920", "3:4": "1920x2560",
  "16:9": "2560x1440", "9:16": "1440x2560", "21:9": "2560x1097",
};

function getImageProvider(model: string): "volcengine" | "fal" | "google" {
  if (model.startsWith("doubao-")) return "volcengine";
  if (model.startsWith("gemini-")) return "google";
  return "fal";
}

const VOLC_RES_SIZES: Record<string, Record<string, string>> = {
  "1K": { "1:1": "1024x1024", "4:3": "1152x864", "3:4": "864x1152", "16:9": "1280x720", "9:16": "720x1280", "21:9": "1280x549" },
  "2K": VOLC_SIZES,
};

async function generateVolcengine(prompt: string, model: string, aspectRatio: string, apiKey: string, refImageDataUrl?: string, watermark?: boolean, resolution?: string) {
  const res_tier = resolution || "2K";
  const sizeMap = VOLC_RES_SIZES[res_tier] || VOLC_SIZES;
  const body: Record<string, unknown> = {
    model,
    prompt,
    size: sizeMap[aspectRatio] || "1920x1920",
    response_format: "url",
    seed: -1,
    watermark: watermark ?? false,
  };

  // Seedream: pass reference image + enable sequential mode for character consistency
  if (refImageDataUrl) {
    body.image = refImageDataUrl;
    body.sequential_image_generation = "auto";
  }

  const res = await fetch("https://ark.cn-beijing.volces.com/api/v3/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    let msg = "图片生成失败";
    try { msg = JSON.parse(text).error?.message || msg; } catch {}
    if (res.status === 401) msg = "API 密钥无效";
    throw new Error(msg);
  }

  const data = await res.json();
  if (data.data?.[0]?.url) return data.data[0].url;
  throw new Error("未获取到图片");
}

async function generateFal(prompt: string, model: string, aspectRatio: string, apiKey: string, refImageDataUrl?: string, resolution?: string) {
  const isNano = model.startsWith("nano-banana");

  // If reference image provided and model supports edit, use edit endpoint
  if (refImageDataUrl && isNano && FAL_EDIT_MODELS[model]) {
    const editPath = FAL_EDIT_MODELS[model];
    const body = {
      image_url: refImageDataUrl,
      prompt,
      num_images: 1,
      resolution: resolution || "1K",
      aspect_ratio: aspectRatio,
      output_format: "png",
      thinking_level: "minimal",
    };

    const res = await fetch(`https://fal.run/${editPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Key ${apiKey}` },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      let msg = "图片生成失败";
      try { msg = JSON.parse(text).detail || msg; } catch {}
      if (res.status === 401) msg = "API 密钥无效";
      throw new Error(msg);
    }

    const data = await res.json();
    if (data.images?.[0]?.url) return data.images[0].url;
    if (data.output?.[0]) return data.output[0];
    throw new Error("未获取到图片");
  }

  // Standard text-to-image
  const modelPath = FAL_MODELS[model];
  if (!modelPath) throw new Error(`不支持的模型: ${model}`);

  const body = isNano
    ? { prompt, num_images: 1, resolution: resolution || "1K", aspect_ratio: aspectRatio, output_format: "png", thinking_level: "minimal" }
    : { prompt, image_size: FAL_SIZES[aspectRatio] || "landscape_16_9", num_images: 1, enable_safety_checker: true };

  const res = await fetch(`https://fal.run/${modelPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Key ${apiKey}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    let msg = "图片生成失败";
    try { msg = JSON.parse(text).detail || msg; } catch {}
    if (res.status === 401) msg = "API 密钥无效";
    throw new Error(msg);
  }

  const data = await res.json();
  if (data.images?.[0]?.url) return data.images[0].url;
  if (data.output?.[0]) return data.output[0];
  throw new Error("未获取到图片");
}

async function generateGemini(prompt: string, model: string, aspectRatio: string, apiKey: string, refImageDataUrl?: string, resolution?: string) {
  // Build content parts - include reference image if provided
  const parts: Array<Record<string, unknown>> = [];

  if (refImageDataUrl) {
    const match = refImageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (match) {
      parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      parts.push({ text: `请参考这张图片中的主体人物/角色，在新生成的图片中保持该主体的外貌特征一致。\n\n${prompt}` });
    } else {
      parts.push({ text: prompt });
    }
  } else {
    parts.push({ text: prompt });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: { aspectRatio: aspectRatio.replace(":", ":"), imageSize: resolution || "1K" },
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    let msg = "图片生成失败";
    try { msg = JSON.parse(text).error?.message || msg; } catch {}
    if (res.status === 401 || res.status === 403) msg = "Google API 密钥无效";
    throw new Error(msg);
  }

  const data = await res.json();
  const resParts = data.candidates?.[0]?.content?.parts;
  if (resParts) {
    for (const part of resParts) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || "image/png";
        return `data:${mime};base64,${part.inlineData.data}`;
      }
    }
  }

  throw new Error("未获取到图片");
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, model, aspectRatio, apiKey, refImageDataUrl, watermark, resolution } = await req.json();
    if (!prompt) return NextResponse.json({ error: "缺少提示词" }, { status: 400 });

    const key = apiKey || process.env.IMAGE_API_KEY;
    if (!key) return NextResponse.json({ error: "请在 API 设置中填写图片生成的密钥" }, { status: 400 });

    const provider = getImageProvider(model);
    let imageUrl: string;

    switch (provider) {
      case "volcengine":
        imageUrl = await generateVolcengine(prompt, model, aspectRatio, key, refImageDataUrl, watermark, resolution);
        break;
      case "google":
        imageUrl = await generateGemini(prompt, model, aspectRatio, key, refImageDataUrl, resolution);
        break;
      default:
        imageUrl = await generateFal(prompt, model, aspectRatio, key, refImageDataUrl, resolution);
        break;
    }

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("Generate image error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "图片生成失败" }, { status: 500 });
  }
}
