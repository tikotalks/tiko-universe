<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { computed } from 'vue'
import { useBemm } from 'bemm'
import { docsPages, getDocsPage } from '../docsContent'

const bemm = useBemm('docs-page', { return: 'string', includeBaseClass: true })

const route = useRoute()

const currentPath = computed(() => {
  const section = route.params.section as string | undefined
  if (section) return `/docs/${section}` as '/docs' | '/docs/philosophy' | '/docs/architecture' | '/docs/apis'
  return '/docs'
})

const currentPage = computed(() => getDocsPage(currentPath.value) ?? docsPages[0])
</script>

<template>
  <div :class="[bemm(''), 'section']">
    <div class="container">
      <div class="docs-layout">
        <aside class="docs-sidebar" aria-label="Documentation pages">
          <p class="eyebrow">Docs</p>
          <nav class="docs-sidebar__nav">
            <RouterLink
              v-for="page in docsPages"
              :key="page.id"
              :to="page.path"
              class="docs-sidebar__link"
              :class="{ 'docs-sidebar__link--active': currentPage.id === page.id }"
              :aria-current="currentPage.id === page.id ? 'page' : undefined"
            >
              <strong class="docs-sidebar__link-title">{{ page.label }}</strong>
              <span class="docs-sidebar__link-summary">{{ page.summary }}</span>
            </RouterLink>
          </nav>
        </aside>

        <article class="docs-article" :key="currentPage.id">
          <header class="docs-article__header">
            <p class="eyebrow">Tiko platform docs</p>
            <h1 class="display-2 docs-article__title">{{ currentPage.title }}</h1>
            <p class="body-lg">{{ currentPage.lede }}</p>
          </header>

          <div v-if="currentPage.callouts?.length" class="docs-article__callouts">
            <div
              v-for="callout in currentPage.callouts"
              :key="callout.title"
              class="docs-callout card"
            >
              <strong class="docs-callout__title">{{ callout.title }}</strong>
              <p class="body-sm">{{ callout.body }}</p>
            </div>
          </div>

          <div class="docs-article__sections">
            <section
              v-for="section in currentPage.sections"
              :key="section.title"
              class="docs-section"
            >
              <p v-if="section.eyebrow" class="eyebrow">{{ section.eyebrow }}</p>
              <h2 class="docs-section__heading">{{ section.title }}</h2>
              <p
                v-for="paragraph in section.body"
                :key="paragraph"
                class="body-sm docs-section__body"
              >
                {{ paragraph }}
              </p>
              <ul v-if="section.bullets?.length" class="docs-section__bullets">
                <li v-for="bullet in section.bullets" :key="bullet" class="docs-section__bullet">
                  {{ bullet }}
                </li>
              </ul>
              <pre v-if="section.code"><code>{{ section.code }}</code></pre>
            </section>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.docs-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: clamp(2rem, 5vw, 4rem);
  align-items: start;
}

.docs-sidebar {
  position: sticky;
  top: calc(var(--header-height) + var(--sp-6));

  &__nav {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    margin-top: var(--sp-3);
  }

  &__link {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--sp-4);
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface-card);
    text-decoration: none;
    transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;

    &:hover {
      background: var(--surface-subtle);
      box-shadow: var(--shadow-sm);
    }

    &--active {
      background: color-mix(in srgb, #f6c85f 18%, var(--surface-card));
      border-color: color-mix(in srgb, #f6c85f 40%, transparent);
      box-shadow: var(--shadow-sm);
    }

    &-title {
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    &-summary {
      font-size: 0.78rem;
      line-height: 1.45;
      color: var(--text-muted);
    }
  }
}

.docs-article {
  display: flex;
  flex-direction: column;
  gap: clamp(var(--sp-8), 5vw, var(--sp-12));

  &__header {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
    padding-bottom: clamp(var(--sp-6), 4vw, var(--sp-10));
    border-bottom: 1px solid var(--border);
  }

  &__title {
    max-width: 18ch;
  }

  &__callouts {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--sp-3);
  }

  &__sections {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
  }
}

.docs-callout {
  padding: var(--sp-5);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);

  &__title {
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 800;
    color: var(--text-primary);
  }
}

.docs-section {
  padding: clamp(var(--sp-5), 3vw, var(--sp-8));
  background: var(--surface-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  box-shadow: var(--shadow-sm);

  &__heading {
    font-size: clamp(1.25rem, 3vw, 1.85rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    max-width: 22ch;
    color: var(--text-primary);
  }

  &__body {
    color: var(--text-secondary);
    line-height: 1.65;
  }

  &__bullets {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    padding-left: var(--sp-6);

    > * {
      position: relative;
      font-size: 0.9rem;
      line-height: 1.6;
      color: var(--text-secondary);

      &::before {
        content: '–';
        position: absolute;
        left: calc(-1 * var(--sp-4));
        color: var(--text-muted);
      }
    }
  }

  pre {
    font-size: 0.8rem;
  }
}

@media (max-width: 768px) {
  .docs-layout {
    grid-template-columns: 1fr;
  }

  .docs-sidebar {
    position: static;
  }
}
</style>
