// The 9:16 frame around the panel — same structure as the reference: header on top, the illustrated
// panel in the middle, a blurred + darkened copy of the panel filling the rest. Restyled to the sheet:
// hand-lettered type, cream not white, a small paper-strip tag for the night counter.
import { W, H, PW, PH, PY, PAL, clamp, scratch, hash, ease } from './lib.js';
import { hand, textWidth, paperTexture, stroke, shape, rectPts } from './ink.js';

export const HEADER = { part: 'PART 1', sub: 'BLACKOUT  ·  40TH FLOOR' };

export function compose(out, panel, t, o = {}) {
  const x = out.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none';
  // ---- blurred backdrop ----
  const [sc, s] = scratch('blurSmall', 108, 74);
  s.filter = 'blur(3px)'; s.drawImage(panel, -6, -4, 120, 82); s.filter = 'none';
  const [mc, m] = scratch('blurMid', 270, 480);
  m.imageSmoothingQuality = 'high';
  // cover-fit the panel into 9:16, mirrored halves keep it from looking stretched
  m.filter = 'blur(6px)'; m.drawImage(sc, -170, -10, 610, 500); m.filter = 'none';
  x.imageSmoothingQuality = 'high'; x.drawImage(mc, 0, 0, W, H);
  x.fillStyle = 'rgba(16,14,20,0.5)'; x.fillRect(0, 0, W, H);
  const vg = x.createLinearGradient(0, 0, 0, H);
  vg.addColorStop(0, 'rgba(10,9,14,0.55)'); vg.addColorStop(0.28, 'rgba(10,9,14,0.1)'); vg.addColorStop(0.72, 'rgba(10,9,14,0.1)'); vg.addColorStop(1, 'rgba(10,9,14,0.65)');
  x.fillStyle = vg; x.fillRect(0, 0, W, H);

  // ---- header ----
  if (o.header !== false) {
    x.save();
    x.shadowColor = 'rgba(0,0,0,0.45)'; x.shadowBlur = 18; x.shadowOffsetY = 4;
    hand(x, HEADER.part, W / 2, 470, { font: 'Permanent Marker', size: 96, color: '#F1E8D6', align: 'center', seed: 3, jitter: 0.8, ls: 4 });
    hand(x, HEADER.sub, W / 2, 540, { font: 'Patrick Hand SC', size: 46, color: PAL.amber, align: 'center', seed: 4, jitter: 0.5, ls: 2 });
    x.restore();
  }
  // ---- the panel ----
  x.save();
  x.shadowColor = 'rgba(0,0,0,0.55)'; x.shadowBlur = 40; x.shadowOffsetY = 10;
  x.fillStyle = '#000'; x.fillRect(0, PY, PW, PH);
  x.restore();
  x.drawImage(panel, 0, PY);
  // hand-inked rules above + below the panel
  stroke(x, [[-10, PY + 1], [W + 10, PY + 1]], { w: 3.4, seed: 21, color: '#1b1816', amp: 0.8, taper: 1 });
  stroke(x, [[-10, PY + PH - 1], [W + 10, PY + PH - 1]], { w: 3.4, seed: 22, color: '#1b1816', amp: 0.8, taper: 1 });

  // ---- night tag (paper strip) ----
  if (o.tag) {
    const k = clamp(o.tagK ?? 1);
    const tw = textWidth(x, o.tag, 'Patrick Hand SC', 50) + 60, th = 76;
    const tx = 56, ty = PY + PH + 46;
    x.save(); x.translate(tx, ty); x.rotate(-0.025); x.globalAlpha = k;
    x.translate(0, (1 - ease.outBack(k)) * 30);
    x.shadowColor = 'rgba(0,0,0,0.4)'; x.shadowBlur = 12; x.shadowOffsetY = 5;
    x.fillStyle = PAL.cream; x.fillRect(0, 0, tw, th); x.shadowColor = 'transparent';
    x.globalCompositeOperation = 'multiply'; x.drawImage(paperTexture(320, 80, 8), 0, 0, tw, th); x.globalCompositeOperation = 'source-over';
    shape(x, rectPts(0, 0, tw, th), { w: 1.6, seed: 31, amp: 0.7 });
    hand(x, o.tag, 30, 55, { font: 'Patrick Hand SC', size: 50, color: PAL.ink, seed: 33 });
    // a scrap of tape
    x.fillStyle = 'rgba(214,204,180,0.75)'; x.save(); x.translate(tw - 18, -8); x.rotate(0.5); x.fillRect(-26, -9, 52, 18); x.restore();
    x.restore();
  }
  // ---- whole-frame grain ----
  x.save(); x.globalCompositeOperation = 'overlay'; x.globalAlpha = 0.07;
  const g = paperTexture(540, 960, 12 + (Math.floor(t * 12) % 3));
  x.drawImage(g, 0, 0, W, H); x.restore();
}
