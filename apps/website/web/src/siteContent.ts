import { appUniverse, stableRoutes, type StableRoute } from './content/appUniverse'
import { docsPages } from './docsContent'

export type WebsiteRouteId = 'home' | 'apps' | 'tools' | 'how-it-works' | 'caregivers' | 'faq' | 'docs'

export interface WebsiteRoute {
  id: WebsiteRouteId
  path: StableRoute
  label: string
  title: string
  description: string
}

export interface TikoTool {
  id: string
  name: string
  href?: string
  accent: string
  status: string
  summary: string
  tone: string
  useWhen: readonly string[]
}

export const routes: WebsiteRoute[] = [
  { id: 'home', path: '/', label: 'Home', title: 'TikoTalks', description: 'A calm front door for Tiko tools.' },
  { id: 'apps', path: '/tools', label: 'Apps', title: 'Tiny apps, each with one clear job.', description: 'A simple look at the first Tiko tools.' },
  { id: 'how-it-works', path: '/how-it-works', label: 'How it works', title: 'One Tiko, many screens.', description: 'Tiko starts on the web and keeps native paths aligned.' },
  { id: 'caregivers', path: '/caregivers', label: 'Caregivers', title: 'Built so the first moment is not an account form.', description: 'Plain trust principles for adults choosing tools.' },
  { id: 'faq', path: '/faq', label: 'FAQ', title: 'Plain answers before setup.', description: 'Short answers about accounts, claims, platforms, and data.' },
  { id: 'docs', path: '/docs', label: 'Docs', title: 'Tiko Universe docs.', description: 'Architecture, philosophy, and API docs for the Tiko platform.' }
]

export const tools: TikoTool[] = appUniverse.map((app) => ({
  id: app.id,
  name: app.name,
  href: app.status === 'available' ? app.path : undefined,
  accent: app.color,
  status: app.statusLabel,
  summary: app.summary,
  tone: app.platformNotes,
  useWhen: app.useWhen
}))

export const tikoApps = tools
export { docsPages, stableRoutes }

export const platformNotes = [
  { label: 'Web', copy: 'The first place to try Tiko apps, because a link is the fastest way to open a tool.' },
  { label: 'iOS', copy: 'A native path planned around the same child-first contracts.' },
  { label: 'Android', copy: 'Android should follow the same small-tool behaviour.' }
]

export const trustPrinciples = [
  'No passwords.',
  'No login walls before use.',
  'No child-facing account ceremony.',
  'No dark patterns or upgrade pressure in the child flow.',
  'Tiko does not make medical, diagnostic, or therapy-outcome claims.'
]

export const faqs = [
  {
    question: 'Do I need an account to use Tiko?',
    answer: 'No. Tiko apps are designed to open and work without a login wall. Optional caregiver recovery may come later through email magic links, but the child-facing app should not start with account setup.'
  },
  {
    question: 'Is Tiko a therapy or medical product?',
    answer: 'No. Tiko is a set of communication and learning support tools. It may be useful in care, family, classroom, or support contexts, but it does not diagnose, treat, or promise outcomes.'
  },
  {
    question: 'Which app should I start with?',
    answer: 'Start with the smallest tool that matches the moment. Use Yes No for simple answers, Type for written messages, Cards for visual choices, Sequence for ordered steps, and Timer for visible time.'
  },
  {
    question: 'Does Tiko work on phones and tablets?',
    answer: 'The web experience should work well on phones and tablets first. Native iOS and Android clients are part of the platform direction, using the same API contracts as the web apps.'
  },
  {
    question: 'What happens to data?',
    answer: 'Tiko is device-first by default. Apps should work immediately, and caregiver recovery or syncing should be optional. Durable platform data belongs behind documented APIs, not hidden browser-only behaviour.'
  },
  {
    question: 'Why separate tiny apps instead of one big app?',
    answer: 'Children and caregivers often need one clear thing in the moment. Separate tiny apps keep screens simpler, reduce setup, and make each tool easier to trust.'
  },
  {
    question: 'How does the media library work in Cards?',
    answer: 'Cards includes built-in image categories (animals, food, emotions, etc.) fetched from the Tiko media API. All images are served in high quality via the tikocdn.org CDN with automatic resizing.'
  }
]
