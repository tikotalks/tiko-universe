export type ImageMode = 'icon' | 'coloring' | 'background'
export type TikoStyle = 'tiko-original' | 'tiko-v2' | 'tiko-natural'

export interface ImagePromptEnv {
  ATLAS_SERVICE?: {
    fetch(input: Request | string, init?: RequestInit): Promise<Response>
  }
  ATLAS_BASE_URL?: string
}

export const ALLOWED_IMAGE_SIZES = new Set(['1024x1024', '1024x1792', '1792x1024'])

const ICON_STYLE_SPECS: Record<TikoStyle, object> = {
  'tiko-original': {
    task: "Generate a friendly flat 2D icon in a warm, sticker-like illustration style. Clean, bold, child-friendly.",
    style_reference: "Flat 2D illustration - like a cheerful sticker or children's book icon. Clean filled shapes with soft outlines. Warm, saturated colors. Minimal shading: flat fills with very subtle edge darkening for form. No 3D rendering, no volumetric lighting.",
    icon_idea: null,
    render_style: {
      materials: "Flat color fills only. Suggest material through color and simple shape - no volumetric rendering, no specular highlights.",
      shapes: "Bold, clean, simplified. Rounded corners, friendly proportions. Slightly stylized - not ultra-minimal, not overly complex.",
      colors: "Warm, cheerful, limited palette: 2-3 bold fills. Saturated but not neon. Warm orange, sky blue, leaf green, sun yellow. Objects look like themselves in a friendly sticker way.",
      lighting: "Flat or very soft inner glow only. No cast shadows, no volumetric lighting.",
      background: "transparent"
    },
    composition: {
      camera: "Straight front-facing or very slight 3/4.",
      layout: "Single centered subject. Clean silhouette. Optional very subtle drop shadow for grounding.",
      aspect_ratio: "1:1 square, minimum 1024x1024px",
      file_format: "High-res PNG"
    },
    surface_texture: {
      enable: false,
      texture_strength: "none",
      texture_scale: "none",
      rules: "No texture. Flat fills only."
    },
    material_hints: {
      animal: "Flat colored areas with simple outline details.",
      plant: "Solid green fills, simple vein line if needed.",
      fabric: "Flat colored panel; seam lines optional.",
      metal: "Flat color with optional thin highlight line.",
      plastic: "Flat color, small circular highlight dot."
    },
    details: {
      expression: "Friendly, simple. Faces optional unless specified.",
      structure: "Bold simplified forms; immediately readable at small sizes.",
      pose: "Clean silhouette for icon use.",
      style_constraints: "No 3D rendering, no gradient shading, no complex textures, no text or letters unless explicitly requested."
    }
  },
  'tiko-v2': {
    task: "Generate a 3D icon in a soft, stylized, contemporary look (playful but mature). Absolutely no leaves, foliage, plant elements, or text/letters unless explicitly described in icon_idea.",
    style_reference: "Soft 3D icon style in a playful, toy-like aesthetic. Smooth rounded forms, vivid natural color, calm proportions. Think high-quality vinyl toy or clay render - stylized and charming, not realistic. Subtle volumetric hints for depth but never photoreal. UI-friendly and readable at small sizes.",
    icon_idea: null,
    render_style: {
      materials: "Soft matte vinyl/clay feel. Suggest material through color and form, not texture maps - a bowl of rice has distinguishable kernels, wood has warm tone variation, fruit has gentle color gradation. Stay stylized, never photorealistic.",
      shapes: "Rounded but not chubby: tighter corner radii, controlled bevels, clean planes. No toy-like bulges; maintain confident geometry.",
      colors: "Truthful colors at natural saturation. Objects look like themselves - green leaves, red tomatoes, golden bread. 2-3 core colors plus one subtle accent. Balanced saturation; avoid candy/neon, rainbow mixes, or oversaturated single-hue dominance.",
      lighting: "Soft studio lighting with gentle key-fill contrast for a hint of dimension - just enough to lift the subject off the page. Faint rim light for pop. Soft grounded shadow. Think vinyl toy photography, not product photography. No harsh speculars.",
      background: "transparent"
    },
    composition: {
      camera: "Orthographic or slight 3/4 top-front",
      layout: "Single centered subject, grounded shadow or soft float. No decorative stars, dots, or clutter.",
      aspect_ratio: "1:1 square format, minimum 1024x1024px",
      file_format: "High-res PNG"
    },
    surface_texture: {
      enable: true,
      texture_strength: "minimal",
      texture_scale: "micro",
      rules: "Suggest material identity through subtle cues, not texture maps. Rice should show individual kernels in a stylized way; wood has warmth but no grain photo-realism; fabric suggests softness through form. Overall feel stays clean and toy-like - detail is a hint, not a feature."
    },
    material_hints: {
      animal: "Ultra-fine short flocking only on edges and silhouette-no visible strands.",
      plant: "Very light velvety bloom on leaves; bark hints only where it aids silhouette.",
      fabric: "Tight felt/woven suggestion, barely visible.",
      metal: "Fine powder-coat or brushed hint; no bright streaks.",
      plastic: "Smooth satin polymer; micro-speckle only on grazing angles."
    },
    details: {
      expression: "Neutral; no faces unless specified.",
      structure: "Clear, mature proportions; stylized but not cute or distorted.",
      pose: "Clean silhouette for icon use; instantly recognizable at small sizes.",
      style_constraints: "No oversized features, blush, sparkles, heavy gloss, visible grain, leaves, foliage, vines, plant parts, text, letters, numbers, or typographic elements unless explicitly requested."
    }
  },
  'tiko-natural': {
    task: "Generate a soft 3D icon in a natural, lively style. Same rounded toy-like forms as Tiko V2 but with a grounded color palette that stays bright and cheerful - not oversaturated, not muted.",
    style_reference: "Soft 3D icon with natural but vibrant colors. Same rounded vinyl-toy aesthetic but colors feel like fresh matte paint - present and lively without being neon. Think high-quality children's wooden toy or Scandinavian illustration with punchy but natural hues - clear greens, warm reds, golden yellows, sky blues.",
    icon_idea: null,
    render_style: {
      materials: "Same satin-matte vinyl/clay as V2. Colors feel like fresh matte paint on physical objects - bright and present, not dull or muddy.",
      shapes: "Rounded but confident. Same as V2.",
      colors: "Natural but bright palette: 2-3 colors at medium-high saturation. A tomato is a clear warm red, leaves are a fresh green, bread is a golden yellow, sky is a clear blue. Never neon, never washed-out or muddy. Target medium-high saturation with warm undertones. When in doubt, choose brighter over more muted.",
      lighting: "Same soft studio lighting as V2 but slightly warmer. Gentle diffuse light that lets the colors read clearly. No harsh speculars.",
      background: "transparent"
    },
    composition: {
      camera: "Orthographic or slight 3/4 top-front.",
      layout: "Single centered subject, grounded shadow or soft float. No decorative clutter.",
      aspect_ratio: "1:1 square, minimum 1024x1024px",
      file_format: "High-res PNG"
    },
    surface_texture: {
      enable: true,
      texture_strength: "minimal",
      texture_scale: "micro",
      rules: "Same as V2 - suggest material through subtle cues, not texture maps."
    },
    material_hints: {
      animal: "Ultra-fine short flocking only on edges.",
      plant: "Very light velvety bloom on leaves.",
      fabric: "Tight felt suggestion, barely visible.",
      metal: "Fine powder-coat hint.",
      plastic: "Smooth satin polymer."
    },
    details: {
      expression: "Neutral; no faces unless specified.",
      structure: "Clear, mature proportions; stylized but not cute or distorted.",
      pose: "Clean silhouette for icon use.",
      style_constraints: "No oversaturation, no candy colors, no neon. No sparkles, gloss streaks, or heavy specular. No text or letters unless explicitly requested."
    }
  }
}

