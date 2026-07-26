"use client";

import { Squircle as ReactSquircle, SquircleNoScript } from "@squircle-js/react";
import type { ComponentProps } from "react";

export function Squircle(props: ComponentProps<typeof ReactSquircle>) {
  return <ReactSquircle cornerSmoothing={0.6} {...props} />;
}

export { SquircleNoScript };
