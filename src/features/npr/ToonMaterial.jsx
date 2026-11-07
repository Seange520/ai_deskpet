import { createContext, forwardRef, useCallback, useContext, useEffect, useMemo } from 'react';
import { CanvasTexture, NearestFilter, NoColorSpace, ShaderChunk } from 'three';
const RampContext = createContext(null);
export function ToonPalette({ children, tier = 2 }) {
  const low = tier === 1;
  const ramp = useMemo(() => {
    // Linear irradiance: indigo shadow, cool midtone, warm ivory highlight.
    const steps = low
      ? ['#4d6391', '#a4bbd2', '#fff1d7']
      : ['#3e527d', '#809ab5', '#c8d5df', '#fff1d7'];
    const canvas = document.createElement('canvas');
    canvas.width = steps.length;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    steps.forEach((color, x) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, 0, 1, 1);
    });
    const texture = new CanvasTexture(canvas);
    texture.name = 'npr-stepped-ramp';
    texture.colorSpace = NoColorSpace;
    texture.minFilter = texture.magFilter = NearestFilter;
    texture.generateMipmaps = false;
    return texture;
  }, [low]);
  useEffect(() => () => ramp.dispose(), [ramp]);
  return <RampContext.Provider value={ramp}>{children}</RampContext.Provider>;
}
function shapeLight(shader, finish) {
  // r170 samples only .r; use RGB irradiance without replacing the Toon lighting model.
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <gradientmap_pars_fragment>',
    ShaderChunk.gradientmap_pars_fragment.replace(
      'vec3( texture2D( gradientMap, coord ).r )',
      'texture2D( gradientMap, coord ).rgb',
    ),
  );
  const ceramic = finish === 'ceramic',
    deck = finish === 'deck';
  const spec = ceramic ? 0.3 : deck ? 0.1 : 0.0;
  const rim = ceramic ? 0.18 : 0.055;
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <lights_toon_pars_fragment>',
    ShaderChunk.lights_toon_pars_fragment.replace(
      'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );',
      `
      reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
      float faceLight = max(dot(geometryNormal, directLight.direction), 0.0);
      vec3 halfVector = normalize(directLight.direction + geometryViewDir);
      float glint = pow(max(dot(geometryNormal, halfVector),0.0), ${ceramic ? '52.0' : '38.0'});
      glint = smoothstep(0.08, 0.65, glint) * faceLight;
      float rim = pow(1.0 - max(dot(geometryNormal, geometryViewDir),0.0), 3.0);
      reflectedLight.directDiffuse += directLight.color * (glint * ${spec.toFixed(3)} + rim * ${rim.toFixed(3)} * smoothstep(0.05,0.7,faceLight));
    `,
    ),
  );
  if (finish === 'deck' || finish === 'cliff') {
    shader.vertexShader =
      'varying vec3 nprLocal;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nnprLocal=position;',
      );
    shader.fragmentShader = 'varying vec3 nprLocal;\n' + shader.fragmentShader;
    const pattern =
      finish === 'deck'
        ? `
      float radius=length(nprLocal.xy)/3.19;
      float radialShade=1.0-smoothstep(0.25,1.0,radius)*0.36;
      float sweep=0.5+0.5*sin(nprLocal.x*0.62+nprLocal.y*0.37);
      diffuseColor.rgb*=mix(vec3(0.72,0.88,1.0),vec3(1.0,1.03,0.97),sweep)*radialShade;
      float circle=abs(length(nprLocal.xy)-2.25);
      float trace=1.0-smoothstep(0.014,0.014+fwidth(circle)*1.4,circle);
      float axes=min(abs(nprLocal.x),abs(nprLocal.y));
      float axisLine=(1.0-smoothstep(0.008,0.008+fwidth(axes),axes))*0.28;
      diffuseColor.rgb+=vec3(0.14,0.32,0.30)*(trace+axisLine);
    `
        : `
      float rise=smoothstep(-1.1,0.0,nprLocal.y);
      diffuseColor.rgb*=mix(vec3(0.36,0.43,0.77),vec3(0.95,1.05,1.15),rise);
      float band=1.0-smoothstep(0.012,0.022,abs(nprLocal.y+0.23));
      diffuseColor.rgb+=vec3(0.08,0.28,0.32)*band;
    `;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      '#include <color_fragment>\n' + pattern,
    );
  }
}
const ToonMaterial = forwardRef(function ToonMaterial(
  { finish = 'matte', onBeforeCompile, ...props },
  ref,
) {
  const gradientMap = useContext(RampContext);
  const compile = useCallback(
    (shader, renderer) => {
      shapeLight(shader, finish);
      onBeforeCompile?.(shader, renderer);
    },
    [finish, onBeforeCompile],
  );
  const cacheKey = useCallback(
    () => 'sparkmate-m1-' + finish + '-' + (onBeforeCompile?.toString() || ''),
    [finish, onBeforeCompile],
  );
  return (
    <meshToonMaterial
      ref={ref}
      gradientMap={gradientMap}
      onBeforeCompile={compile}
      customProgramCacheKey={cacheKey}
      {...props}
    />
  );
});
export default ToonMaterial;
