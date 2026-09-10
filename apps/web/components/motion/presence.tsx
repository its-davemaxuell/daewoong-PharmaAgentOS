"use client";

import { AnimatePresence, useIsPresent, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import type { ComponentProps } from "react";

export { AnimatePresence as Presence };

type SurfaceProps = Omit<ComponentProps<typeof m.section>, "ref"> & { as?: "section" | "aside" | "div"; direction?: "side" | "up" };
/** Parent owns logical visibility/focus. Exiting DOM becomes inert immediately. */
export function PresenceSurface({ as = "section", direction = "up", children, ...props }: SurfaceProps) {
  const present = useIsPresent();
  const reduced = useReducedMotion();
  const Element = as === "aside" ? m.aside : as === "div" ? m.div : m.section;
  const offset = reduced ? 0 : direction === "side" ? 8 : 5;
  return <Element {...props} inert={!present || undefined} aria-hidden={!present || undefined}
    data-presence={present ? "open" : "exiting"}
    initial={reduced ? false : { opacity: 0, x: direction === "side" ? offset : 0, y: direction === "up" ? offset : 0 }}
    animate={{ opacity: 1, x: 0, y: 0 }}
    exit={{ opacity: 0, x: direction === "side" ? offset : 0, y: 0 }}
    transition={{ duration: reduced ? 0 : present ? 0.26 : 0.2, ease: [0.22, 0.8, 0.25, 1] }}>
    {children}
  </Element>;
}
