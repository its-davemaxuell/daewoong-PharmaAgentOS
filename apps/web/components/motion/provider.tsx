"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

const features = () => import("./features").then((module) => module.default);

/** Receives server-rendered children without making the route tree client-owned. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user" transition={{ duration: 0.26, ease: [0.22, 0.8, 0.25, 1] }}>
    <LazyMotion features={features} strict>{children}</LazyMotion>
  </MotionConfig>;
}
