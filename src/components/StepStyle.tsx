"use client";
import { useApp } from "@/lib/store";
import { VISUAL_STYLES, COLOR_TONES, ASPECT_RATIOS, EXTENDED_RATIOS, IMAGE_MODELS, BUILT_IN_PRESETS, getImageModelProvider, RESOLUTION_OPTIONS } from "@/lib/types";
import type { StylePreset } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Wand2, Loader2, BookmarkPlus, Trash2, Upload, FileText, Save, FolderOpen, ImageIcon, X, Sparkles } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";

const WAIT_JOKES = [
  "AI 正在认真看你的文章，比你的读者还认真...",
  "提示词工程师正在加班，请给它一杯咖啡的时间 ☕",
  "据说等待的时候想一个冷笑话，时间会过得更快。好吧我编不出来。",
  "你知道吗？AI 生成一张图的时间，刚好够你喝一口水 💧",
];

export function StepStyle() {
  const { state, dispatch } = useApp();
  const lang = state.lang;
  const isProcessing = state.isSegmenting || state.isGeneratingPrompts;
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [showSaveSkill, setShowSaveSkill] = useState(false);
  const [skillName, setSkillName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [jokeIndex, setJokeIndex] = useState(0);

  useEffect(() => {
    if (!isProcessing) return;
    const timer = setInterval(() => setJokeIndex(i => (i + 1) % WAIT_JOKES.length), 4000);
    return () => clearInterval(timer);
  }, [isProcessing]);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const readFileAsText = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => { if (ev.target?.result) dispatch({ type: "SET_SKILL", text: ev.target.result as string }); };
    reader.readAsText(file);
  }, [dispatch]);

  const handleUploadImage = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new window.Image();
      img.onload = () => {
        const max = 512;
        let w = img.width, h = img.height;
        if (w > max || h > max) {
          if (w > h) { h = Math.round(h * max / w); w = max; }
          else { w = Math.round(w * max / h); h = max; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        dispatch({ type: "SET_SKILL_IMAGE", dataUrl: canvas.toDataURL("image/jpeg", 0.8) });
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [dispatch]);

  const handleAnalyzeStyle = async () => {
    if (!state.skillImageDataUrl) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/analyze-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: state.skillImageDataUrl, apiKey: state.apiConfig.textApiKey, textModel: state.textModel }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "分析失败"); }
      const { description } = await res.json();
      dispatch({ type: "SET_SKILL", text: description });
    } catch (e) {
      dispatch({ type: "SET_ERROR", error: e instanceof Error ? e.message : "风格分析失败" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.type.startsWith("image/")) { handleUploadImage(file); return; }
    if (file.name.endsWith(".txt") || file.name.endsWith(".md")) { readFileAsText(file); return; }
  }, [readFileAsText, handleUploadImage]);

  const allPresets = [...BUILT_IN_PRESETS, ...state.customPresets];

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    dispatch({ type: "ADD_PRESET", preset: { id: `c-${Date.now()}`, name: presetName.trim(), config: { visualStyle: state.styleConfig.visualStyle, colorTone: state.styleConfig.colorTone, aspectRatio: state.styleConfig.aspectRatio, imageTool: state.styleConfig.imageTool, platform: state.styleConfig.platform }, skillText: state.skillText || undefined, skillImageDataUrl: state.skillImageDataUrl || undefined } });
    setPresetName(""); setShowSavePreset(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFileAsText(file);
  };

  const handleGenerate = async () => {
    if (!state.apiConfig.textApiKey) {
      dispatch({ type: "SET_ERROR", error: "请先在第 1 步配置文本模型的 API 密钥" });
      return;
    }
    try {
      let segments: { id: string; text: string; sceneTag: string; emotionTag: string }[];

      if (state.illustrationMode === "manual") {
        // Manual mode: skip AI segmentation, use user-selected segments
        segments = state.manualSegments.map(s => ({ id: s.id, text: s.text, sceneTag: "手动选段", emotionTag: "自定义" }));
      } else {
        // AI segmentation (full or counted mode)
        dispatch({ type: "SET_SEGMENTING", value: true });
        const segRes = await fetch("/api/segment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ articleText: state.articleText, apiKey: state.apiConfig.textApiKey, textModel: state.textModel, mode: state.illustrationMode, imageCount: state.imageCount }) });
        if (!segRes.ok) { const err = await segRes.json(); throw new Error(err.error || "分段失败"); }
        const data = await segRes.json();
        segments = data.segments;
        dispatch({ type: "SET_SEGMENTING", value: false });
      }

      dispatch({ type: "SET_GENERATING_PROMPTS", value: true });
      const promptRes = await fetch("/api/generate-prompts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ segments, styleConfig: state.styleConfig, apiKey: state.apiConfig.textApiKey, textModel: state.textModel, mode: state.illustrationMode, skillText: state.skillText, subjectPrompt: state.subjectPrompt || undefined, infographicMode: state.infographicMode }) });
      if (!promptRes.ok) { const err = await promptRes.json(); throw new Error(err.error || "生成失败"); }
      const { prompts, styleLock } = await promptRes.json();
      const merged = segments.map((seg) => {
        const p = prompts.find((p: { id: string; prompt: string; shouldIllustrate?: boolean }) => p.id === seg.id);
        return { ...seg, prompt: p?.prompt || "", shouldIllustrate: p?.shouldIllustrate ?? true };
      });
      dispatch({ type: "SET_SEGMENTS", segments: merged, styleLock });
      dispatch({ type: "SET_GENERATING_PROMPTS", value: false });
    } catch (error) { dispatch({ type: "SET_ERROR", error: error instanceof Error ? error.message : "处理失败" }); }
  };

  const fields = [
    { key: "visualStyle", label: lang === "zh" ? "视觉风格" : "Visual Style", options: VISUAL_STYLES },
    { key: "colorTone", label: lang === "zh" ? "色彩基调" : "Color Tone", options: COLOR_TONES },
  ] as const;

  const imageProvider = getImageModelProvider(state.styleConfig.imageModel);
  const supportsExtended = imageProvider === "fal" || imageProvider === "google";
  const ratioOptions = supportsExtended ? EXTENDED_RATIOS : ASPECT_RATIOS;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">{lang === "zh" ? "第 3 步" : "Step 3"}</p>
        <h1 className="text-3xl font-extrabold tracking-tight">{lang === "zh" ? "风格与模型配置" : "Style & Model Config"}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{lang === "zh" ? "选择视觉风格、图片模型，也可以上传风格参考文件。" : "Choose visual style, image model, or upload a style reference."}</p>
      </div>

      {/* Presets */}
      <div className="space-y-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{lang === "zh" ? "风格预设" : "Style Presets"}</span>
        <div className="flex flex-wrap gap-2">
          {allPresets.map(p => (
            <div key={p.id} className="flex">
              <button onClick={() => dispatch({ type: "APPLY_PRESET", preset: p })} className="px-4 py-2 rounded-l-xl border text-xs font-semibold hover:bg-foreground hover:text-background transition-all">{p.name}</button>
              {p.id.startsWith("c-") ? (
                <button onClick={() => dispatch({ type: "DELETE_PRESET", id: p.id })} className="px-2 py-2 rounded-r-xl border border-l-0 text-xs text-muted-foreground hover:text-destructive transition-all"><Trash2 className="h-3 w-3" /></button>
              ) : <span className="px-2 py-2 rounded-r-xl border border-l-0 text-[10px] text-muted-foreground">✓</span>}
            </div>
          ))}
          {showSavePreset ? (
            <div className="flex gap-1.5">
              <input type="text" placeholder={lang === "zh" ? "名称" : "Name"} className="h-[36px] px-3 rounded-xl border text-xs bg-background focus:outline-none w-24" value={presetName} onChange={e => setPresetName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSavePreset()} autoFocus />
              <button onClick={handleSavePreset} className="h-[36px] px-3 rounded-xl bg-foreground text-background text-xs font-semibold">{lang === "zh" ? "保存" : "Save"}</button>
              <button onClick={() => setShowSavePreset(false)} className="h-[36px] px-3 rounded-xl border text-xs">{lang === "zh" ? "取消" : "Cancel"}</button>
            </div>
          ) : (
            <button onClick={() => setShowSavePreset(true)} className="px-4 py-2 rounded-xl border border-dashed text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-foreground transition-all">
              <BookmarkPlus className="h-3.5 w-3.5 inline mr-1" />{lang === "zh" ? "保存当前" : "Save Current"}
            </button>
          )}
        </div>
      </div>

      {/* Aspect Ratio */}
      <div className="bg-card rounded-2xl border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{lang === "zh" ? "配图比例（统一）" : "Aspect Ratio (Unified)"}</span>
          {!state.customRatio ? (
            <button
              onClick={() => dispatch({ type: "SET_CUSTOM_RATIO", value: true })}
              className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              {lang === "zh" ? "允许每张单独设置 →" : "Allow per-image →"}
            </button>
          ) : (
            <button
              onClick={() => dispatch({ type: "SET_CUSTOM_RATIO", value: false })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium"
            >
              {lang === "zh" ? "已开启单独设置，点击恢复统一" : "Per-image mode, click to unify"}
            </button>
          )}
        </div>
        {!state.customRatio && (
          <div className="flex flex-wrap gap-2">
            {ratioOptions.map(r => (
              <button
                key={r}
                onClick={() => dispatch({ type: "SET_STYLE", config: { aspectRatio: r } })}
                disabled={isProcessing}
                className={`px-4 py-2 rounded-xl border text-sm font-mono font-semibold transition-all ${
                  state.styleConfig.aspectRatio === r
                    ? "bg-foreground text-background border-foreground"
                    : "hover:bg-muted"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
        {state.customRatio && (
          <p className="text-xs text-muted-foreground">{lang === "zh" ? "已开启：每张配图可在生成时单独选择比例。" : "Enabled: each image can use a different aspect ratio."}</p>
        )}
      </div>

      {/* Style Selectors */}
      <div className="bg-card rounded-2xl border p-6">
        <div className="grid grid-cols-3 gap-4">
          {fields.map(({ key, label, options }) => (
            <div key={key} className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">{label}</span>
              <Select value={state.styleConfig[key]} onValueChange={v => dispatch({ type: "SET_STYLE", config: { [key]: v } })} disabled={isProcessing}>
                <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{options.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ))}
          {/* Image Model */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">{lang === "zh" ? "图片模型" : "Image Model"}</span>
            <Select value={state.styleConfig.imageModel} onValueChange={v => dispatch({ type: "SET_STYLE", config: { imageModel: v } })} disabled={isProcessing}>
              <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>{IMAGE_MODELS.map(m => <SelectItem key={m.id} value={m.id}>{m.name} <span className="text-muted-foreground text-[10px] ml-1">{lang === "zh" ? m.desc : m.descEn}</span></SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        {!state.apiConfig.imageApiKey && (
          <p className="text-xs text-destructive mt-3">{lang === "zh" ? `⚠️ 当前图片模型（${IMAGE_MODELS.find(m => m.id === state.styleConfig.imageModel)?.name || state.styleConfig.imageModel}）尚未配置 API 密钥，请返回第 1 步填写。` : `⚠️ No API key for current image model. Go back to Step 1.`}</p>
        )}
        {!state.apiConfig.textApiKey && (
          <p className="text-xs text-destructive mt-3">{lang === "zh" ? "⚠️ 文本模型尚未配置 API 密钥，无法生成提示词。请返回第 1 步填写。" : "⚠️ No text API key. Go back to Step 1."}</p>
        )}
        {/* Resolution selector */}
        {RESOLUTION_OPTIONS[imageProvider] && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <span className="text-xs text-muted-foreground">{lang === "zh" ? "图片分辨率" : "Resolution"}</span>
            <div className="flex items-center gap-1">
              {RESOLUTION_OPTIONS[imageProvider].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => dispatch({ type: "SET_IMAGE_RESOLUTION", resolution: opt.value })}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-colors ${
                    state.imageResolution === opt.value
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Infographic mode toggle */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <div>
            <span className="text-xs text-muted-foreground">{lang === "zh" ? "智能信息图" : "Smart Infographic"}</span>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">{lang === "zh" ? "含数据的段落自动生成信息图，其余保持纯插图" : "Auto infographic for data-heavy paragraphs, plain images for others"}</p>
          </div>
          <button
            onClick={() => dispatch({ type: "SET_INFOGRAPHIC_MODE", value: !state.infographicMode })}
            className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${state.infographicMode ? "bg-foreground" : "bg-muted"}`}
          >
            <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-background transition-transform ${state.infographicMode ? "translate-x-4" : ""}`} />
          </button>
        </div>
        {/* Watermark toggle */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <span className="text-xs text-muted-foreground">{lang === "zh" ? "AI 生成水印" : "AI Watermark"}</span>
          <button
            onClick={() => dispatch({ type: "SET_WATERMARK", value: !state.watermark })}
            className={`relative w-9 h-5 rounded-full transition-colors ${state.watermark ? "bg-foreground" : "bg-muted"}`}
          >
            <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-background transition-transform ${state.watermark ? "translate-x-4" : ""}`} />
          </button>
        </div>
      </div>

      {/* Style Reference */}
      <div
        className={`bg-card rounded-2xl border p-6 space-y-5 transition-colors ${isDragging ? "border-foreground/50 bg-foreground/5 ring-2 ring-foreground/10" : ""}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="font-semibold text-sm">{lang === "zh" ? "风格参考" : "Style Reference"}</span>
          </div>
          {(state.skillText || state.skillImageDataUrl) && (
            <div className="flex gap-2">
              <button onClick={() => setShowSaveSkill(true)} className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-foreground/20 bg-foreground/5 text-xs font-medium hover:bg-foreground/10 transition-colors">
                <Save className="h-3 w-3" />{lang === "zh" ? "保存风格" : "Save"}
              </button>
              <button onClick={() => { dispatch({ type: "SET_SKILL", text: "" }); dispatch({ type: "SET_SKILL_IMAGE", dataUrl: "" }); }} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                {lang === "zh" ? "清除" : "Clear"}
              </button>
            </div>
          )}
        </div>

        {/* Reference image area */}
        {state.skillImageDataUrl ? (
          <div className="flex items-start gap-4 bg-muted/30 rounded-xl p-4">
            <div className="relative shrink-0">
              <img src={state.skillImageDataUrl} alt="Style ref" className="w-20 h-20 rounded-lg object-cover border" />
              <button onClick={() => dispatch({ type: "SET_SKILL_IMAGE", dataUrl: "" })} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-80"><X className="h-3 w-3" /></button>
            </div>
            <div className="flex-1 space-y-2">
              {isAnalyzing ? (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />{lang === "zh" ? "AI 正在分析风格..." : "Analyzing..."}</span>
              ) : (
                <button onClick={handleAnalyzeStyle} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity">
                  <Sparkles className="h-3.5 w-3.5" />{lang === "zh" ? "反推风格提示词" : "Extract Style"}
                </button>
              )}
              <p className="text-[11px] text-muted-foreground">{lang === "zh" ? "AI 将分析色调、光影、质感等风格参数" : "AI analyzes tone, lighting, texture etc."}</p>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadImage(f); }} />
            <button onClick={() => imageRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground transition-colors">
              <ImageIcon className="h-3.5 w-3.5" />{lang === "zh" ? "上传参考图" : "Upload Image"}
            </button>
            <input ref={fileRef} type="file" accept=".txt,.md" className="hidden" onChange={handleFileUpload} />
            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground transition-colors">
              <Upload className="h-3.5 w-3.5" />{lang === "zh" ? "上传文字描述" : "Upload Text"}
            </button>
          </div>
        )}

        {/* Text input */}
        {isDragging ? (
          <div className="w-full h-24 rounded-xl border-2 border-dashed border-foreground/30 bg-foreground/5 flex items-center justify-center text-sm text-muted-foreground">
            <Upload className="h-5 w-5 mr-2" />{lang === "zh" ? "松开以上传" : "Drop to upload"}
          </div>
        ) : (
          <textarea
            placeholder={lang === "zh" ? "在此输入风格描述，或上传参考图让 AI 反推。支持拖拽图片 / .txt / .md 到此区域。" : "Enter style description, or upload a reference image. Drag & drop supported."}
            className="w-full h-24 rounded-xl border bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-all"
            value={state.skillText}
            onChange={e => dispatch({ type: "SET_SKILL", text: e.target.value })}
          />
        )}

        {/* Save input */}
        {showSaveSkill && (
          <div className="flex gap-1.5 items-center">
            <input type="text" placeholder={lang === "zh" ? "风格名称..." : "Style name..."} className="h-[32px] px-3 rounded-lg border text-xs bg-background focus:outline-none flex-1 max-w-48" value={skillName} onChange={e => setSkillName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && skillName.trim()) { dispatch({ type: "SAVE_SKILL", skill: { id: `sk-${Date.now()}`, name: skillName.trim(), text: state.skillText, imageDataUrl: state.skillImageDataUrl || undefined } }); setSkillName(""); setShowSaveSkill(false); } }} autoFocus />
            <button onClick={() => { if (!skillName.trim()) return; dispatch({ type: "SAVE_SKILL", skill: { id: `sk-${Date.now()}`, name: skillName.trim(), text: state.skillText, imageDataUrl: state.skillImageDataUrl || undefined } }); setSkillName(""); setShowSaveSkill(false); }} className="h-[32px] px-3 rounded-lg bg-foreground text-background text-xs font-semibold">{lang === "zh" ? "保存" : "Save"}</button>
            <button onClick={() => { setShowSaveSkill(false); setSkillName(""); }} className="h-[32px] px-3 rounded-lg border text-xs">{lang === "zh" ? "取消" : "Cancel"}</button>
          </div>
        )}

        {/* Saved styles */}
        {state.savedSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2 border-t">
            <span className="text-[11px] text-muted-foreground mr-1 self-center">{lang === "zh" ? "已保存：" : "Saved:"}</span>
            {state.savedSkills.map(s => (
              <div key={s.id} className="flex">
                <button onClick={() => dispatch({ type: "LOAD_SKILL", id: s.id })} className="flex items-center gap-1 px-2.5 py-1 rounded-l-md border text-[11px] font-medium hover:bg-foreground hover:text-background transition-all">
                  {s.imageDataUrl ? <ImageIcon className="h-2.5 w-2.5" /> : <FolderOpen className="h-2.5 w-2.5" />}{s.name}
                </button>
                <button onClick={() => dispatch({ type: "DELETE_SKILL", id: s.id })} className="px-1 py-1 rounded-r-md border border-l-0 text-muted-foreground hover:text-destructive transition-all"><Trash2 className="h-2.5 w-2.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loading hint with jokes */}
      {isProcessing && (
        <div className="rounded-2xl border bg-foreground/[0.02] p-4 text-center space-y-2">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground transition-opacity duration-500">{WAIT_JOKES[jokeIndex]}</p>
        </div>
      )}

      {/* Error */}
      {state.error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{state.error}</div>
      )}

      {/* Nav */}
      <div className="flex justify-between">
        <button onClick={() => dispatch({ type: "SET_STEP", step: 2 })} className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium hover:bg-muted transition-colors">
          <ArrowLeft className="h-4 w-4" />{lang === "zh" ? "上一步" : "Back"}
        </button>
        <button
          onClick={handleGenerate}
          disabled={isProcessing || !state.apiConfig.textApiKey}
          className="flex items-center gap-2 px-7 py-3 rounded-full bg-foreground text-background font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {isProcessing ? (
            <><Loader2 className="h-4 w-4 animate-spin" />{state.isSegmenting ? (lang === "zh" ? "分段中..." : "Segmenting...") : (lang === "zh" ? "生成提示词..." : "Generating...")}</>
          ) : (
            <><Wand2 className="h-4 w-4" />{lang === "zh" ? "开始生成" : "Generate"}</>
          )}
        </button>
      </div>
    </div>
  );
}
