/**
 * Stick-in-the-Sand HTML5 2D Canvas Renderer for Kavenga: Songs of the Star Path.
 * - Shore Mode (animate = true): Progressively carves stick grooves in damp beach sand and places
 *   cowrie shells, basalt pebbles, and palm-frond ribs as the mentor speaks.
 * - At-Sea Recall Mode (animate = false): Renders a STRICTLY STATIC, NON-ROTATING memory vignette
 *   (zero compass needle, zero heading indicator, zero degrees, zero cardinal letters).
 */

import { HORIZON_HOUSES } from '../data/constellationsData.js';

export class SandCanvas {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.lesson = null;
    this.progress = 1.0;
    this._rafId = null;
    this._grainCanvas = this._createSandGrainPattern();
  }

  _createSandGrainPattern() {
    const off = document.createElement('canvas');
    off.width = 128;
    off.height = 128;
    const c = off.getContext('2d');
    c.fillStyle = '#c8ab7e';
    c.fillRect(0, 0, 128, 128);

    // Deterministic warm coral + black volcanic sand speckles
    let s = 48271;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    for (let i = 0; i < 1800; i += 1) {
      const x = Math.floor(rand() * 128);
      const y = Math.floor(rand() * 128);
      const v = rand();
      c.fillStyle =
        v < 0.35
          ? 'rgba(72, 52, 34, 0.16)'
          : v < 0.7
            ? 'rgba(245, 228, 196, 0.18)'
            : 'rgba(138, 104, 66, 0.14)';
      c.fillRect(x, y, 1.5, 1.5);
    }
    return off;
  }

  stopAnimation() {
    if (this._rafId) {
      window.cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  /**
   * Renders a declarative sand lesson onto the canvas.
   * @param {object} lesson Lesson object from SAND_LESSONS
   * @param {object} opts { animate: boolean } — ALWAYS false when invoked via at-sea Recall!
   */
  renderLesson(lesson, { animate = false } = {}) {
    this.stopAnimation();
    this.lesson = lesson;
    if (!lesson) return;

    if (!animate) {
      this.progress = 1.0;
      this._drawFrame(1.0);
      return;
    }

    const startTime = performance.now();
    const durationMs = Math.max(1200, lesson.primitives.length * 480);

    const step = (now) => {
      const t = Math.min(1.0, (now - startTime) / durationMs);
      this.progress = t;
      this._drawFrame(t);
      if (t < 1.0) {
        this._rafId = window.requestAnimationFrame(step);
      } else {
        this._rafId = null;
      }
    };

    this._rafId = window.requestAnimationFrame(step);
  }

  _toPx(nx, ny, w, h) {
    const pad = Math.min(w, h) * 0.12;
    const r = Math.min(w, h) * 0.5 - pad;
    return [w * 0.5 + nx * r, h * 0.5 - ny * r, r];
  }

  _strokeSandGroove(ctx, drawPathFn, width = 5.5, highlight = false) {
    // Raised sunlit sand lip
    ctx.save();
    ctx.translate(1.5, 2.0);
    ctx.strokeStyle = highlight
      ? 'rgba(255, 236, 178, 0.72)'
      : 'rgba(238, 215, 175, 0.55)';
    ctx.lineWidth = width + 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    drawPathFn();
    ctx.stroke();
    ctx.restore();

    // Recessed damp trench
    ctx.save();
    ctx.strokeStyle = highlight ? '#5c3314' : '#6d4c2d';
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    drawPathFn();
    ctx.stroke();
    ctx.restore();
  }

  _drawShell(ctx, x, y, radius = 9.0, glowing = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = 'rgba(38, 24, 10, 0.42)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = glowing ? '#fff6d6' : '#f4e7ce';
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.15, radius * 0.84, -0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = glowing ? '#d4882a' : '#8b6b4a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.65, 0);
    ctx.lineTo(radius * 0.65, 0);
    ctx.stroke();
    ctx.restore();
  }

  _drawPebble(ctx, x, y, radius = 12.0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = 'rgba(20, 14, 8, 0.5)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#36332f';
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.2, radius * 0.92, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.ellipse(-radius * 0.3, -radius * 0.25, radius * 0.45, radius * 0.25, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawCanoeMark(ctx, x, y, angleRad = 0.0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angleRad);

    // Twin carved hulls + two crossbeams pressed into the sand
    for (const hx of [-9, 9]) {
      ctx.fillStyle = '#5a381e';
      ctx.beginPath();
      ctx.moveTo(hx, -20);
      ctx.quadraticCurveTo(hx + 4.5, 0, hx, 20);
      ctx.quadraticCurveTo(hx - 4.5, 0, hx, -20);
      ctx.fill();
    }
    ctx.strokeStyle = '#8b5e34';
    ctx.lineWidth = 3.0;
    for (const bz of [-7, 7]) {
      ctx.beginPath();
      ctx.moveTo(-11, bz);
      ctx.lineTo(11, bz);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawLabel(ctx, text, x, y) {
    if (!text) return;
    ctx.save();
    ctx.font = '600 12.5px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    const metrics = ctx.measureText(text);
    const bw = metrics.width + 12;
    ctx.fillStyle = 'rgba(34, 24, 14, 0.68)';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x - bw * 0.5, y - 11, bw, 19, 6);
    } else {
      ctx.rect(x - bw * 0.5, y - 11, bw, 19);
    }
    ctx.fill();
    ctx.fillStyle = '#faecd2';
    ctx.fillText(text, x, y + 3);
    ctx.restore();
  }

  _drawFrame(overallProgress) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. Damp Beach Sand Bed + Soft Vignette
    const pat = ctx.createPattern(this._grainCanvas, 'repeat');
    ctx.fillStyle = pat || '#c8ab7e';
    ctx.fillRect(0, 0, w, h);

    const grad = ctx.createRadialGradient(
      w * 0.5,
      h * 0.5,
      Math.min(w, h) * 0.18,
      w * 0.5,
      h * 0.5,
      Math.max(w, h) * 0.62
    );
    grad.addColorStop(0, 'rgba(246, 226, 190, 0.16)');
    grad.addColorStop(1, 'rgba(58, 40, 22, 0.42)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    if (!this.lesson || !this.lesson.primitives) return;

    const prims = this.lesson.primitives;
    const count = prims.length;

    prims.forEach((prim, idx) => {
      const localT = Math.min(
        1.0,
        Math.max(0.0, overallProgress * count - idx)
      );
      if (localT <= 0.01) return;

      ctx.save();
      ctx.globalAlpha = Math.min(1.0, localT * 1.4);
      this._drawPrimitive(ctx, prim, w, h);
      ctx.restore();
    });
  }

  _drawPrimitive(ctx, prim, w, h) {
    const [, , scaleR] = this._toPx(0, 0, w, h);

    switch (prim.type) {
      case 'groove_line':
      case 'groove_dashed': {
        const [x1, y1] = this._toPx(prim.from[0], prim.from[1], w, h);
        const [x2, y2] = this._toPx(prim.to[0], prim.to[1], w, h);
        if (prim.type === 'groove_dashed') ctx.setLineDash([9, 7]);
        this._strokeSandGroove(ctx, () => {
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
        });
        ctx.setLineDash([]);
        this._drawLabel(ctx, prim.label, (x1 + x2) * 0.5, (y1 + y2) * 0.5 - 14);
        break;
      }

      case 'groove_wave': {
        const [x1, y1] = this._toPx(prim.from[0], prim.from[1], w, h);
        const [x2, y2] = this._toPx(prim.to[0], prim.to[1], w, h);
        this._strokeSandGroove(ctx, () => {
          ctx.moveTo(x1, y1);
          for (let i = 1; i <= 16; i += 1) {
            const u = i / 16.0;
            const px = x1 + (x2 - x1) * u + Math.sin(u * Math.PI * 5.0) * 10.0;
            const py = y1 + (y2 - y1) * u;
            ctx.lineTo(px, py);
          }
        });
        this._drawLabel(ctx, prim.label, (x1 + x2) * 0.5 + 54, (y1 + y2) * 0.5);
        break;
      }

      case 'groove_ray':
      case 'palm_rib_arrow': {
        const [x1, y1] = this._toPx(prim.from[0], prim.from[1], w, h);
        const [x2, y2] = this._toPx(prim.to[0], prim.to[1], w, h);
        const ang = Math.atan2(y2 - y1, x2 - x1);
        const isPalm = prim.type === 'palm_rib_arrow';

        if (isPalm) {
          ctx.strokeStyle = '#3d6b2c';
          ctx.lineWidth = 4.5;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        } else {
          this._strokeSandGroove(ctx, () => {
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
          });
        }

        // Arrowhead notch
        ctx.fillStyle = isPalm ? '#3d6b2c' : '#5c3314';
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - Math.cos(ang - 0.45) * 13, y2 - Math.sin(ang - 0.45) * 13);
        ctx.lineTo(x2 - Math.cos(ang + 0.45) * 13, y2 - Math.sin(ang + 0.45) * 13);
        ctx.closePath();
        ctx.fill();

        this._drawLabel(ctx, prim.label, (x1 + x2) * 0.5, (y1 + y2) * 0.5 - 15);
        break;
      }

      case 'palm_rib': {
        const [x1, y1] = this._toPx(prim.from[0], prim.from[1], w, h);
        const [x2, y2] = this._toPx(prim.to[0], prim.to[1], w, h);
        ctx.strokeStyle = '#4c7733';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        // Sennit lashing knots along the crossbeam rib
        for (const u of [0.1, 0.28, 0.5, 0.72, 0.9]) {
          const kx = x1 + (x2 - x1) * u;
          const ky = y1 + (y2 - y1) * u;
          ctx.fillStyle = u === 0.5 ? '#e6d29e' : '#c95b3c';
          ctx.beginPath();
          ctx.arc(kx, ky, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        this._drawLabel(ctx, prim.label, (x1 + x2) * 0.5, y1 + 22);
        break;
      }

      case 'groove_ring': {
        const [cx, cy] = this._toPx(prim.at[0], prim.at[1], w, h);
        const rad = prim.radius * scaleR;
        this._strokeSandGroove(ctx, () => {
          ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        });
        ctx.fillStyle = 'rgba(62, 240, 208, 0.25)';
        ctx.beginPath();
        ctx.arc(cx, cy, rad * 0.75, 0, Math.PI * 2);
        ctx.fill();
        this._drawLabel(ctx, prim.label, cx, cy + rad + 18);
        break;
      }

      case 'groove_arc': {
        const [cx, cy] = this._toPx(prim.center[0], prim.center[1], w, h);
        const rad = prim.radius * scaleR;
        this._strokeSandGroove(ctx, () => {
          ctx.arc(cx, cy, rad, Math.PI, 0, false);
        });
        this._drawLabel(ctx, prim.label, cx, cy - rad - 12);
        break;
      }

      case 'pebble': {
        const [px, py] = this._toPx(prim.at[0], prim.at[1], w, h);
        this._drawPebble(ctx, px, py, 13);
        this._drawLabel(ctx, prim.label, px, py - 22);
        break;
      }

      case 'shell': {
        const [sx, sy] = this._toPx(prim.at[0], prim.at[1], w, h);
        this._drawShell(ctx, sx, sy, 9.5, true);
        this._drawLabel(ctx, prim.label, sx, sy - 18);
        break;
      }

      case 'canoe_mark': {
        const [cx, cy] = this._toPx(prim.at[0], prim.at[1], w, h);
        this._drawCanoeMark(ctx, cx, cy, prim.angleRad || 0.0);
        if (prim.label) this._drawLabel(ctx, prim.label, cx, cy + 32);
        break;
      }

      case 'shell_ring_12': {
        const [cx, cy] = this._toPx(0, 0, w, h);
        const rad = (prim.radius || 0.78) * scaleR;
        this._strokeSandGroove(
          ctx,
          () => {
            ctx.arc(cx, cy, rad, 0, Math.PI * 2);
          },
          3.5
        );
        this._drawCanoeMark(ctx, cx, cy, 0.0);

        const oppSet = new Set(prim.highlightOppositePair || []);
        for (const house of HORIZON_HOUSES) {
          const aRad = (house.engineAzDeg * Math.PI) / 180.0;
          const hx = cx + Math.sin(aRad) * rad;
          const hy = cy - Math.cos(aRad) * rad;
          const isHi =
            (prim.highlightBand && house.bandId === prim.highlightBand) ||
            oppSet.has(house.id);

          this._drawShell(ctx, hx, hy, isHi ? 10.5 : 7.5, isHi);

          if (
            isHi ||
            house.bandId === 'north_pivot' ||
            house.bandId === 'south_pivot' ||
            house.bandId === 'band_3'
          ) {
            const shortName = house.name
              .replace('House of the ', '')
              .replace('Path of the ', '');
            const lx = cx + Math.sin(aRad) * (rad + 22);
            const ly = cy - Math.cos(aRad) * (rad + 18);
            this._drawLabel(ctx, shortName, lx, ly);
          }
        }

        if (prim.highlightBand || oppSet.size === 2) {
          const matched = HORIZON_HOUSES.filter(
            (hh) => hh.bandId === prim.highlightBand || oppSet.has(hh.id)
          );
          if (matched.length === 2) {
            const a1 = (matched[0].engineAzDeg * Math.PI) / 180.0;
            const a2 = (matched[1].engineAzDeg * Math.PI) / 180.0;
            this._strokeSandGroove(
              ctx,
              () => {
                ctx.moveTo(cx + Math.sin(a1) * rad, cy - Math.cos(a1) * rad);
                ctx.lineTo(cx + Math.sin(a2) * rad, cy - Math.cos(a2) * rad);
              },
              4.5,
              true
            );
          }
        }
        break;
      }

      case 'parallel_band_grooves_5': {
        const [cx, cy] = this._toPx(0, 0, w, h);
        const rad = (prim.radius || 0.78) * scaleR;
        for (const risingDeg of [30, 60, 90, 120, 150]) {
          const r1 = (risingDeg * Math.PI) / 180.0;
          const r2 = ((360 - risingDeg) * Math.PI) / 180.0;
          this._strokeSandGroove(
            ctx,
            () => {
              ctx.moveTo(
                cx + Math.sin(r2) * (rad - 12),
                cy - Math.cos(r2) * (rad - 12)
              );
              ctx.lineTo(
                cx + Math.sin(r1) * (rad - 12),
                cy - Math.cos(r1) * (rad - 12)
              );
            },
            2.8
          );
        }
        break;
      }

      case 'parallel_swell_ridges': {
        for (let ny = -0.65; ny <= 0.66; ny += 0.32) {
          const [x1, y1] = this._toPx(-0.75, ny, w, h);
          const [x2, y2] = this._toPx(0.75, ny, w, h);
          this._strokeSandGroove(
            ctx,
            () => {
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
            },
            4.2
          );
        }
        break;
      }

      case 'refraction_diamond_grooves': {
        const [cx, cy] = this._toPx(prim.at[0], prim.at[1], w, h);
        for (let i = -2; i <= 2; i += 1) {
          this._strokeSandGroove(
            ctx,
            () => {
              ctx.moveTo(cx - 65 + i * 18, cy - 34);
              ctx.lineTo(cx + 35 + i * 18, cy + 34);
              ctx.moveTo(cx + 65 + i * 18, cy - 34);
              ctx.lineTo(cx - 35 + i * 18, cy + 34);
            },
            3.0
          );
        }
        this._drawLabel(ctx, prim.label, cx, cy + 48);
        break;
      }

      case 'calm_zone': {
        const [cx, cy] = this._toPx(prim.at[0], prim.at[1], w, h);
        ctx.fillStyle = 'rgba(235, 218, 188, 0.45)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 48, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        this._drawLabel(ctx, prim.label, cx + 88, cy + 4);
        break;
      }

      case 'pyramid_peaks': {
        const [cx, cy] = this._toPx(prim.at[0], prim.at[1], w, h);
        for (const dx of [-36, 0, 36]) {
          ctx.fillStyle = '#f5efe2';
          ctx.beginPath();
          ctx.moveTo(cx + dx, cy - 12);
          ctx.lineTo(cx + dx - 11, cy + 8);
          ctx.lineTo(cx + dx + 11, cy + 8);
          ctx.closePath();
          ctx.fill();
        }
        this._drawLabel(ctx, prim.label, cx, cy - 22);
        break;
      }

      default:
        break;
    }
  }
}
