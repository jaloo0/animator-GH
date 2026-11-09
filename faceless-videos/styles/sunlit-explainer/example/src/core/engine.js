// Renderer + post: linear HDR scene (MSAA, depth) → depth-of-field gather → bloom → AgX + warm grade, vignette, grain.
// Optional motion blur: N sub-frames averaged (render(..., {sub}) is called per sub-frame by main.js).
import * as THREE from 'three';
import { UnrealBloomPass } from '../../vendor/addons/postprocessing/UnrealBloomPass.js';
import { FullScreenQuad } from '../../vendor/addons/postprocessing/Pass.js';

const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
export const PORT = q.has('port'); // 9:16 cut
export const W = PORT ? 1080 : 1920, H = PORT ? 1920 : 1080, FPS = 30;

const VS = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const DOF = new THREE.ShaderMaterial({
  uniforms: { tColor: { value: null }, tDepth: { value: null }, uNear: { value: 0.05 }, uFar: { value: 400 }, uFocus: { value: 2 }, uAper: { value: 0 }, uMax: { value: 26 }, uRes: { value: new THREE.Vector2(W, H) } },
  vertexShader: VS,
  fragmentShader: /* glsl */`
    uniform sampler2D tColor, tDepth; uniform float uNear, uFar, uFocus, uAper, uMax; uniform vec2 uRes; varying vec2 vUv;
    float lin(float d){ float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
    float coc(float z){ return clamp(uAper * (1.0 / uFocus - 1.0 / z) * uRes.y, -uMax, uMax); } // signed px, near < 0
    void main(){
      vec3 c0 = texture2D(tColor, vUv).rgb; float z0 = lin(texture2D(tDepth, vUv).r); float k0 = abs(coc(z0));
      if (uAper <= 0.0) { gl_FragColor = vec4(c0, 1.0); return; }
      vec3 acc = vec3(0.0); float wsum = 0.0;
      const int N = 72; const float GA = 2.39996323;
      for (int i = 0; i < N; i++){
        float fi = float(i) + 0.5; float r = sqrt(fi / float(N)) * uMax; float a = fi * GA;
        vec2 o = vec2(cos(a), sin(a)) * r;
        vec2 uv = vUv + o / uRes;
        vec3 cs = texture2D(tColor, uv).rgb; float zs = lin(texture2D(tDepth, uv).r); float ks = abs(coc(zs));
        // background samples may not blur over a sharper foreground pixel
        float ke = zs > z0 ? min(ks, k0) : ks;
        float w = smoothstep(r - 1.2, r + 0.8, ke) / max(ke * ke, 1.0);
        acc += cs * w; wsum += w;
      }
      float wc = 1.0 / max(k0 * k0, 1.0);
      acc += c0 * wc; wsum += wc;
      gl_FragColor = vec4(acc / wsum, 1.0);
    }`,
  depthTest: false, depthWrite: false,
});

const GRADE = new THREE.ShaderMaterial({
  uniforms: { tColor: { value: null }, uTime: { value: 0 }, uVig: { value: 0.32 }, uGrain: { value: 0.018 }, uRes: { value: new THREE.Vector2(W, H) }, uFade: { value: 1 }, uExp: { value: 1 }, uWarm: { value: 0.0 }, uSat: { value: 1.0 }, uLift: { value: 0.0 } },
  vertexShader: VS,
  fragmentShader: /* glsl */`
    uniform sampler2D tColor; uniform float uTime, uVig, uGrain, uFade, uExp, uWarm, uSat, uLift; uniform vec2 uRes; varying vec2 vUv;
    // AgX (Troy Sobotka / three.js port, punchy look)
    vec3 agxContrast(vec3 x){ vec3 x2 = x * x; vec3 x4 = x2 * x2;
      return + 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232; }
    vec3 agx(vec3 color){
      const mat3 inM = mat3(0.856627153315983, 0.137318972929847, 0.11189821299995, 0.0951212405381588, 0.761241990602591, 0.0767994186031903, 0.0482516061458583, 0.101439036467562, 0.811302368396859);
      const mat3 outM = mat3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826, -0.11060664309660323, 1.157823702216272, -0.11060664309660294, -0.016493938717834573, -0.016493938717834257, 1.2519364065950405);
      const float mn = -12.47393, mx = 4.026069;
      color = inM * color; color = max(color, 1e-10); color = log2(color); color = (color - mn) / (mx - mn); color = clamp(color, 0.0, 1.0);
      color = agxContrast(color);
      color = outM * color; color = pow(max(vec3(0.0), color), vec3(2.2));
      return color;
    }
    float hash(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
    vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
    void main(){
      vec2 c = vUv - 0.5;
      float ca = 0.0012 * dot(c, c) * 4.0;
      vec3 col = vec3(texture2D(tColor, vUv + c * ca).r, texture2D(tColor, vUv).g, texture2D(tColor, vUv - c * ca).b);
      col *= uExp;
      col = agx(col);
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSat);
      col *= vec3(1.0 + 0.06 * uWarm, 1.0 + 0.015 * uWarm, 1.0 - 0.07 * uWarm);
      col = uLift + col * (1.0 - uLift);
      col = clamp(col, 0.0, 1.0);
      vec3 s = toSRGB(col);
      // warm, never-black shadows (palette: no pure black)
      s = vec3(0.05, 0.044, 0.04) + s * (1.0 - vec3(0.05, 0.044, 0.04));
      float v = smoothstep(0.95, 0.2, length(c * vec2(1.0, ${(H / W).toFixed(3)})));
      s *= mix(1.0 - uVig, 1.0, v);
      float g = hash(floor(vUv * uRes) + fract(uTime * 7.13) * 137.0) - 0.5;
      s += g * uGrain;
      gl_FragColor = vec4(s * uFade, 1.0);
    }`,
  depthTest: false, depthWrite: false,
});

