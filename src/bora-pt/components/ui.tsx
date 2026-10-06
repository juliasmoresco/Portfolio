import {
  animate,
  AnimatePresence,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useTransform,
  type HTMLMotionProps,
} from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import wordmark from "../../bora/assets/wordmark.webp";
import css from "./ui.module.css";

/** Ease used across the app: quick out, long settle. */
export const EASE = [0.22, 1, 0.36, 1] as const;
export const SPRING = { type: "spring", stiffness: 380, damping: 32 } as const;
export const SOFT_SPRING = { type: "spring", stiffness: 220, damping: 24 } as const;

export function Icon({ name, size, className, style }: { name: string; size?: number; className?: string; style?: CSSProperties }) {
  return <i aria-hidden className={`uil uil-${name}${className ? ` ${className}` : ""}`} style={{ fontSize: size, lineHeight: 1, ...style }} />;
}

type ButtonProps = HTMLMotionProps<"button"> & { variant?: "primary" | "ghost" | "outline" | "danger"; size?: "sm" };

export function Button({ variant = "primary", size, className, children, ...rest }: ButtonProps) {
  const cls = ["btn", variant !== "primary" && `btn--${variant}`, size && `btn--${size}`, className].filter(Boolean).join(" ");
  return (
    <motion.button type="button" whileTap={rest.disabled ? undefined : { scale: 0.97 }} transition={SPRING} className={cls} {...rest}>
      {children}
    </motion.button>
  );
}

export function TopBar({
  title,
  onBack,
  backIcon = "angle-left",
  backLabel = "Voltar",
  right,
  children,
}: {
  title?: ReactNode;
  onBack?: () => void;
  backIcon?: string;
  backLabel?: string;
  right?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={css.topBar}>
      <div className={css.topRow}>
        {onBack ? (
          <motion.button type="button" className={css.iconBtn} onClick={onBack} aria-label={backLabel} whileTap={{ scale: 0.88 }}>
            <Icon name={backIcon} size={backIcon === "times" ? 28 : 30} />
          </motion.button>
        ) : (
          <span />
        )}
        <span className={css.topTitle}>{title}</span>
        {right ?? <span />}
      </div>
      {children}
    </div>
  );
}

/** A progress bar whose fill eases to `value` (0..1), from 0 on first paint. */
export function Progress({
  value,
  height = 6,
  track = "var(--n200)",
  fill = "var(--g600)",
  delay = 0,
  className,
  style,
}: {
  value: number;
  height?: number;
  track?: string;
  fill?: string;
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`${css.progress}${className ? ` ${className}` : ""}`}
      style={{ height, borderRadius: height, background: track, ...style }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
    >
      <motion.div
        className={css.progressFill}
        style={{ background: fill, borderRadius: height }}
        initial={{ width: 0 }}
        animate={{ width: `${value * 100}%` }}
        transition={{ duration: 0.9, ease: EASE, delay }}
      />
    </div>
  );
}

/** Animated number. `format` turns the tweened value into display text. */
export function CountUp({
  to,
  format = (v) => Math.round(v).toString(),
  duration = 1,
  delay = 0,
  from = 0,
}: {
  to: number;
  format?: (v: number) => string;
  duration?: number;
  delay?: number;
  from?: number;
}) {
  const mv = useMotionValue(from);
  const text = useTransform(mv, format);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const c = animate(mv, to, { duration, delay, ease: EASE });
    return () => c.stop();
  }, [inView, to, duration, delay, mv]);
  return <motion.span ref={ref}>{text}</motion.span>;
}

/** Progress ring drawn with a conic gradient (design spec), swept from 0 when it scrolls into view. */
export function Ring({
  value,
  size = 64,
  thickness = 6,
  track,
  fill,
  hole,
  children,
  delay = 0.2,
}: {
  value: number;
  size?: number;
  thickness?: number;
  track: string;
  fill: string;
  hole: string;
  children?: ReactNode;
  delay?: number;
}) {
  const mv = useMotionValue(0);
  const deg = useTransform(mv, (v) => `${v * 360}deg`);
  const bg = useMotionTemplate`conic-gradient(${fill} ${deg}, ${track} 0)`;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const c = animate(mv, value, { duration: 1.2, delay, ease: EASE });
    return () => c.stop();
  }, [inView, value, delay, mv]);
  return (
    <motion.div ref={ref} className={css.ring} style={{ width: size, height: size, background: bg }}>
      <div className={css.ringHole} style={{ inset: thickness, background: hole }}>
        {children}
      </div>
    </motion.div>
  );
}

