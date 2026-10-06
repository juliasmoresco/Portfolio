import { motion, useAnimationControls } from "motion/react";
import { useState } from "react";
import { useStore } from "../store";
import { Button, Icon, Item, Stagger, brl } from "../components/ui";
import css from "./Simulator.module.css";

const parse = (s: string) => {
  const n = Number(s.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function MoneyInput({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className={css.money}>
      <span className={css.currency}>R$</span>
      <input
        id={id}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
        onBlur={() => onChange(brl(parse(value)))}
        onFocus={(e) => e.currentTarget.select()}
        className={css.moneyInput}
      />
    </div>
  );
}

export function Simulator() {
  const { sim, setSim, push, toast } = useStore();
  const [buy, setBuy] = useState(brl(sim.buy));
  const [sell, setSell] = useState(brl(sim.sell));
  const shake = useAnimationControls();

  const run = () => {
    const b = parse(buy);
    const s = parse(sell);
    if (b <= 0 || s <= 0) {
      shake.start({ x: [0, -8, 7, -5, 3, 0], transition: { duration: 0.4 } });
      return;
    }
    setSim(b, s);
    push("simResultado");
  };

  return (
    <div className={`scroll ${css.scroll}`}>
      <Stagger className={css.page} step={0.07}>
        <Item className={css.header}>
          <h1 className={css.h1}>Simulador</h1>
          <button type="button" className={css.bell} aria-label="Notificações" onClick={() => toast("Você não tem notificações novas.")}>
            <Icon name="bell" size={24} />
          </button>
        </Item>
        <Item>
          <p className="t-desc">Descubra quanto você precisa ganhar para recuperar perdas em ações, sem arriscar o seu dinheiro real.</p>
        </Item>
        <Item>
          <motion.div className={`card ${css.steps}`} animate={shake}>
            <div className={css.rail}>
              <span className={css.num}>1</span>
              <span className={css.line} />
            </div>
            <div className={css.step}>
              <label htmlFor="buy" className={css.stepTitle}>
                Preço de compra
              </label>
              <span className="t-meta" style={{ fontSize: 13 }}>
                Quanto você pagou por ação
              </span>
              <MoneyInput id="buy" value={buy} onChange={setBuy} />
            </div>
            <div className={css.rail}>
              <span className={css.num}>2</span>
            </div>
            <div className={css.step} style={{ paddingBottom: 0 }}>
              <label htmlFor="sell" className={css.stepTitle}>
                Preço de venda
              </label>
              <span className="t-meta" style={{ fontSize: 13 }}>
                Por quanto a ação foi vendida
              </span>
              <MoneyInput id="sell" value={sell} onChange={setSell} />
            </div>
          </motion.div>
        </Item>
        <Item>
          <Button onClick={run}>Simular</Button>
        </Item>
        <Item className={css.tip}>
          <Icon name="lightbulb-alt" size={22} style={{ color: "var(--y700)" }} />
          <span>Simulação educativa. Nenhum dinheiro real é usado.</span>
        </Item>
      </Stagger>
    </div>
  );
}
