import { defineComponent, h, onMounted, ref, watch } from 'vue'
import { Button } from '@sil/ui'
import { type TikoAppColor } from './app-config'
import { appThemeStyle, fetchTikoMediaIcon, iconSpan } from './TikoAppTheme'

export interface TikoHeaderAction {
  id: string
  label: string
  icon: string
  active?: boolean
  disabled?: boolean
  visible?: boolean
  round?: boolean
}

export interface TikoShellLabels {
  account?: string
  back?: string
  deselect?: string
  edit?: string
  openIcons?: string
  select?: string
}

export const TikoAppHeader = defineComponent({
  name: 'TikoAppHeader',
  props: {
    appName: { type: String, required: true },
    appIcon: { type: String, default: 'ui/check-fat' },
    appIconImageUrl: { type: String, default: '' },
    appIconMediaCategory: { type: String, default: '' },
    avatar: { type: String, default: '' },
    appColor: { type: String as () => TikoAppColor, default: 'yes-no' },
    themeColor: { type: String, default: '' },
    actions: { type: Array as () => TikoHeaderAction[], default: () => [] },
    showBack: { type: Boolean, default: false },
    showSettingsButton: { type: Boolean, default: true },
    labels: { type: Object as () => Pick<TikoShellLabels, 'account' | 'back'>, default: () => ({}) },
  },
  emits: ['action', 'avatar-click', 'back-click', 'title-click'],
  setup(props, { emit }) {
    const mediaIconUrl = ref('')

    let mediaIconSeq = 0

    async function resolveMediaIcon() {
      const seq = ++mediaIconSeq
      mediaIconUrl.value = ''
      if (!props.appIconMediaCategory || typeof fetch === 'undefined') return
      const storageKey = `tiko:app-icon:${props.appColor}:${props.appIconMediaCategory}`
      try {
        const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey) : ''
        if (stored) {
          if (seq !== mediaIconSeq) return
          mediaIconUrl.value = stored
          return
        }
        const url = await fetchTikoMediaIcon(props.appIconMediaCategory)
        if (seq !== mediaIconSeq) return
        if (url) {
          mediaIconUrl.value = url
          if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey, url)
        }
      } catch {
        mediaIconUrl.value = ''
      }
    }

    onMounted(resolveMediaIcon)
    watch(() => [props.appColor, props.appIconMediaCategory], resolveMediaIcon)

    return () => h('header', { class: ['tiko-app-header', props.showBack ? 'tiko-app-header--has-back' : ''], 'data-test': 'tiko-app-header', 'data-app-color': props.appColor, style: appThemeStyle(props.themeColor) }, [
      h('div', { class: 'tiko-app-header__brand' }, [
        props.showBack
          ? h('button', {
              class: 'tiko-app-header__back-btn',
              'aria-label': props.labels.back ?? 'Back',
              onClick: () => emit('back-click'),
            }, [iconSpan('arrows/arrow-left')])
          : h('span', { class: ['tiko-app-header__app-icon', (props.appIconImageUrl || mediaIconUrl.value) ? 'tiko-app-header__app-icon--image' : ''], 'aria-hidden': 'true' }, [iconSpan(props.appIconImageUrl || mediaIconUrl.value || props.appIcon, props.appName)]),
        h('span', { class: 'tiko-app-header__title', 'data-test': 'tiko-shell-title', onClick: () => emit('title-click') }, props.appName)
      ]),
      h('div', { class: 'tiko-app-header__actions' }, [
        ...props.actions.filter(a => a.visible !== false && (props.showSettingsButton || a.id !== 'settings')).map(action => h(Button, {
          class: ['tiko-app-header__action', action.active ? 'tiko-app-header__action--active' : '', action.round ? 'tiko-app-header__action--round' : ''],
          variant: 'ghost',
          iconOnly: true,
          icon: action.icon,
          'aria-label': action.label,
          disabled: action.disabled,
          'data-test': `tiko-header-action-${action.id}`,
          onClick: () => emit('action', action.id)
        })),
        props.avatar ? h('button', {
          class: 'tiko-app-header__avatar',
          'aria-label': props.labels.account ?? 'Account',
          onClick: () => emit('avatar-click'),
        }, [iconSpan(props.avatar, props.labels.account ?? 'Account')]) : null
      ])
    ])
  }
})

export const TikoAppShell = defineComponent({
  name: 'TikoAppShell',
  props: {
    appName: { type: String, required: true },
    appIcon: { type: String, default: 'ui/check-fat' },
    appIconImageUrl: { type: String, default: '' },
    appIconMediaCategory: { type: String, default: '' },
    appColor: { type: String as () => TikoAppColor, default: 'yes-no' },
    themeColor: { type: String, default: '' },
    avatar: { type: String, default: '' },
    actions: { type: Array as () => TikoHeaderAction[], default: () => [] },
    showBack: { type: Boolean, default: false },
    showSettingsButton: { type: Boolean, default: true },
    labels: { type: Object as () => Pick<TikoShellLabels, 'account' | 'back'>, default: () => ({}) },
  },
  emits: ['headerAction', 'avatar-click', 'back-click', 'title-click'],
  setup(props, { slots, emit }) {
    return () => h('div', { class: 'tiko-app-shell', 'data-app-color': props.appColor, style: appThemeStyle(props.themeColor) }, [
      h(TikoAppHeader, {
        appName: props.appName,
        appIcon: props.appIcon,
        appIconImageUrl: props.appIconImageUrl,
        appIconMediaCategory: props.appIconMediaCategory,
        avatar: props.avatar,
        appColor: props.appColor,
        themeColor: props.themeColor,
        actions: props.actions,
        showBack: props.showBack,
        showSettingsButton: props.showSettingsButton,
        labels: props.labels,
        onAction: (id: string) => emit('headerAction', id),
        onAvatarClick: () => emit('avatar-click'),
        onBackClick: () => emit('back-click'),
        onTitleClick: () => emit('title-click'),
      }),
      h('main', { class: 'tiko-app-shell__main' }, slots.default?.())
    ])
  }
})
