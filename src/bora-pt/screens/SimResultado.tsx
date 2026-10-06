import { motion } from "motion/react";
import { useStore } from "../store";
import { Button, CountUp, EASE, Icon, Item, Stagger, TopBar, brl } from "../components/ui";
import css from "./SimResultado.module.css";

/** Height of the tallest bar in the chart, in px. The axis starts at zero so drops look real-sized. */
const MAX_H = 108;

export function SimResultado() {
  const { sim, back } = useStore();
  const { buy, sell } = sim;
  const diff = Math.abs(buy - sell);
  const loss = sell < buy;
  const changePct = (diff / buy) * 100;
  const recoverPct = loss ? (diff / sell) * 100 : 0;
  const top = Math.max(buy, sell);
  const hBuy = (buy / top) * MAX_H;
  const hSell = (sell / top) * MAX_H;
  const gap = hBuy - hSell;

  const fmtPct = (v: number) => `${brl(v)}%`;

  return (
    <div className={css.screen}>
      <div style={{ height: "var(--status-h)" }} />
      <TopBar title="Resultado" onBack={() => back()} />
      <div className={`scroll ${css.body}`}>
        <Stagger className={css.page} step={0.08}>
          <Item className={css.head}>
            <h1 className={css.h1}>
              {diff === 0
                ? "Você vendeu pelo mesmo preço que pagou."
                : `Você vendeu por R$ ${brl(diff)} ${loss ? "a menos" : "a mais"} do que pagou.`}
            </h1>
            {diff > 0 && (
              <span className={`${css.delta} ${loss ? "down" : "up"}`}>
                <Icon name={loss ? "arrow-down" : "arrow-up"} size={18} />
                {loss ? "Prejuízo" : "Lucro"} de <CountUp to={changePct} format={fmtPct} delay={0.3} />
              </span>
            )}
          </Item>

          <Item className={`card ${css.chartCard}`}>
            <span className={css.chartTitle}>Gráfico de simulação</span>
            <div className={css.chart}>
              <Col label={`R$ ${brl(buy)}`} h={hBuy} color="#344054" delay={0.35} />
              <Col label={`R$ ${brl(sell)}`} h={hSell} color={loss ? "#F97066" : "#32D583"} delay={0.5} labelClass={loss ? "down" : "up"} />
              {loss && (
                <div className={css.col}>
                  <motion.span className={`${css.colLabel} up`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3 }}>
                    R$ {brl(buy)}
                  </motion.span>
                  <div className={css.stack} style={{ height: hBuy }}>
                    <motion.div
                      className={css.recover}
                      style={{ height: gap }}
                      initial={{ scaleY: 0, opacity: 0 }}
                      animate={{ scaleY: 1, opacity: 1 }}
                      transition={{ delay: 1.15, duration: 0.6, ease: EASE }}
                    />
                    <motion.div
                      className={css.bar}
                      style={{ height: hSell, background: "#F97066" }}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: 0.65, duration: 0.7, ease: EASE }}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className={css.axis} style={{ gridTemplateColumns: loss ? "1fr 1fr 1fr" : "1fr 1fr" }}>
              <span>Compra</span>
              <span>Venda</span>
              {loss && <span>Para recuperar</span>}
            </div>
          </Item>

          {loss ? (
            <Item className={css.big}>
              <span>Você precisa lucrar</span>
              <strong>
                <CountUp to={recoverPct} format={fmtPct} duration={1.4} delay={0.9} />
              </strong>
              <span>para recuperar R$ {brl(diff)}</span>
            </Item>
          ) : null}

          <Item className={css.tip}>
            <Icon name="lightbulb-alt" size={22} style={{ color: "var(--y700)" }} />
            {loss ? (
              <span>
                <strong>
                  Por que {brl(recoverPct)}% e não {brl(changePct)}%?
                </strong>{" "}
                A alta é calculada sobre um valor menor (R$ {brl(sell)}). Por isso, recuperar uma perda sempre pede um ganho percentual um pouco
                maior.
              </span>
            ) : (
              <span>
                <strong>Boa!</strong> Experimente um preço de venda menor que o de compra para ver quanto custa recuperar uma perda.
              </span>
            )}
          </Item>
        </Stagger>
      </div>
      <div className={css.footer}>
        <Button onClick={() => back()}>
          <Icon name="redo" size={20} />
          Iniciar outra simulação
        </Button>
      </div>
    </div>
  );
}

function Col({ label, h, color, delay, labelClass }: { label: string; h: number; color: string; delay: number; labelClass?: string }) {
  return (
    <div className={css.col}>
      <motion.span
        className={`${css.colLabel} ${labelClass ?? ""}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay + 0.4 }}
      >
        {label}
      </motion.span>
      <motion.div
        className={css.bar}
        style={{ height: h, background: color }}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay, duration: 0.7, ease: EASE }}
      />
    </div>
  );
}
