import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useDetectGPU } from '@react-three/drei';

// Ship the already-installed detector database as local, lazy chunks. No CDN at runtime,
// and reuse the Stage context rather than allocating a third WebGL context for probing.
const benchmarks = import.meta.glob('../../node_modules/detect-gpu/dist/benchmarks/*.json', {
  import: 'default',
});
const loadBenchmarks = async (name) => {
  const load = benchmarks[`../../node_modules/detect-gpu/dist/benchmarks/${name}`];
  if (!load) return [];
  const data = await load();
  return data.slice(1);
};
export default function GpuProbe({ onDetect }) {
  const gl = useThree((state) => state.gl);
  const gpu = useDetectGPU({ glContext: gl.getContext(), override: { loadBenchmarks } });
  useEffect(() => onDetect(gpu), [gpu, onDetect]);
  return null;
}
