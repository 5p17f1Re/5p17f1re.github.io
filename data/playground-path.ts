export function getPlaygroundPaths(pathname: string, caseSlug: string) {
  const path = pathname.replace(/\/+$/, "");
  const suffix = "/playground";
  const isOpen = path.endsWith(suffix);
  const base = isOpen ? path.slice(0, -suffix.length) : path;

  if (base.split("/").at(-1) !== caseSlug) return null;

  return {
    casePath: `${base}/`,
    playgroundPath: `${base}${suffix}/`,
    isOpen,
  };
}