const IMAGE_STYLE_SPECS: Record<ImageMode, object> = {
  icon: ICON_STYLE_SPECS['tiko-v2'],
  coloring: {
    task: "Generate a black-and-white coloring page (clean line art only). The subject must be fully contained within the frame with no parts cut off. CRITICAL: Absolutely NO border lines, frames, or rectangles around the edge of the image.",
    style_reference: "Crisp, closed outlines with consistent stroke weight; pure black lines on white; no shading, gradients, textures, halftones, or colors. Subject fully visible with generous padding from edges. The edge of the image must be pure white with no lines.",
    icon_idea: null,
    render_style: {
      materials: "None (ink line art). Do not simulate materials.",
      shapes: "Fully closed shapes that form clear 'panels' for coloring. Avoid gaps and feathered edges.",
      colors: "Monochrome only: black outlines (#000) on white (#FFF). No gray.",
      lighting: "None. Do not imply light/shadow.",
      background: "Pure white. No border lines, frames, or decorative elements around the edges."
    },
    composition: {
      camera: "Orthographic, straight-on or slight 3/4 if needed for clarity.",
      layout: "Single centered subject with 10-15% padding from all edges. Complete subject visible, no cropping. No border lines or frames.",
      aspect_ratio: "1:1 square, minimum 1024x1024px (vector look acceptable).",
      file_format: "High-res PNG or SVG"
    },
    surface_texture: {
      enable: false,
      texture_strength: "none",
      texture_scale: "none",
      rules: "No hatching, stipple, halftone, or line-weight shading."
    },
    material_hints: {
      animal: "Use contour outlines only; no fur strokes beyond silhouette-defining lines.",
      plant: "Use simple vein lines; keep fills empty.",
      fabric: "Seam lines allowed; no fabric shading.",
      metal: "No reflections; outline only.",
      plastic: "Outline only."
    },
    details: {
      expression: "Neutral unless specified.",
      structure: "Clear, readable proportions; simplified forms to ease coloring.",
      pose: "Strong, readable silhouette. Ensure all parts fit comfortably within frame.",
      style_constraints: "No gradients, noise, shadows, grayscale, or border lines. Keep stroke weight consistent (eg 3-6 px at 1024px). No lines touching or extending to image edges."
    },
    stroke_rules: {
      weight: "Uniform stroke weight; thicker outer contour, optionally slightly thinner inner details.",
      joins_caps: "Round joins and caps preferred; no feathering.",
      closure: "All panels must be watertight (no open paths).",
      borders: "No border lines or frames around the image. Subject should float freely in white space."
    },
    export_rules: {
      vector_priority: "Prefer SVG with paths; if raster, ensure 2-color (1-bit) output.",
      cleanup: "No anti-aliased edges; crisp pixels. No border artifacts."
    }
  },
  background: {
    task: "Generate a stylized background scene with soft 3D elements. Create a cohesive environment with less crowded center area suitable for UI overlays or content placement.",
    style_reference: "Soft 3D background style matching icon aesthetics - smooth rounded forms, calm balanced composition with breathing room in the center. Same refined palette and lighting as icons.",
    icon_idea: null,
    render_style: {
      materials: "Satin-matte surfaces matching icon style. Smooth with minimal texture.",
      shapes: "Rounded environmental elements, architectural or natural forms. Distributed to frame rather than fill the center.",
      colors: "Cohesive palette using 2-3 main colors plus accents. Match icon saturation levels. Gradient-friendly.",
      lighting: "Soft ambient with directional key light. Atmospheric perspective for depth. Subtle volumetric effects allowed.",
      background: "Full scene with sky/environment. Gradient or soft color transitions."
    },
    composition: {
      camera: "Wide angle, slight elevation. Environmental perspective.",
      layout: "Elements concentrated in corners/edges, sparse center. Rule of thirds. Create natural frame or vignette effect.",
      aspect_ratio: "Variable based on mode - landscape (3:2), portrait (2:3), or square (1:1)",
      file_format: "High-res PNG"
    },
    surface_texture: {
      enable: true,
      texture_strength: "minimal",
      texture_scale: "micro",
      rules: "Match icon texture approach. Very subtle, barely perceptible."
    },
    material_hints: {
      clouds: "Soft volumetric forms, no hard edges.",
      terrain: "Smooth rolling forms, stylized not realistic.",
      architecture: "Simplified geometric structures with rounded edges.",
      foliage: "Abstracted shapes, avoid detailed leaves unless specified.",
      water: "Smooth stylized surfaces, minimal ripples."
    },
    details: {
      density: "30-40% coverage, leaving center area relatively open.",
      depth_layers: "Foreground elements at edges, midground sparse, background atmospheric.",
      focal_point: "Avoid strong focal points in center third of image.",
      style_constraints: "No photo-realism, maintain soft 3D icon aesthetic throughout. No text or UI elements."
    }
  }
}

