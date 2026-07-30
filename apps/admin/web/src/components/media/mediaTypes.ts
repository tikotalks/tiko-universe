/** A filter option plus how many items carry it. */
export interface FilterFacet {
  value: string
  count: number
}

/** The hand-editable metadata shared by media assets and generated images. */
export interface MediaDetails {
  title: string
  description: string
  category: string
  tags: string[]
}
