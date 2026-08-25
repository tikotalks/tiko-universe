/**
 * Privacy policy.
 *
 * Kept as its own shape rather than a `ContentPage`: a policy is narrow prose
 * with plain headings and lists, not a marketing page of colour bands.
 *
 * `{email}` in a paragraph is replaced with a `mailto:` link to `supportEmail`
 * at render time, so a translation can put the address where its own sentence
 * needs it.
 */
export interface PrivacySection {
  /** Stable anchor id. Never translated. */
  id: string
  title: string
  body?: readonly string[]
  bullets?: readonly string[]
}

export const privacyEn = {
  documentTitle: 'Privacy policy',
  description: 'How the Tiko apps and tikotalks.com handle data, in plain language.',
  eyebrow: 'Privacy policy',
  title: 'What we collect, and what we don’t.',
  lede: 'Tiko makes calm, accessible apps for children. Privacy isn’t an afterthought — it’s part of the design. This policy explains, in plain language, how the Tiko apps and tikotalks.com handle data.',
  lastUpdatedLabel: 'Last updated',
  /** Last meaningful update to this policy. Update when the practices change. */
  lastUpdated: 'June 2026',
  /** Not translated. */
  supportEmail: 'support@tikotalks.com',

  sections: [
    {
      id: 'promise',
      title: 'Our promise',
      bullets: [
        'Free, always. We never sell your data or a child’s attention for access.',
        'No ads. Ever. There is no advertising, tracking for advertising, or third-party ad networks in the Tiko apps.',
        'No login walls. The child-facing apps open and work without an account.',
        'We collect as little as possible, and only what an app genuinely needs to work.',
      ],
    },
    {
      id: 'device-first',
      title: 'Device-first by default',
      body: [
        'Tiko apps are built to work on the device. Your settings, saved phrases, drafts, and recent content are stored locally so the apps stay fast and usable offline. When you use an app without signing in, that content stays on your device.',
      ],
    },
    {
      id: 'accounts',
      title: 'Optional accounts and syncing',
      body: [
        'Tiko uses device-based identity rather than passwords. If you choose to enable caregiver recovery or syncing across devices, we may store an email address so we can send a magic sign-in link and link your devices. This is always optional and always transparent — the child-facing app never begins with account setup.',
      ],
    },
    {
      id: 'speech',
      title: 'Speech and content',
      body: [
        'Some apps, such as Tiko Type and Tiko Talk, can speak text aloud. To generate natural speech, the text you ask to be spoken may be sent to our speech service and processed only to return audio. We do not use this content to build advertising profiles, and we do not sell it.',
      ],
    },
    {
      id: 'what-we-do-not-do',
      title: 'What we do not do',
      bullets: [
        'We do not show ads or use advertising trackers.',
        'We do not sell or rent personal data.',
        'We do not require a child to create an account or share personal details to use an app.',
        'We do not make medical, diagnostic, or therapy-outcome claims, and we do not collect health data for such purposes.',
      ],
    },
    {
      id: 'children',
      title: 'Children’s privacy',
      body: [
        'Tiko apps are designed to be safe to open beside a child. Because the apps work without accounts and without ads, a child can use them without sharing personal information. Where a caregiver chooses to set up optional recovery, that account information belongs to the caregiver, not the child.',
      ],
    },
    {
      id: 'retention',
      title: 'Data retention and deletion',
      body: [
        'Locally stored content stays on the device until you clear it or remove the app. If you have created an optional account, you can ask us to delete it and any associated data at any time by emailing {email}.',
      ],
    },
    {
      id: 'changes',
      title: 'Changes to this policy',
      body: [
        'If we update how we handle data, we will update this page and revise the date above. Significant changes will be made clear.',
      ],
    },
    {
      id: 'contact',
      title: 'Contact us',
      body: [
        'Questions about privacy or your data? Email {email} and a real person will help.',
      ],
    },
  ] as readonly PrivacySection[],
} as const