const ACC = new THREE.ShaderMaterial({
  uniforms: { tColor: { value: null }, uW: { value: 1 } }, vertexShader: VS,
  fragmentShader: /* glsl */`uniform sampler2D tColor; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tColor, vUv).rgb * uW, 1.0); }`,
  depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, transparent: true,
});
const COPY = new THREE.ShaderMaterial({
  uniforms: { tColor: { value: null } }, vertexShader: VS,
  fragmentShader: /* glsl */`uniform sampler2D tColor; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tColor, vUv).rgb, 1.0); }`,
  depthTest: false, depthWrite: false,
});

export function makeEngine(glCanvas) {
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NoToneMapping; renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

  const depthTex = new THREE.DepthTexture(W, H); depthTex.type = THREE.FloatType;
  const sceneRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4, depthTexture: depthTex });
  const dofRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
  const ldrRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
  const accRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType });
  const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.25, 0.5, 0.85);
  const quad = new FullScreenQuad(null);
  const blit = (mat, target) => { quad.material = mat; renderer.setRenderTarget(target); quad.render(renderer); };

  return {
    renderer, sceneRT,
    /** look: { focus, aper (lens strength), bloom, exposure, vignette, grain, warm, sat, lift, fade }; sub: { i, n } */
    render(scene, camera, t, look = {}, sub = null) {
      renderer.setRenderTarget(sceneRT); renderer.clear(); renderer.render(scene, camera);
      DOF.uniforms.tColor.value = sceneRT.texture; DOF.uniforms.tDepth.value = depthTex;
      DOF.uniforms.uNear.value = camera.near; DOF.uniforms.uFar.value = camera.far;
      DOF.uniforms.uFocus.value = look.focus ?? 3; DOF.uniforms.uAper.value = look.aper ?? 0.0;
      DOF.uniforms.uMax.value = look.maxBlur ?? 26;
      blit(DOF, dofRT);
      bloom.strength = look.bloom ?? 0.22; bloom.radius = look.bloomRadius ?? 0.55; bloom.threshold = look.bloomThreshold ?? 0.9;
      bloom.render(renderer, null, dofRT, 0, false);
      const G = GRADE.uniforms;
      G.tColor.value = dofRT.texture; G.uTime.value = t; G.uVig.value = look.vignette ?? 0.3; G.uGrain.value = look.grain ?? 0.016;
      G.uFade.value = look.fade ?? 1; G.uExp.value = look.exposure ?? 1.25; G.uWarm.value = look.warm ?? 0.7; G.uSat.value = look.sat ?? 1.14; G.uLift.value = look.lift ?? 0.0;
      if (!sub || sub.n <= 1) { blit(GRADE, null); return; }
      blit(GRADE, ldrRT);
      if (sub.i === 0) { renderer.setRenderTarget(accRT); renderer.setClearColor(0x000000, 1); renderer.clear(); }
      ACC.uniforms.tColor.value = ldrRT.texture; ACC.uniforms.uW.value = 1 / sub.n;
      renderer.autoClear = false; blit(ACC, accRT); renderer.autoClear = true;
      if (sub.i === sub.n - 1) { COPY.uniforms.tColor.value = accRT.texture; blit(COPY, null); }
    },
  };
}
