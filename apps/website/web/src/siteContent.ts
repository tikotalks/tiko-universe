import { appUniverse, stableRoutes, type StableRoute } from './content/appUniverse'
import { docsPages } from './docsContent'

export type WebsiteRouteId = 'home' | 'apps' | 'tools' | 'why-tiko' | 'how-it-works' | 'caregivers' | 'educators' | 'faq' | 'docs'

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

export interface ContentPillar {
  title: string
  body: string
}

export const routes: WebsiteRoute[] = [
  { id: 'home', path: '/', label: 'Home', title: 'TikoTalks', description: 'Beautiful, free communication apps for every child. No ads, no account, any language.' },
  { id: 'apps', path: '/tools', label: 'Apps', title: 'Tiny apps. One clear job each.', description: 'A simple look at the Tiko app universe.' },
  { id: 'why-tiko', path: '/why-tiko', label: 'Why Tiko', title: 'Why Tiko exists.', description: 'Why Tiko is small, free, beautiful, and built for every language.' },
  { id: 'how-it-works', path: '/how-it-works', label: 'How it works', title: 'One Tiko, many screens.', description: 'Tiko starts on the web and keeps native paths aligned.' },
  { id: 'educators', path: '/educators', label: 'Educators', title: 'Manage multiple child accounts with Tiko Profile Manager.', description: 'Create child accounts, control what each child sees, and keep the child-facing experience calm.' },
  { id: 'caregivers', path: '/caregivers', label: 'Caregivers', title: 'Built so the first moment is not an account form.', description: 'Plain trust principles for adults choosing tools for children.' },
  { id: 'faq', path: '/faq', label: 'FAQ', title: 'Quick answers.', description: 'Short answers about accounts, ads, platforms, and what Tiko is.' },
  { id: 'docs', path: '/docs', label: 'Docs', title: 'Tiko Universe docs.', description: 'Technical architecture, product doctrine, and API docs for builders.' }
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

export const whyTikoPillars: ContentPillar[] = [
  {
    title: 'Open instantly. No setup.',
    body: 'Tiko apps are ready the moment you need them. No account form, no download, no tutorial — just open and use.'
  },
  {
    title: 'One app, one clear job.',
    body: 'Each Tiko app does exactly one thing. The screen stays simple, calm, and easy to trust — for the child and the adult beside them.'
  },
  {
    title: 'Every language, built in.',
    body: 'Tiko is multilingual from the ground up, not as an afterthought. Every app speaks the child\'s language — because communication tools that only work in one language leave too many people out.'
  },
  {
    title: 'Free and ad-free, always.',
    body: 'No trial. No premium gate. No ads. No attention tracking. The tools work the same on day one as they do on day one thousand.'
  }
]

export const whyFreePillars: ContentPillar[] = [
  {
    title: 'No hesitation.',
    body: 'Open a tool and try it with a child right now — without deciding whether the moment is worth paying for.'
  },
  {
    title: 'No pressure.',
    body: 'Tiko doesn\'t use urgency, shame, ads, or upgrade prompts. Nothing turns communication into a transaction.'
  },
  {
    title: 'No hidden bargain.',
    body: 'Free doesn\'t mean ad-funded. Tiko is not trading a child\'s attention or data for access.'
  }
]

export const platformNotes = [
  { label: 'Web', copy: 'The fastest way to try Tiko. A link is all it takes — no app store, no download required.' },
  { label: 'iOS', copy: 'Native iOS apps planned with the same simple, focused experience as the web.' },
  { label: 'Android', copy: 'Android follows the same approach — small tools, one job each, consistent behaviour.' }
]

export const trustPrinciples = [
  'Free, always.',
  'No ads. Ever.',
  'No passwords.',
  'No login walls before use.',
  'No child-facing account ceremony.',
  'No dark patterns or upgrade pressure in the child flow.',
  'Tiko does not make medical, diagnostic, or therapy-outcome claims.'
]

export const faqs = [
  {
    question: 'What is Tiko?',
    answer: 'Tiko is a collection of small, free, and beautiful apps that help children communicate, make choices, follow routines, and understand time. Each app does one clear thing and opens instantly — in any language, on any device, without needing an account.'
  },
  {
    question: 'Why does Tiko exist?',
    answer: 'Because communication should be joyful and immediate. Every child deserves a tool that opens the moment they need it — not after a signup flow, not behind a paywall, and not in only one language.'
  },
  {
    question: 'Is Tiko really free?',
    answer: 'Yes. The core Tiko apps are free, always. They are not a temporary preview, not a teaser, and not an upgrade funnel.'
  },
  {
    question: 'Will Tiko show ads?',
    answer: 'No. No ads, ever. Tiko should be safe to open beside a child without commercial content, sponsored prompts, or attention extraction.'
  },
  {
    question: 'Do I need an account to use Tiko?',
    answer: 'No. Tiko apps open and work without a login wall. Optional caregiver recovery may come later through email magic links, but the child-facing app never starts with account setup.'
  },
  {
    question: 'Is Tiko a therapy or medical product?',
    answer: 'No. Tiko is a set of communication and daily-life tools. They may be useful in care, classroom, or home contexts, but Tiko does not diagnose, treat, or promise outcomes. Caregivers and professionals decide whether a tool fits their situation.'
  },
  {
    question: 'Which app should I start with?',
    answer: 'Start with the simplest tool that fits the moment. Yes No for quick answers, Talk for building sentences, Type for spoken messages, Cards for visual choices, Sequence for step-by-step routines, and Timer for making time visible.'
  },
  {
    question: 'Why separate tiny apps instead of one big app?',
    answer: 'One clear thing on the screen is easier to understand and trust than a complicated panel. Separate tiny apps keep each moment focused, reduce setup, and make each tool simpler to pick up and put down.'
  },
  {
    question: 'Does Tiko work in my language?',
    answer: 'Tiko is built multilingual from the start, not as a bolt-on. Every app ships with multilingual text and speech support — because communication tools that only work in one language leave too many people out.'
  },
  {
    question: 'Does Tiko work on phones and tablets?',
    answer: 'The web experience works well on phones and tablets first. Native iOS and Android apps are part of the plan, using the same API contracts as the web apps.'
  },
  {
    question: 'What happens to data?',
    answer: 'Tiko is device-first by default. Apps work immediately without an account. Caregiver recovery and syncing are optional and always transparent.'
  },
  {
    question: 'How does the media library work in Cards?',
    answer: 'Cards includes built-in image categories served from the Tiko media library. Thousands of clear, colourful images are ready to use — no upload or setup needed.'
  }
]
