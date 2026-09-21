/**
 * Locale routing (Next 16 renamed `middleware.ts` → `proxy.ts`).
 *
 * Every public page lives under `/{locale}/...`. This proxy redirects any
 * request that arrives without a locale prefix to the visitor's best match,
 * preferring (1) an explicit choice from the language switcher cookie, then
 * (2) the browser's Accept-Language header, then (3) English.
 *
 * Paths that must NOT be prefixed are excluded via the matcher below: API
 * routes, Next internals, and any file request (a path containing a dot).
 */
import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  localeFromAcceptLanguage,
} from "@/lib/i18n/config";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Already prefixed with a supported locale → let it through.
  const hasLocale = isLocale(
    pathname.split("/")[1] // '/am/foo' → 'am'
  );
  if (hasLocale) return NextResponse.next();

  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale)
    ? cookieLocale
    : localeFromAcceptLanguage(request.headers.get("accept-language")) ||
      DEFAULT_LOCALE;

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.redirect(url);
}

export const config = {
  /**
   * Run on everything except:
   *   - `/api/*`              route handlers already locale-agnostic
   *   - `/_next/*`            build output + HMR
   *   - `/admin/*`            staff dashboard is English-only
   *   - any path with a dot   favicon.ico, robots.txt, sitemap.xml, …
   */
  matcher: ["/((?!api|_next|admin|.*\\..*).*)"],
};
