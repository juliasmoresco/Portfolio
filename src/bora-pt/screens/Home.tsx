import { AnimatePresence, motion } from "motion/react";
import { firstName, initials, useLesson, useStore } from "../store";
import { AULAS, INDICES, LOCKED_TRILHAS, STEP_INFO, STEP_NEXT_NAME, TRILHA, pct } from "../content";
import { Button, CountUp, EASE, Icon, Item, Progress, Ring, Stagger, TrilhaCover } from "../components/ui";
import css from "./Home.module.css";

export function Home() {
  const { user, push, setTab } = useStore();
  const lesson = useLesson();
  const { started, current, count, lessonDone, quiz, lessonsDone } = lesson;

  const next = lessonDone
    ? { verb: "assistir à aula", name: AULAS[1].name, icon: "play-circle" }
    : { verb: STEP_INFO[current!].verb, name: STEP_NEXT_NAME[current!], icon: STEP_INFO[current!].icon };

  const barValue = lessonDone ? 1 / 4 : count / 4;
  const barLabel = lessonDone ? "1 de 4 aulas" : started ? `Aula 1 · ${count} de 4 etapas` : "4 aulas";
  const toTrilha = () => push("trilha");

  return (
    <div className={`scroll ${css.scroll}`}>
      <Stagger className={css.page} step={0.07}>
        <Item className={css.greeting}>
          <h1 className="t-display">
            Olá, {firstName(user.name)}
          </h1>
          <motion.button type="button" className={css.avatar} onClick={() => setTab("profile")} aria-label="Abrir perfil" whileTap={{ scale: 0.92 }}>
            {initials(user.name)}
          </motion.button>
        </Item>

        <Item>
          <div className={css.carousel} role="list" aria-label="Índices do mercado">
            {INDICES.map((ix, i) => (
              <motion.div
                key={ix.name}
                role="listitem"
                className={`card ${css.index}`}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.06, duration: 0.5, ease: EASE }}
              >
                <span className={css.indexName}>{ix.name}</span>
                <span className={css.indexValue}>
                  <CountUp to={ix.value} from={ix.value * 0.96} format={ix.format} duration={1.2} delay={0.2 + i * 0.06} />
                </span>
                <span className={`${css.change} ${ix.change >= 0 ? "up" : "down"}`}>
                  <Icon name={ix.change >= 0 ? "arrow-up" : "arrow-down"} size={16} />
                  {pct(ix.change)}
                </span>
              </motion.div>
            ))}
          </div>
        </Item>

        <Item className={css.section}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.h2
              key={started ? "c" : "s"}
              className="t-section"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              {started ? "Continue aprendendo" : "Comece por aqui"}
            </motion.h2>
          </AnimatePresence>
          <div className={css.continue}>
            <button type="button" className={css.trilhaRow} onClick={toTrilha}>
              <TrilhaCover grow />
              <span className={css.trilhaText}>
                <span className="t-meta">Trilha {TRILHA.n}</span>
                <span className={css.trilhaName}>{TRILHA.name}</span>
              </span>
              <Icon name="angle-right" size={24} style={{ color: "var(--n500)" }} />
            </button>
            <div className={css.barRow}>
              <Progress value={barValue} delay={0.4} />
              <span className={css.barLabel}>{barLabel}</span>
            </div>
            <div className={css.next}>
              <Icon name={next.icon} size={20} style={{ color: "var(--n600)" }} />
              <span>
                A seguir: {next.verb} <strong>{next.name}</strong>
              </span>
            </div>
            <Button onClick={toTrilha}>
              {started ? "Continuar" : `Começar a Trilha ${TRILHA.n}`}
              <Icon name="arrow-right" size={22} />
            </Button>
          </div>
        </Item>

        <Item className={css.sectionWide}>
          <h2 className="t-section" style={{ padding: "0 24px" }}>
            Seu desempenho
          </h2>
          <div className={css.perfCarousel}>
            <PerfCard
              bg="#054F31"
              track="#2D6A4F"
              fill="#A6F4C5"
              value={0}
              label="0/5"
              title="Iniciante"
              caption="Trilhas concluídas"
              icon="book-open"
              foot={started ? "Você começou a Trilha 1" : "Comece a Trilha 1 para avançar"}
            />
            <PerfCard
              bg="#C4320A"
              track="#E0663A"
              fill="#FEDF89"
              value={quiz ? quiz.correct / quiz.total : 0}
              label={quiz ? `${Math.round((quiz.correct / quiz.total) * 100)}%` : "–"}
              title="Performance"
              caption="Acertos nos quizzes"
              icon="check-circle"
              foot={quiz ? `${quiz.correct} de ${quiz.total} no quiz da Aula 1` : "Aparece após o primeiro quiz"}
            />
            <PerfCard
              bg="#53389E"
              track="#7A5AF8"
              fill="#D6BBFB"
              value={lessonsDone / 4}
              label={`${lessonsDone}/4`}
              title="Aulas"
              caption="Concluídas na Trilha 1"
              icon="play-circle"
              foot={`Próxima: ${AULAS[lessonsDone].name}`}
            />
          </div>
        </Item>

        <Item className={css.section}>
          <h2 className="t-section">Trilhas de Conhecimento</h2>
          <div className={css.locked}>
            {LOCKED_TRILHAS.map((t, i) => (
              <div key={t.n} className={`card ${css.lockedCard}`}>
                <span className={css.lock}>
                  <Icon name="lock-alt" size={18} />
                </span>
                <span className={css.lockedText}>
                  <span className="t-meta">Trilha {t.n}</span>
                  <span className={css.lockedName}>{t.name}</span>
                  {i === 0 && <span className={css.unlock}>Libera ao concluir a Trilha 1</span>}
                </span>
              </div>
            ))}
          </div>
        </Item>
      </Stagger>
    </div>
  );
}

function PerfCard({
  bg,
  track,
  fill,
  value,
  label,
  title,
  caption,
  icon,
  foot,
}: {
  bg: string;
  track: string;
  fill: string;
  value: number;
  label: string;
  title: string;
  caption: string;
  icon: string;
  foot: string;
}) {
  return (
    <motion.div className={css.perf} style={{ background: bg }} whileTap={{ scale: 0.98 }}>
      <div className={css.perfTop}>
        <Ring value={value} track={track} fill={fill} hole={bg}>
          {label}
        </Ring>
        <div className={css.perfText}>
          <span className={css.perfTitle}>{title}</span>
          <span className={css.perfCaption}>{caption}</span>
        </div>
      </div>
      <div className={css.perfFoot}>
        <Icon name={icon} size={18} />
        <span>{foot}</span>
      </div>
    </motion.div>
  );
}
