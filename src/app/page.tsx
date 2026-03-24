"use client";
import { useReducer, useEffect, useState } from "react";
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
      const savedSkills = localStorage.getItem("av_saved_skills");
      if (savedSkills) JSON.parse(savedSkills).forEach((s: import("@/lib/types").SavedSkill) => dispatch({ type: "SAVE_SKILL", skill: s }));
      const presets = localStorage.getItem("av_presets");
      if (presets) JSON.parse(presets).forEach((p: import("@/lib/types").StylePreset) => dispatch({ type: "ADD_PRESET", preset: p }));
    } catch {}
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <div className="flex h-screen overflow-hidden">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto relative">
          <SubtleDots />
          <div className="max-w-[900px] mx-auto px-8 py-10 relative" style={{ zIndex: 1 }}>
            {state.step === 1 && <StepApi />}
            {state.step === 2 && <StepContent />}
            {state.step === 3 && <StepStyle />}
            {state.step === 4 && <StepResults />}
          </div>
          {/* QR code hover */}
          <div className="fixed top-5 right-10 z-50 group">
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
        </main>
      </div>
    </AppContext.Provider>
  );
}
