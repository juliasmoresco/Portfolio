import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useStore } from "../store";
import { Bars, EASE, Icon, Logo, SPRING, type Bar } from "../components/ui";
import css from "./Onboarding.module.css";

/** Each slide runs for this long before advancing, like Stories. */
const SLIDE_MS = 6000;
/** A press held longer than this pauses the timer instead of counting as a tap. */
const HOLD_MS = 220;

type Slide = {
  bg: string;
  track: string;
  fill: string;
  tile: string;
  bars: Bar[];
  title: string;
  body: string;
  chips: ReactNode[];
};

const SLIDES: Slide[] = [
  {
    bg: "#F6FEF9",
    track: "#D1FADF",
    fill: "#027A48",
    tile: "#D1FADF",
    bars: [
      { h: 34, color: "#32D583" },
      { h: 72, color: "#32D583" },
      { h: 54, color: "#039855" },
    ],
    title: "Discover a new way to learn about investing",
    body: "BoraInvest is a free financial education app with quality content, no coaches and no conflicts of interest.",
    chips: [
      <Chip key="a" style={{ left: 28, top: 52 }} className={css.row}>
        <Icon name="check-circle" size={22} style={{ color: "var(--g700)" }} />
        <strong>Lesson 1 complete</strong>
      </Chip>,
      <Chip key="b" style={{ right: 28, bottom: 44 }} className={css.col} delay={0.12}>
        <span className={css.muted}>Track 1</span>
        <span className={css.miniTrack}>
          <motion.span
            className={css.miniFill}
            initial={{ width: 0 }}
            animate={{ width: "25%" }}
            transition={{ delay: 0.6, duration: 0.8, ease: EASE }}
          />
        </span>
      </Chip>,
    ],
  },
  {
    bg: "#F9F5FF",
    track: "#E9D7FE",
    fill: "#6941C6",
    tile: "#E9D7FE",
    bars: [
      { h: 66, color: "#344054" },
      { h: 60, color: "#F97066" },
      { h: 66, color: "#F97066", cap: "#32D583" },
    ],
    title: "Practice stock investing without fear",
    body: "See how much you need to gain to recover a loss on a stock, without risking your real money.",
    chips: [
      <Chip key="a" style={{ left: 24, bottom: 64 }} className={`${css.row} ${css.big} down`}>
        <Icon name="arrow-down" />
        −9.09%
      </Chip>,
      <Chip key="b" style={{ right: 24, top: 48 }} className={css.col} delay={0.12}>
        <span className={css.muted}>To recover</span>
        <span className={`${css.row} ${css.big} up`}>
          <Icon name="arrow-up" />
          +10.00%
        </span>
      </Chip>,
    ],
  },
  {
    bg: "#FFFCF5",
    track: "#FEF0C7",
    fill: "#B54708",
    tile: "#FEF0C7",
    bars: [
      { h: 44, color: "#FDB022" },
      { h: 58, color: "#FDB022" },
      { h: 80, color: "#DC6803" },
    ],
    title: "Stay up to date on the financial market",
    body: "Read the latest financial news, the main events on the stock exchange and analysis from experts.",
    chips: [
      <Chip key="a" style={{ left: 24, top: 56, width: 220 }} className={css.col}>
        <strong className={css.headline}>Ibovespa closes in the green with its first gain of the month</strong>
        <span className={css.muted}>TradeMap</span>
      </Chip>,
      <Chip key="b" style={{ right: 28, bottom: 52, borderRadius: 999, padding: "10px 16px" }} className={css.row} delay={0.12}>
        <strong>IBOV</strong>
        <strong className={`${css.row} up`} style={{ gap: 0 }}>
          <Icon name="arrow-up" />
          +0.37%
        </strong>
      </Chip>,
    ],
  },
  {
    bg: "#F8F9FC",
    track: "#EAECF0",
    fill: "#344054",
    tile: "#EAECF0",
    bars: [
      { h: 34, color: "#475467" },
      { h: 72, color: "#344054" },
      { h: 54, color: "#32D583" },
    ],
    title: "Real people, real support",
    body: "Talk to a real person about the learning tracks or anything in the app.",
    chips: [
      <Chip key="a" style={{ left: 24, top: 60, borderRadius: "16px 16px 16px 4px" }} className={css.bubble}>
        I have a question about Lesson 1
      </Chip>,
      <Chip
        key="b"
        style={{ right: 24, bottom: 56, borderRadius: "16px 16px 4px 16px", background: "var(--g700)", color: "#fff" }}
        className={css.bubble}
        delay={0.55}
        typing
      >
        Hi, Clara! We're here to help.
      </Chip>,
    ],
  },
];

