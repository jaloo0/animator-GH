// Shared effects, all pure functions of film time (frames render out of order):
// molten lava (flowing crust plates, glowing cracks, impact ripples), GPU particles (smoke, sparks, ash, dust, clouds),
// a lava-glow patch for rock materials.
import * as THREE from 'three';

export const GLSL_NOISE = /* glsl */`
  float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  vec2 h22(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
  float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * n2(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
  // voronoi: x = distance to nearest centre, y = distance to the border between the two nearest
  vec2 vor(vec2 p){ vec2 i = floor(p), f = fract(p); float d1 = 9.0, d2 = 9.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){ vec2 g = vec2(x, y); vec2 o = h22(i + g); vec2 r = g + o - f; float d = dot(r, r);
      if (d < d1){ d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
    return vec2(sqrt(d1), sqrt(d2) - sqrt(d1)); }
`;

// Molten colour ramp (linear HDR): dark red → orange → yellow-white
export const GLSL_LAVA = /* glsl */`
  vec3 lavaRamp(float h){
    vec3 c = mix(vec3(0.16, 0.008, 0.002), vec3(0.95, 0.09, 0.006), smoothstep(0.0, 0.45, h));
    c = mix(c, vec3(1.9, 0.42, 0.03), smoothstep(0.45, 0.8, h));
    return mix(c, vec3(3.6, 1.55, 0.3), smoothstep(0.82, 1.0, h));
  }
  // p = world xz in metres * scale; returns linear HDR colour
  vec3 lavaColor(vec2 p, float t, float crust, float bright){
    vec2 w = p + 0.6 * vec2(fbm(p * 0.5 + vec2(0.0, t * 0.07)), fbm(p * 0.5 + vec2(5.2, -t * 0.05)));
    float heat = fbm(w * 1.3 + vec2(t * 0.05, t * 0.02));
    vec3 mol = lavaRamp(clamp(heat * 1.25 - 0.05 + 0.1 * sin(t * 1.3 + p.x), 0.0, 1.0)) * bright;
    // crust plates drifting on top
    vec2 v = vor(w * 0.9 + vec2(t * 0.03, 0.0));
    float cover = smoothstep(crust - 0.08, crust + 0.08, fbm(w * 0.35 + 3.0 + vec2(t * 0.02, 0.0)));
    float edge = 1.0 - smoothstep(0.02, 0.09, v.y);
    float plate = cover * (1.0 - edge);
    vec3 rock = vec3(0.022, 0.016, 0.013) * (0.7 + 0.6 * n2(w * 9.0)) + mol * 0.025;
    vec3 c = mix(mol, rock, plate);
    c += lavaRamp(0.7) * edge * cover * 0.55 * bright; // glowing cracks between plates
    return c;
  }
`;

/** Molten lava surface. Vertex: slow swell + impact ripples (uImpact = x, z, t0, amp). */
export function lavaMaterial({ scale = 0.5, crust = 0.55, bright = 1, swell = 0.08 } = {}) {
  const U = {
    uTime: { value: 0 }, uScale: { value: scale }, uCrust: { value: crust }, uBright: { value: bright }, uSwell: { value: swell },
    uImpact: { value: new THREE.Vector4(0, 0, -99, 0) }, uImpact2: { value: new THREE.Vector4(0, 0, -99, 0) },
  };
  const m = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: /* glsl */`
      uniform float uTime, uSwell; uniform vec4 uImpact, uImpact2; varying vec3 vW;
      float ripple(vec4 I, vec2 xz){ float a = uTime - I.z; if (a < 0.0) return 0.0; float d = length(xz - I.xy);
        float front = a * 3.2; return I.w * sin(d * 3.4 - a * 11.0) * exp(-a * 1.4) * exp(-d * 0.35) * smoothstep(front + 0.6, front - 0.4, d); }
      void main(){
        vec4 w = modelMatrix * vec4(position, 1.0);
        w.y += uSwell * (sin(w.x * 0.35 + uTime * 0.9) + sin(w.z * 0.27 - uTime * 0.7) * 0.7);
        w.y += ripple(uImpact, w.xz) + ripple(uImpact2, w.xz);
        vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uScale, uCrust, uBright; varying vec3 vW;
      ${GLSL_NOISE}
      ${GLSL_LAVA}
      void main(){ gl_FragColor = vec4(lavaColor(vW.xz * uScale, uTime, uCrust, uBright), 1.0); }`,
  });
  m.userData.U = U;
  return m;
}

/** Patch a MeshStandardMaterial so it glows orange near the lava (world y below `top`). */
export function addLavaGlow(mat, { col = 0xff5a10, strength = 2.5, top = 3, fall = 0.6, base = 0 } = {}) {
  const U = { uGlowCol: { value: new THREE.Color(col) }, uGlowK: { value: strength }, uGlowTop: { value: top }, uGlowFall: { value: fall }, uGlowBase: { value: base } };
  mat.userData.glow = U;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWG;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWG = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWG; uniform vec3 uGlowCol; uniform float uGlowK, uGlowTop, uGlowFall, uGlowBase;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += uGlowCol * (uGlowK * exp(-max(vWG.y - uGlowBase, 0.0) * uGlowFall) * step(vWG.y, uGlowTop + 40.0));');
  };
  mat.customProgramCacheKey = () => 'lavaglow';
  return mat;
}

