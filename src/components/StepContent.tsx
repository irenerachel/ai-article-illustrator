"use client";
import { useApp } from "@/lib/store";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, ArrowLeft, ImageIcon, LayoutGrid, MousePointerClick, Plus, Trash2, Sparkles, Loader2, Upload } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import mammoth from "mammoth";

const SAMPLE_TEXT = `人有时候会突然讨厌一首歌，不一定是歌变难听了，而是你的大脑，偷偷给它贴了标签。

心理学里有个挺冷门的现象，叫"情境绑定"。意思是，大脑不会单独储存一段声音、一种气味、一个画面，它更喜欢把它们和当时的情绪、环境一起打包。于是你后来再听到那首歌，真正被唤醒的，往往不是旋律本身，而是那段加班到凌晨的夜晚、那次难堪的争吵，或者某段你以为已经翻篇的关系。

这也是为什么，有些人一闻到某种洗衣液味道，就莫名安心；有些人看到某家餐厅的灯光，会突然低落；还有些人只是路过一个街角，情绪就先变了，连自己都说不清原因。不是你矫情，是大脑比你更早认出了"旧场景"。

更有意思的是，大脑特别会"省事"。它不会每次都重新判断眼前发生了什么，而是优先调用旧经验。只要外界出现一点熟悉线索，它就会迅速推送一整套感受。这种机制原本是为了提高生存效率，但放到现代生活里，就常常变成一种误伤。你以为自己是在讨厌今天，其实你只是被昨天触发了。

所以，很多情绪并不是凭空出现的，它们常常有"开关"，只是那个开关藏得很细。理解这一点的好处是，当你下一次突然烦躁、委屈、心慌时，可以先别急着责怪自己，不妨想想：我到底是在回应当下，还是被某个旧记忆轻轻按了一下？

人最难的，往往不是控制情绪，而是看见情绪从哪里来。一旦看见，很多反应就会开始松动。`;

