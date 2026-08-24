<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Button, InputText } from '@sil/ui'
import { useBemm } from 'bemm'
import { useAdminApiKeys, type IssuedMediaUploadApiKey, type MediaUploadApiKey } from '../../composables/useAdminApiKeys'
import type { ApiKeyCreateForm } from './ApiKeysPage.model'

const bemm = useBemm('api-keys-page', { return: 'string', includeBaseClass: true })
const { keys, loading, saving, error, list, create, revoke } = useAdminApiKeys()
const form = ref<ApiKeyCreateForm>({ name: 'Codex media publisher', expiresInDays: 90 })
const issuedKey = ref<IssuedMediaUploadApiKey | null>(null)
const copyMessage = ref('')

function formatDate(value: string | null): string {
  if (!value) return 'Never'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

async function createKey(): Promise<void> {
  issuedKey.value = null
  copyMessage.value = ''
  try {
    issuedKey.value = await create({ ...form.value })
  } catch {
    // The composable exposes the server error in the page state.
  }
}

async function copyKey(): Promise<void> {
  if (!issuedKey.value) return
  try {
    await navigator.clipboard.writeText(issuedKey.value.key)
    copyMessage.value = 'Copied. Store it in TIKO_MEDIA_API_KEY now; it cannot be shown again.'
  } catch {
    copyMessage.value = 'Copy failed. Select the key and store it in TIKO_MEDIA_API_KEY now.'
  }
}

async function revokeKey(key: MediaUploadApiKey): Promise<void> {
  if (!window.confirm(`Revoke ${key.name}? Uploads using this key will stop working.`)) return
  try {
    await revoke(key.id)
  } catch {
    // The composable exposes the server error in the page state.
  }
}

onMounted(() => { void list() })
</script>

<template>
  <main :class="bemm('')">
    <header :class="bemm('header')">
      <div>
        <h1 :class="bemm('title')">API keys</h1>
        <p :class="bemm('subtitle')">Create narrowly scoped keys for publishing generated images to Tiko Media.</p>
      </div>
    </header>

    <p v-if="error" :class="bemm('error')" role="alert">{{ error }}</p>

    <section :class="bemm('panel')" aria-labelledby="create-key-title">
      <div :class="bemm('panel-heading')">
        <h2 id="create-key-title" :class="bemm('panel-title')">Create media upload key</h2>
        <p :class="bemm('panel-copy')">Keys can upload and analyze media only. They expire automatically and cannot manage or delete the library.</p>
      </div>

      <form :class="bemm('form')" @submit.prevent="createKey">
        <InputText v-model="form.name" label="Key name" :disabled="saving" />
        <label :class="bemm('field')">
          <span :class="bemm('field-label')">Expires after</span>
          <select v-model.number="form.expiresInDays" :class="bemm('select')" :disabled="saving">
            <option :value="30">30 days</option>
            <option :value="90">90 days</option>
            <option :value="180">180 days</option>
            <option :value="365">365 days</option>
          </select>
        </label>
        <Button type="submit" :loading="saving" :disabled="saving || form.name.trim().length < 3">Create key</Button>
      </form>
    </section>

    <section v-if="issuedKey" :class="[bemm('panel'), bemm('issued')]" aria-live="polite">
      <div :class="bemm('panel-heading')">
        <h2 :class="bemm('panel-title')">Save this key now</h2>
        <p :class="bemm('panel-copy')">It is shown once and will not be recoverable after this page is closed or refreshed.</p>
      </div>
      <code :class="bemm('secret')">{{ issuedKey.key }}</code>
      <div :class="bemm('issued-actions')">
        <Button size="small" @click="copyKey">Copy key</Button>
        <span :class="bemm('copy-message')">{{ copyMessage }}</span>
      </div>
    </section>

    <section :class="bemm('panel')" aria-labelledby="active-keys-title">
      <div :class="bemm('panel-heading')">
        <h2 id="active-keys-title" :class="bemm('panel-title')">Active keys</h2>
        <p :class="bemm('panel-copy')">Revoking a key prevents future requests from using it.</p>
      </div>

      <p v-if="loading" :class="bemm('empty')">Loading keys…</p>
      <p v-else-if="keys.length === 0" :class="bemm('empty')">No active media upload keys.</p>
      <div v-else :class="bemm('key-list')">
        <article v-for="key in keys" :key="key.id" :class="bemm('key')">
          <div :class="bemm('key-main')">
            <strong>{{ key.name }}</strong>
            <code>{{ key.prefix }}…</code>
            <span :class="bemm('scope')">{{ key.scopes.join(', ') }}</span>
          </div>
          <dl :class="bemm('metadata')">
            <div><dt>Created</dt><dd>{{ formatDate(key.createdAt) }}</dd></div>
            <div><dt>Expires</dt><dd>{{ formatDate(key.expiresAt) }}</dd></div>
            <div><dt>Last used</dt><dd>{{ formatDate(key.lastUsedAt) }}</dd></div>
          </dl>
          <Button variant="outline" size="small" :disabled="saving" @click="revokeKey(key)">Revoke</Button>
        </article>
      </div>
    </section>
  </main>
</template>

<style lang="scss">
.api-keys-page {
  display: grid;
  gap: var(--space-m);

  &__header,
  &__panel-heading {
    display: grid;
    gap: var(--space-xs);
  }

  &__title,
  &__panel-title {
    margin: 0;
    color: var(--admin-text);
  }

  &__title {
    font-size: var(--font-size-xl);
  }

  &__subtitle,
  &__panel-copy,
  &__empty,
  &__copy-message,
  &__metadata,
  &__scope {
    margin: 0;
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
  }

  &__panel {
    display: grid;
    gap: var(--space-m);
    padding: var(--space-m);
    border: 1px solid var(--admin-border);
    border-radius: var(--admin-section-radius);
    background: var(--admin-section-bg);
  }

  &__issued {
    border-color: var(--color-primary);
  }

  &__form {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(calc(var(--space) * 10), calc(var(--space) * 14)) auto;
    align-items: end;
    gap: var(--space-s);
  }

  &__field {
    display: grid;
    gap: var(--space-xs);
  }

  &__field-label {
    color: var(--admin-text);
    font-size: var(--font-size-s);
    font-weight: 600;
  }

  &__select {
    min-height: calc(var(--space) * 2.75);
    padding: 0 var(--space-s);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    background: var(--admin-page-bg);
    color: var(--admin-text);
  }

  &__secret {
    display: block;
    overflow-wrap: anywhere;
    padding: var(--space-s);
    border-radius: var(--border-radius-s);
    background: var(--admin-page-bg);
    color: var(--admin-text);
    font-size: var(--font-size-s);
  }

  &__issued-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-s);
  }

  &__key-list {
    display: grid;
    gap: var(--space-s);
  }

  &__key {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: var(--space-m);
    padding: var(--space-s);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-m);
    background: var(--admin-page-bg);
  }

  &__key-main {
    display: grid;
    gap: var(--space-xs);
    min-width: 0;

    code {
      color: var(--admin-text-muted);
      font-size: var(--font-size-xs);
    }
  }

  &__scope {
    color: var(--color-primary);
  }

  &__metadata {
    display: grid;
    grid-template-columns: repeat(3, auto);
    gap: var(--space-s);

    div {
      display: grid;
      gap: var(--space-xs);
    }

    dt {
      color: var(--admin-text-dim);
    }

    dd {
      margin: 0;
      color: var(--admin-text);
    }
  }

  &__error {
    margin: 0;
    padding: var(--space-s);
    border-radius: var(--border-radius-s);
    background: color-mix(in srgb, var(--color-error), transparent 85%);
    color: var(--admin-text);
  }

  @media (max-width: 960px) {
    &__form,
    &__key {
      grid-template-columns: 1fr;
    }

    &__metadata {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
}
</style>
