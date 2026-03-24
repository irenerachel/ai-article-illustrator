"use client";
import { useReducer, useEffect, useState, useRef, useCallback } from "react";
import { AppContext, appReducer, initialState } from "@/lib/store";
import { TEXT_MODELS } from "@/lib/types";
import { AppSidebar } from "@/components/AppSidebar";
import { StepApi } from "@/components/StepApi";
import { StepContent } from "@/components/StepContent";
import { StepStyle } from "@/components/StepStyle";
import { StepResults } from "@/components/StepResults";
import { SubtleDots } from "@/components/SubtleDots";

export default function Home() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      // Auto-cleanup: remove oversized cached data to prevent page freeze
      const segsRaw = localStorage.getItem("av_segments");
      if (segsRaw && segsRaw.length > 2 * 1024 * 1024) {
        localStorage.removeItem("av_segments");
        localStorage.removeItem("av_style_lock");
      }

      const api = localStorage.getItem("av_api");
      if (api) dispatch({ type: "SET_API_CONFIG", config: JSON.parse(api) });
      const lang = localStorage.getItem("av_lang");
      if (lang) dispatch({ type: "SET_LANG", lang: JSON.parse(lang) });
      const skill = localStorage.getItem("av_skill");
      if (skill) dispatch({ type: "SET_SKILL", text: JSON.parse(skill) });
      const textModel = localStorage.getItem("av_text_model");
      if (textModel) {
        const parsed = JSON.parse(textModel);
        // If stored model ID no longer exists in model list, clear it so default is used
        if (TEXT_MODELS.some(m => m.id === parsed)) {
          dispatch({ type: "SET_TEXT_MODEL", model: parsed });
        } else {
          localStorage.removeItem("av_text_model");
        }
      }
      const skillImage = localStorage.getItem("av_skill_image");
      if (skillImage) dispatch({ type: "SET_SKILL_IMAGE", dataUrl: JSON.parse(skillImage) });
      const segments = localStorage.getItem("av_segments");
      const styleLock = localStorage.getItem("av_style_lock");
      if (segments) {
        const parsed = JSON.parse(segments);
        if (parsed.length > 0) dispatch({ type: "SET_SEGMENTS", segments: parsed, styleLock: styleLock ? JSON.parse(styleLock) : "" });
      }
      const savedSkills = localStorage.getItem("av_saved_skills");
      if (savedSkills) JSON.parse(savedSkills).forEach((s: import("@/lib/types").SavedSkill) => dispatch({ type: "SAVE_SKILL", skill: s }));
      const presets = localStorage.getItem("av_presets");
      if (presets) JSON.parse(presets).forEach((p: import("@/lib/types").StylePreset) => dispatch({ type: "ADD_PRESET", preset: p }));
    } catch {}
    setReady(true);
  }, []);

  const mainRef = useRef<HTMLElement>(null);
  const [showTop, setShowTop] = useState(false);

  const handleScroll = useCallback(() => {
    setShowTop((mainRef.current?.scrollTop ?? 0) > 300);
  }, []);

  if (!ready) return null;

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <div className="flex h-screen overflow-hidden">
        <AppSidebar />
        <main ref={mainRef} onScroll={handleScroll} className="flex-1 overflow-y-auto relative">
          <SubtleDots />
          {/* Mobile header */}
          <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b bg-card sticky top-0 z-10">
            <img src="/logo.png" alt="" className="h-8 w-8 rounded-lg object-cover" />
            <span className="font-bold text-sm">AI Article Illustrator</span>
          </div>
          <div className="max-w-[900px] mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-10 relative" style={{ zIndex: 1 }}>
            {state.step === 1 && <StepApi />}
            {state.step === 2 && <StepContent />}
            {state.step === 3 && <StepStyle />}
            {state.step === 4 && <StepResults />}
          </div>
          {/* QR code hover */}
          <div className="fixed top-5 right-4 sm:right-10 z-50 group">
            <span className="text-xs text-muted-foreground cursor-default select-none">
              关注@阿真Irene
            </span>
            <div className="absolute top-full right-0 mt-3 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200">
              <div className="bg-white rounded-2xl p-4 shadow-lg text-center space-y-2">
                <div className="w-40 h-40">
                  <img src="/qrcode.png" alt="QR Code" width={160} height={160} className="w-full h-full object-contain" />
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">AI 工具 · 前沿资讯 · 有趣玩法<br/>都在这里</p>
              </div>
            </div>
          </div>
          {/* Back to top */}
          {showTop && (
            <button
              onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
              className="fixed bottom-6 right-4 sm:right-10 z-50 h-10 w-10 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg hover:opacity-80 transition-opacity"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3L3 8h3v5h4V8h3L8 3z" fill="currentColor"/></svg>
            </button>
          )}
        </main>
      </div>
    </AppContext.Provider>
  );
}
