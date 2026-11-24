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
    this._labelQueue = [];
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
    const durationMs = Math.max(1200, Math.min(3400, lesson.primitives.length * 320));

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

  _strokeSandGroove(ctx, drawPathFn, width = 4.6, highlight = false) {
    // Raised sunlit sand lip
    ctx.save();
    ctx.translate(1.4, 1.8);
    ctx.strokeStyle = highlight
      ? 'rgba(255, 236, 178, 0.78)'
      : 'rgba(238, 215, 175, 0.52)';
    ctx.lineWidth = width + 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    drawPathFn();
    ctx.stroke();
    ctx.restore();

    // Recessed damp trench
    ctx.save();
    ctx.strokeStyle = highlight ? '#562b0c' : '#6d4c2d';
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    drawPathFn();
    ctx.stroke();
    ctx.restore();
  }

  _drawArrowHead(ctx, x, y, angRad, size = 10.5, color = '#5c3314') {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(
      x - Math.cos(angRad - 0.46) * size,
      y - Math.sin(angRad - 0.46) * size
    );
    ctx.lineTo(
      x - Math.cos(angRad + 0.46) * size,
      y - Math.sin(angRad + 0.46) * size
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _drawShell(ctx, x, y, radius = 8.5, glowing = false) {
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
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.62, 0);
    ctx.lineTo(radius * 0.62, 0);
    ctx.stroke();
    ctx.restore();
  }

  _drawPebble(ctx, x, y, radius = 11.5) {
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = 'rgba(20, 14, 8, 0.5)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#36332f';
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.2, radius * 0.92, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.ellipse(
      -radius * 0.28,
      -radius * 0.24,
      radius * 0.42,
      radius * 0.22,
      0.15,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }

  _drawIslandCone(ctx, x, y, scale = 1.0, crag = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.shadowColor = 'rgba(20, 14, 8, 0.45)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = crag ? '#2d2a27' : '#3d3933';
    ctx.beginPath();
    if (crag) {
      ctx.moveTo(-22, 9);
      ctx.lineTo(-9, -12);
      ctx.lineTo(-2, -6);
      ctx.lineTo(5, -18);
      ctx.lineTo(13, -7);
      ctx.lineTo(22, 9);
    } else {
      ctx.moveTo(-20, 9);
      ctx.lineTo(-5, -11);
      ctx.lineTo(2, -13);
      ctx.lineTo(20, 9);
    }
    ctx.closePath();
    ctx.fill();

    // Sunlit ridge facet
    ctx.fillStyle = 'rgba(244, 224, 184, 0.2)';
    ctx.beginPath();
    if (crag) {
      ctx.moveTo(5, -18);
      ctx.lineTo(2, 9);
      ctx.lineTo(22, 9);
    } else {
      ctx.moveTo(2, -13);
      ctx.lineTo(0, 9);
      ctx.lineTo(20, 9);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _drawCloudPuff(ctx, x, y, scale = 1.0, variant = 'white') {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    if (variant === 'jade') {
      ctx.fillStyle = 'rgba(62, 240, 208, 0.36)';
      ctx.beginPath();
      ctx.ellipse(0, 8, 28, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const puffs =
      variant === 'peak'
        ? [
            [-12, 3, 12],
            [12, 4, 11],
            [-5, -7, 13],
            [7, -6, 12],
            [0, -16, 11],
          ]
        : variant === 'drift'
          ? [
              [-14, 2, 9],
              [-2, 0, 11],
              [12, 2, 9],
            ]
          : [
              [-12, 2, 11],
              [0, -3, 13],
              [13, 2, 10],
            ];

    ctx.fillStyle =
      variant === 'jade' ? 'rgba(222, 248, 240, 0.88)' : 'rgba(248, 243, 232, 0.9)';
    ctx.shadowColor = 'rgba(40, 28, 16, 0.26)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    for (const [px, py, pr] of puffs) {
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }

    if (variant === 'jade') {
      ctx.fillStyle = 'rgba(62, 240, 208, 0.42)';
      ctx.beginPath();
      ctx.ellipse(0, 6, 20, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawCanoeMark(ctx, x, y, angleRad = 0.0, scale = 1.0, opts = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angleRad);
    ctx.scale(scale, scale);

    // Optional wake trails astern (+Y)
    if (opts.wake) {
      ctx.strokeStyle = 'rgba(250, 242, 222, 0.55)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-6, 18);
      ctx.lineTo(-14, 34);
      ctx.moveTo(6, 18);
      ctx.lineTo(14, 34);
      ctx.stroke();
    }

    // Cheek highlight arc along port (-X) or starboard (+X) bow
    if (opts.highlightCheek === 'port' || opts.highlightCheek === 'both') {
      ctx.strokeStyle = '#ffd97d';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(-9, -6, 9, Math.PI * 0.9, Math.PI * 1.48);
      ctx.stroke();
    }
    if (opts.highlightCheek === 'starboard' || opts.highlightCheek === 'both') {
      ctx.strokeStyle = '#ffd97d';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(9, -6, 9, -Math.PI * 0.48, Math.PI * 0.1);
      ctx.stroke();
    }

    // Twin hulls: sharp upturned forward prows (-Y), fuller tapered sterns (+Y)
    for (const hx of [-8.5, 8.5]) {
      ctx.fillStyle = '#4f3018';
      ctx.beginPath();
      ctx.moveTo(hx, -22);
      ctx.quadraticCurveTo(hx + 4.8, -5, hx + 3.2, 16);
      ctx.lineTo(hx, 18);
      ctx.lineTo(hx - 3.2, 16);
      ctx.quadraticCurveTo(hx - 4.8, -5, hx, -22);
      ctx.closePath();
      ctx.fill();

      // Golden manu prow tip so bow direction reads effortlessly
      ctx.fillStyle = '#f4d38c';
      ctx.beginPath();
      ctx.arc(hx, -21, 1.9, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crossbeams (iako)
    ctx.strokeStyle = '#8b5e34';
    ctx.lineWidth = 2.8;
    for (const bz of [-6, 6]) {
      ctx.beginPath();
      ctx.moveTo(-11, bz);
      ctx.lineTo(11, bz);
      ctx.stroke();
    }

    // Central crab-claw sail triangle swept slightly toward bow/beam
    ctx.fillStyle = 'rgba(246, 232, 202, 0.86)';
    ctx.strokeStyle = '#734b24';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-2, -12);
    ctx.lineTo(8, 2);
    ctx.lineTo(-3, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Unmistakable steering sweep paddle (hoe uli) trailing astern (+Y)
    ctx.strokeStyle = opts.lockedSweep ? '#ffd97d' : '#4a2b13';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(2, 12);
    ctx.lineTo(6, 26);
    ctx.stroke();
    ctx.fillStyle = opts.lockedSweep ? '#f4d38c' : '#5e3819';
    ctx.beginPath();
    ctx.ellipse(6.8, 27.5, 2.3, 4.5, -0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _drawBirdGlyph(ctx, x, y, angleRad, scale = 1.0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angleRad);
    ctx.scale(scale, scale);

    ctx.strokeStyle = '#fff8ea';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-12, 5);
    ctx.quadraticCurveTo(-5, -4, 0, -9);
    ctx.quadraticCurveTo(5, -4, 12, 5);
    ctx.stroke();

    // Small dark beak tip pointing forward (-Y in local bird space)
    ctx.fillStyle = '#3b2410';
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(-2.3, -8);
    ctx.lineTo(2.3, -8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _drawSunMark(ctx, x, y, scale = 1.0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = '#e5a336';
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 8; i += 1) {
      const a = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12);
      ctx.lineTo(Math.cos(a) * 17, Math.sin(a) * 17);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffd97d';
    ctx.beginPath();
    ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _queueLabel(text, x, y, opts = {}) {
    if (!text) return;
    this._labelQueue.push({
      text,
      x,
      y,
      align: opts.align || 'center',
      fontSize: opts.fontSize || 11.5,
      tone: opts.tone || 'default',
      alpha: opts.alpha ?? 1.0,
    });
  }

  _flushLabels(ctx, w, h) {
    if (!this._labelQueue.length) return;
    const boxes = [];

    for (const lbl of this._labelQueue) {
      ctx.save();
      ctx.font = `600 ${lbl.fontSize}px system-ui, -apple-system, sans-serif`;
      const tw = ctx.measureText(lbl.text).width;
      ctx.restore();

      const bw = tw + 11;
      const bh = lbl.fontSize + 6.5;
      let left =
        lbl.align === 'left'
          ? lbl.x
          : lbl.align === 'right'
            ? lbl.x - bw
            : lbl.x - bw * 0.5;
      let top = lbl.y - bh * 0.5;

      // Clamp cleanly within sand bed
      left = Math.max(6, Math.min(w - bw - 6, left));
      top = Math.max(6, Math.min(h - bh - 6, top));

      boxes.push({ ...lbl, left, top, bw, bh });
    }

    // Deterministic gentle de-overlap pass
    boxes.sort((a, b) => a.top - b.top);
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = 0; j < i; j += 1) {
        const a = boxes[j];
        const b = boxes[i];
        const overlapX = a.left < b.left + b.bw + 3 && a.left + a.bw + 3 > b.left;
        const overlapY = a.top < b.top + b.bh + 2 && a.top + a.bh + 2 > b.top;
        if (overlapX && overlapY) {
          const pushDown = a.top + a.bh + 3;
          if (pushDown + b.bh <= h - 5) {
            b.top = pushDown;
          } else {
            a.top = Math.max(5, a.top - (a.top + a.bh - b.top + 3));
          }
        }
      }
    }

    for (const b of boxes) {
      ctx.save();
      ctx.globalAlpha = b.alpha;
      ctx.font = `600 ${b.fontSize}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillStyle =
        b.tone === 'gold'
          ? 'rgba(56, 34, 12, 0.88)'
          : b.tone === 'jade'
            ? 'rgba(14, 42, 38, 0.85)'
            : 'rgba(30, 21, 12, 0.78)';
      ctx.strokeStyle =
        b.tone === 'gold'
          ? 'rgba(244, 211, 140, 0.52)'
          : b.tone === 'jade'
            ? 'rgba(62, 240, 208, 0.45)'
            : 'rgba(244, 211, 140, 0.22)';
      ctx.lineWidth = 1.0;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(b.left, b.top, b.bw, b.bh, 6);
      } else {
        ctx.rect(b.left, b.top, b.bw, b.bh);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle =
        b.tone === 'gold'
          ? '#ffe4a8'
          : b.tone === 'jade'
            ? '#bdfcf0'
            : '#faecd2';
      ctx.fillText(b.text, b.left + b.bw * 0.5, b.top + b.bh * 0.5 + 0.5);
      ctx.restore();
    }
  }

  _drawFrame(overallProgress) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    this._labelQueue = [];

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

      const alpha = Math.min(1.0, localT * 1.4);
      ctx.save();
      ctx.globalAlpha = alpha;
      this._drawPrimitive(ctx, prim, w, h, alpha);
      ctx.restore();
    });

    this._flushLabels(ctx, w, h);
  }

  _resolveLabelPos(prim, fallbackX, fallbackY, w, h) {
    if (Array.isArray(prim.labelAt)) {
      const [lx, ly] = this._toPx(prim.labelAt[0], prim.labelAt[1], w, h);
      return [lx, ly];
    }
    return [fallbackX, fallbackY];
  }

  _drawPrimitive(ctx, prim, w, h, alpha = 1.0) {
    const [, , scaleR] = this._toPx(0, 0, w, h);
    const lOpts = {
      align: prim.labelAlign || 'center',
      fontSize: prim.labelSize || 11.5,
      tone: prim.labelTone || 'default',
      alpha,
    };

    switch (prim.type) {
      case 'divider_line': {
        const [x1, y1] = this._toPx(prim.from[0], prim.from[1], w, h);
        const [x2, y2] = this._toPx(prim.to[0], prim.to[1], w, h);
        ctx.save();
        ctx.strokeStyle = 'rgba(84, 56, 28, 0.36)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
        break;
      }

      case 'panel_title': {
        const [px, py] = this._toPx(prim.at[0], prim.at[1], w, h);
        this._queueLabel(prim.label, px, py, {
          align: prim.labelAlign || 'center',
          fontSize: prim.fontSize || 11,
          tone: prim.tone || 'gold',
          alpha,
        });
        break;
      }

      case 'groove_line':
      case 'groove_dashed': {
        const [x1, y1] = this._toPx(prim.from[0], prim.from[1], w, h);
        const [x2, y2] = this._toPx(prim.to[0], prim.to[1], w, h);
        if (prim.type === 'groove_dashed') ctx.setLineDash([8, 6]);
        this._strokeSandGroove(
          ctx,
          () => {
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
          },
          prim.width || 4.4,
          Boolean(prim.highlight)
        );
        ctx.setLineDash([]);
        const [lx, ly] = this._resolveLabelPos(
          prim,
          (x1 + x2) * 0.5,
          (y1 + y2) * 0.5 - 15,
          w,
          h
        );
        this._queueLabel(prim.label, lx, ly, lOpts);
        break;
      }

      case 'groove_wave': {
        const [x1, y1] = this._toPx(prim.from[0], prim.from[1], w, h);
        const [x2, y2] = this._toPx(prim.to[0], prim.to[1], w, h);
        this._strokeSandGroove(
          ctx,
          () => {
            ctx.moveTo(x1, y1);
            for (let i = 1; i <= 18; i += 1) {
              const u = i / 18.0;
              const px = x1 + (x2 - x1) * u + Math.sin(u * Math.PI * 5.0) * 7.5;
              const py = y1 + (y2 - y1) * u;
              ctx.lineTo(px, py);
            }
          },
          prim.width || 3.8
        );
        const [lx, ly] = this._resolveLabelPos(
          prim,
          (x1 + x2) * 0.5 + 16,
          (y1 + y2) * 0.5,
          w,
          h
        );
        this._queueLabel(prim.label, lx, ly, {
          ...lOpts,
          align: prim.labelAlign || 'left',
        });
        break;
      }

      case 'groove_ray':
      case 'palm_rib_arrow':
      case 'gaze_ray': {
        const [x1, y1] = this._toPx(prim.from[0], prim.from[1], w, h);
        const [x2, y2] = this._toPx(prim.to[0], prim.to[1], w, h);
        const ang = Math.atan2(y2 - y1, x2 - x1);
        const isPalm = prim.type === 'palm_rib_arrow';
        const isGaze = prim.type === 'gaze_ray';

        if (isGaze) {
          ctx.save();
          ctx.strokeStyle = prim.color || '#f4d38c';
          ctx.lineWidth = 2.6;
          ctx.setLineDash([6, 5]);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.restore();
          this._drawArrowHead(ctx, x2, y2, ang, 10, prim.color || '#f4d38c');
        } else if (isPalm) {
          ctx.strokeStyle = '#3d6b2c';
          ctx.lineWidth = 4.2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          this._drawArrowHead(ctx, x2, y2, ang, 11, '#3d6b2c');
        } else {
          if (prim.dashed) ctx.setLineDash([8, 6]);
          this._strokeSandGroove(
            ctx,
            () => {
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
            },
            prim.width || 4.4,
            Boolean(prim.highlight)
          );
          ctx.setLineDash([]);
          this._drawArrowHead(
            ctx,
            x2,
            y2,
            ang,
            11.5,
            prim.highlight ? '#562b0c' : '#5c3314'
          );
        }

        const [lx, ly] = this._resolveLabelPos(
          prim,
          (x1 + x2) * 0.5,
          (y1 + y2) * 0.5 - 15,
          w,
          h
        );
        this._queueLabel(prim.label, lx, ly, lOpts);
        break;
      }

      case 'wind_gusts': {
        const [x1, y1] = this._toPx(prim.from[0], prim.from[1], w, h);
        const [x2, y2] = this._toPx(prim.to[0], prim.to[1], w, h);
        const count = prim.count || 3;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const step = (prim.spacing || 0.14) * scaleR;
        const ang = Math.atan2(dy, dx);

        for (let i = 0; i < count; i += 1) {
          const offset = (i - (count - 1) * 0.5) * step;
          const sx = x1 + nx * offset;
          const sy = y1 + ny * offset;
          const ex = x2 + nx * offset;
          const ey = y2 + ny * offset;
          ctx.save();
          ctx.strokeStyle = 'rgba(246, 240, 224, 0.78)';
          ctx.lineWidth = 2.6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(
            (sx + ex) * 0.5 + nx * 5,
            (sy + ey) * 0.5 + ny * 5,
            ex,
            ey
          );
          ctx.stroke();
          ctx.restore();
          this._drawArrowHead(ctx, ex, ey, ang, 8.5, 'rgba(246, 240, 224, 0.88)');
        }
        const [lx, ly] = this._resolveLabelPos(
          prim,
          (x1 + x2) * 0.5,
          (y1 + y2) * 0.5 - step - 14,
          w,
          h
        );
        this._queueLabel(prim.label, lx, ly, lOpts);
        break;
      }

      case 'bird_flight': {
        const [x1, y1] = this._toPx(prim.from[0], prim.from[1], w, h);
        const [x2, y2] = this._toPx(prim.to[0], prim.to[1], w, h);
        const ang = Math.atan2(y2 - y1, x2 - x1);
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 248, 232, 0.65)';
        ctx.lineWidth = 2.2;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
        this._drawArrowHead(ctx, x2, y2, ang, 9.5, '#fff8ea');

        const bx = x1 + (x2 - x1) * (prim.birdT ?? 0.5);
        const by = y1 + (y2 - y1) * (prim.birdT ?? 0.5);
        this._drawBirdGlyph(ctx, bx, by, ang + Math.PI * 0.5, prim.birdScale || 0.95);

        const [lx, ly] = this._resolveLabelPos(
          prim,
          (x1 + x2) * 0.5,
          (y1 + y2) * 0.5 - 18,
          w,
          h
        );
        this._queueLabel(prim.label, lx, ly, lOpts);
        break;
      }

      case 'shadow_lashing_demo': {
        const [cx, cy] = this._toPx(prim.at[0], prim.at[1], w, h);
        const sc = prim.scale || 1.0;
        const span = 62 * sc;
        const sunFrom = prim.sunFrom || 'right';
        const targetIdx = prim.targetIdx ?? 1;

        // Crossbeam rib (iako)
        ctx.strokeStyle = '#5a7f3a';
        ctx.lineWidth = 6 * sc;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - span, cy);
        ctx.lineTo(cx + span, cy);
        ctx.stroke();

        // Fore-aft center spine if center_aft mode
        if (sunFrom === 'top') {
          ctx.strokeStyle = '#6f4e2d';
          ctx.lineWidth = 4.5 * sc;
          ctx.beginPath();
          ctx.moveTo(cx, cy - 30 * sc);
          ctx.lineTo(cx, cy + 36 * sc);
          ctx.stroke();
        }

        const ratios = [-0.88, -0.46, 0.0, 0.46, 0.88];
        const targetX =
          sunFrom === 'top' ? cx : cx + ratios[targetIdx] * span;
        const targetY = sunFrom === 'top' ? cy + 28 * sc : cy;

        // Cast dark shadow ray from central sighting post (pou) to target knot
        ctx.save();
        ctx.strokeStyle = 'rgba(24, 15, 7, 0.82)';
        ctx.lineWidth = 5.5 * sc;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();
        ctx.restore();

        // Draw knots along the iako
        ratios.forEach((u, idx) => {
          const kx = cx + u * span;
          const isTarget = sunFrom !== 'top' && idx === targetIdx;
          if (isTarget) {
            ctx.fillStyle = 'rgba(255, 217, 125, 0.48)';
            ctx.beginPath();
            ctx.arc(kx, cy, 9.5 * sc, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = isTarget ? '#ffd97d' : idx === 2 ? '#e6d29e' : '#c95b3c';
          ctx.beginPath();
          ctx.arc(kx, cy, (isTarget ? 5.6 : 4.2) * sc, 0, Math.PI * 2);
          ctx.fill();
        });

        if (sunFrom === 'top') {
          ctx.fillStyle = 'rgba(255, 217, 125, 0.48)';
          ctx.beginPath();
          ctx.arc(cx, targetY, 9.5 * sc, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffd97d';
          ctx.beginPath();
          ctx.arc(cx, targetY, 5.4 * sc, 0, Math.PI * 2);
          ctx.fill();
        }

        // Upright pou post at center
        ctx.fillStyle = '#2d1a0b';
        ctx.beginPath();
        ctx.arc(cx, cy, 6.0 * sc, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f4d38c';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Sun-ray hint on opposite side
        const sunX =
          sunFrom === 'right' ? cx + span * 0.72 : sunFrom === 'left' ? cx - span * 0.72 : cx;
        const sunY = cy - 30 * sc;
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 217, 125, 0.65)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(sunX, sunY);
        ctx.lineTo(cx, cy);
        ctx.stroke();
        ctx.restore();
        this._drawSunMark(ctx, sunX, sunY, 0.58 * sc);

        const [lx, ly] = this._resolveLabelPos(prim, cx, cy + 32 * sc, w, h);
        this._queueLabel(prim.label, lx, ly, lOpts);
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
        for (const u of [0.1, 0.28, 0.5, 0.72, 0.9]) {
          const kx = x1 + (x2 - x1) * u;
          const ky = y1 + (y2 - y1) * u;
          ctx.fillStyle = u === 0.5 ? '#e6d29e' : '#c95b3c';
          ctx.beginPath();
          ctx.arc(kx, ky, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        const [lx, ly] = this._resolveLabelPos(prim, (x1 + x2) * 0.5, y1 + 22, w, h);
        this._queueLabel(prim.label, lx, ly, lOpts);
        break;
      }

      case 'groove_ring': {
        const [cx, cy] = this._toPx(prim.at[0], prim.at[1], w, h);
        const rad = prim.radius * scaleR;
        this._strokeSandGroove(ctx, () => {
          ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        });
        ctx.fillStyle = 'rgba(62, 240, 208, 0.3)';
        ctx.beginPath();
        ctx.arc(cx, cy, rad * 0.78, 0, Math.PI * 2);
        ctx.fill();
        const [lx, ly] = this._resolveLabelPos(prim, cx, cy + rad + 18, w, h);
        this._queueLabel(prim.label, lx, ly, lOpts);
        break;
      }

      case 'groove_arc': {
        const [cx, cy] = this._toPx(prim.center[0], prim.center[1], w, h);
        const rad = prim.radius * scaleR;
        const sRad = prim.startRad ?? Math.PI;
        const eRad = prim.endRad ?? 0;
        const ccw = Boolean(prim.ccw);
        if (prim.dashed) ctx.setLineDash([7, 5]);
        this._strokeSandGroove(
          ctx,
          () => {
            ctx.arc(cx, cy, rad, sRad, eRad, ccw);
          },
          prim.width || 4.0,
          Boolean(prim.highlight)
        );
        ctx.setLineDash([]);
        if (prim.arrowAtEnd) {
          const ex = cx + Math.cos(eRad) * rad;
          const ey = cy + Math.sin(eRad) * rad;
          const tangent = eRad + (ccw ? -Math.PI * 0.5 : Math.PI * 0.5);
          this._drawArrowHead(ctx, ex, ey, tangent, 9.5, '#5c3314');
        }
        const [lx, ly] = this._resolveLabelPos(prim, cx, cy - rad - 14, w, h);
        this._queueLabel(prim.label, lx, ly, lOpts);
        break;
      }

      case 'star_relay_arc': {
        const [x1, y1] = this._toPx(prim.from[0], prim.from[1], w, h);
        const [x2, y2] = this._toPx(prim.to[0], prim.to[1], w, h);
        const cpx = (x1 + x2) * 0.5 + (prim.curveDx || 0) * scaleR;
        const cpy = (y1 + y2) * 0.5 - (prim.curveDy || 0.14) * scaleR;

        this._strokeSandGroove(
          ctx,
          () => {
            ctx.moveTo(x1, y1);
            ctx.quadraticCurveTo(cpx, cpy, x2, y2);
          },
          3.8,
          true
        );

        const tanEndX = x2 - cpx;
        const tanEndY = y2 - cpy;
        this._drawArrowHead(ctx, x2, y2, Math.atan2(tanEndY, tanEndX), 10.5, '#562b0c');

        const stars = prim.stars || [];
        stars.forEach((st) => {
          const t = st.t;
          const mt = 1 - t;
          const sx = mt * mt * x1 + 2 * mt * t * cpx + t * t * x2;
          const sy = mt * mt * y1 + 2 * mt * t * cpy + t * t * y2;
          this._drawShell(ctx, sx, sy, 8.2, true);
          const ox = (st.dx || 0) * scaleR;
          const oy = (st.dy ?? 0.14) * scaleR;
          this._queueLabel(st.name, sx + ox, sy - oy, {
            align: st.align || 'center',
            fontSize: 11,
            tone: st.tone || 'default',
            alpha,
          });
        });

        if (prim.label) {
          const [lx, ly] = this._resolveLabelPos(prim, cpx, cpy - 20, w, h);
          this._queueLabel(prim.label, lx, ly, lOpts);
        }
        break;
      }

      case 'pebble': {
        const [px, py] = this._toPx(prim.at[0], prim.at[1], w, h);
        this._drawPebble(ctx, px, py, prim.radius || 12);
        const [lx, ly] = this._resolveLabelPos(prim, px, py - 21, w, h);
        this._queueLabel(prim.label, lx, ly, lOpts);
        break;
      }

      case 'island_cone': {
        const [px, py] = this._toPx(prim.at[0], prim.at[1], w, h);
        this._drawIslandCone(ctx, px, py, prim.scale || 1.0, Boolean(prim.crag));
        const [lx, ly] = this._resolveLabelPos(prim, px, py - 24, w, h);
        this._queueLabel(prim.label, lx, ly, lOpts);
        break;
      }

      case 'cloud_puff': {
        const [px, py] = this._toPx(prim.at[0], prim.at[1], w, h);
        this._drawCloudPuff(ctx, px, py, prim.scale || 1.0, prim.variant || 'white');
        const [lx, ly] = this._resolveLabelPos(prim, px, py - 26, w, h);
        this._queueLabel(prim.label, lx, ly, lOpts);
        break;
      }

      case 'sun_mark': {
        const [sx, sy] = this._toPx(prim.at[0], prim.at[1], w, h);
        this._drawSunMark(ctx, sx, sy, prim.scale || 1.0);
        const [lx, ly] = this._resolveLabelPos(prim, sx, sy - 24, w, h);
        this._queueLabel(prim.label, lx, ly, lOpts);
        break;
      }

      case 'shell': {
        const [sx, sy] = this._toPx(prim.at[0], prim.at[1], w, h);
        this._drawShell(ctx, sx, sy, prim.radius || 8.8, prim.glowing !== false);
        const [lx, ly] = this._resolveLabelPos(prim, sx, sy - 18, w, h);
        this._queueLabel(prim.label, lx, ly, lOpts);
        break;
      }

      case 'canoe_mark': {
        const [cx, cy] = this._toPx(prim.at[0], prim.at[1], w, h);
        this._drawCanoeMark(ctx, cx, cy, prim.angleRad || 0.0, prim.scale || 1.0, {
          wake: Boolean(prim.wake),
          highlightCheek: prim.highlightCheek || null,
          lockedSweep: Boolean(prim.lockedSweep),
        });
        if (prim.label) {
          const [lx, ly] = this._resolveLabelPos(prim, cx, cy + 30 * (prim.scale || 1.0), w, h);
          this._queueLabel(prim.label, lx, ly, lOpts);
        }
        break;
      }

      case 'shell_ring_12': {
        const [cx, cy] = this._toPx(
          prim.at ? prim.at[0] : 0,
          prim.at ? prim.at[1] : 0,
          w,
          h
        );
        const rad = (prim.radius || 0.62) * scaleR;

        // Optional misty veil across forward sector (e.g. Rangiroa rain curtain)
        if (typeof prim.fogForwardAzDeg === 'number') {
          const fRad = ((prim.fogForwardAzDeg - 90) * Math.PI) / 180.0;
          ctx.save();
          ctx.fillStyle = 'rgba(218, 228, 236, 0.36)';
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, rad + 18, fRad - 0.72, fRad + 0.72);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        this._strokeSandGroove(
          ctx,
          () => {
            ctx.arc(cx, cy, rad, 0, Math.PI * 2);
          },
          3.2
        );

        // Inner parallel track lines if requested
        if (prim.showAllBands) {
          for (const risingDeg of [30, 60, 90, 120, 150]) {
            const r1 = (risingDeg * Math.PI) / 180.0;
            const r2 = ((360 - risingDeg) * Math.PI) / 180.0;
            this._strokeSandGroove(
              ctx,
              () => {
                ctx.moveTo(
                  cx + Math.sin(r2) * (rad - 8),
                  cy - Math.cos(r2) * (rad - 8)
                );
                ctx.lineTo(
                  cx + Math.sin(r1) * (rad - 8),
                  cy - Math.cos(r1) * (rad - 8)
                );
              },
              2.2
            );
          }
          const bandNames = [
            { deg: 30, label: 'Horse Track' },
            { deg: 60, label: 'Boar Track' },
            { deg: 90, label: 'Bull Track' },
            { deg: 120, label: 'Shark Track' },
            { deg: 150, label: 'Whale Track' },
          ];
          bandNames.forEach((b) => {
            const br = (b.deg * Math.PI) / 180.0;
            const by = cy - Math.cos(br) * (rad - 8);
            if (b.deg === 90) return; // keep canoe center uncluttered
            this._queueLabel(b.label, cx, by, {
              align: 'center',
              fontSize: 9.8,
              tone: 'default',
              alpha,
            });
          });
        }

        const oppSet = new Set(prim.highlightOppositePair || []);
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
              4.2,
              true
            );
          }
        }

        if (typeof prim.sternGazeAzDeg === 'number') {
          const sr = (prim.sternGazeAzDeg * Math.PI) / 180.0;
          const gx = cx + Math.sin(sr) * (rad - 14);
          const gy = cy - Math.cos(sr) * (rad - 14);
          ctx.save();
          ctx.strokeStyle = '#ffd97d';
          ctx.lineWidth = 2.6;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(gx, gy);
          ctx.stroke();
          ctx.restore();
          this._drawArrowHead(
            ctx,
            gx,
            gy,
            Math.atan2(gy - cy, gx - cx),
            9.5,
            '#ffd97d'
          );
        }

        this._drawCanoeMark(
          ctx,
          cx,
          cy,
          prim.canoeAngleRad || 0.0,
          prim.canoeScale || 0.88,
          { wake: Boolean(prim.canoeWake) }
        );

        const labeledHouses = new Set(prim.labelHouses || []);
        for (const house of HORIZON_HOUSES) {
          const aRad = (house.engineAzDeg * Math.PI) / 180.0;
          const sinA = Math.sin(aRad);
          const cosA = Math.cos(aRad);
          const hx = cx + sinA * rad;
          const hy = cy - cosA * rad;
          const isHi =
            (prim.highlightBand && house.bandId === prim.highlightBand) ||
            oppSet.has(house.id);

          this._drawShell(ctx, hx, hy, isHi ? 9.2 : 6.8, isHi);

          const defaultLabeled =
            isHi ||
            house.bandId === 'north_pivot' ||
            house.bandId === 'south_pivot' ||
            house.bandId === 'band_3';
          const shouldLabel =
            labeledHouses.size > 0
              ? labeledHouses.has(house.id) || isHi
              : defaultLabeled;

          if (shouldLabel) {
            const shortName = house.name
              .replace('House of the ', '')
              .replace('Path of the ', '');
            const extraName =
              prim.houseAliases?.[house.id] || shortName;

            let lx;
            let ly;
            let align = 'center';
            if (Math.abs(sinA) < 0.15) {
              lx = cx;
              ly = cosA > 0 ? cy - rad - 22 : cy + rad + 23;
            } else {
              align = sinA > 0 ? 'left' : 'right';
              const sideXPad = Math.abs(cosA) > 0.65 ? 16 : 16;
              lx = hx + (sinA > 0 ? sideXPad : -sideXPad);
              ly = hy + (cosA > 0 ? -5 : cosA < -0.35 ? 6 : 0);
            }
            this._queueLabel(extraName, lx, ly, {
              align,
              fontSize: isHi ? 11.2 : 10.6,
              tone: isHi ? 'gold' : 'default',
              alpha,
            });
          }
        }
        break;
      }

      case 'parallel_band_grooves_5': {
        const [cx, cy] = this._toPx(0, 0, w, h);
        const rad = (prim.radius || 0.62) * scaleR;
        for (const risingDeg of [30, 60, 90, 120, 150]) {
          const r1 = (risingDeg * Math.PI) / 180.0;
          const r2 = ((360 - risingDeg) * Math.PI) / 180.0;
          this._strokeSandGroove(
            ctx,
            () => {
              ctx.moveTo(
                cx + Math.sin(r2) * (rad - 10),
                cy - Math.cos(r2) * (rad - 10)
              );
              ctx.lineTo(
                cx + Math.sin(r1) * (rad - 10),
                cy - Math.cos(r1) * (rad - 10)
              );
            },
            2.4
          );
        }
        break;
      }

      case 'swell_field':
      case 'parallel_swell_ridges': {
        const xMin = prim.xRange ? prim.xRange[0] : -0.85;
        const xMax = prim.xRange ? prim.xRange[1] : 0.85;
        const yMin = prim.yRange ? prim.yRange[0] : -0.68;
        const yMax = prim.yRange ? prim.yRange[1] : 0.68;
        const count = prim.count || 5;

        if (prim.mist) {
          const [mx, my] = this._toPx((xMin + xMax) * 0.5, (yMin + yMax) * 0.5, w, h);
          ctx.save();
          ctx.fillStyle = 'rgba(218, 228, 236, 0.28)';
          ctx.beginPath();
          ctx.ellipse(
            mx,
            my,
            (xMax - xMin) * 0.52 * scaleR,
            (yMax - yMin) * 0.55 * scaleR,
            0,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.restore();
        }

        const [cx, cy] = this._toPx((xMin + xMax) * 0.5, (yMin + yMax) * 0.5, w, h);
        const halfW = (xMax - xMin) * 0.5 * scaleR;
        const halfH = (yMax - yMin) * 0.5 * scaleR;
        const rot = prim.angleRad || 0.0;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        for (let i = 0; i < count; i += 1) {
          const u = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
          const ry = u * halfH;
          this._strokeSandGroove(
            ctx,
            () => {
              ctx.moveTo(-halfW, ry);
              ctx.lineTo(halfW, ry);
            },
            prim.width || 3.4
          );
        }

        // Swell travel direction arrows (default downward top->bottom unless travelDir = -1)
        if (prim.showArrows !== false) {
          const travelSign = prim.travelDir === -1 ? -1 : 1;
          const arrowXs =
            prim.arrowSide === 'left'
              ? [-halfW * 0.82]
              : prim.arrowSide === 'right'
                ? [halfW * 0.82]
                : [-halfW * 0.85, halfW * 0.85];
          const spanY = halfH * 0.68;
          for (const ax of arrowXs) {
            ctx.strokeStyle = 'rgba(250, 236, 206, 0.86)';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(ax, -spanY * travelSign);
            ctx.lineTo(ax, spanY * travelSign);
            ctx.stroke();
            this._drawArrowHead(
              ctx,
              ax,
              spanY * travelSign,
              travelSign > 0 ? Math.PI * 0.5 : -Math.PI * 0.5,
              9.0,
              '#faecd2'
            );
          }
        }
        ctx.restore();

        if (prim.label) {
          const [lx, ly] = this._resolveLabelPos(prim, cx, cy - halfH - 16, w, h);
          this._queueLabel(prim.label, lx, ly, lOpts);
        }
        break;
      }

      case 'fog_veiling': {
        const [cx, cy] = this._toPx(prim.at[0], prim.at[1], w, h);
        const rx = (prim.rx || 0.45) * scaleR;
        const ry = (prim.ry || 0.28) * scaleR;
        ctx.save();
        for (let k = 0; k < 3; k += 1) {
          ctx.fillStyle =
            k === 0
              ? 'rgba(216, 226, 234, 0.28)'
              : k === 1
                ? 'rgba(226, 234, 240, 0.24)'
                : 'rgba(238, 244, 248, 0.22)';
          ctx.beginPath();
          ctx.ellipse(
            cx + (k - 1) * 14,
            cy + (k === 1 ? -5 : 4),
            rx * (1 - k * 0.14),
            ry * (1 - k * 0.1),
            0,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
        ctx.restore();
        const [lx, ly] = this._resolveLabelPos(prim, cx, cy, w, h);
        this._queueLabel(prim.label, lx, ly, lOpts);
        break;
      }

      case 'refraction_diamond_grooves': {
        const [cx, cy] = this._toPx(prim.at[0], prim.at[1], w, h);
        for (let i = -2; i <= 2; i += 1) {
          this._strokeSandGroove(
            ctx,
            () => {
              ctx.moveTo(cx - 62 + i * 18, cy - 30);
              ctx.lineTo(cx + 32 + i * 18, cy + 30);
              ctx.moveTo(cx + 62 + i * 18, cy - 30);
              ctx.lineTo(cx - 32 + i * 18, cy + 30);
            },
            2.6
          );
        }
        const [lx, ly] = this._resolveLabelPos(prim, cx, cy + 44, w, h);
        this._queueLabel(prim.label, lx, ly, lOpts);
        break;
      }

      case 'calm_zone': {
        const [cx, cy] = this._toPx(prim.at[0], prim.at[1], w, h);
        ctx.fillStyle = 'rgba(235, 218, 188, 0.5)';
        ctx.strokeStyle = 'rgba(244, 211, 140, 0.45)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 46, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        const [lx, ly] = this._resolveLabelPos(prim, cx + 56, cy, w, h);
        this._queueLabel(prim.label, lx, ly, {
          ...lOpts,
          align: prim.labelAlign || 'left',
        });
        break;
      }

      case 'pyramid_peaks': {
        const [cx, cy] = this._toPx(prim.at[0], prim.at[1], w, h);
        for (const dx of [-34, 0, 34]) {
          ctx.fillStyle = '#f5efe2';
          ctx.strokeStyle = '#6d4c2d';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(cx + dx, cy - 11);
          ctx.lineTo(cx + dx - 10, cy + 8);
          ctx.lineTo(cx + dx + 10, cy + 8);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        const [lx, ly] = this._resolveLabelPos(prim, cx, cy - 22, w, h);
        this._queueLabel(prim.label, lx, ly, lOpts);
        break;
      }

      default:
        break;
    }
  }
}
