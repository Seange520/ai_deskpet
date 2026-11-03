import { create } from 'zustand';
import { executeProgram } from '../../lib/codeRunner';

const blankRuntime = () => ({ action: 'stop', led: false, runId: 0, status: 'idle', logs: [] });

// Demo-only transient state: never import the learning store or persistence helpers.
export const useDemoRuntime = create((set, get) => ({
  runtime: blankRuntime(),
  runProgram: (source) => {
    const previous = get().runtime;
    try {
      const next = { ...previous };
      const instructions = executeProgram(source, {
        move: (value) => {
          next.action = value;
        },
        light: (value) => {
          next.led = value === 'on';
        },
        play: () => {}, // Visual demo only; no audio or business action.
      });
      set({
        runtime: {
          ...next,
          runId: previous.runId + 1,
          status: 'success',
          instructions,
          logs: instructions.map(
            ({ command, value }) =>
              `${command}("${value}") → ${command === 'play' ? '仅预览指令，不播放音效' : '3D 预览已更新'}`,
          ),
        },
      });
      return true;
    } catch (error) {
      set({
        runtime: {
          ...previous,
          status: 'error',
          logs: [error.message || '运行失败，请检查代码。'],
        },
      });
      return false;
    }
  },
  resetRuntime: () => set({ runtime: blankRuntime() }),
}));
