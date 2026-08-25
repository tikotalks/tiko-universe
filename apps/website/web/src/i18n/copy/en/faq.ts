import type { ContentPage } from '../../content.model'

export const faqEn = {
  documentTitle: 'Frequently asked questions',
  description:
    'Plain answers about what Tiko is, what it costs, what it collects, and what it deliberately does not claim to do.',
  eyebrow: 'Frequently asked questions',
  title: 'Plain answers before setup.',
  lede: 'Short answers to the questions caregivers, teachers and developers ask most often. If yours is not here, a real person is one email away.',

  sections: [
    {
      id: 'basics',
      eyebrow: 'The basics',
      title: 'What Tiko is.',
      questions: [
        {
          question: 'What is Tiko?',
          answer:
            'Tiko is a collection of small, free apps that help children communicate, make choices, follow routines, and understand time. Each app does one clear thing and opens instantly — in any language, on any device, without an account.',
        },
        {
          question: 'Why is it many apps instead of one?',
          answer:
            'Because every extra control on screen is one more thing for a child to misread or mis-tap. An app that does one job can be learned completely, and a child who has learned it can trust it. Yes No is two buttons; it should never grow a sentence builder.',
        },
        {
          question: 'Who is Tiko for?',
          answer:
            'Children who need support expressing themselves — through a speech or language difficulty, a developmental delay, a disability, or simply being early in learning to talk — and the parents, teachers and therapists beside them. Nothing about it requires a diagnosis.',
        },
        {
          question: 'Which apps exist today?',
          answer:
            'Yes No, Type, Talk, Say, Sum and First are available now, on the web or the App Store depending on the app. Cards, Sequence and Timer are still being built. The apps page shows exactly where each one can be opened.',
        },
      ],
    },
    {
      id: 'cost',
      eyebrow: 'Cost',
      title: 'What it costs, and why.',
      questions: [
        {
          question: 'Is Tiko really free?',
          answer:
            'Yes. The Tiko apps are free, always. Not a temporary preview, not a teaser, and not an upgrade funnel. There is no paid tier holding back a feature a child needs.',
        },
        {
          question: 'Will Tiko show ads?',
          answer:
            'No. No ads, ever. Tiko should be safe to open beside a child without commercial content, sponsored prompts, or anything designed to extract attention.',
        },
        {
          question: 'If it is free and ad-free, how is it funded?',
          answer:
            'Tiko is built as an open-source project rather than a business with a growth target. That keeps the running costs small — the apps are tiny and most of them talk to no server at all.',
        },
        {
          question: 'Is my child\'s data the payment?',
          answer:
            'No. Free does not mean ad-funded here. Most Tiko apps collect nothing, so there is nothing to sell even if we wanted to.',
        },
      ],
      tone: 'primary',
    },
    {
      id: 'accounts',
      eyebrow: 'Accounts and privacy',
      title: 'What you have to give up to use it.',
      questions: [
        {
          question: 'Do I need an account?',
          answer:
            'No. Tiko apps open and work without a login wall. Optional caregiver recovery is available later through an email magic link, but the child-facing app never starts with account setup.',
        },
        {
          question: 'What data does Tiko collect?',
          answer:
            'In most apps, nothing. There is no analytics on what a child taps, no advertising identifiers, and no third-party trackers. Content you create — cards, routines, saved phrases — stays on the device unless you turn on syncing.',
        },
        {
          question: 'Does Tiko record my child\'s voice?',
          answer:
            'Where an app listens, speech recognition runs on the device wherever the platform supports it, and recordings are never stored or uploaded. Apps that do not need a microphone never ask for one.',
        },
        {
          question: 'Can I verify any of this?',
          answer:
            'Yes, and you should. Tiko is open source, so the code behind these claims is public. The privacy policy sets out what is kept in plain language.',
        },
      ],
    },
    {
      id: 'scope',
      eyebrow: 'What Tiko is not',
      title: 'The limits, stated plainly.',
      questions: [
        {
          question: 'Is Tiko a therapy or medical product?',
          answer:
            'No. Tiko does not diagnose, treat, or promise outcomes. It is a set of communication and learning tools, not a clinical intervention, and it is not a substitute for a speech and language therapist.',
        },
        {
          question: 'Does Tiko track progress?',
          answer:
            'No, deliberately. There are no scores, streaks or dashboards. Progress in communication is not something an app should be grading, and a number on a screen tends to shape the adult\'s behaviour more than the child\'s.',
        },
        {
          question: 'Will it work for my child?',
          answer:
            'We genuinely do not know, and anyone claiming otherwise is guessing. The apps are free and open instantly, so the cheapest way to find out is to try one for a few minutes.',
        },
      ],
    },
    {
      id: 'practical',
      eyebrow: 'Practical',
      title: 'Devices, languages and offline use.',
      questions: [
        {
          question: 'Which languages does Tiko speak?',
          answer:
            'The apps are multilingual from the ground up, and the language a caregiver picks follows them across every Tiko app and this website. Where a language has no interface translation yet, the app falls back to English rather than refusing to open.',
        },
        {
          question: 'Does it work offline?',
          answer:
            'Yes. The apps load their core content to the device and keep working without a network. Anything that needs the internet is additive, and failing to reach it does not stop the app.',
        },
        {
          question: 'What devices does it run on?',
          answer:
            'Any modern browser, plus native iPhone and iPad apps for the ones that have shipped on the App Store. Android follows the same approach.',
        },
        {
          question: 'Can I use it across a class or caseload?',
          answer:
            'Yes. Profile Manager keeps a separate profile per child on a shared device, and there is no per-seat licence to buy or report.',
        },
      ],
    },
  ],

  cta: {
    title: 'Still have a question?',
    body: 'Support is a person, not a ticket queue. Ask and you will get a straight answer.',
    primaryLabel: 'Get support',
    primaryPath: '/support',
    secondaryLabel: 'Why Tiko exists',
    secondaryPath: '/why-tiko',
  },
} as const satisfies ContentPage
