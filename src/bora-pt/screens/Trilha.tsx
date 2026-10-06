import { motion } from "motion/react";
import { useLesson, useStore } from "../store";
import { AULAS, TRILHA } from "../content";
import { Bars, Button, Icon, Item, Progress, Stagger, TopBar } from "../components/ui";
import css from "./Trilha.module.css";

export function Trilha() {
  const { back, push, toast } = useStore();
  const { started, count, lessonDone } = useLesson();
  const aulasDone = lessonDone ? 1 : 0;
  // Bar shows partial progress inside the current lesson, so the first video already moves it.
  const trilhaValue = (aulasDone + (lessonDone ? 0 : count / 4)) / AULAS.length;

  return (
    <div className={css.screen}>
      <div style={{ height: "var(--status-h)" }} />
      <TopBar title={`Trilha ${TRILHA.n}`} onBack={() => back()} />
      <div className={`scroll ${css.body}`}>
        <Stagger className={css.page} step={0.07}>
          <Item className={css.banner}>
            <div className={css.bannerText}>
              <span className={css.bannerLabel}>
                {aulasDone} de {AULAS.length} aulas
              </span>
              <Progress value={trilhaValue} height={8} track="#FFFFFF" style={{ width: 150, flex: "none" }} delay={0.4} />
            </div>
            <div className={css.bannerBars}>
              <Bars
                bars={[
                  { h: 47.5, color: "#039855" },
                  { h: 100, color: "#039855" },
                  { h: 72.5, color: "#039855" },
                ]}
                gap={10}
                barWidth={20}
                grow
                delay={0.2}
              />
            </div>
          </Item>
          <Item className={css.intro}>
            <h1 className="t-title">{TRILHA.name}</h1>
            <p className="t-desc">{TRILHA.description}</p>
          </Item>
          {AULAS.map((a, i) => {
            const isFirst = i === 0;
            const current = isFirst ? !lessonDone : i === 1 && lessonDone;
            const done = isFirst && lessonDone;
            const status = done
              ? "Concluída"
              : current && isFirst && started
                ? `Em andamento · ${count} de 4 etapas`
                : "Não iniciada";
            const open = () => (isFirst ? push("aula") : toast(`A Aula ${a.n} não faz parte deste protótipo.`));
            return (
              <Item key={a.n}>
                <motion.div
                  className={`${css.lesson} ${current ? css.current : ""}`}
                  layout
                  whileTap={!current ? { scale: 0.98 } : undefined}
                  onClick={!current ? open : undefined}
                  role={!current ? "button" : undefined}
                  tabIndex={!current ? 0 : undefined}
                  onKeyDown={!current ? (e) => e.key === "Enter" && open() : undefined}
                >
                  <div className={css.lessonRow}>
                    <div className={css.thumb}>
                      <img src={a.thumb} alt="" />
                      <span className={css.thumbBadge}>
                        {done ? <Icon name="check" size={15} /> : <Icon name="play" size={13} style={{ marginLeft: 1 }} />}
                      </span>
                      <LessonCounter n={a.n} />
                    </div>
                    <div className={css.lessonText}>
                      <span className="t-meta">Aula {a.n}</span>
                      <span className={css.lessonName}>{a.name}</span>
                      <span className={`${css.status} ${current && started ? css.statusLive : ""} ${done ? css.statusDone : ""}`}>
                        {done && <Icon name="check-circle" size={16} />}
                        {status}
                      </span>
                    </div>
                  </div>
                  {current && (
                    <Button size="sm" onClick={open}>
                      {isFirst && started ? "Continuar aula" : "Começar aula"}
                      <Icon name="arrow-right" size={20} />
                    </Button>
                  )}
                </motion.div>
              </Item>
            );
          })}
        </Stagger>
      </div>
    </div>
  );
}

/** The cover's four bars double as a counter: lesson N lights N bars. */
function LessonCounter({ n }: { n: number }) {
  const hs = [6, 11, 8, 14];
  return (
    <span className={css.counter} aria-hidden>
      {hs.map((h, i) => (
        <span key={i} style={{ height: h, background: i < n ? "#32D583" : "rgba(255,255,255,.55)" }} />
      ))}
    </span>
  );
}
