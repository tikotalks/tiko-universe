<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Button, InputSearch } from '@sil/ui'
import { useBemm } from 'bemm'
import { useRoute, useRouter } from 'vue-router'
import { assignableRoles, useAdminUsers } from '../composables/useAdminUsers'
import type { AdminManagedUser, TikoRole } from '../types/admin'

const bemm = useBemm('users-page', { return: 'string', includeBaseClass: true })
const route = useRoute()
const router = useRouter()
const { users, loading, saving, error, list, assignRole, revokeRole } = useAdminUsers()
const query = ref(typeof route.query.q === 'string' ? route.query.q : '')
const selectedUserId = ref<string | null>(null)

const selectedUser = computed(() => users.value.find((user) => user.id === selectedUserId.value) ?? users.value[0] ?? null)
const filteredRoles = computed(() => assignableRoles)

onMounted(async () => {
  await list(query.value)
  selectedUserId.value = users.value[0]?.id ?? null
})

async function search() {
  const trimmed = query.value.trim()
  await router.replace({ path: '/users', query: trimmed ? { q: trimmed } : {} })
  await list(trimmed)
  selectedUserId.value = users.value[0]?.id ?? null
}

function choose(user: AdminManagedUser) {
  selectedUserId.value = user.id
}

function hasRole(user: AdminManagedUser | null, role: TikoRole) {
  return Boolean(user?.roles.includes(role))
}

async function toggleRole(user: AdminManagedUser, role: TikoRole) {
  if (hasRole(user, role)) {
    await revokeRole(user.id, role)
  } else {
    await assignRole(user.id, role)
  }
}

