import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { useStore } from "../store";
import { AULAS, QUIZ } from "../content";
import { useLightIndicator } from "../BoraApp";
import { Button, EASE, Icon, Ring } from "../components/ui";
import css from "./Quiz.module.css";

export function Quiz() {
  const { back, backTo, reset, setQuiz, complete, done } = useStore();
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = QUIZ[qi];
  const answered = picked !== null;
  const right = picked === q.answer;
  const last = qi === QUIZ.length - 1;

  useLightIndicator(!finished && !answered);

  const pick = (i: number) => {
    if (answered) return;
    setPicked(i);
    if (i === q.answer) setScore((s) => s + 1);
  };

  const next = () => {
    if (last) {
      setQuiz({ correct: score, total: QUIZ.length });
      if (!done.quiz) complete("quiz");
      setFinished(true);
      return;
    }
    setPicked(null);
    setQi(qi + 1);
  };

  if (finished) {
    return <Result score={score} total={QUIZ.length} onHome={() => reset("tabs", "fade", "home")} onTrilha={() => backTo("trilha", "drop")} />;
  }

  return (
    <div className={css.screen}>
      <div className={css.top}>
        <div style={{ height: "var(--status-h)" }} />
        <div className={css.bar}>
          <motion.button type="button" className={css.close} onClick={() => back("drop")} aria-label="Fechar quiz" whileTap={{ scale: 0.88 }}>
            <Icon name="times" size={28} />
          </motion.button>
          <span className={css.barTitle}>Quiz</span>
          <span />
        </div>
        <div className={css.head}>
          <div className={css.count}>
            <span className={css.countText}>
              <strong>{String(qi + 1).padStart(2, "0")}</strong>/{String(QUIZ.length).padStart(2, "0")}
            </span>
            <div className={css.track}>
              <motion.div
                className={css.trackFill}
                initial={false}
                animate={{ width: `${((qi + 1) / QUIZ.length) * 100}%`, backgroundColor: q.color }}
                transition={{ duration: 0.6, ease: EASE }}
              />
            </div>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.h2
              key={qi}
              className={css.question}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              {q.question}
            </motion.h2>
          </AnimatePresence>
        </div>
      </div>

      <motion.div className={css.panel} initial={false} animate={{ backgroundColor: q.color }} transition={{ duration: 0.5 }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={qi}
            className={css.options}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } }}
            role="radiogroup"
            aria-label={q.question}
          >
            {q.options.map((opt, i) => {
              const isPicked = picked === i;
              const isAnswer = i === q.answer;
              const state = !answered ? "idle" : isAnswer ? "right" : isPicked ? "wrong" : "dim";
              return (
                <motion.button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={isPicked}
                  className={`${css.option} ${css[state] ?? ""}`}
                  onClick={() => pick(i)}
                  disabled={answered}
                  variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}
                  whileTap={!answered ? { scale: 0.97 } : undefined}
                  animate={state === "wrong" ? { x: [0, -8, 7, -4, 0], transition: { duration: 0.4 } } : undefined}
                >
                  <span>{opt}</span>
                  <AnimatePresence>
                    {(state === "right" || state === "wrong") && (
                      <motion.span initial={{ scale: 0, rotate: -60 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 500, damping: 18 }} className={css.mark}>
                        <Icon name={state === "right" ? "check-circle" : "times-circle"} size={24} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {answered && (
          <motion.div
            className={css.feedback}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 34 }}
            role="status"
          >
            <div className={css.feedbackText}>
              <Icon name={right ? "check-circle" : "info-circle"} size={24} style={{ color: right ? "var(--g700)" : "var(--r700)" }} />
              <div>
                <span className={css.feedbackTitle} style={{ color: right ? "var(--g800)" : "var(--r700)" }}>
                  {right ? "Isso mesmo!" : "Não foi dessa vez"}
                </span>
                <span className={css.feedbackBody}>{q.explain}</span>
              </div>
            </div>
            <Button onClick={next}>
              {last ? "Ver resultado" : "Próxima"}
              <Icon name="arrow-right" size={22} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const BURST_COLORS = ["#32D583", "#039855", "#FDB022", "#7F56D9", "#F97066", "#A6F4C5"];

function Result({ score, total, onHome, onTrilha }: { score: number; total: number; onHome: () => void; onTrilha: () => void }) {
  // Confetti made of logo bars, thrown out from behind the score ring.
  const pieces = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => {
        const a = (i / 26) * Math.PI * 2 + Math.random() * 0.3;
        const d = 110 + Math.random() * 90;
        return {
          x: Math.cos(a) * d,
          y: Math.sin(a) * d * 0.8 - 50,
          r: Math.random() * 300 - 150,
          h: 10 + Math.random() * 14,
          c: BURST_COLORS[i % BURST_COLORS.length],
          delay: Math.random() * 0.15,
        };
      }),
    [],
  );
  const perfect = score === total;

  return (
    <div className={css.result}>
      <div style={{ height: "var(--status-h)" }} />
      <div className={css.resultBody}>
        <div className={css.burst}>
          {pieces.map((p, i) => (
            <motion.span
              key={i}
              className={css.piece}
              style={{ background: p.c, height: p.h }}
              initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 0.4 }}
              animate={{ x: p.x, y: [0, p.y, p.y + 140], opacity: [0, 1, 1, 0], rotate: p.r, scale: 1 }}
              transition={{
                duration: 2.4,
                delay: 0.35 + p.delay,
                ease: [0.16, 1, 0.3, 1],
                y: { duration: 2.4, delay: 0.35 + p.delay, times: [0, 0.35, 1], ease: ["easeOut", "easeIn"] },
                opacity: { duration: 2.4, delay: 0.35 + p.delay, times: [0, 0.08, 0.75, 1] },
              }}
            />
          ))}
          <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}>
            <Ring value={score / total} size={132} thickness={12} track="#D1FADF" fill="#039855" hole="#FFFFFF" delay={0.4}>
              <span className={css.score}>
                {score}/{total}
              </span>
            </Ring>
          </motion.div>
        </div>
        <motion.div
          className={css.resultText}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5, ease: EASE }}
        >
          <span className={css.resultKicker}>{perfect ? "Gabaritou!" : `${score} de ${total} acertos`}</span>
          <h1 className="t-display">Aula 1 concluída!</h1>
          <p className="t-body">
            Você terminou todas as etapas de Bem-Estar Financeiro. A próxima aula, <strong>{AULAS[1].name}</strong>, já está liberada.
          </p>
        </motion.div>
      </div>
      <motion.div className={css.resultActions} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.5, ease: EASE }}>
        <Button onClick={onHome}>Voltar para a Home</Button>
        <Button variant="ghost" onClick={onTrilha}>
          Ver Trilha 1
        </Button>
      </motion.div>
    </div>
  );
}
