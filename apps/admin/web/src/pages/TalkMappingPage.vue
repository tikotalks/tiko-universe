<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useBemm } from 'bemm'
import { Button, InputSearch, InputText, Icon } from '@sil/ui'
import { useTalkMapping, type TalkMediaMapEntry } from '../composables/useTalkMapping'

const page = useBemm('talk-mapping', { return: 'string', includeBaseClass: true })

const { items, loading, saving, error, fetchMap, putEntry, deleteEntry } = useTalkMapping()

const search = ref('')
const editingId = ref<string | null>(null)
const editUrl = ref('')
const newConceptId = ref('')
const newImageUrl = ref('')
const adding = ref(false)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter(i =>
    i.conceptId.toLowerCase().includes(q) || i.imageUrl.toLowerCase().includes(q),
  )
})

onMounted(() => { void fetchMap() })

function startEdit(entry: TalkMediaMapEntry) {
  editingId.value = entry.conceptId
  editUrl.value = entry.imageUrl
}

function cancelEdit() {
  editingId.value = null
  editUrl.value = ''
}

async function saveEdit() {
  if (!editingId.value) return
  await putEntry(editingId.value, editUrl.value.trim())
  cancelEdit()
}

async function removeEntry(conceptId: string) {
  if (!confirm(`Remove image mapping for "${conceptId}"?`)) return
  await deleteEntry(conceptId)
}

async function addEntry() {
  const conceptId = newConceptId.value.trim()
  const imageUrl = newImageUrl.value.trim()
  if (!conceptId || !imageUrl) return
  adding.value = true
  try {
    await putEntry(conceptId, imageUrl)
    newConceptId.value = ''
    newImageUrl.value = ''
  } finally {
    adding.value = false
  }
}
</script>

<template>
  <section :class="page('')">
    <header :class="page('header')">
      <div :class="page('intro')">
        <h1 :class="page('title')">Talk — Image Mapping</h1>
        <p :class="page('subtitle')">
          Map word concepts to Tiko CDN images. One image serves all languages.
        </p>
      </div>
      <Button variant="outline" :loading="loading" :disabled="loading" @click="fetchMap">Reload</Button>
    </header>

    <p v-if="error" :class="page('error')">{{ error }}</p>

    <div :class="page('add-form')">
      <InputText v-model="newConceptId" label="Concept ID" placeholder="e.g. brother" />
      <InputText v-model="newImageUrl" label="Image URL" placeholder="https://data.tikocdn.org/uploads/..." />
      <Button :disabled="!newConceptId.trim() || !newImageUrl.trim() || adding" @click="addEntry">Add</Button>
    </div>

    <div :class="page('toolbar')">
      <InputSearch v-model="search" placeholder="Search concepts or URLs…" />
      <span :class="page('count')">{{ filtered.length }} of {{ items.length }}</span>
    </div>

    <div v-if="loading && items.length === 0" :class="page('empty')">Loading mappings…</div>
    <div v-else-if="filtered.length === 0" :class="page('empty')">No mappings found.</div>
    <div v-else :class="page('table-wrap')">
      <table :class="page('table')">
        <thead>
          <tr>
            <th>Image</th>
            <th>Concept ID</th>
            <th>URL</th>
            <th>Source</th>
            <th>Updated</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in filtered" :key="entry.conceptId">
            <td :class="page('thumb-cell')">
              <img v-if="entry.imageUrl" :src="entry.imageUrl" :alt="entry.conceptId" :class="page('thumb')" />
              <span v-else :class="page('thumb-placeholder')">—</span>
            </td>
            <td :class="page('concept-cell')">{{ entry.conceptId }}</td>
            <td v-if="editingId === entry.conceptId" :class="page('edit-cell')">
              <InputText v-model="editUrl" placeholder="Image URL" />
            </td>
            <td v-else :class="page('url-cell')">
              <a :href="entry.imageUrl" target="_blank" rel="noreferrer" :class="page('url-link')">{{ entry.imageUrl.split('/').pop() || entry.imageUrl }}</a>
            </td>
            <td>
              <span :class="page('badge', { manual: entry.source === 'manual' })">{{ entry.source }}</span>
            </td>
            <td :class="page('date-cell')">{{ entry.updatedAt?.slice(0, 10) }}</td>
            <td :class="page('actions')">
              <template v-if="editingId === entry.conceptId">
                <Button size="small" :loading="saving" @click="saveEdit">Save</Button>
                <Button size="small" variant="ghost" @click="cancelEdit">Cancel</Button>
              </template>
              <template v-else>
                <Button size="small" variant="outline" @click="startEdit(entry)">Edit</Button>
                <Button size="small" variant="ghost" @click="removeEntry(entry.conceptId)">Delete</Button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style lang="scss">
.talk-mapping {
  display: flex;
  flex-direction: column;
  gap: var(--space-m);

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-m);
    flex-wrap: wrap;
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

  &__add-form {
    display: flex;
    gap: var(--space-s);
    align-items: flex-end;
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-s);

    & > :first-child { flex: 0 0 200px; }
    & > :nth-child(2) { flex: 1; }
  }

  &__toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-s);
  }

  &__count {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
    white-space: nowrap;
  }

  &__empty {
    background: var(--admin-surface);
    border: 1px dashed var(--admin-border-strong);
    border-radius: var(--admin-card-radius);
    padding: var(--space-l);
    text-align: center;
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
  }

  &__table-wrap {
    overflow-x: auto;
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    background: var(--admin-surface);
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-s);

    th {
      text-align: left;
      padding: var(--space-s);
      font-weight: 600;
      color: var(--admin-text-muted);
      border-bottom: 1px solid var(--admin-border);
      white-space: nowrap;
    }

    td {
      padding: var(--space-xs) var(--space-s);
      border-bottom: 1px solid var(--admin-border);
      vertical-align: middle;
    }

    tr:last-child td {
      border-bottom: 0;
    }

    tr:hover td {
      background: var(--admin-nav-hover);
    }
  }

  &__thumb-cell {
    width: 56px;
  }

  &__thumb {
    width: 44px;
    height: 44px;
    object-fit: cover;
    border-radius: var(--border-radius-xs);
    border: 1px solid var(--admin-border);
    display: block;
  }

  &__thumb-placeholder {
    display: inline-block;
    width: 44px;
    height: 44px;
    line-height: 44px;
    text-align: center;
    color: var(--admin-text-muted);
    background: var(--admin-page-bg);
    border-radius: var(--border-radius-xs);
  }

  &__concept-cell {
    font-weight: 600;
    color: var(--admin-text);
    white-space: nowrap;
  }

  &__url-cell {
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__url-link {
    color: var(--color-primary);
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }

  &__edit-cell {
    min-width: 280px;
  }

  &__date-cell {
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
    white-space: nowrap;
  }

  &__badge {
    display: inline-block;
    font-size: var(--font-size-xs);
    font-weight: 600;
    padding: 2px var(--space-xs);
    border-radius: var(--border-radius-xs);
    background: var(--admin-page-bg);
    color: var(--admin-text-muted);

    &--manual {
      background: color-mix(in srgb, var(--color-success, green), transparent 80%);
      color: color-mix(in srgb, var(--color-success, green), transparent 20%);
    }
  }

  &__actions {
    display: flex;
    gap: var(--space-xs);
    white-space: nowrap;
  }
}
</style>
