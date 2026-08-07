<script setup lang="ts">
import { computed } from 'vue'
import { useBemm } from 'bemm'
import { activeLocale, setLocale, localeOptions, useCopy } from '../i18n'

/**
 * Language picker. A native `<select>` on purpose: it is keyboard accessible,
 * screen-reader friendly and usable one-handed on a phone without any of the
 * focus-trapping a custom dropdown would need.
 */
const bemm = useBemm('language-switcher', { return: 'string', includeBaseClass: true })
const copy = useCopy()

const options = computed(() => localeOptions.value)

function onChange(event: Event) {
  setLocale((event.target as HTMLSelectElement).value)
}
</script>

<template>
  <div :class="bemm()">
    <label :class="bemm('label')" for="site-language">{{ copy.common.chooseLanguage }}</label>
    <select
      id="site-language"
      :class="bemm('select')"
      :value="activeLocale"
      @change="onChange"
    >
      <option v-for="entry in options" :key="entry.code" :value="entry.code">
        {{ entry.native }}
      </option>
    </select>
  </div>
</template>

<style lang="scss">
.language-switcher {
  display: inline-flex;
  align-items: center;

  &__label {
    // Visible to assistive technology, not on screen — the globe-less select
    // beside a theme toggle reads clearly enough without a printed label.
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  &__select {
    appearance: none;
    border: 1px solid var(--surface-hairline);
    border-radius: 8px;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 0.85rem;
    padding: 0.4em 1.9em 0.4em 0.7em;
    cursor: pointer;
    // Chevron, drawn rather than shipped as an asset.
    background-image: linear-gradient(45deg, transparent 50%, currentColor 50%),
      linear-gradient(135deg, currentColor 50%, transparent 50%);
    background-position: calc(100% - 1.05em) 55%, calc(100% - 0.75em) 55%;
    background-size: 0.3em 0.3em, 0.3em 0.3em;
    background-repeat: no-repeat;

    &:hover {
      background-color: var(--surface-ink-wash);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    // The popup list is drawn by the OS, so it needs real colours rather than
    // `inherit` or it renders white-on-white in dark mode on some platforms.
    option {
      background: var(--color-background);
      color: var(--color-foreground);
    }
  }
}
</style>
