import { Platform } from 'react-native';

/**
 * Web-only CSS für LeafScan.
 * Enthält Animationen, Hintergrundeffekte und Button-Klassen.
 * Wird via injectCSS() in den <head> eingefügt.
 */
export const webCSS = Platform.OS === 'web' ? `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');

  html, body, #root {
    background: #040806 !important;
  }
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: 0;
    background:
      radial-gradient(ellipse 50% 40% at 50% 50%, rgba(92,232,146,0.03) 0%, transparent 70%),
      radial-gradient(ellipse 80% 60% at 50% 100%, rgba(92,232,146,0.04) 0%, transparent 50%),
      radial-gradient(ellipse 40% 40% at 0% 0%, rgba(56,217,176,0.02) 0%, transparent 50%),
      radial-gradient(ellipse 40% 40% at 100% 0%, rgba(212,168,83,0.015) 0%, transparent 50%),
      radial-gradient(ellipse 100% 100% at 50% 50%, transparent 30%, rgba(0,0,0,0.5) 100%);
    pointer-events: none;
  }
  body::after {
    content: '';
    position: fixed;
    inset: 0;
    z-index: 0;
    background: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E");
    background-size: 128px 128px;
    mix-blend-mode: overlay;
    pointer-events: none;
  }
  #root {
    position: relative;
    z-index: 1;
  }
  .cd-screen {
    background: #060A08;
    min-height: 100%;
    position: relative;
    overflow: hidden;
  }
  .cd-screen::before {
    content: '';
    position: absolute; inset: 0;
    background:
      radial-gradient(ellipse 60% 45% at 50% 50%, rgba(92,232,146,0.06) 0%, transparent 70%),
      radial-gradient(ellipse 70% 50% at 50% 100%, rgba(92,232,146,0.07) 0%, transparent 55%),
      radial-gradient(ellipse 45% 35% at 10% 20%, rgba(56,217,176,0.035) 0%, transparent 50%),
      radial-gradient(ellipse 30% 30% at 90% 25%, rgba(212,168,83,0.03) 0%, transparent 50%),
      radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(0,0,0,0.4) 100%);
    animation: cd-bg-breathe 8s ease-in-out infinite;
  }
  .cd-screen::after {
    content: '';
    position: absolute; inset: 0;
    background: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
    background-size: 128px 128px;
    opacity: 1;
    pointer-events: none;
    mix-blend-mode: overlay;
  }
  @keyframes cd-bg-breathe {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  @keyframes cd-float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    33% { transform: translateY(-8px) rotate(1deg); }
    66% { transform: translateY(4px) rotate(-0.5deg); }
  }
  @keyframes cd-glow-orbit {
    0% { transform: rotate(0deg) translateX(120px) rotate(0deg); opacity: 0.5; }
    50% { opacity: 0.8; }
    100% { transform: rotate(360deg) translateX(120px) rotate(-360deg); opacity: 0.5; }
  }
  @keyframes cd-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  @keyframes cd-border-glow {
    0%, 100% { border-color: rgba(92,232,146,0.08); }
    50% { border-color: rgba(92,232,146,0.18); }
  }
  @keyframes cd-shine {
    0% { left: -100%; }
    100% { left: 200%; }
  }
  .cd-title-wrap {
    font-family: 'Playfair Display', serif;
    animation: cd-float 6s ease-in-out infinite;
    position: relative;
  }
  .cd-btn-primary {
    position: relative; overflow: hidden; border-radius: 16px;
    background: linear-gradient(165deg, #72F5A8 0%, #5CE892 35%, #3BBF6E 100%);
    box-shadow: 0 6px 30px rgba(92,232,146,0.3), 0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2);
    transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease; cursor: pointer;
  }
  .cd-btn-primary::after {
    content: '';
    position: absolute; top: 0; width: 40%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
    animation: cd-shine 4s ease-in-out infinite;
    pointer-events: none;
  }
  .cd-btn-primary:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 10px 40px rgba(92,232,146,0.35), 0 4px 8px rgba(0,0,0,0.2); }
  .cd-btn-primary:active { transform: translateY(1px) scale(0.98); }
  .cd-btn-secondary {
    position: relative; overflow: hidden; border-radius: 14px;
    border: 1px solid rgba(92,232,146,0.06);
    background: rgba(12,20,16,0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    transition: all 0.25s ease; cursor: pointer;
    animation: cd-border-glow 4s ease-in-out infinite;
  }
  .cd-btn-secondary:hover { background: rgba(92,232,146,0.06); border-color: rgba(92,232,146,0.2); box-shadow: 0 0 20px rgba(92,232,146,0.06); }
  .cd-btn-secondary:active { transform: scale(0.97); }
  .cd-btn-premium {
    position: relative; overflow: hidden; border-radius: 14px;
    background: linear-gradient(135deg, rgba(212,168,83,0.10) 0%, rgba(180,140,60,0.04) 50%, rgba(212,168,83,0.10) 100%);
    border: 1px solid rgba(212,168,83,0.3);
    box-shadow: 0 0 30px rgba(212,168,83,0.08), inset 0 1px 0 rgba(255,215,0,0.08);
    transition: all 0.25s ease; cursor: pointer;
  }
  .cd-btn-premium:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 40px rgba(212,168,83,0.15), inset 0 1px 0 rgba(255,215,0,0.12);
    border-color: rgba(212,168,83,0.45);
  }
  .cd-btn-premium:active { transform: scale(0.97); }
  .cd-btn-premium::after {
    content: '';
    position: absolute; top: 0; left: -100%; width: 60%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,215,0,0.12), transparent);
    animation: cd-shine 3.5s ease-in-out infinite;
    pointer-events: none;
  }
` : '';

/**
 * Injects the LeafScan CSS into the document head (web only).
 * Safe to call multiple times — only injects once.
 */
export function injectCSS(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('cd-css')) return;
  const s = document.createElement('style');
  s.id = 'cd-css';
  s.textContent = webCSS;
  document.head.appendChild(s);
}
