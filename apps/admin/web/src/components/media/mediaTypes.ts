/** A filter option plus how many items carry it. */
export interface FilterFacet {
  value: string
  count: number
}

/**
 * How much of a facet list the API actually returned. The library holds far more
 * distinct tags than a dropdown wants, so the list is capped — the UI has to say
 * so, otherwise a rare tag looks like it doesn't exist.
 */
export interface FacetMeta {
  returned: number
  total: number
  truncated: boolean
}

/** The hand-editable metadata shared by media assets and generated images. */
export interface MediaDetails {
  title: string
  description: string
  category: string
  tags: string[]
}
