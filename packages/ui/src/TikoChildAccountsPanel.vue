<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Icon } from '@sil/ui'

export interface ChildAccountItem {
  id: string
  name: string
  code?: string
}

interface Props {
  /** Called to fetch the child account list */
  onLoad: () => Promise<ChildAccountItem[]>
  /** Called to create a new child account */
  onCreate: (name: string, code: string) => Promise<ChildAccountItem>
  /** Called to update a child account name */
  onUpdate: (id: string, name: string) => Promise<ChildAccountItem>
  /** Called to reset a child account's login code */
  onResetCode: (id: string, code: string) => Promise<ChildAccountItem>
  /** Called to delete a child account */
  onDelete: (id: string) => Promise<void>
  labels?: TikoChildAccountsLabels
}

interface TikoChildAccountsLabels {
  back: string
  title: string
  subtitle: string
  code: string
  codeNotSet: string
  rename: string
  resetCode: string
  delete: string
  name: string
  save: string
  cancel: string
  newCode: string
  empty: string
  addChildAccount: string
  childName: string
  loginCode: string
  create: string
  deleteConfirm: string
  loadError: string
  createError: string
  updateError: string
  resetError: string
  deleteError: string
}

const props = withDefaults(defineProps<Props>(), {
  labels: () => ({
    back: 'Back',
    title: 'Child accounts',
    subtitle: 'Manage profiles for your children',
    code: 'Code',
    codeNotSet: 'not set',
    rename: 'Rename',
    resetCode: 'Reset code',
    delete: 'Delete',
    name: 'Name',
    save: 'Save',
    cancel: 'Cancel',
    newCode: 'New 4-digit code',
    empty: 'No child accounts yet. Add one so your child can log in with a 4-digit code.',
    addChildAccount: 'Add child account',
    childName: "Child's name",
    loginCode: '4-digit login code',
    create: 'Create',
    deleteConfirm: 'Delete this child account?',
    loadError: 'Could not load child accounts.',
    createError: 'Could not create child account.',
    updateError: 'Could not update name.',
    resetError: 'Could not reset code.',
    deleteError: 'Could not delete child account.',
  }),
})
const emit = defineEmits<{ (e: 'close'): void }>()

const children = ref<ChildAccountItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Create form
const showCreate = ref(false)
const newName = ref('')
const newCode = ref('')

// Edit form
const editingId = ref<string | null>(null)
const editName = ref('')

// Reset code form
const resettingId = ref<string | null>(null)
const resetCode = ref('')

