/** Small URL/host helpers shared by navigation and auth logic. */

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/** True when `host` equals `domain` or is a subdomain of it. */
export function hostMatches(host: string, domain: string): boolean {
  const h = host.toLowerCase();
  const d = domain.toLowerCase();
  return h === d || h.endsWith(`.${d}`);
}

/** True when any of `domains` matches `host`. */
export function hostMatchesAny(host: string, domains: readonly string[]): boolean {
  return domains.some((d) => hostMatches(host, d));
}

export function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return '';
  }
}

export function fileNameFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').pop();
    return last && last.includes('.') ? decodeURIComponent(last) : null;
  } catch {
    return null;
  }
}
