/**
 * Auth.js が返すリダイレクト URL は本番で絶対 URL になることがある。
 * App Router の router.push は同一オリジンのパス（/tasks など）向けなので正規化する。
 */
export function toSameOriginPath(href: string, origin: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) {
    try {
      const u = new URL(href);
      if (u.origin === origin) {
        return `${u.pathname}${u.search}`;
      }
    } catch {
      /* ignore */
    }
  }
  return href.startsWith("/") ? href : `/${href}`;
}
