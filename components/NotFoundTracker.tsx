"use client";

import { useEffect } from "react";
import { trackEvent } from "./analytics";

export function NotFoundTracker() {
  useEffect(() => {
    trackEvent("not_found_view", { path: window.location.pathname });
  }, []);

  return null;
}
