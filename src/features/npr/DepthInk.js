import { Effect, EffectAttribute, BlendFunction } from 'postprocessing';
// Depth silhouettes supplement the selection outline, using the composer's existing depth.
// No normal pass, extra scene render or render target is allocated.
export default class DepthInk extends Effect {
  constructor() {
    super(
      'NprDepthOutline',
      `
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        float center = -getViewZ(readDepth(uv));
        // Near silhouettes retain weight; distant terrain gets a fine, softer line.
        float lineWidth = mix(0.48, 1.85, exp(-center / 18.0));
        vec2 pixel = texelSize * lineWidth;
        float left = -getViewZ(readDepth(uv - vec2(pixel.x, 0.0)));
        float right = -getViewZ(readDepth(uv + vec2(pixel.x, 0.0)));
        float down = -getViewZ(readDepth(uv - vec2(0.0, pixel.y)));
        float up = -getViewZ(readDepth(uv + vec2(0.0, pixel.y)));
        float jump = max(max(abs(left-center),abs(right-center)),max(abs(up-center),abs(down-center))) / max(center,1.0);
        float edge = smoothstep(0.012, 0.045, jump);
        outputColor = vec4(mix(inputColor.rgb, vec3(0.009,0.014,0.034), edge * mix(0.40, 0.88, exp(-center / 45.0))), inputColor.a);
      }
    `,
      {
        attributes: EffectAttribute.DEPTH | EffectAttribute.CONVOLUTION,
        blendFunction: BlendFunction.NORMAL,
      },
    );
  }
}
