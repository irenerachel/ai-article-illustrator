"use client";
import { createContext, useContext } from "react";
import { AppState, DEFAULT_STYLE_CONFIG, DEFAULT_API_CONFIG, DEFAULT_TEXT_MODEL, Segment, StyleConfig, ApiConfig, StylePreset, SavedSkill, IllustrationMode, Step, getTextModelProvider, getImageModelProvider, getDefaultResolution } from "./types";
import type { Lang } from "./i18n";

export type AppAction =
  | { type: "SET_STEP"; step: Step }
  | { type: "SET_ARTICLE"; text: string }
  | { type: "SET_STYLE"; config: Partial<StyleConfig> }
  | { type: "SET_API_CONFIG"; config: Partial<ApiConfig> }
  | { type: "SET_SEGMENTING"; value: boolean }
  | { type: "SET_GENERATING_PROMPTS"; value: boolean }
  | { type: "SET_SEGMENTS"; segments: Segment[]; styleLock: string }
  | { type: "UPDATE_SEGMENT"; id: string; updates: Partial<Segment> }
  | { type: "ADD_SEGMENT"; segment: Segment }
  | { type: "SPLIT_SEGMENT"; id: string; newSegments: Segment[] }
  | { type: "DELETE_SEGMENT"; id: string }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_LANG"; lang: Lang }
  | { type: "SET_ILLUSTRATION_MODE"; mode: IllustrationMode }
  | { type: "ADD_PRESET"; preset: StylePreset }
  | { type: "DELETE_PRESET"; id: string }
  | { type: "APPLY_PRESET"; preset: StylePreset }
  | { type: "SET_SKILL"; text: string }
  | { type: "SET_TEXT_MODEL"; model: string }
  | { type: "SET_IMAGE_COUNT"; count: number }
  | { type: "SET_CUSTOM_RATIO"; value: boolean }
  | { type: "SET_WATERMARK"; value: boolean }
  | { type: "SET_IMAGE_RESOLUTION"; resolution: string }
  | { type: "SET_SUBJECT_IMAGE"; dataUrl: string }
  | { type: "SET_SUBJECT_PROMPT"; prompt: string }
  | { type: "ADD_MANUAL_SEGMENT"; segment: { id: string; text: string } }
  | { type: "DELETE_MANUAL_SEGMENT"; id: string }
  | { type: "CLEAR_MANUAL_SEGMENTS" }
  | { type: "SET_SKILL_IMAGE"; dataUrl: string }
  | { type: "SAVE_SKILL"; skill: SavedSkill }
  | { type: "DELETE_SKILL"; id: string }
  | { type: "LOAD_SKILL"; id: string }
  | { type: "SET_INFOGRAPHIC_MODE"; value: boolean }
  | { type: "RESET" };

function persist(k: string, v: unknown) { if (typeof window !== "undefined") localStorage.setItem(k, JSON.stringify(v)); }

