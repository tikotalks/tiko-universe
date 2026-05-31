export type DocsPageId = 'docs-overview' | 'docs-philosophy' | 'docs-architecture' | 'docs-apis'

export type DocsPagePath = '/docs' | '/docs/philosophy' | '/docs/architecture' | '/docs/apis'

export interface DocsCallout {
  title: string
  body: string
}

export interface DocsSection {
  eyebrow?: string
  title: string
  body: readonly string[]
  bullets?: readonly string[]
  code?: string
}

export interface DocsPage {
  id: DocsPageId
  path: DocsPagePath
  label: string
  title: string
  lede: string
  summary: string
  callouts?: readonly DocsCallout[]
  sections: readonly DocsSection[]
}

export const docsPages: readonly DocsPage[] = [
  {
    id: 'docs-overview',
    path: '/docs',
    label: 'Overview',
    title: 'Tiko Universe docs',
    lede: 'The architecture, product philosophy, and API map for the clean Tiko platform.',
    summary: 'A public, readable entry point for how Tiko is built and why the system is shaped this way.',
    callouts: [
      {
        title: 'Tiny apps, shared platform',
        body: 'Yes No, Type, Cards, Sequence, Timer, Radio, Media, and future apps should all reuse the same identity, state, content, media, generation, and UI contracts.'
      },
      {
        title: 'API first, Cloudflare native',
        body: 'Clients are intentionally thin. Backend authority lives in Cloudflare Workers with D1, R2, KV-as-cache, and Queues where asynchronous work becomes necessary.'
      },
      {
        title: 'No account ceremony first',
        body: 'A child-facing tool must open and be useful before caregiver recovery, sync, or admin features appear.'
      }
    ],
    sections: [
      {
        eyebrow: 'What this covers',
        title: 'A practical map for builders',
        body: [
          'These docs explain Tiko as a product and as a backend platform. They are not marketing fluff and they are not a dumping ground for implementation trivia.',
          'The important rule is simple: if a behavior affects web, iOS, or Android clients, it belongs in a documented API contract before it becomes hidden client logic.'
        ],
        bullets: [
          'Philosophy: child-first product doctrine and engineering constraints.',
          'Architecture: apps, packages, Workers, storage ownership, domains, and deployment boundaries.',
          'APIs: the current contract families and the stable shapes clients should expect.'
        ]
      },
      {
        eyebrow: 'Current platform shape',
        title: 'One repo, clear ownership',
        body: [
          'Tiko Universe is an npm-workspace monorepo with product-first apps, shared TypeScript packages, and Cloudflare Worker services. Native iOS code lives beside each product where it exists; Android should follow the same API contracts rather than copying backend logic into the client.'
        ],
        bullets: [
          'Apps: child-facing tools and supporting public/admin surfaces.',
          'Packages: typed clients, shared contracts, Tiko UI, i18n, media, identity, and testing helpers.',
          'Workers: identity, app state, content, media, generation, admin, and temporary TTS compatibility.'
        ]
      }
    ]
  },
  {
    id: 'docs-philosophy',
    path: '/docs/philosophy',
    label: 'Philosophy',
    title: 'Product and engineering philosophy',
    lede: 'Tiko is child-first software. The backend exists to keep the child-facing moment immediate, calm, and recoverable without turning it into adult SaaS.',
    summary: 'The non-negotiables behind every architecture choice.',
    callouts: [
      { title: 'Immediate', body: 'Apps open and work immediately. The first screen is never a login form.' },
      { title: 'Small', body: 'Each app does one clear job instead of becoming a dashboard.' },
      { title: 'Recoverable', body: 'Device-first sessions can later become recoverable through caregiver email magic links.' }
    ],
    sections: [
      {
        eyebrow: 'Doctrine',
        title: 'Non-negotiables',
        body: [
          'The doctrine is intentionally strict because I have seen “just one exception” turn into a platform nobody understands six months later. Tiko avoids that by keeping identity, APIs, and storage ownership boring and explicit.'
        ],
        bullets: [
          'No passwords and no login walls before use.',
          'No Supabase runtime, old-user bridge, legacy migration requirement, or Better Auth assumption.',
          'Device-first identity by default; optional email recovery later through magic links.',
          'D1 is relational source of truth. R2 is byte source of truth. KV is cache only.',
          'Lezu owns translation management; Tiko consumes bundles and checked-in fallbacks.',
          'Web, iOS, and Android are equal clients of the same HTTPS JSON APIs.'
        ]
      },
      {
        eyebrow: 'Product model',
        title: 'Why tiny apps',
        body: [
          'Tiko is not one giant “special needs platform” with a maze of features. It is a universe of small, focused tools that can be opened at the moment a child or caregiver needs one thing.',
          'Separate tools reduce cognitive load, keep tap targets obvious, and make it easier to test whether a tool helps before asking the caregiver to trust sync, recovery, or admin features.'
        ],
        bullets: [
          'Yes No: quick two-choice answers.',
          'Type: text entry and speech output.',
          'Cards: visual choices and familiar content.',
          'Sequence: ordered routines and next steps.',
          'Timer: visible time and transitions.'
        ]
      },
      {
        eyebrow: 'Engineering model',
        title: 'Contracts before clients',
        body: [
          'Client code is allowed to be pleasant and resilient. It is not allowed to secretly become the backend. If behavior has authority, persistence, provider secrets, or cross-device effects, it belongs in a Worker and a documented contract.'
        ],
        bullets: [
          'Packages expose typed clients, models, fixtures, and UI composition.',
          'Workers own auth, rate limits, D1/R2/KV/Queue access, provider calls, and durable mutations.',
          'Apps may keep local fallback state so the child flow stays usable when a network call fails.'
        ]
      }
    ]
  },
  {
    id: 'docs-architecture',
    path: '/docs/architecture',
    label: 'Architecture',
    title: 'Architecture',
    lede: 'Tiko is a Cloudflare-native platform: product-first apps, shared client packages, Workers as domain services, D1/R2 for durable state, and KV only as cache.',
    summary: 'How the monorepo, domains, storage, workers, and clients fit together.',
    callouts: [
      { title: 'Clients', body: 'Vue web apps, SwiftUI iOS apps, and future Android clients consume the same API contracts.' },
      { title: 'Services', body: 'Workers are split by domain boundary, not by whatever file happened to exist first.' },
      { title: 'Storage', body: 'D1 owns relational truth. R2 owns bytes. KV is rebuildable cache.' }
    ],
    sections: [
      {
        eyebrow: 'System map',
        title: 'High-level flow',
        body: [
          'The architecture is deliberately plain. Clients talk over HTTPS JSON APIs. Workers validate identity and own mutations. Storage is bound to the Worker that owns the domain.'
        ],
        code: `Web Vue apps        SwiftUI iOS apps        Android apps\n     |                    |                   |\n     +--------------------+-------------------+\n                          |\n                    HTTPS JSON APIs\n                          |\n identity-api  app-api  content-api  media-api  generation-api  admin-api\n      |          |          |           |            |              |\n     D1         D1        D1/KV       D1/R2        D1/R2/Queues    D1`
      },
      {
        eyebrow: 'Repository',
        title: 'Product-first monorepo',
        body: [
          'The repo is organized around products first, then platform packages and Workers. That keeps child-facing app context close to its web and native implementation while still sharing contracts through packages.'
        ],
        bullets: [
          '`apps/<product>/web` contains Vue apps deployed to Cloudflare Pages.',
          '`apps/<product>/ios` contains SwiftUI clients where native work exists.',
          '`packages/*` contains shared TypeScript contracts, clients, Tiko UI, i18n, media, identity, and testing helpers.',
          '`workers/*` contains Cloudflare Worker services with their own D1/R2 bindings and tests.'
        ]
      },
      {
        eyebrow: 'Service boundaries',
        title: 'Worker ownership',
        body: [
          'Each Worker has a narrow job. That makes authorization, migrations, rate limiting, and deploy risk easier to reason about.'
        ],
        bullets: [
          '`identity-api`: users, devices, sessions, magic links, and recovery.',
          '`app-api`: per-user app settings and app state.',
          '`content-api`: published content, CMS-like records, and cacheable read models.',
          '`media-api`: upload authorization, media metadata, ownership, and R2 access.',
          '`generation-api`: TTS, sentence/image generation, generated media metadata, and future queues.',
          '`admin-api`: dangerous/admin-only operations, reports, moderation, and support tooling.',
          '`tts-api`: temporary compatibility surface that should fold into generation-api.'
        ]
      },
      {
        eyebrow: 'Domains',
        title: 'Public routes',
        body: [
          'Domains are part of the architecture. Random new hostnames are how platforms turn into archaeology.'
        ],
        bullets: [
          '`tiko.mt`: public product/marketing home.',
          '`tikotalks.com`: public TikoTalks documentation/brand surface for these pages.',
          '`*.tikoapps.org`: app runtime family such as yesno, type, cards, sequence, timer, media, and admin.',
          '`id.tiko.mt`: device-first identity origin.',
          '`api.tikotalks.com/v1/*`: consolidated API route family where practical.',
          '`media-api.tikotalks.com`, `admin-api.tikotalks.com`, `tts.tikotalks.com`: dedicated service subdomains where separation is useful.',
          '`*.tikocdn.org`: byte delivery only, not application logic.'
        ]
      }
    ]
  },
  {
    id: 'docs-apis',
    path: '/docs/apis',
    label: 'APIs',
    title: 'API contracts',
    lede: 'The APIs are the product spine. They let web, iOS, and Android clients behave the same way without copying backend logic into each app.',
    summary: 'A readable guide to the current `/v1` contract families.',
    callouts: [
      { title: 'Versioned', body: 'Client-visible APIs live under `/v1` and return JSON except byte streaming endpoints.' },
      { title: 'Typed errors', body: 'Errors use stable machine-readable codes and safe human messages.' },
      { title: 'Bearer-friendly', body: 'Native clients must work with explicit bearer sessions; browser-only cookies are not enough.' }
    ],
    sections: [
      {
        eyebrow: 'Shared API rules',
        title: 'Contract rules',
        body: [
          'The API shape should stay boring. That is a compliment. Predictable routes and error envelopes are what keep multiple clients from drifting.'
        ],
        bullets: [
          'Use `/v1` paths.',
          'Return JSON from API routes; stream bytes only from explicit media/audio read routes.',
          'Use bearer session auth for native parity.',
          'Never leak whether a recovery email or handle exists.',
          'Store raw tokens only client-side; server state stores token hashes.',
          'Do not expose provider error bodies to clients.'
        ],
        code: `interface ApiErrorEnvelope {\n  error: {\n    code: string\n    message: string\n    field?: string\n    retryAfterSeconds?: number\n  }\n  meta?: { requestId?: string }\n}`
      },
      {
        eyebrow: 'Identity',
        title: 'Device-first identity API',
        body: [
          'Identity exists so apps can open immediately and still become recoverable later. Bootstrap creates or restores a device session; email recovery upgrades continuity without turning startup into login.'
        ],
        bullets: [
          '`POST /v1/identity/device` — create or restore a device-first session.',
          '`GET /v1/identity/session` — validate and return the current session bundle.',
          '`POST /v1/identity/email` — request or attach recovery email with a generic accepted response.',
          '`POST /v1/identity/magic-links/verify` — verify a magic link and return a session bundle.',
          '`POST /v1/identity/logout` — revoke the current bearer session.'
        ],
        code: `interface SessionBundle {\n  user: { id: string; kind: 'device' | 'recoverable'; recoverable: boolean }\n  device: { id: string; name?: string; secret?: string }\n  session: { token: string; expiresAt: string }\n}`
      },
      {
        eyebrow: 'App data',
        title: 'Settings and state API',
        body: [
          'The app API owns user-scoped settings and state for small Tiko apps. Settings are caregiver-visible preferences. State is the app-specific data worth preserving across devices when persistence is intentional.'
        ],
        bullets: [
          '`GET /v1/apps/{app}/settings` — read settings.',
          '`PUT /v1/apps/{app}/settings` — save settings with versioning support.',
          '`GET /v1/apps/{app}/state` — read app state.',
          '`PUT /v1/apps/{app}/state` — save app state.',
          'Allowed P0 app names: `yes-no`, `type`, `cards`, `sequence`, `timer`.'
        ]
      },
      {
        eyebrow: 'Generation and media',
        title: 'TTS, generated audio, uploads, and media records',
        body: [
          'Generation and media are related but not the same thing. Generation creates assets. Media manages uploaded/user assets and metadata. R2 stores bytes; D1 stores ownership and lookup metadata.'
        ],
        bullets: [
          '`POST /v1/generation/tts` — generate or fetch cached text-to-speech audio.',
          '`GET /v1/generation/audio/{id}` — stream generated audio bytes.',
          '`POST /v1/media/uploads` — authorize/register media upload.',
          '`GET /v1/media/{id}` — read media metadata or access details.',
          '`DELETE /v1/media/{id}` — future deletion contract when product UX exists.'
        ]
      },
      {
        eyebrow: 'Content and admin',
        title: 'Published content and dangerous operations',
        body: [
          'Content is for published read models, app content, and CMS-like records. Admin is deliberately separate because dangerous operations should never be smuggled into child-facing app APIs.'
        ],
        bullets: [
          '`content-api` owns published content, app visibility, content versions, and cacheable read models.',
          '`admin-api` owns back-office configuration, reports, moderation, support actions, and audit logs.',
          'Admin API keys or sessions do not belong in child-facing flows.'
        ]
      }
    ]
  }
]

export const docsRoutes = docsPages.map((page) => page.path)

export function getDocsPage(path: string): DocsPage | undefined {
  return docsPages.find((page) => page.path === path) ?? (path.startsWith('/docs/') ? undefined : docsPages[0])
}
