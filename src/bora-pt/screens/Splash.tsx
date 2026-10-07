import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { useStore } from "../store";
import { EASE, Logo } from "../components/ui";
import css from "./Splash.module.css";

/** Long enough for the logo intro to land before the onboarding takes over. */
const AUTO_ADVANCE_MS = 2300;

export function Splash() {
  const { reset } = useStore();
  const go = useRef(() => reset("onboarding", "fade")).current;

  useEffect(() => {
    const t = window.setTimeout(go, AUTO_ADVANCE_MS);
    return () => window.clearTimeout(t);
  }, [go]);

  return (
    <button type="button" className={css.splash} onClick={go} aria-label="BoraInvest. Toque para continuar">
      <Logo height={(230 * 342) / 1995} intro layoutId="logo" />
      <motion.span
        className={css.tagline}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.05, duration: 0.6, ease: EASE }}
      >
        Educação financeira gratuita
      </motion.span>
    </button>
  );
}
