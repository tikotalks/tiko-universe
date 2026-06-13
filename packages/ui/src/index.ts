export { default as TikoLogo } from './TikoLogo.vue'
export { default as TikoChildAccountsPanel } from './TikoChildAccountsPanel.vue'
export { default as TikoProfileMenu } from './TikoProfileMenu.vue'
export { default as TikoPinPopup } from './TikoPinPopup.vue'
export { default as TikoSquareTile } from './TikoSquareTile.vue'
export { default as TikoPagedTileGrid } from './TikoPagedTileGrid.vue'
export { default as TikoTileBoard } from './TikoTileBoard.vue'
export { default as TikoSheet } from './TikoSheet.vue'
export { default as TikoField } from './TikoField.vue'
export { default as TikoColorPicker } from './TikoColorPicker.vue'
export { default as TikoToggleRow } from './TikoToggleRow.vue'
export { default as TikoSegmentedControl } from './TikoSegmentedControl.vue'
export { default as TikoSelectionBadge } from './TikoSelectionBadge.vue'
export { default as TikoEditBadge } from './TikoEditBadge.vue'
export { default as TikoOpenIconPicker, type TikoOpenIconPickerLabels } from './TikoOpenIconPicker'
export { injectAppMeta } from './TikoAppTheme'
export { TikoAppHeader, TikoAppShell, type TikoHeaderAction, type TikoShellLabels } from './TikoAppHeader'
export { createTikoChoice, TikoAnswerButton, TikoChoiceGrid, type TikoChoice, type TikoChoiceInput, type TikoChoiceTone } from './TikoChoiceGrid'
export { TikoSettingsPanel, type TikoSettingsPanelLabels, type TikoSettingsPanelLanguage } from './TikoSettingsPanel'
export { useIdentityRuntime, type UseIdentityRuntimeOptions, type IdentityRuntimeState, type StoredIdentity, type TikoIdentityLabels } from './identity-runtime'
export { useTikoAppDataRuntime, useTikoAppSettingsRuntime, type TikoAppDataClient, type TikoAppDataRuntimeOptions, type TikoAppSettingsClient, type TikoAppSettingsRuntimeOptions, type TikoVersionedSettings, type TikoVersionedState } from './app-data-runtime'
export { useTikoI18nRuntime, type UseTikoI18nRuntimeOptions } from './i18n-runtime'
export { createTikoTtsClient, type TikoTtsClientOptions, type TikoTtsProvider, type TikoTtsRequest, type TikoTtsResponse } from './tts-client'
export {
  TIKO_PALETTE,
  tikoAppColors,
  tikoAppConfigs,
  tikoNormalizeOpenIcon,
  tikoOpenIcons,
  type TikoAppColor,
  type TikoAppConfig,
  type TikoColorMode,
  type TikoOpenIconOption,
  type TikoSupportedLanguagesMode,
} from './app-config'
export { tikoContentImageRefUrl, tikoMediaThumbnailUrl } from './media-images'
export {
  applyTikoColorMode,
  normalizeTikoColorMode,
  readTikoLocalJson,
  resolveTikoAppApiBaseUrl,
  resolveTikoColorMode,
  resolveTikoContentApiBaseUrl,
  resolveTikoGenerationApiBaseUrl,
  resolveTikoIdentityBaseUrl,
  resolveTikoMediaApiBaseUrl,
  useTikoColorModeEffect,
  writeTikoLocalJson,
  type TikoColorModeDocument,
  type TikoColorModeMediaQuery,
  type TikoColorModeWindow,
  type TikoRuntimeEnv,
} from './web-runtime'
export { hashParentPin } from './pin-crypto'
import './styles.scss'

export { Button as SilButton, Icon as SilIcon } from '@sil/ui'

export { tikoColors, type TikoColorEntry } from './tikoColors'


export const tikoKitComponents = [
  'TikoAppHeader',
  'TikoAppShell',
  'TikoAnswerButton',
  'TikoChoiceGrid',
  'TikoSettingsPanel',
  'TikoOpenIconPicker',
  'TikoTileBoard',
  'tikoAppColors',
  'tikoAppConfigs'
]
