"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const yandexMetricaId = 110991707;

declare global {
  interface Window {
    ym?: (counterId: number, command: "hit", url: string) => void;
  }
}

export function YandexMetrica() {
  const pathname = usePathname();
  const reportedUrlRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    function reportPageView() {
      const url = window.location.href;
      if (!window.ym || reportedUrlRef.current === url) return;

      window.ym(yandexMetricaId, "hit", url);
      reportedUrlRef.current = url;
    }

    reportPageView();
    window.addEventListener("yandex-metrica-ready", reportPageView);

    return () => {
      window.removeEventListener("yandex-metrica-ready", reportPageView);
    };
  }, [pathname]);

  return null;
}
