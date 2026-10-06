import { AnimatePresence, motion } from "motion/react";
import type { ComponentType } from "react";
import { useStore, type Route, type ScreenName, type Transition } from "./store";
import { Splash } from "./screens/Splash";
import { Onboarding } from "./screens/Onboarding";
import { Login } from "./screens/Login";
import { Signup } from "./screens/Signup";
import { Tabs } from "./screens/Tabs";
import { Trilha } from "./screens/Trilha";
import { Aula } from "./screens/Aula";
import { Artigo } from "./screens/Artigo";
import { Exercicio } from "./screens/Exercicio";
import { Quiz } from "./screens/Quiz";
import { Noticia } from "./screens/Noticia";
import { SimResultado } from "./screens/SimResultado";
import css from "./BoraApp.module.css";

const SCREENS: Record<ScreenName, ComponentType<{ route: Route }>> = {
  splash: Splash,
  onboarding: Onboarding,
  login: Login,
  signup: Signup,
  tabs: Tabs,
  trilha: Trilha,
  aula: Aula,
  artigo: Artigo,
  exercicio: Exercicio,
  quiz: Quiz,
  noticia: Noticia,
  simResultado: SimResultado,
};

/** iOS navigation curve. */
const NAV = { duration: 0.5, ease: [0.32, 0.72, 0, 1] } as const;

const enter = (via: Transition) => {
  switch (via) {
    case "push":
      return { x: "100%" };
    case "rise":
      return { y: "100%" };
    case "fade":
      return { opacity: 0, scale: 0.985 };
    default:
      return {};
  }
};

const exit = (t: Transition) => {
  switch (t) {
    case "pop":
      return { x: "100%", transition: NAV };
    case "drop":
      return { y: "100%", transition: NAV };
    case "fade":
      return { opacity: 0, transition: { duration: 0.35 } };
    default:
      return { opacity: 0, transition: { duration: 0 } };
  }
};

/**
 * Renders the whole stack so screens underneath keep their state (scroll, video). The top screen
 * sits at rest; the one under a pushed screen parallaxes left and dims; under a modal it only dims.
 */
export function Navigator() {
  const { stack, transition } = useStore();
  return (
    <AnimatePresence initial={false} custom={transition}>
      {stack.map((r, i) => {
        const above = stack[i + 1];
        const depth = stack.length - 1 - i;
        const Screen = SCREENS[r.name];
        const covered = depth > 0;
        const parallax = covered && above.via === "push";
        return (
          <motion.section
            key={r.id}
            className={css.layer}
            style={{ zIndex: r.id }}
            custom={transition}
            initial={enter(r.via)}
            animate={{
              x: parallax ? "-28%" : 0,
              y: 0,
              opacity: 1,
              scale: 1,
              visibility: "visible",
              transitionEnd: depth > 1 ? { visibility: "hidden" } : undefined,
            }}
            variants={{ exit }}
            exit="exit"
            transition={r.via === "fade" && !covered ? { duration: 0.45, ease: [0.22, 1, 0.36, 1] } : NAV}
            aria-hidden={covered || undefined}
            inert={covered || undefined}
          >
            <Screen route={r} />
            <motion.div
              className={css.dim}
              initial={false}
              animate={{ opacity: covered ? (above.via === "rise" ? 0.4 : 0.12) : 0 }}
              transition={NAV}
            />
          </motion.section>
        );
      })}
    </AnimatePresence>
  );
}
