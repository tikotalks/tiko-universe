<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useBemm } from 'bemm'
import { TikoLogo } from '@tiko/ui'
import type { SiteFooterColumn, SiteFooterLink } from './site.model'

const props = withDefaults(defineProps<{
  columns?: SiteFooterColumn[]
  /** Where the brand mark navigates to. */
  homePath?: string
  /** Accessible name for the brand link. */
  homeLabel?: string
  tagline?: string
  copyright?: string
  legalLinks?: SiteFooterLink[]
}>(), {
  columns: () => [],
  homePath: '/',
  homeLabel: 'TikoTalks home',
  tagline: '',
  copyright: '',
  legalLinks: () => [],
})

const bemm = useBemm('site-footer', { return: 'string', includeBaseClass: true })
</script>

<template>
  <footer :class="bemm('')">
    <div :class="[bemm('inner'), 'container']">
      <div :class="bemm('top', ['', `cols-${props.columns.length}`])">
        <div :class="bemm('brand-col')">
          <RouterLink :class="bemm('brand')" :to="props.homePath" :aria-label="props.homeLabel">
            <TikoLogo />
          </RouterLink>
          <p v-if="props.tagline" :class="bemm('tagline')">{{ props.tagline }}</p>
        </div>

        <nav
          v-for="column in props.columns"
          :key="column.label"
          :class="bemm('col')"
          :aria-label="column.ariaLabel ?? column.label"
        >
          <p :class="bemm('col-label')">{{ column.label }}</p>
          <template v-for="link in column.links" :key="link.path">
            <a v-if="link.external" :href="link.path" :class="bemm('link')">
              {{ link.label }}
            </a>
            <RouterLink v-else :to="link.path" :class="bemm('link')">
              {{ link.label }}
              <span v-if="link.available" :class="bemm('available')">●</span>
            </RouterLink>
          </template>
        </nav>
      </div>

      <div :class="bemm('bottom')">
        <p v-if="props.copyright" :class="bemm('copy')">{{ props.copyright }}</p>
        <nav v-if="props.legalLinks.length" :class="bemm('legal')" aria-label="Legal">
          <template v-for="link in props.legalLinks" :key="link.path">
            <a v-if="link.external" :href="link.path" :class="bemm('link')">{{ link.label }}</a>
            <RouterLink v-else :to="link.path" :class="bemm('link')">{{ link.label }}</RouterLink>
          </template>
        </nav>
      </div>
    </div>
  </footer>
</template>

<style lang="scss">
.site-footer {
  background: #111111;
  color: rgba(255,255,255,0.7);
  padding-top: clamp(calc(var(--space) * 3), 8vw, calc(var(--space) * 5));
  padding-bottom: var(--space-l);
  margin-top: var(--section-space);

  &__inner {
    display: flex;
    flex-direction: column;
    gap: calc(var(--space) * 3);
  }

  // The brand column always leads; the link columns are laid out by count rather than
  // by auto-fit, so a two-column footer stays balanced instead of stretching.
  &__top {
    display: grid;
    grid-template-columns: 1fr;
    gap: clamp(calc(var(--space) * 1.5), 4vw, calc(var(--space) * 2.5));

    &--cols-1 { grid-template-columns: 1.5fr 1fr; }
    &--cols-2 { grid-template-columns: 1.5fr repeat(2, 1fr); }
    &--cols-3 { grid-template-columns: 1.5fr repeat(3, 1fr); }
    &--cols-4 { grid-template-columns: 1.5fr repeat(4, 1fr); }
  }

  &__brand {
    display: block;
    text-decoration: none;
    margin-bottom: var(--space);
    font-size: 48px;
    color: white;
    opacity: 0.85;
    letter-spacing: 0;
    transition: opacity 0.15s var(--ease-out);

    &:hover {
      opacity: 1;
    }
  }

  &__tagline {
    font-size: 0.875rem;
    line-height: 1.65;
    color: rgba(255,255,255,0.5);
    max-width: 24ch;
  }

  &__col-label {
    font-family: var(--font-family);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.4);
    margin-bottom: var(--space);
  }

  &__col {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__link {
    display: flex;
    align-items: center;
    gap: var(--space-s);
    font-size: 0.9rem;
    color: rgba(255,255,255,0.6);
    text-decoration: none;
    transition: color 0.15s var(--ease-out);

    &:hover {
      color: white;
    }
  }

  &__available {
    font-size: 0.55rem;
    color: #6ee7b7;
  }

  &__bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-s);
    padding-top: calc(var(--space) * 1.5);
  }

  &__legal {
    display: flex;
    align-items: center;
    gap: var(--space);
  }

  &__copy {
    font-size: 0.8rem;
    color: rgba(255,255,255,0.35);
  }
}

@media (max-width: 768px) {
  .site-footer {
    &__top {
      grid-template-columns: 1fr 1fr;
    }

    &__brand-col {
      grid-column: 1 / -1;
    }
  }
}

@media (max-width: 480px) {
  .site-footer {
    &__top {
      grid-template-columns: 1fr;
    }
  }
}
</style>
