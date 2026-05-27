# @tiko/ui

Tiko-specific web UI components that compose generic primitives from `@sil/ui`.

## Design rules

- Use `@sil/ui` for generic web primitives only: buttons, inputs, icons, global styles, and other low-level controls.
- Do not expose generic `Card`/panel chrome from TikoKit for child-facing app content.
- Tiko child-facing screens should feel direct and object-based: content sits on the page, not inside decorative cards.
- Avoid explanatory labels/chrome such as "optional setup" in the main play flow. Setup/recovery can exist later, but it must not distract from immediate app use.
- Keep `@tiko/ui` for product-specific composition: app shell/header, answer tiles, choice grids, settings panels, and API/TTS contracts.
