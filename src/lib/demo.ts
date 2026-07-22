/** Utilities shared by the isolated, unauthenticated dashboard demo. */
export function isDemoPath(pathname: string): boolean {
  return pathname === '/demo' || pathname.startsWith('/demo/');
}

export function isDemoMode(): boolean {
  return typeof window !== 'undefined' && isDemoPath(window.location.pathname);
}

/** Keep internal dashboard links inside `/demo` while the demo is open. */
export function appPath(path: string): string {
  if (!path.startsWith('/')) return path;
  return isDemoMode() ? `/demo${path}` : path;
}

/** The equivalent app-relative path, useful for active-navigation checks. */
export function withoutDemoPrefix(pathname: string): string {
  if (!isDemoPath(pathname)) return pathname;
  const path = pathname.slice('/demo'.length);
  return path || '/';
}
