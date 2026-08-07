import type { ContentPage } from '../../content.model'

export const caregiversEn = {
  documentTitle: 'For caregivers',
  description:
    'What Tiko promises parents and caregivers: no account before use, no ads, no tracking, and tools you can try in a difficult moment without preparing first.',
  eyebrow: 'For caregivers',
  title: 'Built so the first moment is not an account form.',
  lede: 'You should be able to try a tool before trusting it. Tiko is designed so a caregiver can open an app, see whether it helps, and only add recovery or syncing when that actually matters.',

  sections: [
    {
      id: 'non-negotiables',
      eyebrow: 'Trust principles',
      title: 'Our non-negotiables.',
      lede: 'These are commitments, not current settings. They do not change when circumstances do.',
      points: [
        {
          title: 'Free, always',
          body: 'We never sell your data or a child\'s attention for access. The apps are free because charging for communication is the wrong trade.',
        },
        {
          title: 'No ads. Ever.',
          body: 'There is no advertising, no tracking for advertising, and no third-party ad networks in any Tiko app.',
        },
        {
          title: 'No login walls',
          body: 'The child-facing apps open and work without an account. Nothing stands between a child and being understood.',
        },
        {
          title: 'As little as possible',
          body: 'We collect only what an app genuinely needs to work, and most Tiko apps need nothing at all.',
        },
      ],
      tone: 'dark',
    },
    {
      id: 'starting',
      eyebrow: 'Getting started',
      title: 'You do not need to prepare.',
      body: [
        'There is no right way to begin and nothing to set up first. Open the app that matches the moment you are actually in — a question to answer, a routine to get through, a word to practise — and use it. If it does not help, close it. Nothing was spent and nothing was signed up for.',
        'Most caregivers find one app that fits and stay there for a long time. That is a good outcome, not a limited one. Tiko is not trying to become the place your child spends their day.',
      ],
      steps: [
        {
          title: 'Start with the moment, not the app',
          body: 'Pick the app that matches something happening today. Yes No for a question, First for a routine, Type for a message that needs saying.',
        },
        {
          title: 'Use it beside your child',
          body: 'These are tools for two people. Sitting alongside and modelling a tap or a sentence does more than handing over a device.',
        },
        {
          title: 'Make it theirs',
          body: 'Swap in your own photos, your own words, your own routine. A picture of your child\'s actual shoes beats a stock icon of shoes.',
        },
        {
          title: 'Add recovery only if you want it',
          body: 'If settings should follow you to another device, add an email once. If not, skip it — nothing else changes.',
        },
      ],
    },
    {
      id: 'expectations',
      eyebrow: 'Being honest',
      title: 'What Tiko will and will not do.',
      body: [
        'Tiko does not diagnose, treat, or promise outcomes. It will not tell you whether your child is progressing, and it deliberately keeps no scores to imply that it could. If you want an assessment, that is work for a speech and language therapist, and a good one is worth far more than any app.',
        'What Tiko can do is remove friction from specific moments — being asked a question and having a way to answer, knowing what comes next in a routine, getting a sentence out that would otherwise stay stuck. Those moments matter, and they are enough of a job for one tool.',
      ],
    },
    {
      id: 'privacy',
      eyebrow: 'Privacy',
      title: 'What happens to your child\'s data.',
      body: [
        'In most Tiko apps, nothing leaves the device. Cards you create, routines you build and phrases you save are stored locally. There are no analytics recording what a child taps, and no advertising identifiers.',
        'If you turn on syncing, the content you created is stored so it can reach your other devices. That is content an adult deliberately made — never a log of how a child used the app. You can read exactly what is kept in the privacy policy, and because Tiko is open source you can also check the code rather than take our word for it.',
      ],
    },
  ],

  cta: {
    title: 'Try it with your child today.',
    body: 'Open an app and use it for two minutes. That will tell you more than any description on this page.',
    primaryLabel: 'Explore the apps',
    primaryPath: '/apps',
    secondaryLabel: 'Read the privacy policy',
    secondaryPath: '/privacy-policy',
  },
} as const satisfies ContentPage
