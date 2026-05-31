<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="media-site">
    <header class="media-site__header">
      <RouterLink to="/" class="media-site__brand" aria-label="Tiko Media home">
        <span class="media-site__brand-mark">✦</span>
        <span>
          <strong>Tiko Media</strong>
          <small>Images, audio, video and stories</small>
        </span>
      </RouterLink>

      <nav class="media-site__nav" aria-label="Media sections">
        <a href="#featured">Featured</a>
        <a href="#browse">Browse</a>
        <a href="#categories">Categories</a>
      </nav>
    </header>

    <main>
      <RouterView />
    </main>
  </div>
</template>

<style lang="scss">
@use './styles/_tokens.scss';

:root {
  color-scheme: light dark;
}

body {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--color-primary) 24%, transparent), transparent 28rem),
    radial-gradient(circle at top right, color-mix(in srgb, var(--color-secondary) 18%, transparent), transparent 26rem),
    var(--color-background);
}

.media-site {
  min-height: 100vh;
  color: var(--color-foreground);

  &__header {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem clamp(1rem, 4vw, 3rem);
    backdrop-filter: blur(20px);
    background: color-mix(in srgb, var(--color-background) 82%, transparent);
    border-bottom: 1px solid var(--tiko-border);
  }

  &__brand {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    color: inherit;
    text-decoration: none;

    strong,
    small {
      display: block;
      line-height: 1.1;
    }

    strong {
      font-size: 1.05rem;
      font-weight: 900;
    }

    small {
      margin-top: 0.15rem;
      color: color-mix(in srgb, var(--color-foreground) 58%, transparent);
      font-size: 0.78rem;
      font-weight: 700;
    }
  }

  &__brand-mark {
    display: grid;
    place-items: center;
    width: 2.65rem;
    height: 2.65rem;
    border-radius: 1rem;
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    color: var(--color-primary-text);
    box-shadow: 0 1rem 2rem color-mix(in srgb, var(--color-primary) 25%, transparent);
  }

  &__nav {
    display: flex;
    align-items: center;
    gap: 0.35rem;

    a {
      padding: 0.6rem 0.85rem;
      border-radius: 999px;
      color: color-mix(in srgb, var(--color-foreground) 72%, transparent);
      text-decoration: none;
      font-weight: 800;
      font-size: 0.9rem;

      &:hover {
        color: var(--color-foreground);
        background: var(--tiko-surface-raised);
      }
    }
  }
}

@media (max-width: 42rem) {
  .media-site {
    &__header {
      align-items: flex-start;
      flex-direction: column;
    }

    &__nav {
      width: 100%;
      overflow-x: auto;
    }
  }
}
</style>
