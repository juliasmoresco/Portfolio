import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

export type ScreenName =
  | "splash"
  | "onboarding"
  | "login"
  | "signup"
  | "tabs"
  | "trilha"
  | "aula"
  | "artigo"
  | "exercicio"
  | "quiz"
  | "noticia"
  | "simResultado";

export type Tab = "home" | "news" | "sim" | "profile";

/** How the incoming screen enters. "rise" is a modal from the bottom; "drop" closes it. */
export type Transition = "push" | "pop" | "fade" | "rise" | "drop" | "none";

/** `via` is how the route entered, which decides how the screen under it moves aside. */
export type Route = { id: number; name: ScreenName; params?: Record<string, string>; via: Transition };

/** The four steps of a lesson, in order. */
export const STEPS = ["video", "artigo", "exercicio", "quiz"] as const;
export type Step = (typeof STEPS)[number];

export type QuizStats = { correct: number; total: number };

type User = { name: string; email: string };

type State = {
  stack: Route[];
  transition: Transition;
  tab: Tab;
  user: User;
  started: boolean;
  done: Record<Step, boolean>;
  quiz: QuizStats | null;
  sim: { buy: number; sell: number };
  toast: { id: number; msg: string } | null;
};

const NO_STEPS: Record<Step, boolean> = { video: false, artigo: false, exercicio: false, quiz: false };

let nextId = 1;
const route = (name: ScreenName, params?: Record<string, string>, via: Transition = "fade"): Route => ({
  id: nextId++,
  name,
  params,
  via,
});

const initial = (): State => ({
  stack: [route("splash")],
  transition: "none",
  tab: "home",
  user: { name: "Clara Souza", email: "clara@email.com" },
  started: false,
  done: { ...NO_STEPS },
  quiz: null,
  sim: { buy: 22, sell: 20 },
  toast: null,
});

/** Prototype chapters the side panel can jump to; each sets the progress that screen assumes. */
export type Chapter =
  | "splash"
  | "onboarding"
  | "login"
  | "signup"
  | "home"
  | "trilha"
  | "aula"
  | "artigo"
  | "exercicio"
  | "quiz"
  | "news"
  | "sim"
  | "profile";

