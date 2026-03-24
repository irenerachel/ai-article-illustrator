"use client";
import { useEffect, useRef } from "react";

const DOT_COUNT = 6;
const DOT_RADIUS = 2;
const INFLUENCE_RADIUS = 200;
const BASE_OPACITY = 0.04;
const MAX_OPACITY = 0.08;

interface Dot {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
}

export function SubtleDots() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const dotsRef = useRef<Dot[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      initDots();
    };

    const initDots = () => {
      const dots: Dot[] = [];
      for (let i = 0; i < DOT_COUNT; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        dots.push({ x, y, baseX: x, baseY: y, vx: 0, vy: 0 });
      }
      dotsRef.current = dots;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const { x: mx, y: my } = mouseRef.current;

      for (const dot of dotsRef.current) {
        const dx = mx - dot.x;
        const dy = my - dot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Gently push away from mouse
        if (dist < INFLUENCE_RADIUS && dist > 0) {
          const force = (1 - dist / INFLUENCE_RADIUS) * 0.3;
          dot.vx -= (dx / dist) * force;
          dot.vy -= (dy / dist) * force;
        }

        // Spring back to base position
        dot.vx += (dot.baseX - dot.x) * 0.01;
        dot.vy += (dot.baseY - dot.y) * 0.01;

        // Damping
        dot.vx *= 0.95;
        dot.vy *= 0.95;

        dot.x += dot.vx;
        dot.y += dot.vy;

        // Opacity based on proximity to mouse
        const opacity = dist < INFLUENCE_RADIUS
          ? BASE_OPACITY + (MAX_OPACITY - BASE_OPACITY) * (1 - dist / INFLUENCE_RADIUS)
          : BASE_OPACITY;

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(128, 128, 128, ${opacity})`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-auto"
      style={{ zIndex: 0 }}
    />
  );
}
