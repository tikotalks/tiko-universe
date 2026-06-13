import type { AtlasCapability, AtlasCapabilityDescriptor } from '../types'

export const ATLAS_CAPABILITIES: AtlasCapabilityDescriptor[] = [
  {
    capability: 'speech.synthesize',
    enabled: true,
    allowedApps: ['*'],
    allowedPurposes: ['child-button', 'sentence-speak', 'story-narration', 'voice-sample', 'admin-preview', 'speech-playback', 'compatibility-tts'],
    defaultRoute: { provider: 'openai', model: 'tts-1' },
    accepts: ['text', 'locale', 'format', 'voice'],
    returns: ['audioUrl', 'contentType', 'provider', 'usage'],
    cacheable: true,
    costClass: 'low',
  },
  {
    capability: 'image.generate',
    enabled: true,
    allowedApps: ['admin', 'media', 'radio', 'cards', 'generation-api'],
    allowedPurposes: ['story-cover', 'card-image', 'website-illustration', 'admin-preview', 'media-library', 'image-generation'],
    defaultRoute: { provider: 'openai', model: 'gpt-image-1' },
    accepts: ['prompt', 'size', 'style', 'count'],
    returns: ['images', 'provider', 'usage'],
    cacheable: false,
    costClass: 'high',
  },
  {
    capability: 'text.generate',
    enabled: true,
    allowedApps: ['admin', 'media', 'radio', 'generation-api', 'talk', 'sentence-api'],
    allowedPurposes: ['admin-draft', 'story-draft', 'support-rewrite', 'internal-summary', 'image-art-director', 'word-prediction'],
    defaultRoute: { provider: 'cloudflare-workers-ai', model: '@cf/meta/llama-3.1-8b-instruct' },
    accepts: ['input', 'outputFormat', 'constraints'],
    returns: ['output', 'format', 'provider', 'usage'],
    cacheable: false,
    costClass: 'medium',
  },
  {
    capability: 'text.classify',
    enabled: true,
    allowedApps: ['*'],
    allowedPurposes: ['classification', 'moderation-assist', 'routing'],
    defaultRoute: { provider: 'cloudflare-workers-ai', model: '@cf/meta/llama-3.1-8b-instruct' },
    accepts: ['input', 'labels'],
    returns: ['label', 'confidence', 'provider', 'usage'],
    cacheable: false,
    costClass: 'low',
  },
  {
    capability: 'data.fetch',
    enabled: true,
    allowedApps: ['*'],
    allowedPurposes: ['metadata', 'add-track', 'lookup'],
    defaultRoute: { provider: 'tiko' },
    accepts: ['source', 'operation', 'input'],
    returns: ['data', 'source', 'provider', 'cached'],
    cacheable: true,
    costClass: 'low',
  },
  {
    capability: 'metadata.lookup',
    enabled: true,
    allowedApps: ['*'],
    allowedPurposes: ['media-metadata', 'url-preview'],
    defaultRoute: { provider: 'url-metadata' },
    accepts: ['url', 'source'],
    returns: ['metadata', 'provider', 'cached'],
    cacheable: true,
    costClass: 'low',
  },
]

export function listCapabilities(): AtlasCapabilityDescriptor[] {
  return ATLAS_CAPABILITIES
}

export function findCapability(capability: AtlasCapability): AtlasCapabilityDescriptor | null {
  return ATLAS_CAPABILITIES.find((item) => item.capability === capability) ?? null
}
