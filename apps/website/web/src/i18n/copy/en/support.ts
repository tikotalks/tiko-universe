import type { ContentPage } from '../../content.model'

export const supportEn = {
  documentTitle: 'Support',
  description:
    'Help with the Tiko apps for children, caregivers and educators — common topics, troubleshooting, and how to reach a person.',
  eyebrow: 'Support',
  title: "We're here to help.",
  lede: 'Help with the Tiko apps for children, caregivers and educators. Most answers are below — and a real person is one email away.',

  sections: [
    {
      id: 'common',
      eyebrow: 'Common topics',
      title: 'Quick answers to start with.',
      points: [
        {
          title: 'Getting started',
          body: 'Every Tiko app opens straight away — no account or password needed. Open the link or install the app, and start using it.',
        },
        {
          title: 'Accounts and devices',
          body: 'Tiko uses device-based sessions rather than passwords. If you switch or reset a device, add a recovery email beforehand so your content follows you.',
        },
        {
          title: 'Voices and languages',
          body: 'Choose a voice and language that feels right for the child. Tiko apps support many languages and switch instantly from the settings screen.',
        },
        {
          title: 'Offline use',
          body: 'Apps keep working without a network after first use. Syncing resumes on its own when a connection comes back.',
        },
        {
          title: 'Privacy and data',
          body: 'Most apps store nothing off the device. What you create stays local unless you deliberately turn on syncing.',
        },
        {
          title: 'Something not working?',
          body: 'Tell us what you saw, on which device, and in which app. That is usually enough for us to find it.',
        },
      ],
    },
    {
      id: 'troubleshooting',
      eyebrow: 'Troubleshooting',
      title: 'The three things that fix most problems.',
      steps: [
        {
          title: 'Reload the app',
          body: 'Close it fully and open it again. Web apps update in the background, and a reload picks up the newest version.',
        },
        {
          title: 'Check the language and voice',
          body: 'If speech sounds wrong or silent, the selected voice may not be installed on the device. Try another voice in settings — on iOS, extra voices install from the system accessibility settings.',
        },
        {
          title: 'Confirm the device is not muted',
          body: 'A silent switch or a muted tab accounts for more "speech is broken" reports than anything else.',
        },
      ],
    },
    {
      id: 'contact',
      eyebrow: 'Contact',
      title: 'Ask a person.',
      body: [
        'Support is answered by the people who build Tiko, not a queue. There is no ticket number and no tiered plan — you will get a straight answer, including when the answer is that something is broken or not planned.',
        'If you are reporting a problem, the most useful things to include are the app, the device and browser or OS version, what you expected, and what happened instead. A screenshot beats a description.',
      ],
      tone: 'dark',
    },
    {
      id: 'contribute',
      eyebrow: 'Getting involved',
      title: 'Report, suggest, or build.',
      body: [
        'Tiko is open source, so a bug report is genuinely useful and a pull request is welcome. The direction of the project comes largely from parents, therapists and teachers describing what is missing — that is far more accurate than a roadmap written without them.',
        'If you work with children who use communication tools and something here is wrong, we would rather hear it than not.',
      ],
    },
  ],

  cta: {
    title: 'Read the answers first.',
    body: 'The FAQ covers cost, privacy, accounts and what Tiko deliberately does not do.',
    primaryLabel: 'Read the FAQ',
    primaryPath: '/faq',
    secondaryLabel: 'How it works',
    secondaryPath: '/how-it-works',
  },
} as const satisfies ContentPage
