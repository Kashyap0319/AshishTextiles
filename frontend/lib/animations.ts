import type { Variants, Transition } from 'framer-motion'

// ─── Shared Transitions ─────────────────────────────────────────
export const spring: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
}

export const smooth: Transition = {
  duration: 0.5,
  ease: [0.22, 1, 0.36, 1], // custom cubic-bezier (ease-out-expo)
}

export const gentleSpring: Transition = {
  type: 'spring',
  stiffness: 150,
  damping: 20,
}

// ─── Reusable Variants ──────────────────────────────────────────

/** Fade in + slide up from below */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { ...smooth, delay },
  }),
}

/** Fade in + slide from left */
export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: (delay = 0) => ({
    opacity: 1,
    x: 0,
    transition: { ...smooth, delay },
  }),
}

/** Fade in + slide from right */
export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: (delay = 0) => ({
    opacity: 1,
    x: 0,
    transition: { ...smooth, delay },
  }),
}

/** Fade in with scale pop */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (delay = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { ...gentleSpring, delay },
  }),
}

/** Stagger container — wraps children that each use their own variant */
export const staggerContainer: Variants = {
  hidden: { opacity: 1 },
  visible: (staggerDelay = 0.08) => ({
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
      delayChildren: 0.1,
    },
  }),
}

/** Single stagger child (pair with staggerContainer) */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: smooth,
  },
}

/** Card hover effect */
export const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -4,
    transition: { type: 'spring', stiffness: 400, damping: 25 },
  },
}

/** Table row entrance */
export const tableRow: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { ...smooth, delay: i * 0.03 },
  }),
}

/** Slide panel (right side) */
export const slidePanel: Variants = {
  hidden: { x: '100%', opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: { duration: 0.25, ease: 'easeIn' },
  },
}

/** Number counter config */
export const counterSpring = {
  type: 'spring' as const,
  stiffness: 100,
  damping: 30,
  mass: 1,
}

/** Pulse glow for active/urgent items */
export const pulseGlow: Variants = {
  initial: { boxShadow: '0 0 0 0 rgba(79, 140, 255, 0)' },
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(79, 140, 255, 0.4)',
      '0 0 0 10px rgba(79, 140, 255, 0)',
    ],
    transition: { duration: 1.5, repeat: Infinity },
  },
}

/** Chat message entrance */
export const chatMessage: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...smooth, duration: 0.3 },
  },
}

/** Page/module transition */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
}
