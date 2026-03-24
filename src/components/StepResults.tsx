"use client";
import { useApp } from "@/lib/store";
import { IMAGE_MODELS } from "@/lib/types";
import { SegmentCard } from "./SegmentCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ImageIcon, Download, Copy, Check, FileDown, Plus, TextSelect, Wand2, Loader2, Images, Upload, X, User, RefreshCw } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import JSZip from "jszip";

export function StepResults() {
  const { state, dispatch } = useApp();
  const lang = state.lang;
  const [copiedAll, setCopiedAll] = useState(false);
  const [showTextPicker, setShowTextPicker] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isGeneratingSubject, setIsGeneratingSubject] = useState(false);
  const [isSmartAssigning, setIsSmartAssigning] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const subjectFileRef = useRef<HTMLInputElement>(null);
  const hasImageKey = !!state.apiConfig.imageApiKey;
  const selectedModel = IMAGE_MODELS.find(m => m.id === state.styleConfig.imageModel);

  const [isAnalyzingSubject, setIsAnalyzingSubject] = useState(false);

  const analyzeSubjectImage = async (dataUrl: string) => {
    setIsAnalyzingSubject(true);
    try {
      const res = await fetch("/api/describe-subject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: dataUrl, apiKey: state.apiConfig.textApiKey, textModel: state.textModel }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "分析失败"); }
      const { description } = await res.json();
      dispatch({ type: "SET_SUBJECT_PROMPT", prompt: description });
    } catch (e) {
      dispatch({ type: "SET_ERROR", error: e instanceof Error ? e.message : "主体分析失败" });
    } finally {
      setIsAnalyzingSubject(false);
    }
  };

  const handleUploadSubject = (file: File) => {
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
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        dispatch({ type: "SET_SUBJECT_IMAGE", dataUrl });
        // Auto-analyze to extract subject description
        analyzeSubjectImage(dataUrl);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSmartAssignSubject = async () => {
    if (!state.subjectPrompt || state.segments.length === 0) return;
    setIsSmartAssigning(true);
    try {
      const res = await fetch("/api/assign-subject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segments: state.segments.map(s => ({ id: s.id, prompt: s.prompt })),
          subjectPrompt: state.subjectPrompt,
          apiKey: state.apiConfig.textApiKey,
          textModel: state.textModel,
        }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "分析失败"); }
      const { assignments } = await res.json();
      for (const a of assignments as { id: string; useSubject: boolean }[]) {
        dispatch({ type: "UPDATE_SEGMENT", id: a.id, updates: { useSubject: a.useSubject } });
      }
    } catch (e) {
      dispatch({ type: "SET_ERROR", error: e instanceof Error ? e.message : "智能分配失败" });
    } finally {
      setIsSmartAssigning(false);
    }
  };

  const handleGenerateSubject = async () => {
    if (!state.subjectPrompt.trim() || !hasImageKey) return;
    setIsGeneratingSubject(true);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: state.subjectPrompt, model: state.styleConfig.imageModel, aspectRatio: "1:1", apiKey: state.apiConfig.imageApiKey }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      const { imageUrl } = await res.json();
      dispatch({ type: "SET_SUBJECT_IMAGE", dataUrl: imageUrl });
    } catch (e) {
      dispatch({ type: "SET_ERROR", error: e instanceof Error ? e.message : "主体生成失败" });
    } finally {
      setIsGeneratingSubject(false);
    }
  };

  const generateOneImage = async (seg: typeof state.segments[0]) => {
    dispatch({ type: "UPDATE_SEGMENT", id: seg.id, updates: { isGeneratingImage: true, imageError: undefined } });
    try {
      let prompt = seg.prompt;
      if (state.skillText) {
        const promptLower = seg.prompt.toLowerCase();
        const styleSegments = state.skillText.split(/[，。,.\n]+/).map(s => s.trim()).filter(s => s.length > 3);
        const uniqueParts = styleSegments.filter(s => !promptLower.includes(s.toLowerCase()));
        if (uniqueParts.length > 0) prompt += `\n\n风格参考：${uniqueParts.join("，")}`;
      }
      const res = await fetch("/api/generate-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, model: state.styleConfig.imageModel, aspectRatio: state.styleConfig.aspectRatio, apiKey: state.apiConfig.imageApiKey, watermark: state.watermark, resolution: state.imageResolution }) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      const { imageUrl } = await res.json();
      dispatch({ type: "UPDATE_SEGMENT", id: seg.id, updates: { imageUrl, isGeneratingImage: false } });
    } catch (error) { dispatch({ type: "UPDATE_SEGMENT", id: seg.id, updates: { isGeneratingImage: false, imageError: error instanceof Error ? error.message : "失败" } }); }
  };

  const pendingSegments = state.segments.filter(s => s.prompt && !s.imageUrl && !s.isGeneratingImage && s.shouldIllustrate !== false);
  const isAnyGenerating = state.segments.some(s => s.isGeneratingImage);
  const cancelRef = useRef(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);

  const handleGenerateAllImages = async () => {
    cancelRef.current = false;
    setIsBatchGenerating(true);
    for (const seg of pendingSegments) {
      if (cancelRef.current) break;
      await generateOneImage(seg);
    }
    setIsBatchGenerating(false);
  };

  const handleCancelBatch = () => {
    cancelRef.current = true;
  };

  const handleGenerateNextImage = async () => {
    if (pendingSegments.length > 0) await generateOneImage(pendingSegments[0]);
  };

  const handleCopyAll = async () => {
    const text = state.segments.map((seg, i) => `## ${i + 1}\n${seg.sceneTag} | ${seg.emotionTag}\n\n${seg.text}\n\n${seg.prompt}`).join("\n\n---\n\n");
    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleExport = (fmt: "md" | "json" | "txt") => {
    let content: string;
    let mimeType: string;
    let ext: string;
    if (fmt === "md") {
      content = `# ${lang === "zh" ? "全文配图提示词" : "Article Illustration Prompts"}\n\n> ${state.styleLock}\n\n${state.segments.map((s, i) => `## ${i + 1}. ${s.sceneTag}\n\n${s.text}\n\n\`\`\`\n${s.prompt}\n\`\`\``).join("\n\n---\n\n")}`;
      mimeType = "text/markdown"; ext = "md";
    } else if (fmt === "json") {
      content = JSON.stringify({ styleLock: state.styleLock, segments: state.segments.map((s, i) => ({ index: i + 1, text: s.text, sceneTag: s.sceneTag, emotionTag: s.emotionTag, prompt: s.prompt, imageUrl: s.imageUrl })) }, null, 2);
      mimeType = "application/json"; ext = "json";
    } else {
      content = state.segments.map((s, i) => `[${i + 1}] ${s.sceneTag} | ${s.emotionTag}\n\n${s.text}\n\n提示词：${s.prompt}`).join("\n\n" + "=".repeat(40) + "\n\n");
      mimeType = "text/plain"; ext = "txt";
    }
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `prompts.${ext}`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleTextSelect = useCallback(() => {
    setTimeout(() => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        setSelectedText(selection.toString().trim());
      }
    }, 10);
  }, []);

  const imagesWithUrl = state.segments.filter(s => s.imageUrl);

  const downloadOneImage = async (url: string, filename: string) => {
    if (url.startsWith("data:")) {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      return;
    }
    // Use backend proxy to avoid CORS issues
    try {
      const res = await fetch("/api/proxy-image?" + new URLSearchParams({ url }));
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: open in new tab
      window.open(url, "_blank");
    }
  };

  const [isZipping, setIsZipping] = useState(false);

  const handleDownloadAllImages = async () => {
    if (imagesWithUrl.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < imagesWithUrl.length; i++) {
        const url = imagesWithUrl[i].imageUrl!;
        let blob: Blob;
        if (url.startsWith("data:")) {
          const res = await fetch(url);
          blob = await res.blob();
        } else {
          const res = await fetch("/api/proxy-image?" + new URLSearchParams({ url }));
          if (!res.ok) continue;
          blob = await res.blob();
        }
        const ext = blob.type.includes("png") ? "png" : "jpg";
        zip.file(`image-${i + 1}.${ext}`, blob);
      }
      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = "ai-illustrator-images.zip";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      // Fallback to one-by-one download
      for (let i = 0; i < imagesWithUrl.length; i++) {
        await downloadOneImage(imagesWithUrl[i].imageUrl!, `image-${i + 1}.png`);
        if (i < imagesWithUrl.length - 1) await new Promise(r => setTimeout(r, 500));
      }
    } finally {
      setIsZipping(false);
    }
  };

  const handleAddSelectedSegment = async () => {
    if (!selectedText.trim()) return;

    const newSegId = `seg-custom-${Date.now()}`;

    // Try to auto-generate a prompt for this segment
    setIsGeneratingPrompt(true);
    try {
      const promptRes = await fetch("/api/generate-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segments: [{ id: newSegId, text: selectedText, sceneTag: "自定义", emotionTag: "自定义" }],
          styleConfig: state.styleConfig,
          apiKey: state.apiConfig.textApiKey,
          textModel: state.textModel,
          skillText: state.skillText,
        }),
      });

      let prompt = "";
      let sceneTag = "自定义场景";
      let emotionTag = "自定义";

      if (promptRes.ok) {
        const { prompts } = await promptRes.json();
        const p = prompts.find((p: { id: string; prompt: string }) => p.id === newSegId);
        if (p?.prompt) prompt = p.prompt;
      }

      dispatch({
        type: "ADD_SEGMENT",
        segment: {
          id: newSegId,
          text: selectedText,
          sceneTag,
          emotionTag,
          prompt,
          shouldIllustrate: true,
        },
      });

      setSelectedText("");
      setShowTextPicker(false);
      setIsGeneratingPrompt(false);
    } catch {
      // If prompt generation fails, still add the segment without a prompt
      dispatch({
        type: "ADD_SEGMENT",
        segment: {
          id: newSegId,
          text: selectedText,
          sceneTag: "自定义场景",
          emotionTag: "自定义",
          prompt: "",
          shouldIllustrate: true,
        },
      });
      setSelectedText("");
      setShowTextPicker(false);
      setIsGeneratingPrompt(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">{lang === "zh" ? "第 4 步" : "Step 4"}</p>
        <h1 className="text-3xl font-extrabold tracking-tight">{lang === "zh" ? "生成结果" : "Results"}</h1>
      </div>

      {/* Toolbar */}
      <div className="bg-card rounded-2xl border px-5 py-4 space-y-3">
        {/* Row 1: Info + primary action */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold">{state.segments.length} {lang === "zh" ? "个段落" : "segments"}</span>
            {state.styleLock && <Badge variant="secondary" className="text-xs rounded-lg">{state.styleLock}</Badge>}
            {selectedModel && <Badge variant="outline" className="text-xs rounded-lg">{selectedModel.name}</Badge>}
          </div>
          <div className="flex items-center gap-2">
            {hasImageKey && pendingSegments.length > 0 && !isBatchGenerating && (
              <Button size="sm" className="rounded-lg bg-foreground text-background hover:opacity-90" disabled={isAnyGenerating} onClick={handleGenerateAllImages}>
                <ImageIcon className="h-3.5 w-3.5 mr-1.5" />{lang === "zh" ? "生成全部配图" : "Generate All"}
              </Button>
            )}
            {hasImageKey && pendingSegments.length === 0 && imagesWithUrl.length > 0 && !isBatchGenerating && (
              <Button size="sm" variant="outline" className="rounded-lg" disabled={isAnyGenerating} onClick={() => {
                state.segments.forEach(s => { if (s.imageUrl) dispatch({ type: "UPDATE_SEGMENT", id: s.id, updates: { imageUrl: undefined, imageError: undefined } }); });
                setTimeout(() => handleGenerateAllImages(), 100);
              }}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />{lang === "zh" ? "重新生成全部" : "Regenerate All"}
              </Button>
            )}
            {isBatchGenerating && (
              <Button size="sm" variant="outline" className="rounded-lg border-destructive text-destructive hover:bg-destructive/10" onClick={handleCancelBatch}>
                <X className="h-3.5 w-3.5 mr-1.5" />{lang === "zh" ? "取消生成" : "Cancel"}
              </Button>
            )}
            {imagesWithUrl.length > 0 && (
              <Button size="sm" className="rounded-lg bg-foreground text-background hover:opacity-90" disabled={isZipping} onClick={handleDownloadAllImages}>
                {isZipping ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Images className="h-3.5 w-3.5 mr-1.5" />}{lang === "zh" ? (isZipping ? "打包中..." : "下载全部图片") : (isZipping ? "Zipping..." : "Download All")}
              </Button>
            )}
          </div>
        </div>
        {/* Row 2: Secondary actions */}
        <div className="flex items-center gap-3 text-muted-foreground flex-wrap">
          <button onClick={() => setShowTextPicker(!showTextPicker)} className="flex items-center gap-1 text-xs hover:text-foreground transition-colors">
            <TextSelect className="h-3 w-3" />{lang === "zh" ? "选文配图" : "Select Text"}
          </button>
          <span className="text-border">|</span>
          <button onClick={handleCopyAll} className="flex items-center gap-1 text-xs hover:text-foreground transition-colors">
            {copiedAll ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
            {copiedAll ? (lang === "zh" ? "已复制" : "Copied") : (lang === "zh" ? "复制提示词" : "Copy")}
          </button>
          <span className="text-border">|</span>
          <button onClick={() => handleExport("md")} className="flex items-center gap-1 text-xs hover:text-foreground transition-colors">
            <Download className="h-3 w-3" />MD
          </button>
          <span className="text-border">|</span>
          <button onClick={() => handleExport("json")} className="flex items-center gap-1 text-xs hover:text-foreground transition-colors">
            <FileDown className="h-3 w-3" />JSON
          </button>
          <span className="text-border">|</span>
          <button onClick={() => handleExport("txt")} className="flex items-center gap-1 text-xs hover:text-foreground transition-colors">
            <FileDown className="h-3 w-3" />TXT
          </button>
        </div>
      </div>

      {/* Subject Reference */}
      <div className="bg-card rounded-2xl border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="font-semibold text-sm">{lang === "zh" ? "参考主体" : "Subject Reference"}</span>
          </div>
          {state.subjectImageDataUrl && (
            <button onClick={() => dispatch({ type: "SET_SUBJECT_IMAGE", dataUrl: "" })} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
              {lang === "zh" ? "清除" : "Clear"}
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{lang === "zh" ? "上传或生成一个主体形象，后续配图将参考这个主体保持一致性。" : "Upload or generate a subject. Subsequent images will reference this subject."}</p>

        {state.subjectImageDataUrl ? (
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <img src={state.subjectImageDataUrl} alt="Subject" className="w-24 h-24 rounded-xl object-cover border" />
              <button onClick={() => { dispatch({ type: "SET_SUBJECT_IMAGE", dataUrl: "" }); dispatch({ type: "SET_SUBJECT_PROMPT", prompt: "" }); }} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-80"><X className="h-3 w-3" /></button>
            </div>
            <div className="flex-1 space-y-2">
              {isAnalyzingSubject ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />{lang === "zh" ? "AI 正在分析主体特征..." : "Analyzing subject..."}</p>
              ) : state.subjectPrompt ? (
                <>
                  <p className="text-xs text-muted-foreground">{lang === "zh" ? "AI 提取的主体描述（可编辑）：" : "AI-extracted subject description (editable):"}</p>
                  <textarea
                    className="w-full text-xs rounded-lg border bg-background px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-foreground/10 h-16"
                    value={state.subjectPrompt}
                    onChange={e => dispatch({ type: "SET_SUBJECT_PROMPT", prompt: e.target.value })}
                  />
                  <button
                    onClick={handleSmartAssignSubject}
                    disabled={isSmartAssigning || state.segments.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-40"
                  >
                    {isSmartAssigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                    {lang === "zh" ? "智能分配主体" : "Smart Assign"}
                  </button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">{lang === "zh" ? "主体已上传，但描述为空。请手动输入或重新上传。" : "Subject uploaded but no description."}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <input
                type="text"
                placeholder={lang === "zh" ? "描述主体，如：一只橘色的猫咪，戴着蓝色围巾..." : "Describe subject, e.g.: an orange cat with a blue scarf..."}
                className="w-full h-10 rounded-xl border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10"
                value={state.subjectPrompt}
                onChange={e => dispatch({ type: "SET_SUBJECT_PROMPT", prompt: e.target.value })}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateSubject}
                  disabled={!state.subjectPrompt.trim() || !hasImageKey || isGeneratingSubject}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  {isGeneratingSubject ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                  {lang === "zh" ? "生成主体" : "Generate"}
                </button>
                <input ref={subjectFileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadSubject(f); }} />
                <button
                  onClick={() => subjectFileRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />{lang === "zh" ? "上传主体图片" : "Upload"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Text Picker Panel */}
      {showTextPicker && (
        <div className="bg-card rounded-2xl border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TextSelect className="h-4 w-4" />
              <span className="font-semibold text-sm">{lang === "zh" ? "选中文段配图" : "Select Text to Illustrate"}</span>
            </div>
            <button onClick={() => { setShowTextPicker(false); setSelectedText(""); }} className="text-xs text-muted-foreground hover:text-foreground">
              {lang === "zh" ? "关闭" : "Close"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {lang === "zh"
              ? "在下方文章中用鼠标选中一段文字，然后点击\"为选中内容配图\"按钮，AI 将自动为该段落生成提示词。"
              : "Select text from the article below, then click the button to generate a prompt for it."}
          </p>
          <div
            ref={textRef}
            className="text-sm leading-relaxed bg-muted/50 rounded-xl p-4 max-h-60 overflow-y-auto cursor-text select-text whitespace-pre-wrap"
            onMouseUp={handleTextSelect}
          >
            {state.articleText}
          </div>
          {selectedText && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground">{lang === "zh" ? "已选中：" : "Selected:"}</div>
              <div className="text-sm bg-foreground/5 border rounded-xl p-3 leading-relaxed">{selectedText}</div>
              <button
                onClick={handleAddSelectedSegment}
                disabled={isGeneratingPrompt}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {isGeneratingPrompt ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />{lang === "zh" ? "生成提示词中..." : "Generating prompt..."}</>
                ) : (
                  <><Plus className="h-4 w-4" />{lang === "zh" ? "为选中内容配图" : "Illustrate Selection"}</>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cards */}
      <div className="space-y-4">
        {state.segments.map((seg, i) => (
          <SegmentCard key={seg.id} segment={seg} index={i} total={state.segments.length} />
        ))}
      </div>

      {/* Nav */}
      <div className="flex justify-between">
        <button onClick={() => dispatch({ type: "SET_STEP", step: 3 })} className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium hover:bg-muted transition-colors">
          <ArrowLeft className="h-4 w-4" />{lang === "zh" ? "返回配置" : "Back to Config"}
        </button>
        <button onClick={() => dispatch({ type: "RESET" })} className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium hover:bg-muted transition-colors">
          {lang === "zh" ? "重新开始" : "Start Over"}
        </button>
      </div>
    </div>
  );
}
