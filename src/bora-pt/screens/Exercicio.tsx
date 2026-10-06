import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { useEffect, useState } from "react";
import { useStore } from "../store";
import { Button, CountUp, EASE, Icon, TopBar } from "../components/ui";
import { SPLIT } from "./Artigo";
import css from "./Exercicio.module.css";

type Cat = (typeof SPLIT)[number]["key"];

const INCOME = 3000;

const ITEMS: { label: string; value: number; cat: Cat; icon: string }[] = [
  { label: "Aluguel", value: 900, cat: "need", icon: "home" },
  { label: "Show no fim de semana", value: 150, cat: "want", icon: "music" },
  { label: "Reserva de emergência", value: 300, cat: "save", icon: "shield-check" },
  { label: "Mercado do mês", value: 450, cat: "need", icon: "shopping-cart" },
  { label: "Streaming", value: 40, cat: "want", icon: "tv-retro" },
  { label: "Tesouro Selic", value: 300, cat: "save", icon: "chart-growth" },
];

/** Where each bucket sits relative to the card, so a sorted card flies into its bucket. */
const FLY: Record<Cat, number> = { need: -112, want: 0, save: 112 };

const money = (v: number) => `R$ ${Math.round(v).toLocaleString("pt-BR")}`;

export function Exercicio() {
  const { back, complete, done, toast } = useStore();
  const [index, setIndex] = useState(0);
  const [sums, setSums] = useState<Record<Cat, number>>({ need: 0, want: 0, save: 0 });
  const [lastCat, setLastCat] = useState<Cat>("need");
  const [wrong, setWrong] = useState<Cat | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const cardShake = useAnimationControls();

  const item = ITEMS[index];
  const finished = index >= ITEMS.length;

  const pick = (cat: Cat) => {
    if (finished) return;
    if (cat !== item.cat) {
      setWrong(cat);
      setMistakes((m) => m + 1);
      cardShake.start({ x: [0, -10, 9, -6, 3, 0], rotate: [0, -2, 2, -1, 0], transition: { duration: 0.45 } });
      return;
    }
    setWrong(null);
    setLastCat(cat);
    setSums((s) => ({ ...s, [cat]: s[cat] + item.value }));
    setIndex((i) => i + 1);
  };

  const finish = () => {
    if (!done.exercicio) {
      complete("exercicio");
      toast("Exercício concluído. Falta só o quiz!");
    }
    back();
  };

  const hint = wrong && !finished ? `Quase! ${item.label} entra em ${SPLIT.find((s) => s.key === item.cat)!.label.toLowerCase()}.` : null;

  return (
    <div className={css.screen}>
      <div style={{ height: "var(--status-h)" }} />
      <TopBar title="Exercício prático" onBack={() => back()}>
        <div className={css.progressRow}>
          {ITEMS.map((_, i) => (
            <motion.span key={i} className={css.tick} animate={{ backgroundColor: i < index ? "#039855" : "#EAECF0" }} />
          ))}
        </div>
      </TopBar>

      <div className={css.body}>
        <div className={css.head}>
          <h1 className="t-title">{finished ? "Mandou bem!" : "Onde entra cada gasto?"}</h1>
          <p className="t-desc">
            {finished
              ? mistakes === 0
                ? "Você acertou todos de primeira. Veja como ficou a divisão:"
                : `Você separou todos os gastos, com ${mistakes} ${mistakes === 1 ? "tentativa extra" : "tentativas extras"}. Veja como ficou:`
              : `Renda de ${money(INCOME)}. Toque na categoria certa para cada gasto.`}
          </p>
        </div>

        <div className={css.deck}>
          <AnimatePresence custom={lastCat} initial={false}>
            {!finished &&
              ITEMS.slice(index, index + 3)
                .reverse()
                .map((it, ri, arr) => {
                  const depth = arr.length - 1 - ri;
                  const isTop = depth === 0;
                  const i = index + depth;
                  return (
                    <motion.div
                      key={i}
                      className={css.cardPos}
                      custom={lastCat}
                      initial={{ scale: 0.86, y: 30, opacity: 0 }}
                      animate={{ scale: 1 - depth * 0.06, y: depth * 14, opacity: depth > 1 ? 0.6 : 1 }}
                      exit="fly"
                      variants={{
                        fly: (cat: Cat) => ({
                          x: FLY[cat],
                          y: 250,
                          scale: 0.2,
                          opacity: 0,
                          rotate: FLY[cat] / 8,
                          transition: { duration: 0.55, ease: [0.5, 0, 0.75, 0] },
                        }),
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 26 }}
                      style={{ zIndex: 10 - depth }}
                    >
                      <motion.div className={css.card} animate={isTop ? cardShake : undefined}>
                        <span className={css.cardIcon}>
                          <Icon name={it.icon} size={28} />
                        </span>
                        <span className={css.cardLabel}>{it.label}</span>
                        <span className={css.cardValue}>{money(it.value)}</span>
                      </motion.div>
                    </motion.div>
                  );
                })}
          </AnimatePresence>

          <AnimatePresence>
            {finished && (
              <motion.div
                className={css.summary}
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.4 }}
              >
                <motion.span
                  className={css.trophy}
                  initial={{ rotate: -30, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.6 }}
                >
                  <Icon name="trophy" size={34} />
                </motion.span>
                <span className={css.summaryText}>
                  Você reservou <strong>{money(sums.save)}</strong> para o seu futuro, os 20% do método. Ainda sobram{" "}
                  <strong>{money(INCOME - sums.need - sums.want - sums.save)}</strong> para distribuir.
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={css.hintArea} aria-live="polite">
          <AnimatePresence mode="wait">
            {hint && (
              <motion.span key={hint} className={css.hint} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Icon name="info-circle" size={18} />
                {hint}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className={css.buckets}>
          {SPLIT.map((s) => {
            const target = (INCOME * s.share) / 100;
            const fill = Math.min(1, sums[s.key] / target);
            return (
              <Bucket
                key={s.key}
                label={s.label}
                share={s.share}
                color={s.color}
                fill={fill}
                sum={sums[s.key]}
                wrong={wrong === s.key}
                pulse={sums[s.key]}
                disabled={finished}
                onPick={() => pick(s.key)}
              />
            );
          })}
        </div>
      </div>

      <div className={css.footer}>
        <Button onClick={finish} disabled={!finished}>
          {finished ? (
            <>
              <Icon name="check" size={22} />
              Concluir exercício
            </>
          ) : (
            `${index} de ${ITEMS.length} gastos separados`
          )}
        </Button>
      </div>
    </div>
  );
}

function Bucket({
  label,
  share,
  color,
  fill,
  sum,
  wrong,
  pulse,
  disabled,
  onPick,
}: {
  label: string;
  share: number;
  color: string;
  fill: number;
  sum: number;
  wrong: boolean;
  pulse: number;
  disabled: boolean;
  onPick: () => void;
}) {
  // Bounce when a card lands, timed to the end of its flight.
  const bounce = useAnimationControls();
  useEffect(() => {
    if (pulse) bounce.start({ scale: [1, 1.07, 1], transition: { duration: 0.35, delay: 0.4 } });
  }, [pulse, bounce]);

  return (
    <motion.button
      type="button"
      className={`${css.bucket} ${wrong ? css.bucketWrong : ""}`}
      onClick={onPick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      animate={bounce}
    >
      <span className={css.bucketShare} style={{ color }}>
        {share}%
      </span>
      <span className={css.bucketLabel}>{label}</span>
      <span className={css.meter}>
        <motion.span
          className={css.meterFill}
          style={{ background: color }}
          initial={false}
          animate={{ height: `${fill * 100}%` }}
          transition={{ duration: 0.6, delay: 0.4, ease: EASE }}
        />
      </span>
      <span className={css.bucketSum}>
        <CountUp to={sum} format={money} duration={0.6} delay={0.4} />
      </span>
    </motion.button>
  );
}
