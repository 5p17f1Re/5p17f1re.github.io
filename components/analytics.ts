"use client";

type AnalyticsValue = string | number | boolean | undefined;

declare global {
  interface Window {
    gtag?: (command: "event", name: string, parameters?: Record<string, AnalyticsValue>) => void;
  }
}

export function trackEvent(
  name: string,
  parameters: Record<string, AnalyticsValue> = {},
) {
  window.gtag?.("event", name, parameters);
}

export function trackContactIntent(destination: string, placement: string) {
  trackEvent("contact_intent", { destination, placement });
}

export function trackOutboundLink(destination: string, placement: string) {
  trackEvent("outbound_link_clicked", { destination, placement });
}