const ICON_ART_DIRECTOR_PROMPTS: Record<TikoStyle, string> = {
  'tiko-original': `You are a senior art director. Convert the user's JSON style spec into a single, explicit, 180-300 word image brief for an image-generation model.
Rules:
- Flat 2D illustration only - no 3D rendering, no volumetric lighting, no plastic or vinyl shine.
- Clean filled shapes with soft outlines; warm, cheerful, limited color palette.
- Minimal shading: flat fills with at most a very subtle inner glow or edge darkening for form. No cast shadows.
- Think cheerful sticker art or a friendly children's book illustration - instantly readable, simple, warm.
- Do not use any text, letters, or numbers in the images.
- Include: subject, composition, color palette (name specific warm/bold hues), outline style, simplification level, dos/don'ts.
- Be directive, not optional. No meta talk. No lists. No JSON.`,
  'tiko-v2': `You are a senior art director. Convert the user's JSON style spec into a single, explicit, 180-300 word image brief for an image-generation model.
Rules:
- Do not use any wording or letters in the images.
- Keep ONE consistent visual style across outputs (soft 3D toy-like, rounded forms, balanced truthful color).
- The overall aesthetic is playful and stylized like a high-quality vinyl toy or clay render - NOT photorealistic. Ever.
- Truthful colors at natural saturation: a leaf is green, rice is cream, a tomato is red. Keep saturation balanced - not washed out, not candy-bright. Avoid any single hue dominating the whole image.
- Subtle hints of dimension: soft shadows, gentle light wrapping. Just enough to not look flat. Not realistic shading.
- Suggest material identity through form and color cues (rice kernels, wood warmth) - never through photorealistic texture.
- Include: subject, camera, composition, lighting, palette, materials, textures, surface detail, silhouettes, dos/don'ts.
- Be directive, not optional. No meta talk. No lists. No JSON.`,
  'tiko-natural': `You are a senior art director. Convert the user's JSON style spec into a single, explicit, 180-300 word image brief for an image-generation model.
Rules:
- Do not use any text or letters in the images.
- Same soft 3D toy-like style as Tiko V2 - rounded forms, vinyl/clay aesthetic, NOT photorealistic.
- CRITICAL: use natural, balanced colors. Pull saturation back to feel like matte print, not a screen-vivid render. A tomato is warm dusty red, not bright neon red. Leaves are sage green, not vivid emerald. Bread is warm beige. Sky is powder blue.
- Target mid-saturation with warm undertones throughout. When choosing between vivid and muted, always choose more muted.
- Soft studio lighting, same as V2 but slightly warmer and lower-contrast. Lean toward calm diffuse light. No harsh speculars.
- Suggest material identity through form and color cues - never through photorealistic texture.
- Include: subject, camera, composition, lighting, palette (with specific muted/warm color names), materials, textures, surface detail, silhouettes, dos/don'ts.
- Be directive, not optional. No meta talk. No lists. No JSON.`,
}