export type Bar = { h: number; color: string; cap?: string };

/**
 * The three (or four) bars of the logo, used as illustration and cover. Heights are percentages of
 * the box; they spring to new values, so swapping `bars` morphs the shape.
 */
export function Bars({
  bars,
  gap,
  barWidth,
  className,
  style,
  grow = false,
  delay = 0,
}: {
  bars: Bar[];
  gap: number;
  barWidth?: number;
  className?: string;
  style?: CSSProperties;
  grow?: boolean;
  delay?: number;
}) {
  return (
    <div className={`${css.bars}${className ? ` ${className}` : ""}`} style={{ gap, ...style }} aria-hidden>
      {bars.map((b, i) => (
        <motion.div
          key={i}
          className={css.bar}
          style={{ width: barWidth, flex: barWidth ? "none" : 1 }}
          initial={grow ? { height: "0%", backgroundColor: b.color } : false}
          animate={{ height: `${b.h}%`, backgroundColor: b.color }}
          transition={{ ...SOFT_SPRING, delay: grow ? delay + i * 0.08 : 0 }}
        >
          <motion.div
            className={css.barCap}
            initial={false}
            animate={{ height: b.cap ? "6%" : "0%", backgroundColor: b.cap ?? b.color }}
            transition={SOFT_SPRING}
          />
        </motion.div>
      ))}
    </div>
  );
}

/** Small trilha cover: three logo bars on a tinted tile. */
export function TrilhaCover({ size = 44, tint = "var(--g100)", color = "var(--g600)", grow }: { size?: number; tint?: string; color?: string; grow?: boolean }) {
  const s = size / 44;
  return (
    <div className={css.cover} style={{ width: size, height: size, borderRadius: 10 * s, background: tint, padding: `0 ${9 * s}px` }}>
      <Bars bars={[{ h: 27, color }, { h: 59, color }, { h: 43, color }]} gap={3 * s} barWidth={6 * s} grow={grow} />
    </div>
  );
}

const LOGO_BARS = [168, 336, 269];

/**
 * Logo built from three bars plus the wordmark (cropped from logo.png at the third bar, which is
 * also the stem of the B). `intro` plays the splash micro-interaction: bars rise, then the wordmark.
 */
export function Logo({ height, intro = false, layoutId }: { height: number; intro?: boolean; layoutId?: string }) {
  const s = height / 342;
  return (
    <motion.div layoutId={layoutId} className={css.logo} style={{ height, width: 1995 * s }} role="img" aria-label="BoraInvest">
      {LOGO_BARS.map((h, i) => (
        <motion.span
          key={i}
          className={css.logoBar}
          style={{ width: 56 * s, height: h * s, left: i * 112 * s }}
          initial={intro ? { scaleY: 0 } : false}
          animate={{ scaleY: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.15 + i * 0.13 }}
        />
      ))}
      <motion.img
        src={wordmark}
        alt=""
        className={css.wordmark}
        style={{ left: 280 * s, height, width: 1715 * s }}
        initial={intro ? { clipPath: "inset(0 100% 0 0)", x: -8 } : false}
        animate={{ clipPath: "inset(0 0% 0 0)", x: 0 }}
        transition={{ delay: 0.62, duration: 0.7, ease: EASE }}
        draggable={false}
      />
    </motion.div>
  );
}

/** Sheets render into the phone's overlay root so they cover the tab bar too. */
export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.getElementById(OVERLAY_ROOT)), []);
  if (!host) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className={css.sheetLayer} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          <button type="button" className={css.scrim} aria-label="Fechar" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className={css.sheet}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 500) onClose();
            }}
          >
            <span className={css.grabber} />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    host,
  );
}

export const OVERLAY_ROOT = "bora-overlays";

/** Staggered entrance for the direct children of a screen. Use with `<Item>`. */
export function Stagger({ children, className, style, delay = 0.05, step = 0.06 }: { children: ReactNode; className?: string; style?: CSSProperties; delay?: number; step?: number }) {
  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: step, delayChildren: delay } } }}
    >
      {children}
    </motion.div>
  );
}

export const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export function Item({ children, className, style, ...rest }: HTMLMotionProps<"div">) {
  return (
    <motion.div variants={itemVariants} className={className} style={style} {...rest}>
      {children}
    </motion.div>
  );
}

export const brl = (v: number, digits = 2) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
