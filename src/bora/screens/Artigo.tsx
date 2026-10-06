import { motion, useScroll } from "motion/react";
import { useRef } from "react";
import { useStore } from "../store";
import { TEACHER } from "../content";
import { Button, CountUp, EASE, Icon, Item, Stagger, TopBar } from "../components/ui";
import css from "./Reading.module.css";

export const SPLIT = [
  { key: "need", label: "Needs", share: 50, color: "#027A48", example: "rent, groceries, bills, transport" },
  { key: "want", label: "Wants", share: 30, color: "#6941C6", example: "going out, streaming, clothes, travel" },
  { key: "save", label: "Save & invest", share: 20, color: "#B54708", example: "emergency fund, investments" },
] as const;

const money = (v: number) => `R$ ${Math.round(v).toLocaleString("en-US")}`;

export function Artigo() {
  const { back, complete, done, toast } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: ref });

  const finish = () => {
    if (!done.artigo) {
      complete("artigo");
      toast("Article done. Next step: the practice exercise.");
    }
    back();
  };

  return (
    <div className={css.screen}>
      <div style={{ height: "var(--status-h)" }} />
      <TopBar title="Article" onBack={() => back()}>
        <motion.div className={css.readBar} style={{ scaleX: scrollYProgress }} />
      </TopBar>
      <div ref={ref} className={`scroll ${css.body}`}>
        <Stagger className={css.article} step={0.06}>
          <Item className={css.head}>
            <span className={css.kicker}>Lesson 1 · Step 2 of 4</span>
            <h1 className="t-display">The 50-30-20 rule</h1>
            <div className={css.author}>
              <img src={TEACHER.avatar} alt="" className={css.authorPic} />
              <span className="t-meta">
                By {TEACHER.name} · 3 min read
              </span>
            </div>
          </Item>

          <Item>
            <p className={css.p}>
              Once you know what financial wellbeing means to you, the next step is deciding where your money goes. The
              <strong> 50-30-20 rule</strong> is one of the simplest ways to start.
            </p>
          </Item>

          <Item>
            <SplitChart />
          </Item>

          <Item>
            <p className={css.p}>
              The idea is to split your <strong>take-home pay</strong>, the money that lands in your account after deductions, into three
              parts. Half covers the essentials. A smaller part goes to what makes life lighter. And one part, however small, goes to your
              future.
            </p>
          </Item>

          <Item>
            <h2 className={css.h2}>In practice, with R$ 3,000</h2>
          </Item>
          <Item>
            <Example />
          </Item>

          <Item className={css.tip}>
            <Icon name="lightbulb-alt" size={22} style={{ color: "var(--y700)", flex: "none" }} />
            <span>
              <strong>It doesn't have to be exact.</strong> If your needs take more than 50% today, use the rule as a direction: what matters
              is to start putting something aside.
            </span>
          </Item>

          <Item>
            <p className={css.p}>
              In the next exercise you'll practice: for each expense, decide if it's a need, a want or part of what you set aside.
            </p>
          </Item>
        </Stagger>
      </div>
      <div className={css.footer}>
        <Button onClick={finish}>
          <Icon name="check" size={22} />
          Finish reading
        </Button>
      </div>
    </div>
  );
}

function SplitChart() {
  return (
    <div className={css.split}>
      <div className={css.splitBar}>
        {SPLIT.map((s, i) => (
          <motion.div
            key={s.key}
            className={css.splitSeg}
            style={{ background: s.color }}
            initial={{ flexGrow: 0.001, opacity: 0 }}
            whileInView={{ flexGrow: s.share, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.2 + i * 0.15, ease: EASE }}
          >
            {s.share}%
          </motion.div>
        ))}
      </div>
      <div className={css.legend}>
        {SPLIT.map((s) => (
          <div key={s.key} className={css.legendRow}>
            <span className={css.dot} style={{ background: s.color }} />
            <span>
              {s.label}
              <span className="t-meta" style={{ display: "block", fontSize: 13 }}>
                {s.example}
              </span>
            </span>
            <strong>{s.share}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function Example() {
  return (
    <div className={css.split} style={{ gap: 12 }}>
      {SPLIT.map((s, i) => (
        <div key={s.key} className={css.legendRow}>
          <span className={css.dot} style={{ background: s.color }} />
          <span>{s.label}</span>
          <strong>
            <CountUp to={(3000 * s.share) / 100} format={money} delay={0.1 + i * 0.12} />
          </strong>
        </div>
      ))}
    </div>
  );
}
