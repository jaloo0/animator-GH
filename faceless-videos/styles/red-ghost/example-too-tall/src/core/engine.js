// Renderer + post: HDR scene → bloom → Neutral tone map/sRGB (ACES turns the ember salmon) → grade (vignette, soft grain, tiny chroma), then a 2D overlay canvas.
import * as THREE from 'three';
import { EffectComposer } from '../../vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../../vendor/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../../vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../../vendor/addons/postprocessing/OutputPass.js';
import { ShaderPass } from '../../vendor/addons/postprocessing/ShaderPass.js';

export const LAND = typeof location !== 'undefined' && location.search.includes('land'); // 16:9 YouTube cut
export const W = LAND ? 1920 : 1080, H = LAND ? 1080 : 1920, FPS = 30;
export const UI = LAND ? 0.72 : 1; // overlay scale

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVig: { value: 0.55 }, uGrain: { value: 0.022 }, uRes: { value: new THREE.Vector2(W, H) }, uFade: { value: 1 },
    uMono: { value: 0 }, uScan: { value: 0 }, uTear: { value: 0 }, uFlash: { value: 0 } },
  vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime, uVig, uGrain, uFade, uMono, uScan, uTear, uFlash; uniform vec2 uRes; varying vec2 vUv;
    float hash(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
    void main(){
      vec2 uv = vUv;
      // tape roll / tracking tear (CCTV playback): the picture slips vertically and the bottom band wobbles
      if (uTear > 0.0) { uv.y = fract(uv.y + uTear * 0.35); float band = smoothstep(0.12, 0.0, abs(uv.y - fract(0.08 + uTear * 2.0))); uv.x += band * 0.03 * sin(uv.y * 90.0 + uTime * 40.0); }
      vec2 c = uv - 0.5;
      float ca = 0.0016 * dot(c, c) * 4.0 + uMono * 0.002;
      vec3 col = vec3(texture2D(tDiffuse, uv + c * ca).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - c * ca).b);
      if (uMono > 0.0) {
        // 1994 store camera: soft, grey, a touch green — but the ember figure keeps its red
        vec2 px = 1.6 / uRes;
        vec3 soft = (col + texture2D(tDiffuse, uv + vec2(px.x, 0.0)).rgb + texture2D(tDiffuse, uv - vec2(px.x, 0.0)).rgb + texture2D(tDiffuse, uv + vec2(0.0, px.y)).rgb) * 0.25;
        float l = dot(soft, vec3(0.3, 0.59, 0.11));
        float red = smoothstep(0.05, 0.3, soft.r - max(soft.g, soft.b));
        vec3 m = vec3(pow(l, 0.85) * 1.12) * vec3(0.93, 1.0, 0.95) + 0.018;
        col = mix(col, mix(m, soft, red), uMono);
        col *= 1.0 - uScan * 0.2 * (0.5 + 0.5 * sin(vUv.y * uRes.y * 1.5708));
      }
      float v = smoothstep(0.98, 0.18, length(c * vec2(1.0, 0.62)));
      col *= mix(1.0 - uVig, 1.0, v);
      // lift the deepest blacks a hair toward oxblood so shadows read as a room, not a void
      col = col + vec3(0.010, 0.004, 0.003) * (1.0 - smoothstep(0.0, 0.08, dot(col, vec3(0.33))));
      float g = hash(floor(vUv * uRes) + fract(uTime * 7.13) * 137.0) - 0.5;
      col += g * uGrain * (0.6 + 0.4 * (1.0 - dot(col, vec3(0.33))));
      col += uFlash * vec3(1.0, 0.93, 0.82);
      gl_FragColor = vec4(col * uFade, 1.0);
    }`,
};

export function makeEngine(glCanvas) {
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1);
  composer.setSize(W, H);
  const renderPass = new RenderPass(null, null);
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.6, 0.4, 0.3);
  const output = new OutputPass();
  const grade = new ShaderPass(GradeShader);
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(output);
  composer.addPass(grade);

  return {
    renderer, composer, bloom, grade,
    render(scene, camera, t, look = {}) {
      renderPass.scene = scene; renderPass.camera = camera;
      renderer.toneMappingExposure = look.exposure ?? 1.0;
      bloom.strength = look.bloom ?? 0.6; bloom.radius = look.bloomRadius ?? 0.4; bloom.threshold = look.bloomThreshold ?? 0.36;
      grade.uniforms.uTime.value = t; grade.uniforms.uVig.value = look.vignette ?? 0.55;
      grade.uniforms.uGrain.value = look.grain ?? 0.022; grade.uniforms.uFade.value = look.fade ?? 1;
      grade.uniforms.uMono.value = look.mono ?? 0; grade.uniforms.uScan.value = look.scan ?? 0; grade.uniforms.uTear.value = look.tear ?? 0; grade.uniforms.uFlash.value = look.flash ?? 0;
      composer.render();
    },
  };
}
