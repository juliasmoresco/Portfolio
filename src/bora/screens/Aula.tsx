import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { STEPS, useLesson, useStore, type Step } from "../store";
import { AULA1_DESCRIPTION, AULAS, CAPTIONS, STEP_INFO, TEACHER, TRILHA, VIDEO_COVER } from "../content";
import { Button, EASE, Icon, Item, Stagger, TopBar } from "../components/ui";
import css from "./Aula.module.css";

/** The prototype plays the "video" in this long, shown as a 4-minute lesson. */
const VIDEO_MS = 7000;
const VIDEO_LABEL_S = 4 * 60;

type Phase = "idle" | "playing" | "paused" | "done";

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function Aula() {
  const { back, push, complete, start } = useStore();
  const { done, current, lessonDone } = useLesson();
  const [phase, setPhase] = useState<Phase>(done.video ? "done" : "idle");
  const [t, setT] = useState(done.video ? 1 : 0);
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== "playing") return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setT((v) => Math.min(1, v + dt / VIDEO_MS));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  useEffect(() => {
    if (t >= 1 && phase === "playing") {
      setPhase("done");
      complete("video");
    }
  }, [t, phase, complete]);

  const play = () => {
    if (phase === "done") setT(0);
    start();
    setPhase("playing");
    playerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const onPlayer = () => {
    if (phase === "playing") setPhase("paused");
    else play();
  };

  const openStep = (step: Step) => {
    if (step === "video") play();
    if (step === "artigo") push("artigo");
    if (step === "exercicio") push("exercicio");
    if (step === "quiz") push("quiz", undefined, "rise");
  };

  const caption = [...CAPTIONS].reverse().find(([at]) => t >= at)?.[1] ?? "";
  const live = phase === "playing" || phase === "paused";

  return (
    <div className={css.screen}>
      <div style={{ height: "var(--status-h)" }} />
      <TopBar title="Lesson 1" onBack={() => back()} />
      <div className={`scroll ${css.body}`}>
        <Stagger className={css.page} step={0.07}>
          <Item>
            <div ref={playerRef} className={css.player} onClick={onPlayer} role="button" tabIndex={0} aria-label={phase === "playing" ? "Pause video" : "Play video"} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onPlayer())}>
              <img src={VIDEO_COVER} alt="Tainá Soares presenting the lesson" className={css.poster} style={{ transform: `scale(${1 + 0.12 * t})` }} draggable={false} />
              <motion.div className={css.shade} animate={{ opacity: phase === "idle" ? 0.15 : phase === "done" ? 0.55 : 0.3 }} />

              <AnimatePresence>
                {(phase === "idle" || phase === "paused") && (
                  <motion.span
                    key="play"
                    className={css.play}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.3, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 24 }}
                  >
                    {phase === "idle" && <motion.span className={css.halo} animate={{ scale: [1, 1.5], opacity: [0.5, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }} />}
                    <Icon name="play" size={36} style={{ marginLeft: 4 }} />
                  </motion.span>
                )}
                {phase === "done" && (
                  <motion.span
                    key="done"
                    className={css.doneBadge}
                    initial={{ scale: 0.7, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 380, damping: 20 }}
                  >
                    <CheckDraw />
                    <strong>Lesson watched</strong>
                    <span className={css.replay}>
                      <Icon name="redo" size={14} /> Watch again
                    </span>
                  </motion.span>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {live && (
                  <motion.div key="hud" className={css.hud} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <span className={css.livePill}>
                      <Equalizer on={phase === "playing"} />
                      {phase === "playing" ? "Playing" : "Paused"}
                    </span>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={caption}
                        className={css.caption}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.25 }}
                      >
                        {caption}
                      </motion.span>
                    </AnimatePresence>
                    <span className={css.time}>
                      {clock(t * VIDEO_LABEL_S)} / {clock(VIDEO_LABEL_S)}
                    </span>
                    <span className={css.track}>
                      <span className={css.fill} style={{ width: `${t * 100}%` }} />
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Item>

          <Item className={css.info}>
            <span className={css.kicker}>{TRILHA.name}</span>
            <h1 className="t-title">{AULAS[0].name}</h1>
            <div className={css.teacher}>
              <img src={TEACHER.avatar} alt="" />
              <span>
                with <strong>{TEACHER.name}</strong> · {TEACHER.role}
              </span>
            </div>
            <p className="t-desc">{AULA1_DESCRIPTION}</p>
          </Item>

          <Item className={`card ${css.timeline}`}>
            {STEPS.map((step, i) => {
              const isDone = done[step];
              const isCurrent = step === current;
              const reachable = isDone || isCurrent;
              const info = STEP_INFO[step];
              const sub = step === "video" && live ? "In progress" : isDone ? "Completed" : info.sub;
              return (
                <button
                  key={step}
                  type="button"
                  className={css.stepRow}
                  disabled={!reachable}
                  onClick={() => openStep(step)}
                  aria-label={`${info.title}: ${isDone ? "completed" : isCurrent ? "current step" : "locked"}`}
                >
                  <span className={css.rail}>
                    <StepDot state={isDone ? "done" : isCurrent ? "current" : "future"} />
                    {i < STEPS.length - 1 && (
                      <span className={css.connector}>
                        <motion.span className={css.connectorFill} initial={false} animate={{ scaleY: isDone ? 1 : 0 }} transition={{ duration: 0.6, ease: EASE, delay: 0.2 }} />
                      </span>
                    )}
                  </span>
                  <span className={css.stepText}>
                    <span className={`${css.stepTitle} ${isCurrent ? css.stepTitleCurrent : ""} ${!reachable ? css.stepTitleFuture : ""}`}>{info.title}</span>
                    <span className={`${css.stepSub} ${isDone ? css.stepSubDone : ""}`}>{sub}</span>
                  </span>
                  {reachable && !(step === "video" && live) && <Icon name="angle-right" size={22} className={css.stepChev} />}
                </button>
              );
            })}
          </Item>
        </Stagger>
      </div>

      <div className={css.footer}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={live ? "live" : (current ?? "end")}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            {live && phase === "playing" ? (
              <Button disabled>Watching…</Button>
            ) : live ? (
              <Button onClick={play}>
                <Icon name="play" size={20} />
                Resume video
              </Button>
            ) : lessonDone ? (
              <Button onClick={() => back()}>
                Back to the track
                <Icon name="arrow-right" size={22} />
              </Button>
            ) : (
              <Button onClick={() => openStep(current!)}>
                <Icon name={current === "video" ? "play" : STEP_INFO[current!].icon} size={20} />
                {STEP_INFO[current!].cta}
              </Button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function StepDot({ state }: { state: "done" | "current" | "future" }) {
  return (
    <span className={css.dot}>
      <AnimatePresence mode="popLayout" initial={false}>
        {state === "done" ? (
          <motion.span key="d" className={css.dotDone} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 420, damping: 18 }}>
            <Icon name="check-circle" size={24} />
          </motion.span>
        ) : state === "current" ? (
          <motion.span key="c" className={css.dotCurrent} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
            <motion.span className={css.dotPulse} animate={{ scale: [1, 1.9], opacity: [0.35, 0] }} transition={{ duration: 1.8, repeat: Infinity }} />
            <span className={css.dotCore} />
          </motion.span>
        ) : (
          <motion.span key="f" className={css.dotFuture} exit={{ scale: 0 }} />
        )}
      </AnimatePresence>
    </span>
  );
}

function Equalizer({ on }: { on: boolean }) {
  return (
    <span className={css.eq} aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={on ? { height: ["30%", "100%", "50%", "80%", "30%"] } : { height: "40%" }}
          transition={on ? { duration: 0.9 + i * 0.15, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 } : { duration: 0.2 }}
        />
      ))}
    </span>
  );
}

function CheckDraw() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden>
      <motion.circle cx="16" cy="16" r="14" fill="none" stroke="#027A48" strokeWidth="2.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, ease: EASE }} />
      <motion.path
        d="M10 16.5 L14.2 20.5 L22 12"
        fill="none"
        stroke="#027A48"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35, delay: 0.4, ease: EASE }}
      />
    </svg>
  );
}