function formatRole(role: string) {
  return assignableRoles.find((item) => item.value === role)?.label ?? role
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function userLabel(user: AdminManagedUser) {
  return user.email || user.id
}
</script>

<template>
  <section :class="bemm('')">
    <header :class="bemm('header')">
      <div>
        <h1 :class="bemm('title')">Users</h1>
        <p :class="bemm('subtitle')">Search Tiko identities and manage product-scoped roles.</p>
      </div>
      <Button :disabled="loading" :loading="loading" @click="search">Refresh</Button>
    </header>

    <form :class="bemm('search')" @submit.prevent="search">
      <InputSearch v-model="query" label="Search users" placeholder="Email, subject id, or kind" />
      <Button type="submit" :loading="loading" :disabled="loading">Search</Button>
    </form>

    <p v-if="error" :class="bemm('error')">{{ error }}</p>

    <div :class="bemm('layout')">
      <section :class="bemm('list')" aria-label="Users">
        <button
          v-for="user in users"
          :key="user.id"
          type="button"
          :class="bemm('user-card', { active: selectedUser?.id === user.id })"
          @click="choose(user)"
        >
          <span :class="bemm('avatar')">{{ userLabel(user).charAt(0).toUpperCase() }}</span>
          <span :class="bemm('user-summary')">
            <strong>{{ userLabel(user) }}</strong>
            <small>{{ user.kind }} · {{ formatRelativeTime(user.lastSeenAt) }}</small>
          </span>
          <span :class="bemm('data-dot', { active: user.hasData })" title="Has data" />
          <span :class="bemm('role-count')">{{ user.roles.length }}</span>
        </button>

        <p v-if="!loading && users.length === 0" :class="bemm('empty')">No users found.</p>
      </section>

      <aside :class="bemm('detail')">
        <template v-if="selectedUser">
          <div :class="bemm('detail-header')">
            <div>
              <h2 :class="bemm('detail-title')">{{ userLabel(selectedUser) }}</h2>
              <p :class="bemm('detail-meta')">{{ selectedUser.kind }} · {{ selectedUser.id }}</p>
              <p :class="bemm('detail-meta')">Last seen {{ formatRelativeTime(selectedUser.lastSeenAt) }} · {{ selectedUser.hasData ? 'Has data' : 'No data' }}</p>
            </div>
            <div :class="bemm('role-pills')">
              <span v-for="role in selectedUser.roles" :key="role" :class="bemm('pill')">{{ formatRole(role) }}</span>
              <span v-if="selectedUser.roles.length === 0" :class="bemm('pill', 'muted')">No roles</span>
            </div>
          </div>

          <div :class="bemm('roles')">
            <button
              v-for="role in filteredRoles"
              :key="role.value"
              type="button"
              :class="bemm('role-toggle', { active: hasRole(selectedUser, role.value) })"
              :disabled="saving"
              @click="toggleRole(selectedUser, role.value)"
            >
              <span :class="bemm('role-toggle-mark')">{{ hasRole(selectedUser, role.value) ? '✓' : '+' }}</span>
              <span :class="bemm('role-toggle-text')">
                <strong>{{ role.label }}</strong>
                <small>{{ role.description }}</small>
              </span>
            </button>
          </div>
        </template>

        <p v-else :class="bemm('empty')">Select a user to manage roles.</p>
      </aside>
    </div>
  </section>
</template>

<style lang="scss">
.users-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-m);

  &__header,
  &__search,
  &__layout,
  &__detail-header {
    display: flex;
    gap: var(--space-s);
  }

  &__header {
    justify-content: space-between;
    align-items: flex-start;
  }

  &__title {
    font-size: var(--font-size-xl);
    font-weight: 700;
    color: var(--admin-text);
  }

  &__subtitle,
  &__detail-meta,
  &__empty {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
  }

  &__search {
    align-items: flex-end;
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-m);
  }

  &__search > *:first-child {
    flex: 1;
  }

  &__error {
    color: var(--color-error);
    background: color-mix(in srgb, var(--color-background), var(--color-foreground) 7%);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-xs);
    padding: var(--space-s);
  }

  &__layout {
    align-items: flex-start;
  }

  &__list,
  &__detail {
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
  }

  &__list {
    width: min(100%, calc(var(--space) * 28));
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  &__user-card {
    display: flex;
    align-items: center;
    gap: var(--space-s);
    padding: var(--space-s);
    color: var(--admin-text);
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--admin-border);
    cursor: pointer;
    text-align: left;

    &:hover,
    &--active {
      background: var(--admin-surface-hover);
    }
  }

  &__avatar,
  &__role-toggle-mark {
    width: calc(var(--space) * 2);
    height: calc(var(--space) * 2);
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--color-background), var(--color-foreground) 10%);
    color: var(--admin-text);
    border: 1px solid var(--admin-border);
    flex-shrink: 0;
    font-weight: 700;
  }

  &__user-summary,
  &__role-toggle-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: calc(var(--space-xs) / 2);

    small {
      color: var(--admin-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  &__data-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    flex-shrink: 0;
    background: color-mix(in srgb, var(--color-background), var(--color-foreground) 15%);

    &--active {
      background: var(--color-success, #22c55e);
    }
  }

  &__role-count {
    min-width: calc(var(--space) * 1.5);
    text-align: center;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-background), var(--color-foreground) 10%);
    color: var(--admin-text-muted);
    font-size: var(--font-size-xs);
    padding: calc(var(--space-xs) / 2) var(--space-xs);
  }

  &__detail {
    flex: 1;
    padding: var(--space-m);
    display: flex;
    flex-direction: column;
    gap: var(--space-m);
  }

  &__detail-header {
    justify-content: space-between;
    align-items: flex-start;
  }

  &__detail-title {
    font-size: var(--font-size-l);
    font-weight: 700;
    color: var(--admin-text);
  }

  &__role-pills {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--space-xs);
  }

  &__pill {
    border: 1px solid var(--admin-border);
    border-radius: 999px;
    color: var(--admin-text);
    background: color-mix(in srgb, var(--color-background), var(--color-foreground) 8%);
    padding: calc(var(--space-xs) / 2) var(--space-xs);
    font-size: var(--font-size-xs);

    &--muted {
      color: var(--admin-text-muted);
    }
  }

  &__roles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(calc(var(--space) * 15), 1fr));
    gap: var(--space-s);
  }

  &__role-toggle {
    display: flex;
    gap: var(--space-s);
    align-items: flex-start;
    text-align: left;
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    background: color-mix(in srgb, var(--color-background), var(--color-foreground) 4%);
    color: var(--admin-text);
    padding: var(--space-s);
    cursor: pointer;

    &:hover,
    &--active {
      background: var(--admin-surface-hover);
      border-color: var(--admin-border-strong);
    }

    &:disabled {
      opacity: 0.65;
      cursor: wait;
    }
  }

  @media (max-width: 900px) {
    &__layout,
    &__search,
    &__detail-header {
      flex-direction: column;
    }

    &__list {
      width: 100%;
    }
  }
}
</style>
