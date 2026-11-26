"use client";

import { useEffect, useRef } from "react";

type SnowParticle = {
  x: number;
  y: number;
  radius: number;
  speedY: number;
  speedX: number;
  swayAmp: number;
  swayFreq: number;
  phase: number;
  opacity: number;
  layer: 0 | 1 | 2;
};

export default function Snow() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let animationFrameId = 0;

    const setSize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    setSize();

    // Deterministic-seeded random for initial distribution, then natural continuous motion
    const count = Math.min(180, Math.max(95, Math.floor((width * height) / 11000)));
    const particles: SnowParticle[] = Array.from({ length: count }, (_, i) => {
      const layerRoll = (i % 10) / 10;
      // 0 = distant small grains, 1 = mid-ground flakes, 2 = foreground soft flakes
      const layer: 0 | 1 | 2 = layerRoll < 0.45 ? 0 : layerRoll < 0.82 ? 1 : 2;

      const radius =
        layer === 0
          ? 0.9 + Math.random() * 0.9
          : layer === 1
            ? 1.8 + Math.random() * 1.2
            : 3.0 + Math.random() * 1.8;

      const speedY =
        layer === 0
          ? 18 + Math.random() * 18
          : layer === 1
            ? 34 + Math.random() * 26
            : 55 + Math.random() * 35;

      const opacity =
        layer === 0
          ? 0.25 + Math.random() * 0.25
          : layer === 1
            ? 0.45 + Math.random() * 0.3
            : 0.65 + Math.random() * 0.28;

      return {
        x: Math.random() * width,
        y: Math.random() * height,
        radius,
        speedY,
        speedX: (Math.random() - 0.5) * 10,
        swayAmp: 8 + Math.random() * 18,
        swayFreq: 0.6 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
        opacity,
        layer,
      };
    });

    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const t = now / 1000;

      ctx.clearRect(0, 0, width, height);

      // Gentle ambient breeze changing slowly over time
      const ambientWind = Math.sin(t * 0.28) * 10 + Math.cos(t * 0.11) * 6;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const layerWindFactor = p.layer === 0 ? 0.45 : p.layer === 1 ? 0.8 : 1.15;
        const flutter = Math.sin(t * p.swayFreq + p.phase) * p.swayAmp;

        p.y += p.speedY * dt;
        p.x += (p.speedX + ambientWind * layerWindFactor + flutter * 0.6) * dt;

        if (p.y - p.radius > height) {
          p.y = -p.radius - Math.random() * 12;
          p.x = Math.random() * width;
        }
        if (p.x - p.radius > width) {
          p.x = -p.radius;
        } else if (p.x + p.radius < 0) {
          p.x = width + p.radius;
        }

        if (p.layer === 0) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(248, 250, 252, ${p.opacity})`;
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Soft radial gradient so snow looks natural and fluffy
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 1.45);
          grad.addColorStop(0, `rgba(255, 255, 255, ${p.opacity})`);
          grad.addColorStop(0.55, `rgba(241, 245, 249, ${p.opacity * 0.65})`);
          grad.addColorStop(1, "rgba(255, 255, 255, 0)");
          ctx.beginPath();
          ctx.fillStyle = grad;
          ctx.arc(p.x, p.y, p.radius * 1.45, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = window.requestAnimationFrame(render);
    };

    animationFrameId = window.requestAnimationFrame(render);
    window.addEventListener("resize", setSize);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", setSize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
}
