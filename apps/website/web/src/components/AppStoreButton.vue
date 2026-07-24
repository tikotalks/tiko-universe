<script setup lang="ts">
/**
 * Official-style "Download on the App Store" badge. Renders the Apple logo +
 * lockup as accessible HTML/CSS (crisp, translatable) rather than a text-in-SVG
 * image. Apple black badge per App Store marketing guidelines.
 */
withDefaults(defineProps<{ href: string; label?: string }>(), {
  label: 'Download on the App Store',
})
</script>

<template>
  <a
    class="app-store-btn"
    :href="href"
    target="_blank"
    rel="noopener"
    :aria-label="label"
  >
    <svg class="app-store-btn__logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.427-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.88.06 4.373 2.19-.115.07-2.463 1.43-2.463 4.55 0 3.65 3.157 4.93 3.215 4.95z"
      />
    </svg>
    <span class="app-store-btn__text">
      <span class="app-store-btn__caption">Download on the</span>
      <span class="app-store-btn__name">App Store</span>
    </span>
  </a>
</template>

<style lang="scss">
.app-store-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  height: clamp(44px, 6vw, 52px);
  padding-inline: 1rem 1.6rem;
  border-radius: 14px;
  background: #000000;
  color: #ffffff;
  text-decoration: none;
  transition: transform 0.2s var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1)),
    box-shadow 0.2s var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1));
  box-shadow: 0 12px 30px -16px rgba(0, 0, 0, 0.5);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 38px -18px rgba(0, 0, 0, 0.55);
  }

  &:active {
    transform: translateY(0);
  }

  &__logo {
    width: 1.5rem;
    height: 1.5rem;
    fill: currentColor;
    flex-shrink: 0;
  }

  &__text {
    display: flex;
    flex-direction: column;
    line-height: 1.05;
    font-family: var(--font-family);
  }

  &__caption {
    font-size: 0.62rem;
    letter-spacing: 0.02em;
    opacity: 0.92;
  }

  &__name {
    font-size: 1.18rem;
    font-weight: 700;
    letter-spacing: 0.01em;
  }
}

@media (prefers-color-scheme: dark) {
  .app-store-btn {
    background: #ffffff;
    color: #000000;
  }
}
</style>
