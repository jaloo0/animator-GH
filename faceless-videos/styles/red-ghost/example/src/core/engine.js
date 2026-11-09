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
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVig: { value: 0.55 }, uGrain: { value: 0.022 }, uRes: { value: new THREE.Vector2(W, H) }, uFade: { value: 1 } },
  vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime, uVig, uGrain, uFade; uniform vec2 uRes; varying vec2 vUv;
    float hash(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
    void main(){
      vec2 c = vUv - 0.5;
      float ca = 0.0016 * dot(c, c) * 4.0;
      vec3 col = vec3(texture2D(tDiffuse, vUv + c * ca).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - c * ca).b);
      float v = smoothstep(0.98, 0.18, length(c * vec2(1.0, 0.62)));
      col *= mix(1.0 - uVig, 1.0, v);
      // lift the deepest blacks a hair toward oxblood so shadows read as a room, not a void
      col = col + vec3(0.010, 0.004, 0.003) * (1.0 - smoothstep(0.0, 0.08, dot(col, vec3(0.33))));
      float g = hash(floor(vUv * uRes) + fract(uTime * 7.13) * 137.0) - 0.5;
      col += g * uGrain * (0.6 + 0.4 * (1.0 - dot(col, vec3(0.33))));
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
      composer.render();
    },
  };
}
