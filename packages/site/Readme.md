# @tiko/site

The shared chrome for Tiko's **public web surfaces** — `tikotalks.com` (`apps/website/web`) and
`media.tikoapps.org` (`apps/media/web`). It owns the header, the footer, and the design-token /
base / helper stylesheet those two surfaces have in common, so they cannot drift apart.

This is not the in-app kit. Apps that run *inside* the Tiko universe (`yes-no`, `type`, `cards`,
`sequence`, `timer`, …) use `TikoAppShell` / `TikoAppHeader` from `@tiko/ui` instead.

## Using it

Each surface loads its own palette first, then this stylesheet:

```scss
// apps/<surface>/web/src/styles.scss
@use '@sil/ui/defaults' with ($project-colors: ( 'primary': #2dd4bf, /* … */ ));
@use '@sil/ui/styles/main.scss';
@use '@tiko/site/src/site.scss';
```

`site.scss` deliberately does **not** load `@sil/ui/defaults` itself: the surfaces have different
accent hues (the website is purple, media is teal), and `@use`-ing a configured module twice in one
compilation is an error.

Then compose the shell:

```vue
<SiteHeader :links="navLinks" wordmark="Media" />
<main class="site__main"><RouterView /></main>
<SiteFooter :columns="footerColumns" :tagline="tagline" copyright="© 2026 TikoTalks" />
```

Both components need `vue-router` in scope. `SiteHeader` also owns the colour-mode toggle: it reads
and writes the `color-mode` key that each surface's `index.html` bootstrap script reads before
first paint to avoid a flash of the wrong theme.

Nav and footer content stays with the surface — this package holds no copy.
