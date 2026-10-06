import { motion, useScroll } from "motion/react";
import { useRef } from "react";
import { useStore, type Route } from "../store";
import { NEWS } from "../content";
import { Icon, Item, Stagger, TopBar } from "../components/ui";
import { NewsCover } from "../components/NewsCover";
import css from "./Reading.module.css";

export function Noticia({ route }: { route: Route }) {
  const { back, toast } = useStore();
  const n = NEWS.find((x) => x.id === route.params?.id) ?? NEWS[0];
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: ref });

  return (
    <div className={css.screen}>
      <div style={{ height: "var(--status-h)" }} />
      <TopBar
        title="News"
        onBack={() => back()}
        right={
          <button type="button" className={css.iconBtn} aria-label="Share" onClick={() => toast("Link copied.")}>
            <Icon name="share-alt" size={22} />
          </button>
        }
      >
        <motion.div className={css.readBar} style={{ scaleX: scrollYProgress }} />
      </TopBar>
      <div ref={ref} className={`scroll ${css.body}`}>
        <Stagger className={css.article} step={0.06}>
          <Item>
            <NewsCover tone={n.tone} variant="hero" />
          </Item>
          <Item className={css.head}>
            <h1 className="t-title">{n.title}</h1>
            <span className="t-meta">
              {n.source} · {n.date}
            </span>
          </Item>
          {n.body.map((p, i) => (
            <Item key={i}>
              <p className={css.p}>{p}</p>
            </Item>
          ))}
        </Stagger>
      </div>
    </div>
  );
}
