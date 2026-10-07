import { motion, useScroll } from "motion/react";
import { useRef } from "react";
import { useStore } from "../store";
import { TEACHER } from "../content";
import { Button, CountUp, EASE, Icon, Item, Stagger, TopBar } from "../components/ui";
import css from "./Reading.module.css";

export const SPLIT = [
  { key: "need", label: "Necessidades", share: 50, color: "#027A48", example: "aluguel, mercado, contas, transporte" },
  { key: "want", label: "Desejos", share: 30, color: "#6941C6", example: "lazer, streaming, roupas, viagens" },
  { key: "save", label: "Poupar e investir", share: 20, color: "#B54708", example: "reserva de emergência, investimentos" },
] as const;

const money = (v: number) => `R$ ${Math.round(v).toLocaleString("pt-BR")}`;

export function Artigo() {
  const { back, complete, done, toast } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: ref });

  const finish = () => {
    if (!done.artigo) {
      complete("artigo");
      toast("Artigo concluído. Próxima etapa: exercício prático.");
    }
    back();
  };

  return (
    <div className={css.screen}>
      <div style={{ height: "var(--status-h)" }} />
      <TopBar title="Artigo" onBack={() => back()}>
        <motion.div className={css.readBar} style={{ scaleX: scrollYProgress }} />
      </TopBar>
      <div ref={ref} className={`scroll ${css.body}`}>
        <Stagger className={css.article} step={0.06}>
          <Item className={css.head}>
            <span className={css.kicker}>Aula 1 · Etapa 2 de 4</span>
            <h1 className="t-display">Método 50-30-20</h1>
            <div className={css.author}>
              <img src={TEACHER.avatar} alt="" className={css.authorPic} />
              <span className="t-meta">
                Por {TEACHER.name} · Leitura de 3 min
              </span>
            </div>
          </Item>

          <Item>
            <p className={css.p}>
              Depois de entender o que é bem-estar financeiro para você, o próximo passo é organizar para onde o dinheiro vai. O
              <strong> método 50-30-20</strong> é uma das formas mais simples de começar.
            </p>
          </Item>

          <Item>
            <SplitChart />
          </Item>

          <Item>
            <p className={css.p}>
              A ideia é dividir a sua <strong>renda líquida</strong>, ou seja, o que cai na conta depois dos descontos, em três partes. Metade
              cobre o que é essencial. Uma parte menor fica para o que deixa a vida mais leve. E uma parte, mesmo que pequena, vai para o
              seu futuro.
            </p>
          </Item>

          <Item>
            <h2 className={css.h2}>Na prática, com R$ 3.000</h2>
          </Item>
          <Item>
            <Example />
          </Item>

          <Item className={css.tip}>
            <Icon name="lightbulb-alt" size={22} style={{ color: "var(--y700)", flex: "none" }} />
            <span>
              <strong>Não precisa ser exato.</strong> Se hoje suas necessidades passam de 50%, use o método como direção: o importante é
              começar a separar algo para poupar.
            </span>
          </Item>

          <Item>
            <p className={css.p}>
              No exercício a seguir, você vai praticar: para cada gasto, decida se ele é uma necessidade, um desejo ou parte do que você
              guarda.
            </p>
          </Item>
        </Stagger>
      </div>
      <div className={css.footer}>
        <Button onClick={finish}>
          <Icon name="check" size={22} />
          Concluir leitura
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
