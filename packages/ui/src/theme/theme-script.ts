export const THEME_STORAGE_KEY = "milo-theme";

/**
 * Inline, synchronous script source to run as the first thing in <body>, so
 * the right theme class is on <html> before anything paints. Can't live in
 * <head> cleanly under the App Router's metadata API, so "first child of
 * body" is the next best thing; it still runs before the rest of body
 * parses. Kept as a plain string (not JSX) so it can be inlined via
 * dangerouslySetInnerHTML without Next.js trying to hydrate it as a module.
 */
export function themeInitScript(): string {
  return `(function(){try{var k="${THEME_STORAGE_KEY}";var s=localStorage.getItem(k);var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
}
