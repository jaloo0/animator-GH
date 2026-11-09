// Sunlit sky: a gradient dome (hardhat blue overhead → warm haze at the horizon, glow around a low sun),
// the same sky baked into a PMREM environment for image-based light, and the low warm sun (shadow caster).
import * as THREE from 'three';

const SKY_VS = /* glsl */`varying vec3 vDir; void main(){ vDir = normalize((modelMatrix * vec4(position, 0.0)).xyz); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }`;
const SKY_FS = /* glsl */`
  uniform vec3 uTop, uMid, uHaze, uGround, uSun, uSunCol; uniform float uSunSize, uGlow, uCloud, uTime; varying vec3 vDir;
  float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * n2(p); p *= 2.07; a *= 0.5; } return s; }
  void main(){
    vec3 d = normalize(vDir);
    float y = d.y;
    vec3 col = mix(uHaze, uMid, smoothstep(0.0, 0.18, y));
    col = mix(col, uTop, smoothstep(0.15, 0.75, y));
    col = mix(col, uGround, smoothstep(0.0, -0.06, y));
    float s = max(dot(d, uSun), 0.0);
    col += uSunCol * (pow(s, 6.0) * 0.35 + pow(s, 64.0) * 0.6) * uGlow;
    col += uSunCol * smoothstep(1.0 - uSunSize, 1.0 - uSunSize * 0.6, s) * 8.0;
    // soft high cirrus, lit warm on the sun side
    if (uCloud > 0.0 && y > 0.0) {
      vec2 uv = d.xz / (y + 0.12) * 1.3 + vec2(uTime * 0.004, 0.0);
      float c = smoothstep(0.52, 0.85, fbm(uv * vec2(1.0, 2.6)));
      c *= smoothstep(0.02, 0.2, y);
      col = mix(col, mix(vec3(1.0, 0.93, 0.85), uSunCol * 0.9, 0.35 + 0.4 * s) * 1.05, c * uCloud);
    }
    gl_FragColor = vec4(col, 1.0);
  }`;

/** opts: { az, el (deg) sun direction; top, mid, haze, ground (hex); sun (hex); sunI; envI; cloud } */
export function makeSky(renderer, opts = {}) {
  const az = (opts.az ?? -60) * Math.PI / 180, el = (opts.el ?? 14) * Math.PI / 180;
  const sunDir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).normalize();
  const lin = (h) => new THREE.Color(h);
  const U = {
    uTop: { value: lin(opts.top ?? 0x4f8fcc) }, uMid: { value: lin(opts.mid ?? 0x8ab9e0) }, uHaze: { value: lin(opts.haze ?? 0xf0d9b8) },
    uGround: { value: lin(opts.ground ?? 0x9a7a58) }, uSun: { value: sunDir }, uSunCol: { value: lin(opts.sunCol ?? 0xffc48a) },
    uSunSize: { value: 0.0012 }, uGlow: { value: opts.glow ?? 1 }, uCloud: { value: opts.cloud ?? 0.6 }, uTime: { value: 0 },
  };
  const domeMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), domeMat); dome.frustumCulled = false; dome.renderOrder = -10;

  // env: same sky + a warm ground disc
  const envScene = new THREE.Scene();
  const d2 = new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), domeMat.clone()); d2.material.uniforms = { ...U, uSunSize: { value: 0.02 }, uGlow: { value: 1.6 } }; envScene.add(d2);
  const gnd = new THREE.Mesh(new THREE.CircleGeometry(48, 32), new THREE.MeshBasicMaterial({ color: lin(opts.ground ?? 0x9a7a58).multiplyScalar(opts.groundBounce ?? 0.5) }));
  gnd.rotation.x = -Math.PI / 2; gnd.position.y = -1; envScene.add(gnd);
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(envScene, 0.02).texture; pm.dispose();

  const sun = new THREE.DirectionalLight(opts.sunCol ?? 0xffc48a, opts.sunI ?? 3.2);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.012; sun.shadow.radius = 2.5;
  const sc = sun.shadow.camera; sc.near = 0.5; sc.far = 80; sc.left = -6; sc.right = 6; sc.top = 6; sc.bottom = -6;
  return {
    dome, env, sun, sunDir, U,
    /** aim the sun's shadow frustum at a point with a given half-size (metres) */
    frame(center, half = 3, dist = 30) {
      sun.position.copy(center).addScaledVector(sunDir, dist); sun.target.position.copy(center);
      sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.near = 0.5; sc.far = dist + half * 3; sc.updateProjectionMatrix();
      sun.target.updateMatrixWorld(); sun.updateMatrixWorld();
    },
  };
}
