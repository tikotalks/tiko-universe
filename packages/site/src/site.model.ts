/** A single entry in the shared site header navigation. */
export interface SiteNavLink {
  label: string
  /**
   * An internal router path (optionally carrying a `#hash`), or an absolute URL when
   * `external` is true.
   */
  path: string
  /**
   * Match the current route exactly rather than by prefix. `/` and any path carrying a
   * hash are always matched exactly, regardless of this flag.
   */
  exact?: boolean
  /** Render as a plain `<a>` pointing off-surface instead of a `RouterLink`. */
  external?: boolean
}

/** A single link in a shared site footer column. */
export interface SiteFooterLink {
  label: string
  path: string
  external?: boolean
  /**
   * Show the availability dot after the label. Reserved for a real availability signal —
   * it is not decoration.
   */
  available?: boolean
}

/** A labelled column of links in the shared site footer. */
export interface SiteFooterColumn {
  label: string
  /** Accessible name for the column's `<nav>`. Falls back to `label`. */
  ariaLabel?: string
  links: SiteFooterLink[]
}
