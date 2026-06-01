<script setup lang="ts">
import { onMounted } from 'vue'
import { useCommunicationInbox } from '../composables/useCommunicationInbox'

const inbox = useCommunicationInbox()
const { messages, loading, error, list } = inbox

onMounted(() => {
  void list()
})
</script>

<template>
  <section class="communication-inbox">
    <header class="communication-inbox__header">
      <div>
        <h1>Support inbox</h1>
        <p>Inbound messages sent to Tiko support addresses.</p>
      </div>
      <button :disabled="loading" @click="list">
        {{ loading ? 'Loading...' : 'Refresh' }}
      </button>
    </header>

    <p v-if="error" class="communication-inbox__error">{{ error }}</p>

    <div v-if="!loading && messages.length === 0" class="communication-inbox__empty">
      No open messages.
    </div>

    <article v-for="message in messages" :key="message.id" class="communication-inbox__message">
      <div class="communication-inbox__message-head">
        <div>
          <strong>{{ message.subject || 'No subject' }}</strong>
          <span>{{ message.from }} -> {{ message.to }}</span>
        </div>
        <time :datetime="message.createdAt">{{ new Date(message.createdAt).toLocaleString() }}</time>
      </div>
      <p>{{ message.text || 'No text body captured.' }}</p>
    </article>
  </section>
</template>

<style lang="scss" scoped>
.communication-inbox {
  display: grid;
  gap: 1rem;

  &__header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
  }

  h1 {
    margin: 0;
  }

  p {
    color: var(--tiko-admin-muted);
  }

  button {
    border: none;
    border-radius: 999px;
    padding: 0.65rem 1rem;
    background: var(--tiko-app-primary);
    color: var(--tiko-app-primary-text);
    font-weight: 800;
    cursor: pointer;
  }

  &__error {
    color: var(--color-error);
    font-weight: 700;
  }

  &__empty,
  &__message {
    border: 1px solid var(--tiko-admin-border);
    border-radius: 1rem;
    background: var(--tiko-admin-card);
    padding: 1rem;
  }

  &__message-head {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;

    div {
      display: grid;
      gap: 0.2rem;
    }

    span,
    time {
      color: var(--tiko-admin-muted);
      font-size: 0.8rem;
    }
  }
}
</style>
