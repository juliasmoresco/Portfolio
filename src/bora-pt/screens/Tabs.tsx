import { AnimatePresence, motion } from "motion/react";
import { useStore, type Tab } from "../store";
import { EASE, Icon } from "../components/ui";
import { Home } from "./Home";
import { News } from "./News";
import { Simulator } from "./Simulator";
import { Profile } from "./Profile";
import css from "./Tabs.module.css";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "home", label: "Home", icon: "estate" },
  { id: "news", label: "Notícias", icon: "newspaper" },
  { id: "sim", label: "Simulador", icon: "chart-bar" },
  { id: "profile", label: "Perfil", icon: "user" },
];

export function Tabs() {
  const { tab } = useStore();
  return (
    <div className={css.root}>
      <div className={css.content}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={tab}
            className={css.pane}
            initial={{ opacity: 0, y: 10, filter: "blur(2px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            {tab === "home" && <Home />}
            {tab === "news" && <News />}
            {tab === "sim" && <Simulator />}
            {tab === "profile" && <Profile />}
          </motion.div>
        </AnimatePresence>
      </div>
      <TabBar />
    </div>
  );
}

function TabBar() {
  const { tab, setTab } = useStore();
  return (
    <nav className={css.bar} aria-label="Navegação principal">
      {TABS.map((t) => {
        const on = t.id === tab;
        return (
          <button
            key={t.id}
            type="button"
            className={css.item}
            aria-current={on ? "page" : undefined}
            onClick={() => setTab(t.id)}
          >
            <span className={css.iconWrap}>
              {on && <motion.span layoutId="tab-pill" className={css.pill} transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
              <motion.span
                className={css.icon}
                animate={on ? { y: [0, -3, 0], scale: [1, 1.12, 1] } : { y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                <Icon name={t.icon} size={22} />
              </motion.span>
            </span>
            <span className={css.label}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