export function StepContent() {
  const { state, dispatch } = useApp();
  const lang = state.lang;
  const [selectedText, setSelectedText] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<{ count: number; reason: string } | null>(null);
  const selectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const canNext = !!state.articleText.trim() && (state.illustrationMode !== "manual" || state.manualSegments.length > 0);

  const textPickerRef = useRef<HTMLDivElement>(null);

  // Listen for selection changes globally so reverse selection also works
  useEffect(() => {
    if (state.illustrationMode !== "manual" || !state.articleText) return;
    const handler = () => {
      if (selectTimer.current) clearTimeout(selectTimer.current);
      selectTimer.current = setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        // Only capture if selection is inside our text picker
        if (textPickerRef.current && textPickerRef.current.contains(selection.anchorNode)) {
          const sel = selection.toString().trim();
          if (sel) setSelectedText(sel);
        }
      }, 150);
    };
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, [state.illustrationMode, state.articleText]);

  const handleAddSegment = () => {
    if (!selectedText.trim()) return;
    dispatch({ type: "ADD_MANUAL_SEGMENT", segment: { id: `ms-${Date.now()}`, text: selectedText.trim() } });
    setSelectedText("");
    window.getSelection()?.removeAllRanges();
  };

  const docFileRef = useRef<HTMLInputElement>(null);

  const handleDocUpload = useCallback(async (file: File) => {
    if (file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) dispatch({ type: "SET_ARTICLE", text: ev.target.result as string });
      };
      reader.readAsText(file);
    } else if (file.name.endsWith(".docx")) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        dispatch({ type: "SET_ARTICLE", text: result.value });
      } catch {
        dispatch({ type: "SET_ERROR", error: lang === "zh" ? "文档解析失败" : "Failed to parse document" });
      }
    }
  }, [dispatch, lang]);

  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleDocUpload(file);
    if (e.target) e.target.value = "";
  };

  const handleLoadSample = () => {
    dispatch({ type: "SET_ARTICLE", text: SAMPLE_TEXT });
  };

  const handleSmartSuggest = async () => {
    if (!state.articleText.trim() || !state.apiConfig.textApiKey) return;
    setIsSuggesting(true);
    setSuggestion(null);
    try {
      const res = await fetch("/api/suggest-segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleText: state.articleText, apiKey: state.apiConfig.textApiKey, textModel: state.textModel }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "分析失败"); }
      const data = await res.json();
      setSuggestion(data);
      dispatch({ type: "SET_IMAGE_COUNT", count: data.count });
    } catch (e) {
      dispatch({ type: "SET_ERROR", error: e instanceof Error ? e.message : "智能分段失败" });
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
          {lang === "zh" ? "第 2 步" : "Step 2"}
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">
          {lang === "zh" ? "输入文章内容" : "Enter Your Content"}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {lang === "zh" ? "粘贴文章全文或脚本内容，AI 将智能分段并生成配图提示词。" : "Paste your article or script. AI will segment it and generate image prompts."}
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-3">
        <button
          onClick={() => dispatch({ type: "SET_ILLUSTRATION_MODE", mode: "full" })}
          className={`flex-1 flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
            state.illustrationMode === "full" ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/20"
          }`}
        >
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${state.illustrationMode === "full" ? "bg-foreground text-background" : "bg-muted"}`}>
            <ImageIcon className="h-5 w-5" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm">{lang === "zh" ? "全文配图" : "Per-Scene"}</p>
            <p className="text-xs text-muted-foreground">{lang === "zh" ? "每 1-2 句话切一个场景" : "Every 1-2 sentences"}</p>
          </div>
        </button>
        <button
          onClick={() => dispatch({ type: "SET_ILLUSTRATION_MODE", mode: "counted" })}
          className={`flex-1 flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
            state.illustrationMode === "counted" ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/20"
          }`}
        >
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${state.illustrationMode === "counted" ? "bg-foreground text-background" : "bg-muted"}`}>
            <LayoutGrid className="h-5 w-5" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm">{lang === "zh" ? "分段配图" : "By Count"}</p>
            <p className="text-xs text-muted-foreground">{lang === "zh" ? "指定配图数量" : "Specify image count"}</p>
          </div>
        </button>
        <button
          onClick={() => { dispatch({ type: "SET_ILLUSTRATION_MODE", mode: "manual" }); dispatch({ type: "CLEAR_MANUAL_SEGMENTS" }); }}
          className={`flex-1 flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
            state.illustrationMode === "manual" ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/20"
          }`}
        >
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${state.illustrationMode === "manual" ? "bg-foreground text-background" : "bg-muted"}`}>
            <MousePointerClick className="h-5 w-5" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm">{lang === "zh" ? "手动选段" : "Manual Select"}</p>
            <p className="text-xs text-muted-foreground">{lang === "zh" ? "选中文字添加配图" : "Highlight text to illustrate"}</p>
          </div>
        </button>
      </div>

      {/* Image Count (for counted mode) */}
      {state.illustrationMode === "counted" && (
        <div className="bg-card rounded-2xl border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{lang === "zh" ? "配图数量" : "Image Count"}</span>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSmartSuggest}
                disabled={isSuggesting || !state.articleText.trim() || !state.apiConfig.textApiKey}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSuggesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {lang === "zh" ? "智能分段" : "Smart Split"}
              </button>
              <button
                onClick={() => dispatch({ type: "SET_IMAGE_COUNT", count: Math.max(2, state.imageCount - 1) })}
                className="h-8 w-8 rounded-lg border text-sm font-semibold hover:bg-muted transition-colors"
              >
                -
              </button>
              <input
                type="number"
                min={2}
                max={50}
                value={state.imageCount}
                onChange={e => {
                  const v = parseInt(e.target.value);
                  if (!isNaN(v) && v >= 1 && v <= 50) dispatch({ type: "SET_IMAGE_COUNT", count: v });
                }}
                className="w-14 h-8 text-center text-lg font-bold border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-foreground/10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                onClick={() => dispatch({ type: "SET_IMAGE_COUNT", count: Math.min(50, state.imageCount + 1) })}
                className="h-8 w-8 rounded-lg border text-sm font-semibold hover:bg-muted transition-colors"
              >
                +
              </button>
            </div>
          </div>
          {suggestion ? (
            <p className="text-xs text-muted-foreground">
              {lang === "zh" ? `AI 建议分为 ${suggestion.count} 段：${suggestion.reason}` : `AI suggests ${suggestion.count} segments: ${suggestion.reason}`}
              <span className="text-foreground/40 ml-1">{lang === "zh" ? "（可自行调整）" : "(adjustable)"}</span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {lang === "zh"
                ? state.articleText.trim() ? "点击\"智能分段\"让 AI 分析文章并建议分段数量，或直接手动设置。" : "请先输入文章内容，再使用智能分段。"
                : state.articleText.trim() ? "Click \"Smart Split\" for AI suggestion, or set manually." : "Enter article text first."}
            </p>
          )}
        </div>
      )}

      {/* Text Input */}
      <div className="bg-card rounded-2xl border p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold">{lang === "zh" ? "文章内容" : "Article Content"}</span>
          <div className="flex items-center gap-3">
            <input ref={docFileRef} type="file" accept=".txt,.md,.docx" className="hidden" onChange={handleDocFileChange} />
            <button onClick={() => docFileRef.current?.click()} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Upload className="h-3 w-3" />{lang === "zh" ? "上传文档" : "Upload Doc"}
            </button>
            {state.articleText && (
              <button onClick={() => dispatch({ type: "SET_ARTICLE", text: "" })} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {lang === "zh" ? "清空" : "Clear"}
              </button>
            )}
            <span className="text-xs text-muted-foreground font-mono">{state.articleText.length} {lang === "zh" ? "字" : "chars"}</span>
          </div>
        </div>

        {/* Normal textarea for full/counted modes */}
        {state.illustrationMode !== "manual" && (
          <div className="relative">
            <Textarea
              placeholder=" "
              className="min-h-[280px] resize-none text-sm border bg-background rounded-xl p-4 focus-visible:ring-2 focus-visible:ring-foreground/10"
              value={state.articleText}
              onChange={e => dispatch({ type: "SET_ARTICLE", text: e.target.value })}
            />
            {!state.articleText && (
              <div
                className="absolute inset-0 p-4 text-sm leading-relaxed text-foreground/20 whitespace-pre-wrap pointer-events-auto cursor-text rounded-xl overflow-hidden"
                onClick={handleLoadSample}
              >
                {SAMPLE_TEXT}
                <div className="absolute bottom-3 right-3 pointer-events-auto">
                  <span className="text-[10px] text-foreground/30 bg-background/80 px-2 py-1 rounded">{lang === "zh" ? "点击加载示例" : "Click to load sample"}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manual mode: paste + select text directly */}
        {state.illustrationMode === "manual" && (
          <div className="space-y-4">
            {!state.articleText ? (
              /* Empty state: show sample as faded hint, or let user paste */
              <div className="space-y-3">
                <Textarea
                  placeholder={lang === "zh" ? "在这里粘贴文章全文..." : "Paste your article here..."}
                  className="min-h-[120px] resize-none text-sm border bg-background rounded-xl p-4 focus-visible:ring-2 focus-visible:ring-foreground/10"
                  value={state.articleText}
                  onChange={e => dispatch({ type: "SET_ARTICLE", text: e.target.value })}
                />
                <button onClick={handleLoadSample} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {lang === "zh" ? "或点击加载示例文章" : "Or click to load sample"}
                </button>
              </div>
            ) : (
              /* Has text: show as selectable content */
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {lang === "zh" ? "选中文字 → 点击\"添加为配图段落\"" : "Select text → click \"Add as segment\""}
                  </p>
                  <button onClick={() => dispatch({ type: "SET_ARTICLE", text: "" })} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                    {lang === "zh" ? "重新输入" : "Re-enter"}
                  </button>
                </div>
                <div
                  ref={textPickerRef}
                  className="text-sm leading-relaxed bg-muted/30 rounded-xl p-4 max-h-72 overflow-y-auto cursor-text select-text whitespace-pre-wrap border"
                >
                  {state.articleText}
                </div>

                <div className={`flex items-center gap-3 rounded-xl p-3 transition-all ${selectedText ? "bg-foreground/5 border opacity-100" : "opacity-0 h-0 p-0 overflow-hidden"}`}>
                  {selectedText && (
                    <>
                      <p className="text-sm flex-1 line-clamp-2">{selectedText}</p>
                      <button
                        onClick={handleAddSegment}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-foreground text-background font-semibold text-xs hover:opacity-90 transition-opacity shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />{lang === "zh" ? "添加为配图段落" : "Add"}
                      </button>
                    </>
                  )}
                </div>

                {/* Manual segments list */}
                {state.manualSegments.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {lang === "zh" ? `已添加 ${state.manualSegments.length} 个段落` : `${state.manualSegments.length} segments added`}
                      </span>
                      <button onClick={() => dispatch({ type: "CLEAR_MANUAL_SEGMENTS" })} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                        {lang === "zh" ? "全部清除" : "Clear all"}
                      </button>
                    </div>
                    {state.manualSegments.map((seg, i) => (
                      <div key={seg.id} className="flex items-start gap-2 bg-foreground/[0.03] border rounded-xl p-3">
                        <span className="text-[10px] font-bold bg-foreground text-background px-1.5 py-0.5 rounded shrink-0 mt-0.5">{i + 1}</span>
                        <p className="text-xs text-muted-foreground flex-1 line-clamp-2">{seg.text}</p>
                        <button onClick={() => dispatch({ type: "DELETE_MANUAL_SEGMENT", id: seg.id })} className="text-muted-foreground hover:text-destructive shrink-0">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex justify-between">
        <button
          onClick={() => dispatch({ type: "SET_STEP", step: 1 })}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {lang === "zh" ? "上一步" : "Back"}
        </button>
        <button
          onClick={() => canNext && dispatch({ type: "SET_STEP", step: 3 })}
          disabled={!canNext}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-foreground text-background font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {lang === "zh" ? "下一步" : "Next"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
