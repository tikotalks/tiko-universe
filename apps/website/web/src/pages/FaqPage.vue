<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useBemm } from 'bemm'
import { faqs } from '../siteContent'
import { ref } from 'vue'

const bemm = useBemm('faq-page', { return: 'string', includeBaseClass: true })
const bemmItem = useBemm('faq-item', { return: 'string', includeBaseClass: true })

const openIndex = ref<number | null>(null)

function toggle(i: number) {
  openIndex.value = openIndex.value === i ? null : i
}
</script>

<template>
  <div :class="bemm('')">
    <header :class="[bemm('hero'), 'section']">
      <div class="container">
        <p class="eyebrow">Frequently asked questions</p>
        <h1 :class="['display-1', bemm('heading')]">Plain answers<br />before setup.</h1>
        <p :class="['body-lg', bemm('lede')]">
          Short answers to the questions caregivers, teachers, and developers ask most often.
        </p>
      </div>
    </header>

    <section class="section section--flush-top">
      <div class="container">
        <div class="faq-list">
          <article
            v-for="(item, i) in faqs"
            :key="item.question"
            :class="bemmItem('', { open: openIndex === i })"
          >
            <button :class="bemmItem('question')" @click="toggle(i)" :aria-expanded="openIndex === i">
              <span>{{ item.question }}</span>
              <span :class="bemmItem('arrow')" aria-hidden="true">{{ openIndex === i ? '↑' : '↓' }}</span>
            </button>
            <div v-show="openIndex === i" :class="bemmItem('answer')">
              <p class="body-sm">{{ item.answer }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section :class="[bemm('more'), 'section']">
      <div class="container">
        <div class="faq-more">
          <p class="eyebrow">Still have questions?</p>
          <h2 class="display-3">Read the full documentation.</h2>
          <p class="body-lg">The docs cover philosophy, architecture, and API contracts in detail.</p>
          <RouterLink to="/docs" class="faq-more__link">Go to docs →</RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style lang="scss">
.faq-page {
  &__hero {
    background: var(--surface-subtle);
  }

  &__heading {
    max-width: 12ch;
    margin-bottom: calc(var(--space) * 1.5);
  }

  &__lede {
    max-width: 48ch;
  }

  &__more {
    background: var(--surface-subtle);
  }
}

.faq-list {
  padding-top: calc(var(--space) * 3);
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: var(--space-s);
}

.faq-item {
  background: var(--surface-card);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow-s);
  transition: box-shadow 0.15s;

  &--open {
    box-shadow: var(--shadow-m);
  }

  &__question {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space);
    padding: calc(var(--space) * 1.25) calc(var(--space) * 1.5);
    background: none;
    text-align: left;
    cursor: pointer;
    font-family: var(--font-family-heading);
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--color-foreground);
    line-height: 1.35;

    &:hover {
      background: var(--surface-ink-wash);
    }
  }

  &__arrow {
    flex-shrink: 0;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  &__answer {
    padding: 0 calc(var(--space) * 1.5) calc(var(--space) * 1.25);
    padding-top: var(--space);
  }
}

.faq-more {
  max-width: 52ch;
  display: flex;
  flex-direction: column;
  gap: var(--space);

  &__link {
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--text-secondary);
    text-decoration: none;

    &:hover { color: var(--color-foreground); }
  }
}
</style>
