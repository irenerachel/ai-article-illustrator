"use client";
import { useApp } from "@/lib/store";
import { t } from "@/lib/i18n";
import { ImageIcon, Key, FileText, Palette, Sparkles, Check, PanelLeftClose, PanelLeftOpen, Languages } from "lucide-react";
import type { Step } from "@/lib/types";
import { useState, useRef, useCallback, useEffect } from "react";

const STEPS: { step: Step; zh: string; en: string; icon: typeof Key }[] = [
  { step: 1, zh: "API 设置", en: "API Setup", icon: Key },
  { step: 2, zh: "内容输入", en: "Content", icon: FileText },
  { step: 3, zh: "风格配置", en: "Style", icon: Palette },
  { step: 4, zh: "生成结果", en: "Results", icon: Sparkles },
];

const MIN_WIDTH = 60;
const DEFAULT_WIDTH = 260;
const MAX_WIDTH = 400;

export function AppSidebar() {
  const { state, dispatch } = useApp();
  const lang = state.lang;
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const isResizing = useRef(false);
  const sidebarRef = useRef<HTMLElement>(null);

  const canGoTo = (s: Step) => {
    if (s === 1) return true;
    if (s === 2) return !!(state.apiConfig.textApiKey);
    if (s === 3) return !!(state.apiConfig.textApiKey && state.articleText.trim());
    if (s === 4) return state.segments.length > 0;
    return false;
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX));
      if (newWidth <= MIN_WIDTH + 20) {
        setCollapsed(true);
        setWidth(MIN_WIDTH);
      } else {
        setCollapsed(false);
        setWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const currentWidth = collapsed ? MIN_WIDTH : width;

  return (
    <aside
      ref={sidebarRef}
      className="bg-card border-r flex flex-col h-full shrink-0 relative select-none"
      style={{ width: currentWidth, minWidth: currentWidth }}
    >
      {/* Logo */}
      <div className={`h-18 flex items-center gap-3.5 border-b ${collapsed ? "px-3 justify-center" : "px-6"} py-4`}>
        <img src="/logo.png" alt="AI Article Illustrator" className="h-10 w-10 rounded-xl object-cover shrink-0" />
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="font-extrabold text-base tracking-tight whitespace-nowrap">AI Article Illustrator</div>
            <div className="text-[11px] text-muted-foreground whitespace-nowrap">{t("nav.subtitle", lang)}</div>
          </div>
        )}
      </div>

      {/* Steps */}
      <nav className={`flex-1 py-6 space-y-1 ${collapsed ? "px-2" : "px-4"}`}>
        {STEPS.map(({ step, zh, en, icon: Icon }) => {
          const active = state.step === step;
          const done = state.step > step;
          const clickable = canGoTo(step);

          return (
            <button
              key={step}
              onClick={() => clickable && dispatch({ type: "SET_STEP", step })}
              disabled={!clickable}
              title={collapsed ? (lang === "zh" ? zh : en) : undefined}
              className={`w-full flex items-center gap-3 ${collapsed ? "justify-center px-2" : "px-4"} py-3 rounded-xl text-sm transition-all text-left ${
                active
                  ? "bg-foreground text-background font-semibold shadow-lg"
                  : done
                  ? "text-foreground hover:bg-muted font-medium"
                  : clickable
                  ? "text-muted-foreground hover:bg-muted"
                  : "text-muted-foreground/40 cursor-not-allowed"
              }`}
            >
              <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                active ? "bg-background text-foreground" : done ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </div>
              {!collapsed && <span className="whitespace-nowrap overflow-hidden">{lang === "zh" ? zh : en}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className={`py-4 border-t space-y-2 ${collapsed ? "px-2" : "px-4"}`}>
        {!collapsed && (
          <button
            onClick={() => dispatch({ type: "SET_LANG", lang: lang === "zh" ? "en" : "zh" })}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
          >
            <Languages className="h-4 w-4" />{lang === "zh" ? "English" : "中文"}
          </button>
        )}
        <button
          onClick={() => { setCollapsed(!collapsed); if (collapsed) setWidth(DEFAULT_WIDTH); }}
          title={collapsed ? (lang === "zh" ? "展开侧边栏" : "Expand sidebar") : (lang === "zh" ? "折叠侧边栏" : "Collapse sidebar")}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors text-muted-foreground"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" />{lang === "zh" ? "折叠" : "Collapse"}</>}
        </button>
      </div>

      {/* Resize Handle */}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-foreground/10 active:bg-foreground/20 transition-colors"
        onMouseDown={handleMouseDown}
      />
    </aside>
  );
}
