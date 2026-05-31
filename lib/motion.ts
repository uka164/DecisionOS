import type { Variants, Transition } from "framer-motion"

// ─── DecisionOS motion signature ──────────────────────────────────────────────
// One vocabulary, used everywhere, so movement is recognizably "ours" rather
// than the Framer-tutorial default (fade + 12px slide + scale 0.96, easeOut).
//
// The signature: content *settles into focus* — it rises a little while
// sharpening from a soft blur, on a confident expo-out curve. Reveals use the
// curve; interactive/spatial elements use the spring.

/** Confident expo-out. Slow to arrive, decisive to settle. */
export const EASE_SIGNATURE = [0.16, 1, 0.3, 1] as const

/** Precise settle with a hair of overshoot — for toggles, knobs, layout moves. */
export const SPRING_SETTLE: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 30,
  mass: 0.85,
}

/** The signature reveal: rise + sharpen. Use on panels and hero moments. */
export const rise: Variants = {
  hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: EASE_SIGNATURE },
  },
}

/** Stagger wrapper — children reveal in a quick cascade. */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.03 } },
}

/** Staggered child with the soft-focus blur. For short groups (≤ ~8). */
export const riseItem: Variants = {
  hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.42, ease: EASE_SIGNATURE },
  },
}

/** Lightweight staggered child (no blur) — for longer lists where animating
 *  `filter` on many nodes would cost too much. */
export const riseItemLight: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.34, ease: EASE_SIGNATURE } },
}
