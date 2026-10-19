import { docsPages, type DocsPageId, type DocsPage } from '../../../docsContent'

/**
 * The builder documentation, keyed by page id.
 *
 * Same reasoning as `apps.ts`: keyed so a locale can translate one doc page
 * without owning all four. Code samples travel with the prose because there are
 * only three of them, and splitting them out would mean matching sections by
 * index across locales — exactly the positional coupling this file avoids.
 */
export interface DocsSectionCopy {
  eyebrow?: string
  title: string
  body: readonly string[]
  bullets?: readonly string[]
  /** Not translated — repeat it verbatim in a locale file. */
  code?: string
}

export interface DocsPageCopy {
  label: string
  title: string
  lede: string
  summary: string
  callouts: readonly { title: string; body: string }[]
  sections: readonly DocsSectionCopy[]
}

function toCopy(page: DocsPage): DocsPageCopy {
  return {
    label: page.label,
    title: page.title,
    lede: page.lede,
    summary: page.summary,
    callouts: page.callouts ?? [],
    sections: page.sections,
  }
}

export const docsEn = {
  sidebarLabel: 'Docs',
  navAriaLabel: 'Documentation pages',
  articleEyebrow: 'Tiko platform docs',
  pages: Object.fromEntries(docsPages.map((page) => [page.id, toCopy(page)])) as Record<
    DocsPageId,
    DocsPageCopy
  >,
}
