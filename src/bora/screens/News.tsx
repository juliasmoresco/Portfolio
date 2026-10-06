import { motion } from "motion/react";
import { useStore } from "../store";
import { INDICES, NEWS, pct } from "../content";
import { Icon, Item, Stagger } from "../components/ui";
import { NewsCover } from "../components/NewsCover";
import css from "./News.module.css";

export function News() {
  const { push, toast } = useStore();
  const [featured, ...rest] = NEWS;
  const open = (id: string) => push("noticia", { id });

  return (
    <div className={`scroll ${css.scroll}`}>
      <Stagger className={css.page} step={0.07}>
        <Item className={css.header}>
          <h1 className={css.h1}>News</h1>
          <motion.button
            type="button"
            className={css.bell}
            aria-label="Notifications"
            onClick={() => toast("You have no new notifications.")}
            whileTap={{ rotate: [0, -18, 14, -8, 0], transition: { duration: 0.5 } }}
          >
            <Icon name="bell" size={24} />
          </motion.button>
        </Item>

        <Item className={css.tickerWrap} aria-label="Market indices">
          {/* Two copies scroll as one seamless loop. */}
          <motion.div className={css.ticker} animate={{ x: ["0%", "-50%"] }} transition={{ duration: 22, ease: "linear", repeat: Infinity }}>
            {[...INDICES, ...INDICES].map((ix, i) => (
              <span key={i} className={css.pill} aria-hidden={i >= INDICES.length || undefined}>
                <strong>{ix.name}</strong>
                <span className={`${css.chg} ${ix.change >= 0 ? "up" : "down"}`}>
                  <Icon name={ix.change >= 0 ? "arrow-up" : "arrow-down"} />
                  {pct(ix.change)}
                </span>
              </span>
            ))}
          </motion.div>
        </Item>

        <Item className={css.section}>
          <span className="t-overline">Featured</span>
          <motion.button type="button" className={css.featured} onClick={() => open(featured.id)} whileTap={{ scale: 0.98 }}>
            <NewsCover tone={featured.tone} variant="hero" />
            <span className={css.featuredTitle}>{featured.title}</span>
            <span className={css.meta}>
              {featured.source} · {featured.date}
            </span>
          </motion.button>
        </Item>

        <Item className={css.section}>
          <span className="t-overline">Market trends</span>
          <div className={css.list}>
            {rest.map((n, i) => (
              <motion.button key={n.id} type="button" className={css.row} onClick={() => open(n.id)} whileTap={{ scale: 0.98 }}>
                <span className={css.rowText}>
                  <span className={css.rowTitle}>{n.title}</span>
                  <span className={css.meta}>{n.date}</span>
                </span>
                <NewsCover tone={n.tone} variant="thumb" seed={i + 1} />
              </motion.button>
            ))}
          </div>
        </Item>
      </Stagger>
    </div>
  );
}
