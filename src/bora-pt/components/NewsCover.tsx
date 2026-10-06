import { motion } from "motion/react";
import type { News } from "../content";
import { Bars, EASE } from "./ui";
import css from "./NewsCover.module.css";

const TONES: Record<News["tone"], { bg: string; bars: string[]; line: string }> = {
  green: { bg: "#D1FADF", bars: ["#32D583", "#32D583", "#039855"], line: "#027A48" },
  purple: { bg: "#E9D7FE", bars: ["#B692F6", "#9E77ED", "#6941C6"], line: "#53389E" },
  yellow: { bg: "#FEF0C7", bars: ["#FDB022", "#FDB022", "#DC6803"], line: "#B54708" },
  gray: { bg: "#EAECF0", bars: ["#98A2B3", "#475467", "#32D583"], line: "#344054" },
};

const HEIGHTS = [[38, 72, 55], [60, 44, 78], [30, 64, 48], [52, 80, 40]];

/**
 * News art from the cover system (bars of the logo on a tint) instead of stock photos. The hero
 * variant adds a market line that draws itself in.
 */
export function NewsCover({ tone, variant, seed = 0 }: { tone: News["tone"]; variant: "hero" | "thumb"; seed?: number }) {
  const t = TONES[tone];
  const hs = HEIGHTS[seed % HEIGHTS.length];
  const hero = variant === "hero";
  return (
    <div className={hero ? css.hero : css.thumb} style={{ background: t.bg }} aria-hidden>
      <div className={hero ? css.heroBars : css.thumbBars}>
        <Bars bars={hs.map((h, i) => ({ h, color: t.bars[i] }))} gap={hero ? 12 : 5} grow delay={hero ? 0.2 : 0.1} />
      </div>
      {hero && (
        <svg className={css.line} viewBox="0 0 300 120" preserveAspectRatio="none">
          <motion.path
            d="M0 92 L30 84 L55 96 L85 70 L110 78 L140 52 L165 60 L195 38 L220 48 L250 26 L300 18"
            fill="none"
            stroke={t.line}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.6, delay: 0.35, ease: EASE }}
          />
          <motion.circle
            cx="300"
            cy="18"
            r="5"
            fill={t.line}
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.4, 1] }}
            transition={{ delay: 1.8, duration: 0.5 }}
          />
        </svg>
      )}
    </div>
  );
}
