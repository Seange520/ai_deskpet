import { create } from 'zustand';
import graph from './data/knowledge-graph.v1.json';
import diagnostic from './data/diagnostic.v1.json';
import {
  PROFILE_KEY,
  freshProfile,
  restoreProfile,
  beginLesson,
  completeLesson,
  applyDiagnostic,
} from './learning.mjs';
let initial;
try {
  initial = restoreProfile(graph, localStorage.getItem(PROFILE_KEY));
} catch {
  initial = freshProfile(graph);
}
export const useLearningProfile = create((set, get) => ({
  profile: initial,
  storageError: false,
  save(profile) {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      set({ profile, storageError: false });
    } catch {
      set({ profile, storageError: true });
    }
  },
  begin(id) {
    get().save(beginLesson(graph, get().profile, id));
  },
  finish(id, result) {
    get().save(completeLesson(graph, get().profile, id, result));
  },
  diagnose(answers) {
    get().save(applyDiagnostic(graph, get().profile, diagnostic, answers));
  },
  reset() {
    get().save(freshProfile(graph));
  },
}));