export const initialState: AppState = {
  step: 1,
  articleText: "",
  styleConfig: DEFAULT_STYLE_CONFIG,
  apiConfig: DEFAULT_API_CONFIG,
  textModel: DEFAULT_TEXT_MODEL,
  segments: [],
  styleLock: "",
  isSegmenting: false,
  isGeneratingPrompts: false,
  error: null,
  lang: "zh",
  illustrationMode: "full",
  customPresets: [],
  skillText: "",
  savedSkills: [],
  imageCount: 6,
  customRatio: false,
  watermark: false,
  imageResolution: "2K",
  manualSegments: [],
  skillImageDataUrl: "",
  subjectImageDataUrl: "",
  subjectPrompt: "",
  infographicMode: false,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_STEP": return { ...state, step: action.step };
    case "SET_ARTICLE": return { ...state, articleText: action.text };
    case "SET_STYLE": {
      const newStyle = { ...state.styleConfig, ...action.config };
      // When image model changes, auto-fill imageApiKey from saved provider keys
      if (action.config.imageModel && action.config.imageModel !== state.styleConfig.imageModel) {
        const newProvider = getImageModelProvider(action.config.imageModel);
        const newResolution = getDefaultResolution(newProvider);
        const savedKey = state.apiConfig.providerKeys[newProvider];
        if (savedKey) {
          const c = { ...state.apiConfig, imageApiKey: savedKey };
          persist("av_api", c);
          return { ...state, styleConfig: newStyle, apiConfig: c, imageResolution: newResolution };
        }
        return { ...state, styleConfig: newStyle, imageResolution: newResolution };
      }
      return { ...state, styleConfig: newStyle };
    }
    case "SET_API_CONFIG": {
      const c = { ...state.apiConfig, ...action.config };
      // Auto-save keys to providerKeys by current provider
      const pk = { ...c.providerKeys };
      if (action.config.textApiKey) {
        pk[getTextModelProvider(state.textModel)] = action.config.textApiKey;
      }
      if (action.config.imageApiKey) {
        pk[getImageModelProvider(state.styleConfig.imageModel)] = action.config.imageApiKey;
      }
      c.providerKeys = pk;
      persist("av_api", c);
      return { ...state, apiConfig: c };
    }
    case "SET_SEGMENTING": return { ...state, isSegmenting: action.value, error: null };
    case "SET_GENERATING_PROMPTS": return { ...state, isGeneratingPrompts: action.value, error: null };
    case "SET_SEGMENTS": { persist("av_segments", action.segments); persist("av_style_lock", action.styleLock); return { ...state, segments: action.segments, styleLock: action.styleLock, step: 4 }; }
    case "ADD_SEGMENT": return { ...state, segments: [...state.segments, action.segment] };
    case "UPDATE_SEGMENT": { const segs = state.segments.map(s => s.id === action.id ? { ...s, ...action.updates } : s); persist("av_segments", segs); return { ...state, segments: segs }; }
    case "SPLIT_SEGMENT": { const idx = state.segments.findIndex(s => s.id === action.id); if (idx === -1) return state; const segs = [...state.segments]; segs.splice(idx, 1, ...action.newSegments); return { ...state, segments: segs }; }
    case "DELETE_SEGMENT": return { ...state, segments: state.segments.filter(s => s.id !== action.id) };
    case "SET_ERROR": return { ...state, error: action.error, isSegmenting: false, isGeneratingPrompts: false };
    case "SET_LANG": persist("av_lang", action.lang); return { ...state, lang: action.lang };
    case "SET_ILLUSTRATION_MODE": return { ...state, illustrationMode: action.mode };
    case "ADD_PRESET": { const p = [...state.customPresets, action.preset]; persist("av_presets", p); return { ...state, customPresets: p }; }
    case "DELETE_PRESET": { const p = state.customPresets.filter(x => x.id !== action.id); persist("av_presets", p); return { ...state, customPresets: p }; }
    case "APPLY_PRESET": return { ...state, styleConfig: { ...state.styleConfig, ...action.preset.config }, skillText: action.preset.skillText ?? state.skillText, skillImageDataUrl: action.preset.skillImageDataUrl ?? state.skillImageDataUrl };
    case "SET_SKILL": persist("av_skill", action.text); return { ...state, skillText: action.text };
    case "SET_SKILL_IMAGE": persist("av_skill_image", action.dataUrl); return { ...state, skillImageDataUrl: action.dataUrl };
    case "SET_TEXT_MODEL": {
      persist("av_text_model", action.model);
      // Auto-fill textApiKey from saved provider keys
      const tp = getTextModelProvider(action.model);
      const savedTextKey = state.apiConfig.providerKeys[tp];
      if (savedTextKey) {
        const c = { ...state.apiConfig, textApiKey: savedTextKey };
        persist("av_api", c);
        return { ...state, textModel: action.model, apiConfig: c };
      }
      return { ...state, textModel: action.model };
    }
    case "SET_IMAGE_COUNT": return { ...state, imageCount: action.count };
    case "SET_CUSTOM_RATIO": return { ...state, customRatio: action.value };
    case "SET_WATERMARK": return { ...state, watermark: action.value };
    case "SET_IMAGE_RESOLUTION": return { ...state, imageResolution: action.resolution };
    case "SET_SUBJECT_IMAGE": return { ...state, subjectImageDataUrl: action.dataUrl };
    case "SET_SUBJECT_PROMPT": return { ...state, subjectPrompt: action.prompt };
    case "ADD_MANUAL_SEGMENT": return { ...state, manualSegments: [...state.manualSegments, action.segment] };
    case "DELETE_MANUAL_SEGMENT": return { ...state, manualSegments: state.manualSegments.filter(s => s.id !== action.id) };
    case "CLEAR_MANUAL_SEGMENTS": return { ...state, manualSegments: [] };
    case "SAVE_SKILL": { const s = [...state.savedSkills, action.skill]; persist("av_saved_skills", s); return { ...state, savedSkills: s }; }
    case "DELETE_SKILL": { const s = state.savedSkills.filter(x => x.id !== action.id); persist("av_saved_skills", s); return { ...state, savedSkills: s }; }
    case "LOAD_SKILL": { const found = state.savedSkills.find(x => x.id === action.id); return found ? { ...state, skillText: found.text, skillImageDataUrl: found.imageDataUrl || "" } : state; }
    case "SET_INFOGRAPHIC_MODE": return { ...state, infographicMode: action.value };
    case "RESET": return { ...initialState, apiConfig: state.apiConfig, textModel: state.textModel, lang: state.lang, customPresets: state.customPresets, skillText: state.skillText, savedSkills: state.savedSkills };
    default: return state;
  }
}

export const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<AppAction> }>({ state: initialState, dispatch: () => {} });
export function useApp() { return useContext(AppContext); }
