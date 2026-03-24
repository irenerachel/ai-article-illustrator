"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { Segment, ASPECT_RATIOS, EXTENDED_RATIOS, getImageModelProvider } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, Pencil, Trash2, ChevronDown, ChevronUp, ImageIcon, Loader2, RefreshCw, AlertCircle, Download, User } from "lucide-react";

export function SegmentCard({ segment, index, total }: { segment: Segment; index: number; total: number }) {
  const { state, dispatch } = useApp();
  const lang = state.lang;
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState(segment.prompt);
  const [collapsed, setCollapsed] = useState(false);
  const [localRatio, setLocalRatio] = useState(state.styleConfig.aspectRatio);
  const [lightbox, setLightbox] = useState(false);
  const useSubject = segment.useSubject ?? false;
  const setUseSubject = (v: boolean) => dispatch({ type: "UPDATE_SEGMENT", id: segment.id, updates: { useSubject: v } });
  const hasImageKey = !!state.apiConfig.imageApiKey;
  const hasSubject = !!(state.subjectPrompt && state.subjectImageDataUrl);
  const dimmed = !segment.shouldIllustrate;

  const handleCopy = async () => { await navigator.clipboard.writeText(segment.prompt); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleSave = () => { dispatch({ type: "UPDATE_SEGMENT", id: segment.id, updates: { prompt: editPrompt } }); setEditing(false); };

  const handleGenImage = async () => {
    dispatch({ type: "UPDATE_SEGMENT", id: segment.id, updates: { isGeneratingImage: true, imageError: undefined } });
    try {
      const ratio = state.customRatio ? localRatio : state.styleConfig.aspectRatio;
      const fullPrompt = hasSubject && useSubject
        ? `${segment.prompt}\n\n参考主体：${state.subjectPrompt}`
        : segment.prompt;
      const refImageDataUrl = hasSubject && useSubject ? state.subjectImageDataUrl : undefined;
      const res = await fetch("/api/generate-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: fullPrompt, model: state.styleConfig.imageModel, aspectRatio: ratio, apiKey: state.apiConfig.imageApiKey, refImageDataUrl, watermark: state.watermark, resolution: state.imageResolution }) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      const { imageUrl } = await res.json();
      dispatch({ type: "UPDATE_SEGMENT", id: segment.id, updates: { imageUrl, isGeneratingImage: false } });
    } catch (e) { dispatch({ type: "UPDATE_SEGMENT", id: segment.id, updates: { isGeneratingImage: false, imageError: e instanceof Error ? e.message : "失败" } }); }
  };

  return (
    <div className={`bg-card rounded-2xl border p-5 group transition-all hover:shadow-md ${dimmed ? "opacity-40" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold bg-foreground text-background px-2.5 py-1 rounded-lg">{index + 1}/{total}</span>
          <Badge variant="secondary" className="text-xs rounded-lg">{segment.sceneTag}</Badge>
          <Badge variant="outline" className="text-xs rounded-lg">{segment.emotionTag}</Badge>

        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}</Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => dispatch({ type: "DELETE_SEGMENT", id: segment.id })}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-3 space-y-3">
          <div className="text-sm text-muted-foreground leading-relaxed bg-muted/50 rounded-xl p-3 line-clamp-3">{segment.text}</div>

          {segment.imageUrl && (
            <>
            <div className="rounded-xl overflow-hidden border relative group/img">
              <img src={segment.imageUrl} alt="" className="w-full object-cover cursor-pointer" onClick={() => setLightbox(true)} />
              <div className="absolute top-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 rounded-lg shadow-md"
                  onClick={async () => {
                    try {
                      if (segment.imageUrl!.startsWith("data:")) {
                        const a = document.createElement("a");
                        a.href = segment.imageUrl!;
                        a.download = `image-${index + 1}.png`;
                        a.click();
                      } else {
                        const res = await fetch("/api/proxy-image?" + new URLSearchParams({ url: segment.imageUrl! }));
                        if (!res.ok) throw new Error();
                        const blob = await res.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = blobUrl;
                        a.download = `image-${index + 1}.png`;
                        a.click();
                        URL.revokeObjectURL(blobUrl);
                      }
                    } catch {
                      window.open(segment.imageUrl!, "_blank");
                    }
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {/* Lightbox */}
            {lightbox && (
              <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center cursor-pointer" onClick={() => setLightbox(false)}>
                <img src={segment.imageUrl} alt="" className="max-w-[90vw] max-h-[90vh] object-contain" />
              </div>
            )}
            </>
          )}

          {segment.imageError && (
            <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/5 rounded-lg p-2"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{segment.imageError}</div>
          )}

          {segment.prompt && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">{lang === "zh" ? "配图提示词" : "Image Prompt"}</span>
                <div className="flex items-center gap-1">
                  {hasImageKey && !segment.isGeneratingImage && (
                    <>
                      {/* Subject toggle */}
                      {hasSubject && (
                        <button
                          onClick={() => setUseSubject(!useSubject)}
                          title={lang === "zh" ? (useSubject ? "已参考主体，点击取消" : "点击启用参考主体") : (useSubject ? "Using subject, click to disable" : "Click to use subject")}
                          className={`flex items-center gap-1.5 h-7 px-2 rounded-md text-xs font-medium transition-all ${
                            useSubject
                              ? "bg-foreground text-background ring-2 ring-foreground/20 ring-offset-1"
                              : "border border-dashed border-muted-foreground/30 text-muted-foreground/50 hover:border-foreground/50 hover:text-muted-foreground"
                          }`}
                        >
                          {useSubject && state.subjectImageDataUrl && (
                            <img src={state.subjectImageDataUrl} className="h-4 w-4 rounded-sm object-cover" alt="" />
                          )}
                          {!useSubject && <User className="h-3 w-3" />}
                          {lang === "zh" ? (useSubject ? "已参考主体" : "主体") : (useSubject ? "Subject ON" : "Subject")}
                        </button>
                      )}
                      {/* Per-card ratio selector (only in custom ratio mode) */}
                      {state.customRatio && (
                        <div className="flex items-center gap-0.5 mr-1 flex-wrap">
                          {(getImageModelProvider(state.styleConfig.imageModel) === "fal" || getImageModelProvider(state.styleConfig.imageModel) === "google" ? EXTENDED_RATIOS : ASPECT_RATIOS).map(r => (
                            <button
                              key={r}
                              onClick={() => setLocalRatio(r)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                                localRatio === r
                                  ? "bg-foreground text-background font-bold"
                                  : "text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleGenImage}>
                        {segment.imageUrl ? <><RefreshCw className="h-3.5 w-3.5 mr-1" />{lang === "zh" ? "重新生成" : "Regen"}</> : <><ImageIcon className="h-3.5 w-3.5 mr-1" />{lang === "zh" ? "生成配图" : "Generate"}</>}
                      </Button>
                    </>
                  )}
                  {segment.isGeneratingImage && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" />{lang === "zh" ? "生成中..." : "Generating..."}</span>}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditPrompt(segment.prompt); setEditing(!editing); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>{copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}</Button>
                  {segment.imageUrl && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => {
                      try {
                        if (segment.imageUrl!.startsWith("data:")) {
                          const a = document.createElement("a"); a.href = segment.imageUrl!; a.download = `image-${index + 1}.png`; a.click();
                        } else {
                          const res = await fetch("/api/proxy-image?" + new URLSearchParams({ url: segment.imageUrl! }));
                          if (!res.ok) throw new Error();
                          const blob = await res.blob(); const u = URL.createObjectURL(blob);
                          const a = document.createElement("a"); a.href = u; a.download = `image-${index + 1}.png`; a.click(); URL.revokeObjectURL(u);
                        }
                      } catch { window.open(segment.imageUrl!, "_blank"); }
                    }}><Download className="h-3.5 w-3.5" /></Button>
                  )}
                </div>
              </div>
              {editing ? (
                <div className="space-y-2">
                  <Textarea value={editPrompt} onChange={e => setEditPrompt(e.target.value)} className="text-sm min-h-[80px] rounded-xl" />
                  <div className="flex gap-2">
                    <Button size="sm" className="rounded-lg" onClick={handleSave}>{lang === "zh" ? "保存" : "Save"}</Button>
                    <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setEditing(false)}>{lang === "zh" ? "取消" : "Cancel"}</Button>
                  </div>
                </div>
              ) : (
                <div className="text-xs bg-foreground/[0.03] border rounded-xl p-3 leading-relaxed font-mono">{segment.prompt}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