/**
 * GPU particles (instanced camera-facing quads). Every particle is a pure function of uTime:
 * born at a time in [birth0, birth1], lives `life`, moves origin + v0·drag + gravity + buoyant rise + turbulence.
 * opts: { count, origin, spread (box half-size at birth), dir, cone (rad), speed [a,b], drag, gravity, rise,
 *         turb, life [a,b], birth [t0,t1], size [s0,s1], colA, colB (hex), intA, intB (HDR multipliers),
 *         alpha, additive, soft, glow (hex, under-light), glowK, lit (0..1 top light), seed, stretch }
 */
export function particles(o) {
  const n = o.count ?? 200;
  const g = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  g.index = quad.index; g.attributes.position = quad.attributes.position; g.attributes.uv = quad.attributes.uv;
  const R = mulberry(o.seed ?? 7);
  const a0 = new Float32Array(n * 4), a1 = new Float32Array(n * 4);
  const [b0, b1] = o.birth ?? [0, 0];
  for (let i = 0; i < n; i++) {
    // a0: birth time, life, random size factor, random seed
    a0[i * 4] = o.birthFn ? o.birthFn(i / n, R) : b0 + (b1 - b0) * (o.evenBirth ? i / n : R());
    a0[i * 4 + 1] = (o.life ?? [2, 3])[0] + R() * ((o.life ?? [2, 3])[1] - (o.life ?? [2, 3])[0]);
    a0[i * 4 + 2] = 0.6 + 0.8 * R(); a0[i * 4 + 3] = R() * 100;
    // a1: unit direction inside a cone around dir, plus speed
    const dir = new THREE.Vector3(...(o.dir ?? [0, 1, 0])).normalize();
    const cone = o.cone ?? 0.5, ph = R() * Math.PI * 2, ct = 1 - R() * (1 - Math.cos(cone));
    const st = Math.sqrt(1 - ct * ct);
    const t1 = Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const u = new THREE.Vector3().crossVectors(dir, t1).normalize(), v = new THREE.Vector3().crossVectors(dir, u);
    const d = dir.clone().multiplyScalar(ct).addScaledVector(u, st * Math.cos(ph)).addScaledVector(v, st * Math.sin(ph));
    const sp = (o.speed ?? [1, 2])[0] + R() * ((o.speed ?? [1, 2])[1] - (o.speed ?? [1, 2])[0]);
    a1[i * 4] = d.x * sp; a1[i * 4 + 1] = d.y * sp; a1[i * 4 + 2] = d.z * sp; a1[i * 4 + 3] = R();
  }
  g.setAttribute('a0', new THREE.InstancedBufferAttribute(a0, 4));
  g.setAttribute('a1', new THREE.InstancedBufferAttribute(a1, 4));
  // per-particle birth offset inside the spread box
  const off = new Float32Array(n * 3); const sp3 = o.spread ?? [0, 0, 0];
  for (let i = 0; i < n; i++) { off[i * 3] = (R() * 2 - 1) * sp3[0]; off[i * 3 + 1] = (R() * 2 - 1) * sp3[1]; off[i * 3 + 2] = (R() * 2 - 1) * sp3[2]; }
  g.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 3));
  g.instanceCount = n;
  const U = {
    uTime: { value: 0 }, uOrigin: { value: new THREE.Vector3(...(o.origin ?? [0, 0, 0])) }, uDrag: { value: o.drag ?? 0.0 },
    uGrav: { value: o.gravity ?? 0 }, uRise: { value: o.rise ?? 0 }, uTurb: { value: o.turb ?? 0 }, uS0: { value: (o.size ?? [1, 2])[0] }, uS1: { value: (o.size ?? [1, 2])[1] },
    uColA: { value: new THREE.Color(o.colA ?? 0x666666) }, uColB: { value: new THREE.Color(o.colB ?? o.colA ?? 0x666666) },
    uIntA: { value: o.intA ?? 1 }, uIntB: { value: o.intB ?? o.intA ?? 1 }, uAlpha: { value: o.alpha ?? 1 }, uSoft: { value: o.soft ?? 1 },
    uGlow: { value: new THREE.Color(o.glow ?? 0x000000) }, uGlowK: { value: o.glowK ?? 0 }, uLit: { value: o.lit ?? 0.5 },
    uStretch: { value: o.stretch ?? 0 }, uFadeIn: { value: o.fadeIn ?? 0.12 }, uSpreadRate: { value: o.spreadRate ?? 0 }, uMaster: { value: 1 },
    uGround: { value: o.ground ?? -1e9 }, uGlowH: { value: o.glowH ?? 1e9 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false,
    blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexShader: /* glsl */`
      attribute vec4 a0, a1; attribute vec3 aOff;
      uniform float uTime, uDrag, uGrav, uRise, uTurb, uS0, uS1, uStretch, uSpreadRate, uGround; uniform vec3 uOrigin;
      varying vec2 vUv; varying float vAge, vSeed, vAlive, vH; varying vec3 vVel;
      void main(){
        float age = uTime - a0.x, life = a0.y; vSeed = a0.w;
        vAlive = step(0.0, age) * step(age, life);
        float u = clamp(age / life, 0.0, 1.0); vAge = u;
        float tt = max(age, 0.0);
        float dragF = uDrag > 0.0 ? (1.0 - exp(-uDrag * tt)) / uDrag : tt;
        vec3 p = uOrigin + aOff * (1.0 + uSpreadRate * tt) + a1.xyz * dragF + vec3(0.0, 0.5 * uGrav * tt * tt + uRise * tt, 0.0);
        p += uTurb * tt * vec3(sin(tt * 1.3 + a0.w), sin(tt * 0.9 + a0.w * 1.7) * 0.5, cos(tt * 1.1 + a0.w * 2.3));
        p.y = max(p.y, uGround); vH = p.y - uOrigin.y;
        vec3 vel = a1.xyz * exp(-uDrag * tt) + vec3(0.0, uGrav * tt + uRise, 0.0);
        float size = mix(uS0, uS1, sqrt(u)) * a0.z;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        vec2 q = position.xy;
        if (uStretch > 0.0) { // streak along the screen-space velocity
          vec3 vv = (viewMatrix * vec4(vel, 0.0)).xyz; vec2 d = normalize(vv.xy + 1e-5); vec2 nn = vec2(d.y, -d.x); // keep the quad front-facing (a mirrored basis gets back-face culled)
          float len = 1.0 + uStretch * length(vv.xy);
          mv.xy += d * q.y * size * len + nn * q.x * size;
        } else {
          float a = a0.w * 6.28 + tt * (fract(a0.w * 3.1) - 0.5) * 0.6; mat2 r = mat2(cos(a), -sin(a), sin(a), cos(a));
          mv.xy += (r * q) * size;
        }
        vUv = uv; vVel = vel;
        gl_Position = projectionMatrix * mv;
        if (vAlive < 0.5) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColA, uColB, uGlow; uniform float uIntA, uIntB, uAlpha, uSoft, uGlowK, uLit, uFadeIn, uMaster, uGlowH;
      varying vec2 vUv; varying float vAge, vSeed, vAlive, vH;
      ${GLSL_NOISE}
      void main(){
        if (vAlive < 0.5) discard;
        vec2 c = vUv - 0.5; float r = length(c) * 2.0;
        float shape = uSoft > 0.5 ? smoothstep(1.0, 0.15, r) * (0.55 + 0.6 * fbm(vUv * 3.0 + vSeed)) : smoothstep(1.0, 0.0, r);
        shape = clamp(shape * (uSoft > 0.5 ? 1.25 : 1.0), 0.0, 1.0);
        float fade = smoothstep(0.0, uFadeIn, vAge) * (1.0 - smoothstep(0.6, 1.0, vAge));
        vec3 col = mix(uColA * uIntA, uColB * uIntB, vAge);
        col *= mix(1.0, 0.6 + 0.8 * (vUv.y), uLit);               // lit from above
        col += uGlow * uGlowK * (1.0 - vUv.y) * (1.0 - vAge) * exp(-max(vH, 0.0) / uGlowH);   // lava under-glow, strongest near the source
        float a = shape * fade * uAlpha * uMaster;
        if (a < 0.003) discard;
        gl_FragColor = vec4(col, a);
      }`,
  });
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = o.order ?? 5;
  m.userData.U = U;
  m.userData.shift = 0; // play the effect later (+) / earlier (−) than its baked birth times
  m.update = (t) => { U.uTime.value = t - m.userData.shift; };
  return m;
}

export function mulberry(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** displace a geometry's vertices along normals with 3D value noise (craggy rock) */
export function craggy(geo, amp = 0.3, freq = 1, seed = 1) {
  const p = geo.attributes.position; geo.computeVertexNormals(); const nn = geo.attributes.normal;
  const h = (x, y, z) => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed * 4.1) * 43758.5453; return s - Math.floor(s); };
  const vn = (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), fx = x - xi, fy = y - yi, fz = z - zi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), sz = fz * fz * (3 - 2 * fz);
    const L = (a, b, t) => a + (b - a) * t;
    return L(L(L(h(xi, yi, zi), h(xi + 1, yi, zi), sx), L(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), sx), sy),
      L(L(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), sx), L(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), sx), sy), sz);
  };
  const fb = (x, y, z) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < 4; i++) { s += a * vn(x * f, y * f, z * f); a *= 0.5; f *= 2.1; } return s; };
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const d = (fb(x * freq, y * freq, z * freq) - 0.47) * 2 * amp;
    p.setXYZ(i, x + nn.getX(i) * d, y + nn.getY(i) * d, z + nn.getZ(i) * d);
  }
  geo.computeVertexNormals();
  return geo;
}