function Chip({
  children,
  style,
  className,
  delay = 0,
  typing = false,
}: {
  children: ReactNode;
  style: CSSProperties;
  className?: string;
  delay?: number;
  typing?: boolean;
}) {
  const [showText, setShowText] = useState(!typing);
  useEffect(() => {
    if (!typing) return;
    const t = window.setTimeout(() => setShowText(true), (delay + 0.9) * 1000);
    return () => window.clearTimeout(t);
  }, [typing, delay]);

  return (
    <motion.div
      className={css.chipPos}
      style={style.left !== undefined ? { left: style.left, top: style.top, bottom: style.bottom } : { right: style.right, top: style.top, bottom: style.bottom }}
      initial={{ opacity: 0, scale: 0.7, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: -6, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 320, damping: 20, delay: 0.25 + delay }}
    >
      {/* Gentle idle float, offset per chip so the two never move in step. */}
      <motion.div
        className={`${css.chip} ${className ?? ""}`}
        style={{ ...style, left: undefined, right: undefined, top: undefined, bottom: undefined }}
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3.2 + delay * 2, repeat: Infinity, ease: "easeInOut", delay: delay * 3 }}
      >
        {showText ? (
          <motion.span initial={typing ? { opacity: 0 } : false} animate={{ opacity: 1 }} className={css.chipText}>
            {children}
          </motion.span>
        ) : (
          <span className={css.typing} aria-label="typing">
            {[0, 1, 2].map((i) => (
              <motion.i
                key={i}
                animate={{ y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.12 }}
              />
            ))}
          </span>
        )}
      </motion.div>
    </motion.div>
  );
}

export function Onboarding() {
  const { reset } = useStore();
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const slide = SLIDES[index];
  const holdTimer = useRef<number | undefined>(undefined);
  const held = useRef(false);

  const finish = useCallback(() => reset("login", "fade"), [reset]);

  const next = useCallback(() => {
    if (index >= SLIDES.length - 1) {
      setPaused(true);
      finish();
      return;
    }
    setProgress(0);
    setIndex(index + 1);
  }, [index, finish]);

  const prev = useCallback(() => {
    setProgress(0);
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  // Stories timer. Driven by rAF so the bar is smooth and pausing is exact.
  useEffect(() => {
    if (paused) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setProgress((p) => Math.min(1, p + dt / SLIDE_MS));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, index]);

  useEffect(() => {
    if (progress >= 1) next();
  }, [progress, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const onPointerDown = () => {
    held.current = false;
    holdTimer.current = window.setTimeout(() => {
      held.current = true;
      setPaused(true);
    }, HOLD_MS);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    window.clearTimeout(holdTimer.current);
    setPaused(false);
    if (held.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    if ((e.clientX - r.left) / r.width < 0.3) prev();
    else next();
  };

  const onPointerCancel = () => {
    window.clearTimeout(holdTimer.current);
    setPaused(false);
  };

  const stop = (e: React.PointerEvent) => e.stopPropagation();

  return (
    <motion.div
      className={css.screen}
      initial={false}
      animate={{ backgroundColor: slide.bg }}
      transition={{ duration: 0.6, ease: EASE }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerCancel}
    >
      <div className={css.bars} aria-hidden>
        {SLIDES.map((_, i) => (
          <motion.div key={i} className={css.seg} animate={{ backgroundColor: slide.track }} transition={{ duration: 0.6 }}>
            <motion.div
              className={css.segFill}
              style={{ width: `${(i < index ? 1 : i === index ? progress : 0) * 100}%` }}
              animate={{ backgroundColor: slide.fill }}
              transition={{ duration: 0.6 }}
            />
          </motion.div>
        ))}
      </div>

      <div className={css.top}>
        <Logo height={22} layoutId="logo" />
        <button type="button" className={css.skip} onPointerDown={stop} onPointerUp={stop} onClick={finish}>
          Skip
        </button>
      </div>

      <div className={css.stageArea}>
        <motion.div
          className={css.tile}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: paused ? 0.97 : 1, opacity: 1, backgroundColor: slide.tile }}
          transition={{ ...SPRING, backgroundColor: { duration: 0.6 } }}
        >
          <Bars bars={slide.bars} gap={18} style={{ padding: "0 44px" }} grow={index === 0} delay={0.3} />
        </motion.div>
        <AnimatePresence>
          <motion.div key={index} className={css.chips}>
            {slide.chips}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className={css.text} aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={index}
            className={css.textInner}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.32, ease: EASE }}
          >
            <h2 className="t-display">{slide.title}</h2>
            <p className="t-body">{slide.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className={css.footer}>
        <span className={css.hint}>
          <motion.span animate={{ y: [0, -3, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
            <TapIcon />
          </motion.span>
          {paused ? "Paused" : "Tap to continue"}
        </span>
        <motion.button
          type="button"
          className="btn btn--auto"
          onPointerDown={stop}
          onPointerUp={stop}
          onClick={next}
          whileTap={{ scale: 0.96 }}
          layout
          transition={SPRING}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={index === SLIDES.length - 1 ? "start" : "next"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {index === SLIDES.length - 1 ? "Get started" : "Next"}
            </motion.span>
          </AnimatePresence>
          <Icon name="arrow-right" size={22} />
        </motion.button>
      </div>
    </motion.div>
  );
}

/** Unicons has no hand-pointer glyph, so this draws one with the same 1.5px line style. */
function TapIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ display: "block" }}>
      <path d="M22 14a8 8 0 0 1-8 8" />
      <path d="M18 11v-1a2 2 0 0 0-4 0" />
      <path d="M14 10V9a2 2 0 0 0-4 0v1" />
      <path d="M10 9.5V4a2 2 0 0 0-4 0v10" />
      <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-6-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </svg>
  );
}
