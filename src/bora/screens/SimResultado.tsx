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
      <TopBar title="Result" onBack={() => back()} />
      <div className={`scroll ${css.body}`}>
        <Stagger className={css.page} step={0.08}>
          <Item className={css.head}>
            <h1 className={css.h1}>
              {diff === 0
                ? "You sold for the same price you paid."
                : `You sold for R$ ${brl(diff)} ${loss ? "less" : "more"} than you paid.`}
            </h1>
            {diff > 0 && (
              <span className={`${css.delta} ${loss ? "down" : "up"}`}>
                <Icon name={loss ? "arrow-down" : "arrow-up"} size={18} />
                {loss ? "Loss" : "Gain"} of <CountUp to={changePct} format={fmtPct} delay={0.3} />
              </span>
            )}
          </Item>

          <Item className={`card ${css.chartCard}`}>
            <span className={css.chartTitle}>Simulation chart</span>
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
              <span>Buy</span>
              <span>Sell</span>
              {loss && <span>To recover</span>}
            </div>
          </Item>

          {loss ? (
            <Item className={css.big}>
              <span>You need to gain</span>
              <strong>
                <CountUp to={recoverPct} format={fmtPct} duration={1.4} delay={0.9} />
              </strong>
              <span>to recover R$ {brl(diff)}</span>
            </Item>
          ) : null}

          <Item className={css.tip}>
            <Icon name="lightbulb-alt" size={22} style={{ color: "var(--y700)" }} />
            {loss ? (
              <span>
                <strong>
                  Why {brl(recoverPct)}% and not {brl(changePct)}%?
                </strong>{" "}
                The gain is calculated on a smaller amount (R$ {brl(sell)}). That's why recovering a loss always takes a slightly bigger
                percentage gain.
              </span>
            ) : (
              <span>
                <strong>Nice!</strong> Try a sell price lower than the buy price to see what it takes to recover a loss.
              </span>
            )}
          </Item>
        </Stagger>
      </div>
      <div className={css.footer}>
        <Button onClick={() => back()}>
          <Icon name="redo" size={20} />
          Start another simulation
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