type Store = Omit<State, "toast"> & {
  top: Route;
  push: (name: ScreenName, params?: Record<string, string>, transition?: Transition) => void;
  back: (transition?: Transition) => void;
  backTo: (name: ScreenName, transition?: Transition) => void;
  reset: (name: ScreenName, transition?: Transition, tab?: Tab) => void;
  setTab: (tab: Tab) => void;
  setUser: (user: User) => void;
  start: () => void;
  complete: (step: Step) => void;
  setQuiz: (quiz: QuizStats) => void;
  setSim: (buy: number, sell: number) => void;
  toast: (msg: string) => void;
  restart: () => void;
  jump: (chapter: Chapter) => void;
  toastState: State["toast"];
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, set] = useState(initial);
  const toastTimer = useRef<number | undefined>(undefined);

  const push = useCallback((name: ScreenName, params?: Record<string, string>, transition: Transition = "push") => {
    set((p) => ({ ...p, stack: [...p.stack, route(name, params, transition)], transition }));
  }, []);

  const back = useCallback((transition: Transition = "pop") => {
    set((p) => (p.stack.length > 1 ? { ...p, stack: p.stack.slice(0, -1), transition } : p));
  }, []);

  const backTo = useCallback((name: ScreenName, transition: Transition = "pop") => {
    set((p) => {
      const i = p.stack.map((r) => r.name).lastIndexOf(name);
      return i >= 0 && i < p.stack.length - 1 ? { ...p, stack: p.stack.slice(0, i + 1), transition } : p;
    });
  }, []);

  const reset = useCallback((name: ScreenName, transition: Transition = "fade", tab?: Tab) => {
    set((p) => ({ ...p, stack: [route(name, undefined, transition)], transition, tab: tab ?? p.tab }));
  }, []);

  const setTab = useCallback((tab: Tab) => set((p) => ({ ...p, tab })), []);
  const setUser = useCallback((user: User) => set((p) => ({ ...p, user })), []);
  const start = useCallback(() => set((p) => ({ ...p, started: true })), []);
  const complete = useCallback(
    (step: Step) => set((p) => ({ ...p, started: true, done: { ...p.done, [step]: true } })),
    [],
  );
  const setQuiz = useCallback((quiz: QuizStats) => set((p) => ({ ...p, quiz })), []);
  const setSim = useCallback((buy: number, sell: number) => set((p) => ({ ...p, sim: { buy, sell } })), []);

  const toast = useCallback((msg: string) => {
    window.clearTimeout(toastTimer.current);
    set((p) => ({ ...p, toast: { id: nextId++, msg } }));
    toastTimer.current = window.setTimeout(() => set((p) => ({ ...p, toast: null })), 2400);
  }, []);

  const restart = useCallback(() => {
    window.clearTimeout(toastTimer.current);
    set({ ...initial(), transition: "fade" });
  }, []);

  const jump = useCallback((chapter: Chapter) => {
    set((p) => {
      const base = { ...p, toast: null, transition: "fade" as Transition };
      const upTo = (n: number): Record<Step, boolean> => ({
        video: n > 0,
        artigo: n > 1,
        exercicio: n > 2,
        quiz: n > 3,
      });
      // Lesson chapters need the earlier steps done, but never undo progress already made.
      const atLeast = (n: number) => {
        const need = upTo(n);
        return { ...base, started: true, done: { ...need, ...pickTrue(p.done) } };
      };
      const tabs = (tab: Tab, extra: Partial<State> = {}) => ({ ...base, ...extra, tab, stack: [route("tabs")] });
      switch (chapter) {
        case "splash":
          return { ...initial(), transition: "fade" };
        case "onboarding":
        case "login":
        case "signup":
          return { ...initial(), transition: "fade", stack: [route(chapter)] };
        case "home":
        case "news":
        case "sim":
        case "profile":
          return tabs(chapter);
        case "trilha":
          return { ...base, tab: "home", stack: [route("tabs"), route("trilha", undefined, "push")] };
        case "aula":
          return { ...base, tab: "home", stack: [route("tabs"), route("trilha", undefined, "push"), route("aula", undefined, "push")] };
        case "artigo":
        case "exercicio":
        case "quiz": {
          const n = chapter === "artigo" ? 1 : chapter === "exercicio" ? 2 : 3;
          const next = atLeast(n);
          return {
            ...next,
            tab: "home",
            stack: [
              route("tabs"),
              route("trilha", undefined, "push"),
              route("aula", undefined, "push"),
              route(chapter, undefined, chapter === "quiz" ? "rise" : "push"),
            ],
          };
        }
      }
    });
  }, []);

  const value = useMemo<Store>(
    () => ({
      ...s,
      top: s.stack[s.stack.length - 1],
      push,
      back,
      backTo,
      reset,
      setTab,
      setUser,
      start,
      complete,
      setQuiz,
      setSim,
      toast,
      restart,
      jump,
      toastState: s.toast,
    }),
    [s, push, back, backTo, reset, setTab, setUser, start, complete, setQuiz, setSim, toast, restart, jump],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function pickTrue(done: Record<Step, boolean>) {
  return Object.fromEntries(Object.entries(done).filter(([, v]) => v)) as Partial<Record<Step, boolean>>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}

/** Everything the Home, Trilha and Aula screens derive from lesson progress. */
export function useLesson() {
  const { done, started, quiz } = useStore();
  const count = STEPS.filter((k) => done[k]).length;
  const current: Step | null = STEPS.find((k) => !done[k]) ?? null;
  const lessonDone = current === null;
  return { done, started, quiz, count, current, lessonDone, lessonsDone: lessonDone ? 1 : 0 };
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || "Clara";
export const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "CS";
  const a = parts[0][0];
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
};
