/**
 * The shape of a content page.
 *
 * Every explainer page on the site is the same thing: an opening, then a run of
 * sections. A section carries prose, or a set of points, or ordered steps, or
 * questions — never more than one of those, so the renderer stays a switch
 * rather than a layout engine. Pages that previously hand-rolled their own
 * sections now describe themselves in this shape instead, which is what makes
 * them translatable without touching a component.
 */

export interface ContentPoint {
  title: string
  body: string
}

export interface ContentStep {
  title: string
  body: string
}

export interface ContentQuestion {
  question: string
  answer: string
}

/** A Tiko colour name used to tone a section band, e.g. 'primary' | 'dark'. */
export type SectionTone = string

export interface ContentSection {
  /** Stable identifier — used for the anchor and as the `v-for` key. */
  id: string
  eyebrow?: string
  title: string
  /** One sentence under the title, larger than body copy. */
  lede?: string
  /** Body paragraphs. Rendered in order, before any points/steps/questions. */
  body?: readonly string[]
  /** Unordered points, rendered as colour panels. */
  points?: readonly ContentPoint[]
  /** Ordered steps, rendered as a numbered list. */
  steps?: readonly ContentStep[]
  /** Questions and answers. */
  questions?: readonly ContentQuestion[]
  /** Renders the section as a full-colour band. */
  tone?: SectionTone
}

export interface ContentPage {
  /** Document title, without the site suffix. */
  documentTitle: string
  /** Meta description. */
  description: string
  eyebrow: string
  title: string
  lede: string
  sections: readonly ContentSection[]
  /** Optional closing call to action. */
  cta?: {
    title: string
    body: string
    /** Label for the primary link. The path itself is not translated. */
    primaryLabel: string
    primaryPath: string
    secondaryLabel?: string
    secondaryPath?: string
  }
}
