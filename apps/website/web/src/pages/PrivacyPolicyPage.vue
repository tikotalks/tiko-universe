<script setup lang="ts">
import { computed } from 'vue'
import PageSection from '../components/sections/PageSection.vue'
import { useCopy } from '../i18n'

const copy = useCopy()
const policy = computed(() => copy.value.privacy)

/**
 * A paragraph may place the support address with `{email}`. Splitting on the
 * token keeps the link a real `mailto:` anchor instead of `v-html`, and lets a
 * translation put the address wherever its own sentence needs it.
 */
function parts(paragraph: string): string[] {
  return paragraph.split('{email}')
}
</script>

<template>
  <div class="privacy-page">
    <PageSection
      :eyebrow="policy.eyebrow"
      :title="policy.title"
      :intro="policy.lede"
      width="narrow"
    />

    <PageSection width="narrow">
      <div class="prose">
        <p class="prose__meta">{{ policy.lastUpdatedLabel }}: {{ policy.lastUpdated }}</p>

        <template v-for="section in policy.sections" :key="section.id">
          <h2 :id="section.id">{{ section.title }}</h2>

          <p v-for="(paragraph, i) in section.body ?? []" :key="i">
            <template v-for="(chunk, c) in parts(paragraph)" :key="c">
              <a v-if="c > 0" :href="`mailto:${policy.supportEmail}`">{{ policy.supportEmail }}</a>{{ chunk }}
            </template>
          </p>

          <ul v-if="section.bullets?.length">
            <li v-for="(bullet, b) in section.bullets" :key="b">{{ bullet }}</li>
          </ul>
        </template>
      </div>
    </PageSection>
  </div>
</template>

<style lang="scss">
.privacy-page {
  .prose {
    max-width: 70ch;
    line-height: 1.7;

    &__meta {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: 2rem;
    }

    h2 {
      font-family: var(--font-family-heading);
      font-size: clamp(1.25rem, 2.5vw, 1.6rem);
      margin-top: 2.5rem;
      margin-bottom: 0.75rem;
    }

    p {
      margin-bottom: 1rem;
      color: var(--text-secondary);
    }

    ul {
      margin: 0 0 1rem 1.1rem;
      padding: 0;
      color: var(--text-secondary);
    }

    li {
      margin-bottom: 0.5rem;
    }

    a {
      color: var(--color-primary);
      text-decoration: underline;
    }
  }
}
</style>
