"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export function LocaleTextTransition({
  children,
  transitionId,
  block = false,
}: {
  children: ReactNode;
  transitionId: number;
  block?: boolean;
}) {
  const reduceMotion = useReducedMotion();

  if (!transitionId || reduceMotion) return <>{children}</>;

  return (
    <span
      className={`locale-text-transition${block ? " locale-text-transition--block" : ""}`}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={transitionId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
