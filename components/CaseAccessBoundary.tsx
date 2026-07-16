import type { ReactNode } from "react";

export type CaseAccessScope = "public" | "page" | "section";

export function CaseAccessBoundary({
  id,
  scope = "public",
  children,
}: {
  id: string;
  scope?: CaseAccessScope;
  children: ReactNode;
}) {
  return (
    <div data-case-access-id={id} data-case-access-scope={scope}>
      {children}
    </div>
  );
}