const ART_DIRECTOR_SYSTEM_PROMPTS: Record<ImageMode, string> = {
  icon: ICON_ART_DIRECTOR_PROMPTS['tiko-v2'],
  coloring: `You are a senior art director. Convert the user's JSON style spec into a single, explicit, 180-300 word image brief for an image-generation model producing a coloring page.
Rules:
- EMPHASIZE no border lines or frames at the image edges. The image must have a pure white background that extends to the edges with no black lines forming a border or frame.
- Pure black outlines on white only. No shading, no gray, no color.
- Include: subject, composition, stroke style, closure rules, padding, dos/don'ts.
- Be directive, not optional. No meta talk. No lists. No JSON.`,
  background: `You are a senior art director. Convert the user's JSON style spec into a single, explicit, 180-300 word image brief for an image-generation model producing a stylized background scene.
Rules:
- Do not use any wording or letters in the images.
- Keep ONE consistent visual style (soft 3D, matching the icon aesthetic).
- Keep the center area sparse - elements should frame, not fill.
- Include: scene description, depth layers, camera, composition, lighting, palette, materials, dos/don'ts.
- Be directive, not optional. No meta talk. No lists. No JSON.`
}

export async function boostPrompt(subject: string, mode: ImageMode, tikoStyle: TikoStyle, env: ImagePromptEnv): Promise<string> {
  if (!env.ATLAS_SERVICE) throw new Error('Atlas service not available for prompt boost')

  const spec = mode === 'icon'
    ? { ...ICON_STYLE_SPECS[tikoStyle], icon_idea: subject }
    : { ...IMAGE_STYLE_SPECS[mode], icon_idea: subject }
  const systemPrompt = mode === 'icon'
    ? ICON_ART_DIRECTOR_PROMPTS[tikoStyle]
    : ART_DIRECTOR_SYSTEM_PROMPTS[mode]

  const atlasBase = (env.ATLAS_BASE_URL ?? 'https://tiko-atlas-api-dev.silvandiepen.workers.dev/v1/atlas').replace(/\/$/, '')
  const response = await env.ATLAS_SERVICE.fetch(new Request(`${atlasBase}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      capability: 'text.generate',
      app: 'generation-api',
      purpose: 'image-art-director',
      input: { input: JSON.stringify(spec, null, 2), system: systemPrompt },
    }),
  }))

  if (!response.ok) {
    const errorText = await response.text()
    let detail = errorText
    try { detail = JSON.parse(errorText).error?.message || errorText } catch { /* keep raw */ }
    console.error('[boost] Atlas prompt boost failed', { status: response.status, detail })
    throw new Error(`Prompt boost failed: ${detail}`)
  }
  const data = await response.json() as { data?: { output?: string } }
  return (data.data?.output ?? '').trim()
}
