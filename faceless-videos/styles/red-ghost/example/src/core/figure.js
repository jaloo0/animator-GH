// The red ghost: a human body built from ~40 signed-distance shapes, posed by a 17-bone skeleton with
// two-bone IK, ray-marched inside its bounding box (writes real depth), mirrored under the glossy floor,
// and it lights the room with three red point lights + a floor pool.
import * as THREE from 'three';
import { glow } from './tex.js';

export const BN = ['pelvis', 'spine', 'chest', 'neck', 'head', 'uarmL', 'farmL', 'handL', 'uarmR', 'farmR', 'handR', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR'];
export const BI = Object.fromEntries(BN.map((n, i) => [n, i]));
const PARENT = [-1, 0, 1, 2, 3, 2, 5, 6, 2, 8, 9, 0, 11, 12, 0, 14, 15];
const OFF = [[0, 0.95, 0], [0, 0.08, 0], [0, 0.17, 0], [0, 0.22, 0], [0, 0.08, 0], [0.155, 0.17, -0.015], [0, -0.28, 0], [0, -0.245, 0],
  [-0.155, 0.17, -0.015], [0, -0.28, 0], [0, -0.245, 0], [0.09, -0.05, 0], [0, -0.42, 0], [0, -0.40, 0], [-0.09, -0.05, 0], [0, -0.42, 0], [0, -0.40, 0]].map((a) => new THREE.Vector3(...a));
const UPPER = 0.28, FORE = 0.245, THIGH = 0.42, SHIN = 0.40;
const D2R = Math.PI / 180;

const GLSL = /* glsl */`
uniform mat4 uInv[17];
uniform mat4 projectionMatrix;
uniform vec3 uBoxMin, uBoxMax;
uniform float uMirror, uKind, uGain, uEyes;
uniform vec3 uCore, uRim;
varying vec3 vW;

float sdEll(vec3 p, vec3 r){ float k0 = length(p / r); float k1 = length(p / (r * r)); return k0 * (k0 - 1.0) / max(k1, 1e-5); }
float sdRBox(vec3 p, vec3 b, float r){ vec3 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r; }
float sdRC(vec3 p, vec3 a, vec3 b, float r1, float r2){
  vec3 ba = b - a; float l2 = dot(ba, ba); float rr = r1 - r2; float a2 = l2 - rr * rr; float il2 = 1.0 / l2;
  vec3 pa = p - a; float y = dot(pa, ba); float z = y - l2;
  vec3 xv = pa * l2 - ba * y; float x2 = dot(xv, xv); float y2 = y * y * l2; float z2 = z * z * l2;
  float k = sign(rr) * rr * rr * x2;
  if (sign(z) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - r2;
  if (sign(y) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - r1;
  return (sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
float smin(float a, float b, float k){ float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }
vec3 Lb(int i, vec3 p){ return (uInv[i] * vec4(p, 1.0)).xyz; }

float arm(vec3 p, int b, float sd){
  vec3 q = Lb(b, p);
  float d = sdRC(q, vec3(0.0), vec3(0.0, -0.27, 0.0), 0.043, 0.033);
  d = smin(d, sdEll(q - vec3(0.006 * sd, -0.045, 0.0), vec3(0.045, 0.07, 0.048)), 0.03);
  float sl = sdRC(q, vec3(0.0, -0.01, 0.0), vec3(0.0, -0.14, 0.0), 0.047, 0.045) + 0.002 * sin(q.y * 70.0 + q.x * 40.0);
  sl = max(sl, -q.y - 0.135);
  d = smin(d, sl, 0.006);
  q = Lb(b + 1, p);
  d = smin(d, sdRC(q, vec3(0.0), vec3(0.0, -0.235, 0.0), 0.036, 0.026), 0.025);
  q = Lb(b + 2, p);
  float h = sdRBox(q - vec3(0.0, -0.05, 0.003), vec3(0.011, 0.044, 0.03), 0.01);
  h = smin(h, sdRBox(q - vec3(-0.008 * sd, -0.118, 0.0), vec3(0.0095, 0.038, 0.026), 0.0085), 0.016);
  h = smin(h, sdRC(q, vec3(-0.006 * sd, -0.025, 0.026), vec3(-0.014 * sd, -0.082, 0.032), 0.0115, 0.009), 0.012);
  d = smin(d, h, 0.02);
  return d;
}
float leg(vec3 p, int b, float sd){
  vec3 q = Lb(b, p);
  float d = sdRC(q, vec3(0.0, 0.02, 0.0), vec3(0.0, -0.42, 0.0), 0.088, 0.066);
  d += 0.0035 * sin(q.y * 48.0 + 2.5 * sin(atan(q.x, q.z) * 2.0 + q.y * 9.0)) * smoothstep(-0.05, -0.3, q.y);
  d = smin(d, sdRBox(q - vec3(0.08 * sd, -0.27, 0.005), vec3(0.012, 0.055, 0.045), 0.012), 0.02);
  q = Lb(b + 1, p);
  float sh = sdRC(q, vec3(0.0), vec3(0.0, -0.355, 0.0), 0.066, 0.06);
  sh = smin(sh, sdEll(q - vec3(0.0, -0.335, 0.006), vec3(0.071, 0.06, 0.074)), 0.03);
  sh += 0.004 * sin(q.y * 52.0 + 2.0 * sin(atan(q.x, q.z) * 3.0)) * smoothstep(-0.05, -0.2, q.y);
  d = smin(d, sh, 0.045);
  q = Lb(b + 2, p);
  float f = sdRBox(q - vec3(0.0, -0.036, 0.05), vec3(0.038, 0.03, 0.105), 0.03);
  f = smin(f, sdRBox(q - vec3(0.0, -0.066, 0.052), vec3(0.042, 0.012, 0.114), 0.01), 0.01);
  d = smin(d, f, 0.03);
  return d;
}
float hairD(vec3 q){
  float hr = sdEll(q - vec3(0.0, 0.098, -0.012), vec3(0.09, 0.106, 0.102));
  hr = smin(hr, sdEll(q - vec3(0.0, 0.03, -0.016), vec3(0.102, 0.066, 0.096)), 0.05);  // bob flares toward the jaw
  hr = max(hr, 0.006 - q.y + 0.01 * q.z);                                             // bob cut at the jaw
  hr = max(hr, -sdRBox(q - vec3(0.0, 0.025, 0.125), vec3(0.064, 0.088, 0.1), 0.025)); // open the face below the fringe
  return hr;
}
float map(vec3 p){
  p.y *= uMirror;
  vec3 q = Lb(0, p);
  float d = sdEll(q - vec3(0.0, -0.005, -0.005), vec3(0.156, 0.122, 0.112));
  d = smin(d, sdEll(q - vec3(0.0, -0.04, -0.028), vec3(0.145, 0.09, 0.09)), 0.05);
  q = Lb(1, p);
  float ab = sdEll(q - vec3(0.0, 0.05, 0.0), vec3(0.118, 0.105, 0.088));
  d = smin(d, ab, 0.06);
  d = smin(d, sdEll(q - vec3(0.0, -0.02, 0.0), vec3(0.142, 0.03, 0.1)), 0.004);   // waistband ridge
  q = Lb(2, p);
  float bw = uKind > 0.5 ? 1.16 : 1.0;
  float ch = sdEll(q - vec3(0.0, 0.055, -0.008), vec3(0.128 * bw, 0.15, 0.092));
  if (uKind < 0.5) ch = smin(ch, sdEll(vec3(abs(q.x), q.y, q.z) - vec3(0.062, 0.04, 0.062), vec3(0.058, 0.055, 0.048)), 0.05);
  ch = smin(ch, sdRC(vec3(abs(q.x), q.y, q.z), vec3(0.035, 0.2, -0.022), vec3(0.12 * bw, 0.15, -0.014), 0.04, 0.034), 0.06);
  ch += 0.0022 * sin(q.y * 38.0 + q.x * 22.0 + 1.3) * smoothstep(0.12, -0.02, q.y);   // t-shirt folds
  d = smin(d, ch, 0.06);
  q = Lb(3, p);
  d = smin(d, sdRC(q, vec3(0.0, -0.03, -0.008), vec3(0.0, 0.085, 0.012), 0.046, 0.04), 0.03);
  q = Lb(4, p);
  float hd = sdEll(q - vec3(0.0, 0.085, -0.005), vec3(0.08, 0.098, 0.094));
  hd = smin(hd, sdEll(q - vec3(0.0, 0.045, 0.028), vec3(0.062, 0.068, 0.068)), 0.04);
  hd = smin(hd, sdEll(q - vec3(0.0, 0.075, 0.088), vec3(0.011, 0.02, 0.016)), 0.012);
  d = smin(d, hd, 0.02);
  if (uKind < 0.5) d = smin(d, hairD(q), 0.006);
  if (length(Lb(5, p)) - 0.85 < d) d = smin(d, arm(p, 5, 1.0), 0.03);
  if (length(Lb(8, p)) - 0.85 < d) d = smin(d, arm(p, 8, -1.0), 0.03);
  if (length(Lb(11, p) + vec3(0.0, 0.42, 0.0)) - 0.62 < d) d = smin(d, leg(p, 11, 1.0), 0.045);
  if (length(Lb(14, p) + vec3(0.0, 0.42, 0.0)) - 0.62 < d) d = smin(d, leg(p, 14, -1.0), 0.045);
  return d;
}
vec3 nrm(vec3 p){
  const vec2 k = vec2(1.0, -1.0); float e = 0.0012;
  return normalize(k.xyy * map(p + k.xyy * e) + k.yyx * map(p + k.yyx * e) + k.yxy * map(p + k.yxy * e) + k.xxx * map(p + k.xxx * e));
}
float occ(vec3 p, vec3 n){
  float o = 0.0, s = 1.0;
  for (int i = 1; i <= 5; i++){ float h = 0.006 + 0.022 * float(i); o += (h - map(p + n * h)) * s; s *= 0.72; }
  return clamp(1.0 - 2.6 * o, 0.0, 1.0);
}
`;

const FRAG = /* glsl */`
${GLSL}
void main(){
  vec3 ro = cameraPosition, rd = normalize(vW - cameraPosition);
  vec3 inv = 1.0 / rd;
  vec3 t0 = (uBoxMin - ro) * inv, t1 = (uBoxMax - ro) * inv;
  vec3 tmn = min(t0, t1), tmx = max(t0, t1);
  float tN = max(max(tmn.x, tmn.y), tmn.z), tF = min(min(tmx.x, tmx.y), tmx.z);
  if (tF < 0.0 || tN > tF) discard;
  float t = max(tN, 0.02);
  bool hit = false;
  for (int i = 0; i < 160; i++){
    vec3 p = ro + rd * t;
    float d = map(p);
    if (d < 0.0004 + t * 0.0004){ hit = true; break; }
    t += d * 0.85;
    if (t > tF) break;
  }
  if (!hit) discard;
  vec3 p = ro + rd * t;
  vec3 n = nrm(p);
  float o = occ(p, n);
  float ndv = clamp(dot(n, -rd), 0.0, 1.0);
  float fr = pow(1.0 - ndv, 3.0);
  vec3 col = uCore * (0.35 + 0.65 * o) * (0.7 + 0.3 * ndv) + uRim * fr * (0.3 + 0.7 * o);
  if (uKind > 0.5 && uEyes > 0.0){
    vec3 hq = Lb(4, vec3(p.x, p.y * uMirror, p.z));
    float e = min(length(hq - vec3(0.032, 0.088, 0.082)), length(hq - vec3(-0.032, 0.088, 0.082)));
    col += vec3(1.0, 0.35, 0.18) * uEyes * 30.0 * smoothstep(0.022, 0.006, e);
  }
  col *= uGain;
  if (uMirror < 0.0) col *= 0.32 * exp(p.y * 2.2);
  vec4 clip = projectionMatrix * viewMatrix * vec4(p, 1.0);
  gl_FragDepth = clamp(clip.z / clip.w * 0.5 + 0.5, 0.0, 1.0);
  gl_FragColor = vec4(col, 1.0);
}`;

const VERT = /* glsl */`varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

let GLOW = null;
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler(), _m = new THREE.Matrix4(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _s1 = new THREE.Vector3(1, 1, 1);

export class Figure {
  constructor(scene, { kind = 0, core = [1.0, 0.042, 0.008], rim = [1.0, 0.17, 0.045], coreGain = 0.78, rimGain = 1.7, light = 1.0 } = {}) {
    this.kind = kind; this.scene = scene; this.visible = true; this.lightGain = light;
    this.W = Array.from({ length: 17 }, () => new THREE.Matrix4());
    this.inv = Array.from({ length: 17 }, () => new THREE.Matrix4());
    const mk = (mirror) => {
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG, side: THREE.BackSide, depthWrite: true, depthTest: true,
        uniforms: {
          uInv: { value: this.inv }, uBoxMin: { value: new THREE.Vector3() }, uBoxMax: { value: new THREE.Vector3() },
          uMirror: { value: mirror ? -1 : 1 }, uKind: { value: kind }, uGain: { value: 1 }, uEyes: { value: 0 },
          uCore: { value: new THREE.Vector3(...core).multiplyScalar(coreGain) }, uRim: { value: new THREE.Vector3(...rim).multiplyScalar(rimGain) },
        },
      });
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
      m.frustumCulled = false; m.renderOrder = mirror ? -10 : 0;
      scene.add(m); return m;
    };
    this.mesh = mk(false); this.mirror = mk(true);
    this.lights = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xff2a0e, 1, 0, 2); scene.add(l); return l; });
    GLOW = GLOW || glow(256, 1.6);
    this.pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: GLOW, color: new THREE.Color(1.0, 0.06, 0.015).multiplyScalar(1.0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.pool.rotation.x = -Math.PI / 2; this.pool.renderOrder = 5; scene.add(this.pool);
    this.box = new THREE.Box3();
  }

  set gain(g) { this.mesh.material.uniforms.uGain.value = g; this.mirror.material.uniforms.uGain.value = g; }
  set eyes(g) { this.mesh.material.uniforms.uEyes.value = g; this.mirror.material.uniforms.uEyes.value = g; }

  /** world position of a bone origin, or of a point given in that bone's space */
  at(name, local = null, out = new THREE.Vector3()) { out.copy(local || new THREE.Vector3()); return out.applyMatrix4(this.W[BI[name]]); }

  /**
   * pose = { pos:[x,z], yaw (deg), root:{ pos:[x,y,z], rot:[x,y,z] }, b:{ bone:[x,y,z] deg },
   *          ik:{ handL|handR:{ target:V3, pole:V3, rot:[x,y,z] }, footL|footR:{ target:V3 (ankle), pole:V3 } }, look:V3 }
   */
  pose(P) {
    const yaw = (P.yaw || 0) * D2R;
    const base = new THREE.Matrix4().makeRotationY(yaw).setPosition(P.pos ? P.pos[0] : 0, 0, P.pos ? P.pos[1] : 0);
    this.base = base; this.yawQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const b = { ...(P.b || {}) }, ik = P.ik || {};
    const rot = (name, extra) => { const r = b[name] || [0, 0, 0]; _e.set(r[0] * D2R, r[1] * D2R, r[2] * D2R, 'YXZ'); _q.setFromEuler(_e); return _q; };
    // root
    const rp = (P.root && P.root.pos) || [0, 0, 0], rr = (P.root && P.root.rot) || [0, 0, 0];
    _e.set(rr[0] * D2R, rr[1] * D2R, rr[2] * D2R, 'YXZ');
    this.W[0].compose(_v.set(OFF[0].x + rp[0], OFF[0].y + rp[1], OFF[0].z + rp[2]), _q.setFromEuler(_e), _s1).premultiply(base);
    for (let i = 1; i < 17; i++) {
      const pw = this.W[PARENT[i]];
      if (i === BI.head && P.look) this._look(P.look, b);
      if ((i === BI.uarmL && ik.handL) || (i === BI.uarmR && ik.handR) || (i === BI.thighL && ik.footL) || (i === BI.thighR && ik.footR)) { this._ik(i, ik, b); i += 2; continue; }
      this.W[i].compose(OFF[i], rot(BN[i]), _s1).premultiply(pw);
    }
    for (let i = 0; i < 17; i++) this.inv[i].copy(this.W[i]).invert();
    this._bounds();
    this._lights();
  }

  _look(target, b) {
    // split yaw/pitch toward a world target between neck and head (relative to chest)
    const chest = this.W[BI.chest];
    const hp = _v.set(0, 0.32, 0.02).applyMatrix4(chest);
    _q.setFromRotationMatrix(_m.extractRotation(chest)).invert();
    const d = _v2.copy(target).sub(hp).applyQuaternion(_q);
    const yaw = THREE.MathUtils.clamp(Math.atan2(d.x, d.z) / D2R, -80, 80);
    const pitch = THREE.MathUtils.clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)) / D2R, -35, 45);
    const n = b.neck || [0, 0, 0], h = b.head || [0, 0, 0];
    b.neck = [n[0] + pitch * 0.35, n[1] + yaw * 0.4, n[2]];
    b.head = [h[0] + pitch * 0.65, h[1] + yaw * 0.6, h[2]];
    // re-pose the neck with the new rotation (it was already composed)
    _e.set(b.neck[0] * D2R, b.neck[1] * D2R, b.neck[2] * D2R, 'YXZ');
    this.W[BI.neck].compose(OFF[BI.neck], _q2.setFromEuler(_e), _s1).premultiply(this.W[BI.chest]);
  }

  _ik(i, ik, b) {
    const isArm = i === BI.uarmL || i === BI.uarmR;
    const key = { [BI.uarmL]: 'handL', [BI.uarmR]: 'handR', [BI.thighL]: 'footL', [BI.thighR]: 'footR' }[i];
    const spec = ik[key], a = isArm ? UPPER : THIGH, c2 = isArm ? FORE : SHIN;
    const root = _v.copy(OFF[i]).applyMatrix4(this.W[PARENT[i]]).clone();
    const target = spec.target.clone();
    const td = target.clone().sub(root); let c = td.length();
    c = THREE.MathUtils.clamp(c, 0.05, a + c2 - 0.002);
    const tdir = td.normalize();
    const pole = (spec.pole || new THREE.Vector3(0, 0, isArm ? -1 : 1).applyQuaternion(this.yawQ)).clone();
    const pdir = pole.sub(tdir.clone().multiplyScalar(pole.dot(tdir))).normalize();
    const cosA = THREE.MathUtils.clamp((a * a + c * c - c2 * c2) / (2 * a * c), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
    const elbow = root.clone().addScaledVector(tdir, a * cosA).addScaledVector(pdir, a * sinA);
    const end = root.clone().addScaledVector(tdir, c);
    const u = elbow.clone().sub(root).normalize(), f = end.clone().sub(elbow).normalize();
    // bend direction: arms flex toward local +z, knees toward local -z
    let bend = f.clone().sub(u.clone().multiplyScalar(f.dot(u)));
    if (bend.lengthSq() < 1e-8) bend = pdir.clone().negate(); bend.normalize();
    _y.copy(u).negate(); _z.copy(isArm ? bend : bend.negate()); _x.crossVectors(_y, _z).normalize(); _z.crossVectors(_x, _y);
    this.W[i].makeBasis(_x, _y, _z).setPosition(root);
    const y2 = f.clone().negate(), z2 = new THREE.Vector3().crossVectors(_x, y2).normalize();
    this.W[i + 1].makeBasis(_x.clone(), y2, z2).setPosition(elbow);
    // end effector orientation
    const r = spec.rot || b[BN[i + 2]] || [0, 0, 0];
    _e.set(r[0] * D2R, r[1] * D2R, r[2] * D2R, 'YXZ'); _q.setFromEuler(_e);
    if (isArm) {
      this.W[i + 2].compose(OFF[i + 2], _q, _s1).premultiply(this.W[i + 1]);
    } else {
      // feet stay flat on the floor in the figure's heading
      _q2.copy(this.yawQ).multiply(_q);
      this.W[i + 2].compose(end, _q2, _s1);
    }
  }

  _bounds() {
    const B = this.box.makeEmpty();
    const pts = [[BI.head, [0, 0.22, 0]], [BI.handL, [0, -0.18, 0.03]], [BI.handR, [0, -0.18, 0.03]], [BI.footL, [0, -0.08, 0.2]], [BI.footR, [0, -0.08, 0.2]], [BI.footL, [0, -0.08, -0.08]], [BI.footR, [0, -0.08, -0.08]]];
    for (let i = 0; i < 17; i++) B.expandByPoint(_v.setFromMatrixPosition(this.W[i]));
    for (const [i, p] of pts) B.expandByPoint(_v.set(...p).applyMatrix4(this.W[i]));
    B.expandByScalar(0.14);
    const set = (mesh, mn, mx) => {
      mesh.material.uniforms.uBoxMin.value.copy(mn); mesh.material.uniforms.uBoxMax.value.copy(mx);
      mesh.position.copy(mn).add(mx).multiplyScalar(0.5); mesh.scale.copy(mx).sub(mn);
    };
    set(this.mesh, B.min, B.max);
    set(this.mirror, new THREE.Vector3(B.min.x, -B.max.y, B.min.z), new THREE.Vector3(B.max.x, -Math.max(B.min.y, -0.05), B.max.z));
    this.mesh.visible = this.mirror.visible = this.visible;
  }

  _lights() {
    const g = this.visible ? this.lightGain * (this.mesh.material.uniforms.uGain.value) : 0;
    const chest = this.at('chest', new THREE.Vector3(0, 0.05, 0.16));
    const hips = this.at('pelvis', new THREE.Vector3(0, -0.05, 0.18));
    const feet = this.at('footL').add(this.at('footR')).multiplyScalar(0.5); feet.y = 0.2;
    this.lights[0].position.copy(chest); this.lights[0].intensity = 0.42 * g;
    this.lights[1].position.copy(hips); this.lights[1].intensity = 0.36 * g;
    this.lights[2].position.copy(feet); this.lights[2].intensity = 0.12 * g;
    this.pool.position.set(feet.x, 0.004, feet.z); this.pool.scale.setScalar(1.25);
    this.pool.material.opacity = 0.32 * Math.min(1, g); this.pool.visible = this.visible && g > 0.01;
  }

  hide(v = false) { this.visible = v; this.mesh.visible = this.mirror.visible = v; this.pool.visible = v; if (!v) this.lights.forEach((l) => (l.intensity = 0)); }
}

// ---------------- pose helpers ----------------
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
/** figure-local point → world (for IK targets) */
export function local(pos, yawDeg, x, y, z) {
  const a = yawDeg * D2R, c = Math.cos(a), s = Math.sin(a);
  return new THREE.Vector3(pos[0] + x * c + z * s, y, pos[1] - x * s + z * c);
}

/** a relaxed standing pose with breathing; `t` drives the idle */
export function stand(pos, yaw, t = 0, o = {}) {
  const br = Math.sin(t * 2 * Math.PI * 0.24), sway = Math.sin(t * 2 * Math.PI * 0.11);
  const knee = o.knee ?? 0.012;
  const cp = o.contra ?? 1; // weight on the left leg, right knee soft
  return {
    pos, yaw,
    root: { pos: [0.025 * cp + 0.006 * sway, -knee + 0.003 * br, 0], rot: [o.lean ?? 2, 4 * cp, -3.5 * cp + 1.0 * sway] },
    b: {
      spine: [1 + (o.hunch ?? 0) * 0.5, -2 * cp, 2 * cp - 0.8 * sway], chest: [-1.2 * br + (o.hunch ?? 0), -2 * cp, 2.2 * cp - 0.6 * sway],
      neck: [4, 0, -1.5 * cp], head: [o.nod ?? 2, 0, 2.5 * cp],
      uarmL: [4, 0, 6 + br * 0.6], farmL: [-14, 0, 0], handL: [-4, -4, -6],
      uarmR: [1, 0, -8 - br * 0.6], farmR: [-9, 0, 0], handR: [-4, 4, 6],
    },
    ik: {
      footL: { target: local(pos, yaw, 0.1, 0.08, 0.0), rot: [0, 6, 0] },
      footR: { target: local(pos, yaw, -0.14, 0.08, 0.07 * cp), rot: [0, -12, 0] },
    },
  };
}

/** figure-local direction → world (for IK poles) */
export function ldir(yawDeg, x, y, z) {
  const a = yawDeg * D2R, c = Math.cos(a), s = Math.sin(a);
  return new THREE.Vector3(x * c + z * s, y, -x * s + z * c).normalize();
}
