<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { faqs } from '../siteContent'
import { ref } from 'vue'

const openIndex = ref<number | null>(null)

function toggle(i: number) {
  openIndex.value = openIndex.value === i ? null : i
}
</script>

<template>
  <div class="faq-page">
    <header class="faq-page__hero section">
      <div class="container">
        <p class="eyebrow">Frequently asked questions</p>
        <h1 class="display-1 faq-page__heading">Plain answers<br />before setup.</h1>
        <p class="body-lg faq-page__lede">
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
            class="faq-item"
            :class="{ 'faq-item--open': openIndex === i }"
          >
            <button class="faq-item__question" @click="toggle(i)" :aria-expanded="openIndex === i">
              <span>{{ item.question }}</span>
              <span class="faq-item__arrow" aria-hidden="true">{{ openIndex === i ? '↑' : '↓' }}</span>
            </button>
            <div v-show="openIndex === i" class="faq-item__answer">
              <p class="body-sm">{{ item.answer }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="faq-page__more section">
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

<style scoped lang="scss">
.faq-page {
  &__hero {
    background: var(--surface-subtle);
    border-bottom: 1px solid var(--border);
  }

  &__heading {
    max-width: 12ch;
    margin-bottom: var(--sp-6);
  }

  &__lede {
    max-width: 48ch;
  }
}

.faq-list {
  padding-top: var(--sp-12);
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.faq-item {
  background: var(--surface-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.15s;

  &--open {
    box-shadow: var(--shadow-md);
    border-color: var(--border-strong);
  }

  &__question {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-4);
    padding: var(--sp-5) var(--sp-6);
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text-primary);
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
    padding: 0 var(--sp-6) var(--sp-5);
    border-top: 1px solid var(--border);
    padding-top: var(--sp-4);
  }
}

.faq-page__more {
  background: var(--surface-subtle);
  border-top: 1px solid var(--border);
}

.faq-more {
  max-width: 52ch;
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);

  &__link {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--text-secondary);
    text-decoration: none;

    &:hover { color: var(--text-primary); }
  }
}
</style>
