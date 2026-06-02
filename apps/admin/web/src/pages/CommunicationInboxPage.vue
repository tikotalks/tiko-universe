<script setup lang="ts">
import { onMounted } from 'vue'
import { useBemm } from 'bemm'
import { Button } from '@sil/ui'
import { useCommunicationInbox } from '../composables/useCommunicationInbox'

const bemm = useBemm('communication-inbox', { return: 'string', includeBaseClass: true })

const inbox = useCommunicationInbox()
const { messages, loading, error, list } = inbox

onMounted(() => {
  void list()
})
</script>

<template>
  <section :class="bemm('')">
    <header :class="bemm('header')">
      <div :class="bemm('intro')">
        <h1 :class="bemm('title')">Support inbox</h1>
        <p :class="bemm('subtitle')">Inbound messages sent to Tiko support addresses.</p>
      </div>
      <Button :loading="loading" :disabled="loading" @click="list">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </Button>
    </header>

    <p v-if="error" :class="bemm('error')">{{ error }}</p>

    <div v-if="!loading && messages.length === 0" :class="bemm('empty')">
      No open messages.
    </div>

    <ul :class="bemm('list')">
      <li v-for="message in messages" :key="message.id" :class="bemm('item')">
        <div :class="bemm('item-head')">
          <div :class="bemm('item-meta')">
            <strong :class="bemm('item-subject')">{{ message.subject || 'No subject' }}</strong>
            <span :class="bemm('item-addresses')">{{ message.from }} → {{ message.to }}</span>
          </div>
          <time :class="bemm('item-time')" :datetime="message.createdAt">
            {{ new Date(message.createdAt).toLocaleString() }}
          </time>
        </div>
        <p :class="bemm('item-body')">{{ message.text || 'No text body captured.' }}</p>
      </li>
    </ul>
  </section>
</template>

<style lang="scss">
.communication-inbox {
  display: flex;
  flex-direction: column;
  gap: var(--space-m);

  &__header {
    display: flex;
    justify-content: space-between;
    gap: var(--space-m);
    align-items: flex-start;
  }

  &__intro {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__title {
    font-size: var(--font-size-xl);
    font-weight: 700;
    color: var(--admin-text);
  }

  &__subtitle {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
  }

  &__error {
    color: var(--color-error);
    font-size: var(--font-size-s);
    font-weight: 600;
  }

  &__empty {
    padding: var(--space-l);
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    text-align: center;
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
  }

  &__list {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__item {
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-m);
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__item-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-m);
  }

  &__item-meta {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    min-width: 0;
  }

  &__item-subject {
    color: var(--admin-text);
    font-weight: 600;
    font-size: var(--font-size-m);
  }

  &__item-addresses {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
  }

  &__item-time {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
    flex-shrink: 0;
  }

  &__item-body {
    color: var(--admin-text);
    font-size: var(--font-size-s);
    line-height: 1.5;
    white-space: pre-wrap;
  }
}
</style>
