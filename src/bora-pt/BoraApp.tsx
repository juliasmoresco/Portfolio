import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { createContext, useContext, useEffect, useState, type CSSProperties } from "react";
import { Navigator } from "./Navigator";
import { StoreProvider, useStore, type Chapter } from "./store";
import { Icon, Logo, OVERLAY_ROOT } from "./components/ui";
import css from "./BoraApp.module.css";

const FRAME_W = 390;
const FRAME_H = 844;
/** The 10px bezel ring around the screen. */
const BEZEL = 10;
/** Narrower than this, the prototype fills the viewport like a real app. */
const FULL_BLEED_MAX = 520;

const params = new URLSearchParams(window.location.search);
/** `?embed` drops the side panel so the case study can iframe just the phone. */
const EMBED = params.has("embed");
/** `?shot&screen=<chapter>`: just the screen, 390×844, no bezel or rounding, opened at that chapter (for exporting images). */
const SHOT = params.has("shot");
/** `?frame` keeps the phone bezel even in a narrow window (the case study's book page). */
const FRAME = params.has("frame");
// Embedded in the case study, the page behind the phone is the book's paper: let it show through.
if (EMBED) document.documentElement.style.background = document.body.style.background = "transparent";
const SCREEN = params.get("screen") as Chapter | null;

type Chrome = { setIndicator: (light: boolean) => void };
const ChromeCtx = createContext<Chrome>({ setIndicator: () => {} });

/** Lets a screen with a dark bottom edge (the quiz panel) switch the home indicator to white. */
export function useLightIndicator(light: boolean) {
  const { setIndicator } = useContext(ChromeCtx);
  useEffect(() => {
    setIndicator(light);
    return () => setIndicator(false);
  }, [light, setIndicator]);
}

export function BoraApp() {
  return (
    <MotionConfig reducedMotion="user">
      <StoreProvider>
        <Stage />
      </StoreProvider>
    </MotionConfig>
  );
}

function useViewport() {
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return vp;
}

function Stage() {
  const { w, h } = useViewport();
  const { jump } = useStore();
  useEffect(() => {
    if (!SCREEN) return;
    jump(SCREEN);
    // The splash that was showing for a moment may still hand over to the onboarding as it leaves; land again after it.
    const t = window.setTimeout(() => jump(SCREEN), 2400);
    return () => window.clearTimeout(t);
  }, [jump]);

  // The case study embeds the prototype and lists its screens beside it: a click there jumps here.
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data as { type?: string; chapter?: Chapter; restart?: boolean } | null;
      if (d?.type === "bora:jump" && d.chapter) jump(d.chapter);
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [jump]);

  if (SHOT) {
    return (
      <div className={css.shot}>
        <Phone framed />
      </div>
    );
  }

  const fullBleed = !FRAME && w <= FULL_BLEED_MAX;
  const panel = !EMBED && !fullBleed && w >= 900;

  if (fullBleed) {
    return (
      <div className={css.bleed}>
        <Phone framed={false} />
      </div>
    );
  }

  const pad = EMBED ? 24 : 48;
  const availW = panel ? w - 360 - pad * 2 : w - pad * 2;
  const scale = Math.min(1, (h - pad * 2) / (FRAME_H + BEZEL * 2), availW / (FRAME_W + BEZEL * 2));

  return (
    <div className={`${css.stage}${EMBED ? ` ${css.embed}` : ""}`}>
      {panel && <SidePanel />}
      <div className={css.frameBox} style={{ width: (FRAME_W + BEZEL * 2) * scale, height: (FRAME_H + BEZEL * 2) * scale }}>
        <div className={css.frameScale} style={{ transform: `scale(${scale})` }}>
          <Phone framed />
        </div>
      </div>
    </div>
  );
}

function Phone({ framed }: { framed: boolean }) {
  const [lightIndicator, setIndicator] = useState(false);
  const { toastState } = useStore();
  return (
    <ChromeCtx.Provider value={{ setIndicator }}>
      <div className={framed ? css.phone : css.phoneBleed} style={framed ? ({ "--status-h": "50px", "--home-h": "34px" } as CSSProperties) : undefined}>
        <Navigator />
        <div id={OVERLAY_ROOT} className={css.overlays} />
        {framed && <StatusBar />}
        <AnimatePresence>
          {toastState && (
            <motion.div
              key={toastState.id}
              className={css.toast}
              role="status"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
            >
              <Icon name="info-circle" size={20} />
              {toastState.msg}
            </motion.div>
          )}
        </AnimatePresence>
        {framed && <div className={css.homeIndicator} style={{ background: lightIndicator ? "#FFFFFF" : "#101828" }} />}
      </div>
    </ChromeCtx.Provider>
  );
}

function StatusBar() {
  return (
    <div className={css.status} aria-hidden>
      <span>9:41</span>
      <span className={css.statusIcons}>
        <Icon name="signal-alt-3" />
        <Icon name="wifi" />
        <Icon name="battery-empty" />
      </span>
    </div>
  );
}

const CHAPTERS: { id: Chapter; label: string; group: string }[] = [
  { id: "splash", label: "Splash", group: "Primeiro acesso" },
  { id: "onboarding", label: "Onboarding", group: "Primeiro acesso" },
  { id: "login", label: "Entrar", group: "Primeiro acesso" },
  { id: "signup", label: "Cadastro", group: "Primeiro acesso" },
  { id: "home", label: "Home", group: "Primeira aula" },
  { id: "trilha", label: "Trilha 1", group: "Primeira aula" },
  { id: "aula", label: "Aula 1 · vídeo", group: "Primeira aula" },
  { id: "artigo", label: "Artigo", group: "Primeira aula" },
  { id: "exercicio", label: "Exercício", group: "Primeira aula" },
  { id: "quiz", label: "Quiz", group: "Primeira aula" },
  { id: "news", label: "Notícias", group: "Abas" },
  { id: "sim", label: "Simulador", group: "Abas" },
  { id: "profile", label: "Perfil", group: "Abas" },
];

function useActiveChapter(): Chapter {
  const { top, tab } = useStore();
  switch (top.name) {
    case "tabs":
      return tab;
    case "noticia":
      return "news";
    case "simResultado":
      return "sim";
    default:
      return top.name;
  }
}

function SidePanel() {
  const { jump, restart } = useStore();
  const active = useActiveChapter();
  let lastGroup = "";
  return (
    <aside className={css.panel}>
      <Logo height={26} />
      <div className={css.panelIntro}>
        <h1>Do onboarding à primeira aula</h1>
        <p>
          Um protótipo navegável do BoraInvest. Navegue como num celular ou pule para uma tela.
        </p>
      </div>
      <nav className={css.chapters} aria-label="Telas do protótipo">
        {CHAPTERS.map((c, i) => {
          const header = c.group !== lastGroup ? c.group : null;
          lastGroup = c.group;
          const on = c.id === active;
          return (
            <div key={c.id} className={css.chapterWrap}>
              {header && <span className={css.group}>{header}</span>}
              <button type="button" className={css.chapter} aria-current={on || undefined} onClick={() => jump(c.id)}>
                {on && <motion.span layoutId="chapter-bg" className={css.chapterBg} transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                <span className={css.chapterNum}>{String(i + 1).padStart(2, "0")}</span>
                <span className={css.chapterLabel}>{c.label}</span>
              </button>
            </div>
          );
        })}
      </nav>
      <button type="button" className={css.restart} onClick={restart}>
        <Icon name="redo" size={18} />
        Restart
      </button>
    </aside>
  );
}
