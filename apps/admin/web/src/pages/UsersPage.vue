<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Button, InputSearch, Icon } from '@sil/ui'
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

const selectedUser = computed(() => users.value.find((user) => user.id === selectedUserId.value) ?? null)
const onlineThreshold = 5 * 60 * 1000 // 5 minutes

onMounted(async () => {
  await list(query.value)
  if (users.value.length > 0) selectedUserId.value = users.value[0].id
})

async function search() {
  const trimmed = query.value.trim()
  await router.replace({ path: '/users', query: trimmed ? { q: trimmed } : {} })
  await list(trimmed)
  if (users.value.length > 0) selectedUserId.value = users.value[0].id
}

function choose(user: AdminManagedUser) {
  selectedUserId.value = user.id
}

function isOnline(user: AdminManagedUser): boolean {
  if (!user.lastSeenAt) return false
  return Date.now() - new Date(user.lastSeenAt).getTime() < onlineThreshold
}

function userDisplayName(user: AdminManagedUser): string {
  return user.displayName || user.email || user.id.slice(0, 12)
}

function userInitials(user: AdminManagedUser): string {
  const name = userDisplayName(user)
  return name.charAt(0).toUpperCase()
}

async function setSingleRole(user: AdminManagedUser, role: TikoRole) {
  if (saving.value) return
  // Revoke all current roles first, then assign the new one
  const rolesToRevoke = user.roles.filter((r) => r !== role)
  for (const r of rolesToRevoke) {
    await revokeRole(user.id, r)
  }
  // If the user didn't already have this role, assign it
  if (!user.roles.includes(role)) {
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

function kindLabel(kind: string): string {
  switch (kind) {
    case 'account': return 'Account'
    case 'device': return 'Device'
    case 'anonymous': return 'Anonymous'
    case 'service': return 'Service'
    default: return kind
  }
}
</script>

<template>
  <section :class="bemm('')">
    <header :class="bemm('header')">
      <div>
        <h1 :class="bemm('title')">Users</h1>
        <p :class="bemm('subtitle')">{{ users.length }} identities · Search by name, email, or ID</p>
      </div>
      <Button :disabled="loading" :loading="loading" size="small" @click="search">
        <Icon name="ui/refresh" size="small" />
      </Button>
    </header>

    <form :class="bemm('search')" @submit.prevent="search">
      <InputSearch v-model="query" label="" placeholder="Search by name, email, or ID…" />
      <Button type="submit" :loading="loading" :disabled="loading" size="small">Search</Button>
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
          <div
            :class="bemm('avatar')"
            :style="{
              ...(user.colorHex ? { background: user.colorHex, color: '#fff' } : {}),
              ...(user.avatarUrl ? { backgroundImage: `url(${user.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
            }"
          >
            <span v-if="!user.avatarUrl">{{ userInitials(user) }}</span>
          </div>
          <span :class="bemm('user-summary')">
            <strong :class="bemm('user-name')">{{ userDisplayName(user) }}</strong>
            <small v-if="user.email && user.email !== userDisplayName(user)" :class="bemm('user-email')">{{ user.email }}</small>
            <small :class="bemm('user-meta')">
              <span :class="bemm('status-dot', { online: isOnline(user), offline: !isOnline(user) })" />
              {{ isOnline(user) ? 'Online' : formatRelativeTime(user.lastSeenAt) }}
              · {{ kindLabel(user.kind) }}
            </small>
          </span>
          <span v-if="user.roles.length > 0" :class="bemm('role-pill')">{{ formatRole(user.roles[0]) }}</span>
        </button>

        <p v-if="!loading && users.length === 0" :class="bemm('empty')">No users found.</p>
      </section>

      <aside :class="bemm('detail')">
        <template v-if="selectedUser">
          <div :class="bemm('detail-header')">
            <div
              :class="bemm('detail-avatar')"
              :style="{
                ...(selectedUser.colorHex ? { background: selectedUser.colorHex, color: '#fff' } : {}),
                ...(selectedUser.avatarUrl ? { backgroundImage: `url(${selectedUser.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
              }"
            >
              <span v-if="!selectedUser.avatarUrl">{{ userInitials(selectedUser) }}</span>
            </div>
            <div :class="bemm('detail-info')">
              <h2 :class="bemm('detail-title')">{{ userDisplayName(selectedUser) }}</h2>
              <p v-if="selectedUser.email" :class="bemm('detail-email')">{{ selectedUser.email }}</p>
              <div :class="bemm('detail-meta-row')">
                <span :class="bemm('status-dot', { online: isOnline(selectedUser), offline: !isOnline(selectedUser) })" />
                <span :class="bemm('detail-meta')">{{ isOnline(selectedUser) ? 'Online now' : `Last seen ${formatRelativeTime(selectedUser.lastSeenAt)}` }}</span>
                <span :class="bemm('detail-meta')">·</span>
                <span :class="bemm('detail-meta')">{{ kindLabel(selectedUser.kind) }}</span>
                <span :class="bemm('detail-meta')">·</span>
                <span :class="bemm('detail-meta')">{{ selectedUser.hasData ? 'Has data' : 'No data' }}</span>
              </div>
              <p :class="bemm('detail-id')">{{ selectedUser.id }}</p>
            </div>
          </div>

          <div :class="bemm('section')">
            <h3 :class="bemm('section-title')">Role</h3>
            <p :class="bemm('section-desc')">Each user has exactly one role.</p>
            <select
              :class="bemm('role-select')"
              :disabled="saving"
              :value="selectedUser.roles[0] || 'guest'"
              @change="setSingleRole(selectedUser, ($event.target as HTMLSelectElement).value as TikoRole)"
            >
              <option v-for="role in assignableRoles" :key="role.value" :value="role.value">
                {{ role.label }} — {{ role.description }}
              </option>
            </select>
          </div>
        </template>

        <p v-else :class="bemm('empty')">Select a user to view details.</p>
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
  &__layout {
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
    margin: 0;
  }

  &__subtitle,
  &__detail-email,
  &__detail-id,
  &__detail-meta,
  &__section-desc,
  &__empty {
    color: var(--admin-text-muted);
    font-size: var(--font-size-s);
  }

  &__detail-id {
    font-family: monospace;
    font-size: var(--font-size-xs);
    word-break: break-all;
  }

  &__search {
    align-items: flex-end;
    background: var(--admin-surface);
    border: 0;
    border-radius: var(--admin-card-radius);
    padding: var(--space-s);
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
    border: 0;
    border-radius: var(--admin-card-radius);
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
    transition: background 0.1s ease;

    &:last-child {
      border-bottom: 0;
    }

    &:hover,
    &--active {
      background: var(--admin-surface-hover);
    }
  }

  &__avatar {
    width: calc(var(--space) * 2.5);
    height: calc(var(--space) * 2.5);
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--color-background), var(--color-foreground) 10%);
    color: var(--admin-text);
    border: 1px solid var(--admin-border);
    flex-shrink: 0;
    font-weight: 700;
    font-size: var(--font-size-m);
  }

  &__user-summary {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 2px;
    flex: 1;
  }

  &__user-name {
    font-size: var(--font-size-s);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--admin-text);
  }

  &__user-email {
    font-size: var(--font-size-xs);
    color: var(--admin-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__user-meta {
    display: flex;
    align-items: center;
    gap: calc(var(--space-xs) / 2);
    font-size: var(--font-size-xs);
    color: var(--admin-text-muted);
  }

  &__status-dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    flex-shrink: 0;
    background: color-mix(in srgb, var(--color-background), var(--color-foreground) 20%);

    &--online {
      background: var(--color-success, #22c55e);
      box-shadow: 0 0 4px color-mix(in srgb, var(--color-success, #22c55e) 60%, transparent);
    }

    &--offline {
      background: color-mix(in srgb, var(--color-background), var(--color-foreground) 20%);
    }
  }

  &__role-pill {
    border: 1px solid var(--admin-border);
    border-radius: 999px;
    color: var(--admin-text-muted);
    background: color-mix(in srgb, var(--color-background), var(--color-foreground) 6%);
    padding: calc(var(--space-xs) / 2) var(--space-xs);
    font-size: var(--font-size-xs);
    flex-shrink: 0;
  }

  &__detail {
    flex: 1;
    padding: var(--space-m);
    display: flex;
    flex-direction: column;
    gap: var(--space-l);
  }

  &__detail-header {
    display: flex;
    gap: var(--space-m);
    align-items: flex-start;
  }

  &__detail-avatar {
    width: calc(var(--space) * 4);
    height: calc(var(--space) * 4);
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--color-background), var(--color-foreground) 10%);
    color: var(--admin-text);
    border: 1px solid var(--admin-border);
    flex-shrink: 0;
    font-weight: 700;
    font-size: var(--font-size-l);
  }

  &__detail-info {
    display: flex;
    flex-direction: column;
    gap: calc(var(--space-xs) / 2);
    min-width: 0;
  }

  &__detail-title {
    font-size: var(--font-size-l);
    font-weight: 700;
    color: var(--admin-text);
    margin: 0;
  }

  &__detail-meta-row {
    display: flex;
    align-items: center;
    gap: calc(var(--space-xs) / 2);
    flex-wrap: wrap;
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  &__section-title {
    font-size: var(--font-size-m);
    font-weight: 600;
    color: var(--admin-text);
    margin: 0;
  }

  &__role-select {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    padding: var(--space-s);
    background: var(--admin-page-bg);
    color: var(--admin-text);
    font: inherit;
    font-size: var(--font-size-s);

    &:disabled {
      opacity: 0.6;
      cursor: wait;
    }
  }

  &__role-option {
    display: flex;
    gap: var(--space-s);
    align-items: flex-start;
    text-align: left;
    border: 1px solid var(--admin-border);
    border-radius: var(--border-radius-s);
    background: color-mix(in srgb, var(--color-background), var(--color-foreground) 2%);
    color: var(--admin-text);
    padding: var(--space-s);
    cursor: pointer;
    transition: background 0.1s ease, border-color 0.1s ease;

    &:hover {
      background: var(--admin-surface-hover);
      border-color: var(--admin-border-strong);
    }

    &--active {
      background: var(--admin-surface-hover);
      border-color: var(--color-primary, #6366f1);

      &:hover {
        border-color: var(--color-primary, #6366f1);
      }
    }

    &:disabled {
      opacity: 0.6;
      cursor: wait;
    }
  }

  &__role-radio {
    width: calc(var(--space) * 1.125);
    height: calc(var(--space) * 1.125);
    border-radius: 999px;
    border: 2px solid var(--admin-border-strong);
    display: grid;
    place-items: center;
    flex-shrink: 0;
    margin-top: 2px;
    transition: border-color 0.1s ease;

    &--checked {
      border-color: var(--color-primary, #6366f1);
    }
  }

  &__role-radio-dot {
    width: calc(var(--space) * 0.5);
    height: calc(var(--space) * 0.5);
    border-radius: 999px;
    background: var(--color-primary, #6366f1);
  }

  &__role-option-text {
    display: flex;
    flex-direction: column;
    gap: 2px;

    small {
      color: var(--admin-text-muted);
      font-size: var(--font-size-xs);
    }
  }

  @media (max-width: 900px) {
    &__layout,
    &__search {
      flex-direction: column;
    }

    &__list {
      width: 100%;
    }

    &__detail-header {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    &__detail-meta-row {
      justify-content: center;
    }
  }
}
</style>