async function load() {
  loading.value = true
  error.value = null
  try {
    children.value = await props.onLoad()
  } catch {
    error.value = props.labels.loadError
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function createChild() {
  const code = newCode.value.trim()
  if (!newName.value.trim() || !code) return
  if (!/^\d{4}$/.test(code)) { error.value = props.labels.loginCode; return }
  loading.value = true
  error.value = null
  try {
    const child = await props.onCreate(newName.value.trim(), newCode.value.trim())
    children.value.push(child)
    newName.value = ''
    newCode.value = ''
    showCreate.value = false
  } catch {
    error.value = props.labels.createError
  } finally {
    loading.value = false
  }
}

function startEdit(child: ChildAccountItem) {
  editingId.value = child.id
  editName.value = child.name
  resettingId.value = null
}

async function saveEdit() {
  if (!editingId.value || !editName.value.trim()) return
  loading.value = true
  error.value = null
  try {
    const updated = await props.onUpdate(editingId.value, editName.value.trim())
    const idx = children.value.findIndex(c => c.id === updated.id)
    if (idx >= 0) children.value[idx] = updated
    editingId.value = null
  } catch {
    error.value = props.labels.updateError
  } finally {
    loading.value = false
  }
}

function startResetCode(child: ChildAccountItem) {
  resettingId.value = child.id
  resetCode.value = ''
  editingId.value = null
}

async function saveResetCode() {
  const code = resetCode.value.trim()
  if (!resettingId.value || !code) return
  if (!/^\d{4}$/.test(code)) { error.value = props.labels.newCode; return }
  loading.value = true
  error.value = null
  try {
    const updated = await props.onResetCode(resettingId.value, resetCode.value.trim())
    const idx = children.value.findIndex(c => c.id === updated.id)
    if (idx >= 0) children.value[idx] = updated
    resettingId.value = null
  } catch {
    error.value = props.labels.resetError
  } finally {
    loading.value = false
  }
}

async function deleteChild(id: string) {
  if (!confirm(props.labels.deleteConfirm)) return
  loading.value = true
  error.value = null
  try {
    await props.onDelete(id)
    children.value = children.value.filter(c => c.id !== id)
  } catch {
    error.value = props.labels.deleteError
  } finally {
    loading.value = false
  }
}

function cancelEdit() {
  editingId.value = null
  resettingId.value = null
  showCreate.value = false
  newName.value = ''
  newCode.value = ''
  resetCode.value = ''
}
</script>

<template>
  <div class="tiko-child-accounts" data-test="tiko-child-accounts">
    <div class="tiko-child-accounts__header">
      <button class="tiko-child-accounts__back" type="button" :aria-label="props.labels.back" @click="emit('close')">
        <Icon name="arrows/arrow-left" aria-hidden="true" />
      </button>
      <div class="tiko-child-accounts__heading">
        <h2 class="tiko-child-accounts__title">{{ props.labels.title }}</h2>
        <p class="tiko-child-accounts__subtitle">{{ props.labels.subtitle }}</p>
      </div>
      <span class="tiko-child-accounts__badge" aria-hidden="true"><Icon name="product/baby-stroller" /></span>
    </div>

    <div v-if="error" class="tiko-child-accounts__error" role="alert">{{ error }}</div>

    <!-- Child list -->
    <div class="tiko-child-accounts__list">
      <div v-for="child in children" :key="child.id" class="tiko-child-accounts__item">
        <!-- Normal view -->
        <template v-if="editingId !== child.id && resettingId !== child.id">
          <div class="tiko-child-accounts__item-info">
            <span class="tiko-child-accounts__item-icon"><Icon name="ui/user-s" /></span>
            <div class="tiko-child-accounts__item-copy">
              <strong>{{ child.name }}</strong>
              <small>{{ props.labels.code }}: {{ child.code ? '****' : props.labels.codeNotSet }}</small>
            </div>
          </div>
          <div class="tiko-child-accounts__item-actions">
            <button class="tiko-child-accounts__action" type="button" :title="props.labels.rename" @click="startEdit(child)">
              <Icon name="ui/pencil" aria-hidden="true" />
            </button>
            <button class="tiko-child-accounts__action" type="button" :title="props.labels.resetCode" @click="startResetCode(child)">
              <Icon name="ui/lock" aria-hidden="true" />
            </button>
            <button class="tiko-child-accounts__action tiko-child-accounts__action--danger" type="button" :title="props.labels.delete" @click="deleteChild(child.id)">
              <Icon name="wayfinding/cross" aria-hidden="true" />
            </button>
          </div>
        </template>

        <!-- Edit name form -->
        <template v-else-if="editingId === child.id">
          <div class="tiko-child-accounts__form">
            <input v-model="editName" class="tiko-child-accounts__input" type="text" :placeholder="props.labels.name" :disabled="loading" @keyup.enter="saveEdit" @keyup.escape="cancelEdit" />
            <div class="tiko-child-accounts__form-actions">
              <button class="tiko-child-accounts__btn" type="button" :disabled="loading" @click="saveEdit">{{ props.labels.save }}</button>
              <button class="tiko-child-accounts__btn tiko-child-accounts__btn--ghost" type="button" @click="cancelEdit">{{ props.labels.cancel }}</button>
            </div>
          </div>
        </template>

        <!-- Reset code form -->
        <template v-else-if="resettingId === child.id">
          <div class="tiko-child-accounts__form">
            <input v-model="resetCode" class="tiko-child-accounts__input" type="text" inputmode="numeric" maxlength="4" :placeholder="props.labels.newCode" :disabled="loading" @keyup.enter="saveResetCode" @keyup.escape="cancelEdit" />
            <div class="tiko-child-accounts__form-actions">
              <button class="tiko-child-accounts__btn" type="button" :disabled="loading" @click="saveResetCode">{{ props.labels.save }}</button>
              <button class="tiko-child-accounts__btn tiko-child-accounts__btn--ghost" type="button" @click="cancelEdit">{{ props.labels.cancel }}</button>
            </div>
          </div>
        </template>
      </div>

      <!-- Empty state -->
      <div v-if="!loading && children.length === 0" class="tiko-child-accounts__empty">
        <p>{{ props.labels.empty }}</p>
      </div>
    </div>

    <!-- Add child -->
    <div v-if="!showCreate && !editingId && !resettingId" class="tiko-child-accounts__add">
      <button class="tiko-child-accounts__item tiko-child-accounts__item--add" type="button" @click="showCreate = true">
        <span class="tiko-child-accounts__item-icon"><Icon name="ui/plus" /></span>
        <span class="tiko-child-accounts__item-copy"><strong>{{ props.labels.addChildAccount }}</strong></span>
      </button>
    </div>

    <!-- Create form -->
    <div v-if="showCreate" class="tiko-child-accounts__create-form">
      <input v-model="newName" class="tiko-child-accounts__input" type="text" :placeholder="props.labels.childName" :disabled="loading" @keyup.enter="createChild" />
      <input v-model="newCode" class="tiko-child-accounts__input" type="text" inputmode="numeric" maxlength="4" :placeholder="props.labels.loginCode" :disabled="loading" @keyup.enter="createChild" />
      <div class="tiko-child-accounts__form-actions">
        <button class="tiko-child-accounts__btn" type="button" :disabled="loading || !newName.trim() || !newCode.trim()" @click="createChild">{{ props.labels.create }}</button>
        <button class="tiko-child-accounts__btn tiko-child-accounts__btn--ghost" type="button" @click="cancelEdit">{{ props.labels.cancel }}</button>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.tiko-child-accounts {
  width: min(100%, 31rem);
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  padding: clamp(1.25rem, 4vw, 2rem);
  border-radius: clamp(1.75rem, 5vw, 2.6rem);
  background: color-mix(in srgb, var(--color-background), var(--color-foreground) 6%);
  color: var(--color-foreground);
  border: 1px solid color-mix(in srgb, var(--color-foreground), transparent 88%);
  box-shadow: 0 24px 80px color-mix(in srgb, var(--color-foreground), transparent 82%);
  backdrop-filter: blur(22px) saturate(1.15);
}

.tiko-child-accounts__header {
  display: grid;
  grid-template-columns: 4rem 1fr 4rem;
  align-items: center;
  gap: 0.75rem;
}

.tiko-child-accounts__back,
.tiko-child-accounts__badge {
  border: none;
  display: inline-grid;
  place-items: center;
  border-radius: 1.25rem;
  background: color-mix(in srgb, var(--color-background), var(--color-foreground) 10%);
  color: color-mix(in srgb, var(--color-foreground), transparent 8%);
  width: 4rem;
  height: 4rem;
  font-size: 1.6rem;
  cursor: pointer;
}

.tiko-child-accounts__heading {
  min-width: 0;
  text-align: center;
}

.tiko-child-accounts__title {
  margin: 0;
  font-size: clamp(1.45rem, 5vw, 2rem);
  font-weight: 900;
}

.tiko-child-accounts__subtitle {
  margin: 0.15rem 0 0;
  color: color-mix(in srgb, var(--color-foreground), transparent 42%);
  font-size: 0.9rem;
  font-weight: 700;
}

.tiko-child-accounts__error {
  padding: 0.85rem 1.15rem;
  border-radius: 1rem;
  background: color-mix(in srgb, var(--color-error), var(--color-background) 88%);
  color: var(--color-error);
  font-size: 0.9rem;
  font-weight: 700;
}

.tiko-child-accounts__list {
  display: grid;
  gap: 0.85rem;
}

.tiko-child-accounts__item {
  width: 100%;
  min-height: 4.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1.15rem;
  border: 1px solid color-mix(in srgb, var(--color-foreground), transparent 90%);
  border-radius: 1.35rem;
  background: color-mix(in srgb, var(--color-background), var(--color-foreground) 3%);
  font-size: clamp(1.05rem, 4vw, 1.3rem);
  font-weight: 850;

  &--add {
    cursor: pointer;
    &:active { transform: scale(0.985); }
  }
}

.tiko-child-accounts__item-info {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}

.tiko-child-accounts__item-icon {
  display: inline-grid;
  place-items: center;
  width: 3.3rem;
  height: 3.3rem;
  border-radius: 1rem;
  background: color-mix(in srgb, var(--color-background), var(--color-foreground) 10%);
  color: color-mix(in srgb, var(--color-foreground), transparent 8%);
  font-size: 1.35rem;
  flex-shrink: 0;
}

.tiko-child-accounts__item-copy {
  display: grid;
  gap: 0.1rem;
  min-width: 0;

  strong { display: block; }
  small {
    display: block;
    color: color-mix(in srgb, var(--color-foreground), transparent 45%);
    font-size: 0.82rem;
    font-weight: 700;
  }
}

.tiko-child-accounts__item-actions {
  display: flex;
  gap: 0.4rem;
}

.tiko-child-accounts__action {
  display: inline-grid;
  place-items: center;
  width: 2.8rem;
  height: 2.8rem;
  border: none;
  border-radius: 0.85rem;
  background: color-mix(in srgb, var(--color-background), var(--color-foreground) 8%);
  color: color-mix(in srgb, var(--color-foreground), transparent 18%);
  font-size: 1.1rem;
  cursor: pointer;

  &:active { transform: scale(0.94); }

  &--danger {
    color: color-mix(in srgb, var(--color-error), transparent 10%);
  }
}

.tiko-child-accounts__empty {
  padding: 1.5rem 0;
  text-align: center;
  color: color-mix(in srgb, var(--color-foreground), transparent 42%);
  font-size: 0.95rem;
  font-weight: 700;
}

.tiko-child-accounts__form,
.tiko-child-accounts__create-form {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.tiko-child-accounts__input {
  width: 100%;
  padding: 0.85rem 1.1rem;
  border: 1px solid color-mix(in srgb, var(--color-foreground), transparent 82%);
  border-radius: 1rem;
  background: color-mix(in srgb, var(--color-background), var(--color-foreground) 4%);
  color: var(--color-foreground);
  font-size: 1.05rem;
  font-weight: 700;
  outline: none;

  &:focus {
    border-color: color-mix(in srgb, var(--color-foreground), transparent 60%);
  }

  &::placeholder {
    color: color-mix(in srgb, var(--color-foreground), transparent 58%);
  }
}

.tiko-child-accounts__form-actions {
  display: flex;
  gap: 0.65rem;
}

.tiko-child-accounts__btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 1rem;
  background: color-mix(in srgb, var(--color-foreground), var(--color-background) 12%);
  color: var(--color-background);
  font-size: 1rem;
  font-weight: 850;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:active:not(:disabled) { transform: scale(0.97); }

  &--ghost {
    background: color-mix(in srgb, var(--color-background), var(--color-foreground) 8%);
    color: var(--color-foreground);
  }
}

.tiko-child-accounts__add {
  display: grid;
}
</style>
