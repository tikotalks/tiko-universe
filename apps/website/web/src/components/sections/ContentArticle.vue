<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useBemm } from 'bemm'
import type { ContentPage } from '../../i18n'
import PageSection from './PageSection.vue'
import PrinciplePanels from './PrinciplePanels.vue'
import StepList from './StepList.vue'
import CtaBanner from './CtaBanner.vue'
import { sectionTones as tones } from '../../siteContent'

/**
 * Renders a `ContentPage`. Every explainer page on the site goes through here,
 * so they share one set of section shapes and pick up translations without
 * each page re-implementing a layout.
 */
defineProps<{ page: ContentPage }>()

const bemm = useBemm('content-article', { return: 'string', includeBaseClass: true })
</script>

<template>
  <article :class="bemm()">
    <PageSection :eyebrow="page.eyebrow" :title="page.title" :intro="page.lede" layout="split" />

    <PageSection
      v-for="(section, i) in page.sections"
      :id="section.id"
      :key="section.id"
      :eyebrow="section.eyebrow"
      :title="section.title"
      :intro="section.lede"
      :tone="section.tone"
      layout="split"
    >
      <div :class="bemm('body')">
        <p v-for="(paragraph, p) in section.body ?? []" :key="p" :class="bemm('paragraph')">
          {{ paragraph }}
        </p>
      </div>

      <PrinciplePanels
        v-if="section.points?.length"
        :class="bemm('points')"
        :panels="section.points.map((point, p) => ({
          marker: String(p + 1).padStart(2, '0'),
          title: point.title,
          body: point.body,
          // Offset per section so two adjacent sections never open on the same
          // colour, which would read as one long band.
          tone: tones[(p + i) % tones.length],
        }))"
      />

      <StepList v-if="section.steps?.length" :class="bemm('steps')" :steps="[...section.steps]" />

      <dl v-if="section.questions?.length" :class="bemm('questions')">
        <div v-for="qa in section.questions" :key="qa.question" :class="bemm('qa')">
          <dt :class="bemm('question')">{{ qa.question }}</dt>
          <dd :class="bemm('answer')">{{ qa.answer }}</dd>
        </div>
      </dl>
    </PageSection>

    <PageSection v-if="page.cta">
      <CtaBanner tone="primary" :title="page.cta.title" :body="page.cta.body">
        <template #actions>
          <RouterLink class="btn btn--light" :to="page.cta.primaryPath">
            {{ page.cta.primaryLabel }}
          </RouterLink>
          <RouterLink
            v-if="page.cta.secondaryPath && page.cta.secondaryLabel"
            class="btn btn--ghost-light"
            :to="page.cta.secondaryPath"
          >
            {{ page.cta.secondaryLabel }}
          </RouterLink>
        </template>
      </CtaBanner>
    </PageSection>
  </article>
</template>

<style lang="scss">
.content-article {
  &__body:empty {
    display: none;
  }

  &__paragraph {
    // A real reading measure. Marketing pages run to a few hundred words now,
    // and full-width lines at 1440px are unreadable.
    max-width: 68ch;
    line-height: 1.7;
    color: var(--text-secondary);

    + .content-article__paragraph {
      margin-top: 1em;
    }
  }

  .section--toned &__paragraph {
    color: color-mix(in srgb, var(--section-fg), transparent 20%);
  }

  &__points,
  &__steps {
    margin-top: 2rem;
  }

  &__body:empty + &__points,
  &__body:empty + &__steps {
    margin-top: 0;
  }

  &__questions {
    margin: 0;
  }

  &__body:not(:empty) + &__questions {
    margin-top: 2rem;
  }

  &__qa {
    padding-block: clamp(1rem, 2.5vw, 1.5rem);
    border-block-start: 1px solid var(--surface-hairline);
    max-width: 68ch;

    &:last-child {
      border-block-end: 1px solid var(--surface-hairline);
    }
  }

  &__question {
    font-family: var(--font-family-heading);
    font-size: clamp(1.05rem, 2vw, 1.3rem);
    line-height: 1.25;
  }

  &__answer {
    margin: 0.5rem 0 0;
    line-height: 1.7;
    color: var(--text-secondary);
  }

  .section--toned &__answer {
    color: color-mix(in srgb, var(--section-fg), transparent 20%);
  }
}
</style>
