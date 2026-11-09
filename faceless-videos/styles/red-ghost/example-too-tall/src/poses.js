// Pose library on top of figure.js: walking / running along a path (IK feet planted in stance), sitting,
// hands raised, hands hidden. Everything is a pure function of (path, distance, t), so any frame renders on its own.
import { stand, local, ldir, V } from './core/figure.js';

const D2R = Math.PI / 180;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

export function pathLen(pts) { let L = 0; for (let i = 0; i < pts.length - 1; i++) L += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); return L; }
function at(pts, d) {
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], l = Math.hypot(bx - ax, bz - az);
    if (d <= acc + l || i === pts.length - 2) { const k = clamp((d - acc) / l, d < 0 && i === 0 ? -9 : 0, 9); return [ax + (bx - ax) * k, az + (bz - az) * k]; }
    acc += l;
  }
  return pts[pts.length - 1];
}
/** position + heading (deg, smoothed through corners) at distance d along a polyline of [x, z] points */
export function pathAt(pts, d) {
  const L = pathLen(pts), dd = clamp(d, 0, L);
  const a = at(pts, Math.max(0, dd - 0.25)), b = at(pts, Math.min(L, dd + 0.25));
  let yaw = Math.atan2(b[0] - a[0], b[1] - a[1]) / D2R;
  if (!isFinite(yaw) || (a[0] === b[0] && a[1] === b[1])) yaw = Math.atan2(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]) / D2R;
  return { pos: at(pts, dd), yaw, L };
}
/** distance travelled at time t for a walk that starts at t0 with speed v, easing in/out over `acc` seconds */
export function travel(t, t0, v, L, acc = 0.35) {
  const u = t - t0; if (u <= 0) return 0;
  return Math.min(L, u < acc ? v * u * u / (2 * acc) : v * (u - acc / 2));
}

/**
 * walking / running pose at distance d along pts.
 * o: { run, stride (m per full cycle), amp (0 = standing, 1 = full gait), yaw (override), lean, hunch, look, phase }
 */
export function walk(pts, d, t, o = {}) {
  const run = !!o.run;
  const Dc = o.stride ?? (run ? 2.0 : 1.3), sf = run ? 0.36 : 0.5;
  const p = pathAt(pts, d), pos = p.pos, yaw = o.yaw ?? p.yaw;
  const amp = clamp(o.amp ?? 1);
  const ph = (d / Dc) * Math.PI * 2 + (o.phase ?? 0);
  const P = stand(pos, yaw, t, { contra: 0, knee: 0, lean: (run ? 11 : 3) * amp + (o.lean ?? 0), hunch: o.hunch ?? 0, nod: o.nod ?? 2 });
  const Sst = Dc * sf * amp, lift = (run ? 0.2 : 0.075) * amp;
  const foot = (side, off) => {
    const u = (((ph / (Math.PI * 2)) + off) % 1 + 1) % 1;
    let z, y = 0;
    if (u < sf) { z = Sst / 2 - Sst * (u / sf); }
    else { const v = (u - sf) / (1 - sf), e = v * v * (3 - 2 * v); z = -Sst / 2 + Sst * e; y = lift * Math.sin(Math.PI * v) * (run ? (1.2 - 0.6 * v) : 1); }
    return local(pos, yaw, side * (run ? 0.08 : 0.1), 0.08 + y, z);
  };
  P.ik.footL = { target: foot(1, 0), rot: [0, 0, 0] };
  P.ik.footR = { target: foot(-1, 0.5), rot: [0, 0, 0] };
  const c = Math.cos(ph), bob = -Math.cos(2 * ph);
  P.root.pos = [0, (run ? -0.1 : -0.065) * amp + (run ? 0.03 : 0.014) * bob * amp, 0];
  P.root.rot = [P.root.rot[0], 6 * c * amp, P.root.rot[2] * (1 - amp)];
  const A = (run ? 42 : 17) * amp;
  P.b.spine = [P.b.spine[0], -3 * c * amp, 0]; P.b.chest = [P.b.chest[0] + (run ? 4 : 0) * amp, -6 * c * amp, 0];
  P.b.uarmL = [A * c, 0, 6]; P.b.uarmR = [-A * c, 0, -6];
  P.b.farmL = [-(run ? 75 : 14 + 10 * Math.max(0, -c)) * Math.max(amp, 0.3), 0, 0]; P.b.farmR = [-(run ? 75 : 14 + 10 * Math.max(0, c)) * Math.max(amp, 0.3), 0, 0];
  if (o.look) P.look = o.look;
  return P;
}

/** seated on a chair at pos (the seat centre), facing yaw */
export function sit(pos, yaw, t, o = {}) {
  const P = stand(pos, yaw, t, { contra: 0, knee: 0, lean: o.lean ?? 6, hunch: o.hunch ?? 4, nod: o.nod ?? 8 });
  const seat = o.seat ?? 0.48;
  P.root.pos = [0, seat + 0.09 - 0.95, -0.04];
  P.root.rot = [P.root.rot[0] - 4, 0, 0];
  const kx = o.knees ?? 0.11;
  P.ik.footL = { target: local(pos, yaw, kx + 0.01, 0.08, 0.46 + (o.feet ?? 0)), pole: ldir(yaw, 0.15, 0.6, 1) };
  P.ik.footR = { target: local(pos, yaw, -kx - 0.01, 0.08, 0.48 + (o.feet ?? 0)), pole: ldir(yaw, -0.15, 0.6, 1) };
  P.ik.handL = { target: local(pos, yaw, 0.15, seat + 0.17, 0.3), pole: ldir(yaw, 1, -0.6, -0.4), rot: [-70, 0, 0] };
  P.ik.handR = { target: local(pos, yaw, -0.15, seat + 0.17, 0.32), pole: ldir(yaw, -1, -0.6, -0.4), rot: [-70, 0, 0] };
  return P;
}

/** both hands up by the head (surrender); k 0..1 blends from the current arms */
export function handsUp(P, k = 1) {
  if (k <= 0) return P;
  const pos = P.pos, yaw = P.yaw;
  const up = (side) => local(pos, yaw, side * 0.27, 1.5 + 0.22 * k, 0.1);
  P.ik.handL = { target: up(1), pole: ldir(yaw, 1, -0.7, -0.3), rot: [-10, 0, 0] };
  P.ik.handR = { target: up(-1), pole: ldir(yaw, -1, -0.7, -0.3), rot: [-10, 0, 0] };
  return P;
}

/** hands hidden: right hand low at the hip, half behind the body; left hand in the jacket pocket */
export function handsHidden(P, o = {}) {
  const pos = P.pos, yaw = P.yaw;
  P.ik.handR = { target: local(pos, yaw, -0.2, 0.93 + (o.raise ?? 0), 0.12 + (o.fwd ?? 0)), pole: ldir(yaw, -0.6, -0.4, -1), rot: [-20, 0, 0] };
  P.ik.handL = { target: local(pos, yaw, 0.19, 0.9, 0.05), pole: ldir(yaw, 1, -0.3, -1), rot: [0, 0, 0] };
  return P;
}
