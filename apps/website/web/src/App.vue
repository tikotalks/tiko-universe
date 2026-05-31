<script setup lang="ts">
import { Button, Icon } from '@sil/ui'
import { useBemm } from 'bemm'
import { computed, watchEffect } from 'vue'
import { getDocsPage } from './docsContent'
import { docsPages, faqs, platformNotes, routes, tools, trustPrinciples } from './siteContent'

const bemm = useBemm('tiko-talks', { includeBaseClass: true, return: 'string' })

const currentRoute = computed(() => {
  const path = typeof window === 'undefined' ? '/' : window.location.pathname
  if (path === '/apps' || path.startsWith('/apps/')) return routes.find((route) => route.id === 'tools') ?? routes[0]
  if (path === '/docs' || path.startsWith('/docs/')) return routes.find((route) => route.id === 'docs') ?? routes[0]
  return routes.find((route) => route.path === path) ?? routes[0]
})

const availableTool = computed(() => tools.find((tool) => tool.href) ?? tools[0])
const pageTestId = computed(() => `${currentRoute.value.id === 'how-it-works' ? 'how' : currentRoute.value.id}-page`)
const currentDocsPage = computed(() => getDocsPage(typeof window === 'undefined' ? '/docs' : window.location.pathname) ?? docsPages[0])

watchEffect(() => {
  if (typeof document === 'undefined') return
  document.title = `${currentRoute.value.title} | TikoTalks`
})
</script>

<template>
  <main :class="bemm()">
    <header :class="bemm('nav')" aria-label="TikoTalks">
      <a :class="bemm('brand')" href="/" aria-label="TikoTalks home">
        <span :class="bemm('brand-mark')" aria-hidden="true">T</span>
        <span :class="bemm('brand-text')">TikoTalks</span>
      </a>
      <nav :class="bemm('nav-links')" aria-label="Site pages">
        <a
          v-for="route in routes"
          :key="route.id"
          :href="route.path"
          :aria-current="currentRoute.id === route.id ? 'page' : undefined"
        >
          {{ route.label }}
        </a>
      </nav>
    </header>

    <section v-if="currentRoute.id === 'home'" :class="bemm('hero')" :data-test="pageTestId" aria-labelledby="hero-title">
      <div :class="bemm('hero-copy')">
        <p :class="bemm('eyebrow')">Small tools for big moments.</p>
        <h1 id="hero-title">Tiko helps children communicate, choose, and follow along without getting stuck behind setup.</h1>
        <p :class="bemm('lede')">
          Open a tiny app, use it right away, and let the caregiver layer stay quietly in the background.
          No passwords. No login wall. Just calm tools for everyday support.
        </p>
        <div :class="bemm('actions')" aria-label="Primary actions">
          <Button element="a" :href="availableTool.href ?? '/tools'" variant="primary" size="large" icon="wayfinding/arrow-right" icon-after>
            Open a Tiko app
          </Button>
          <Button element="a" href="/tools" variant="outline" size="large">
            See the app universe
          </Button>
        </div>
        <p :class="bemm('note')">Works on the web first, with native iOS and Android paths planned around the same child-first contracts.</p>
      </div>

      <aside :class="bemm('hero-card')" aria-label="Tiko promise">
        <div :class="bemm('device')">
          <span :class="bemm('device-dot')" aria-hidden="true" />
          <p>One clear thing on the screen.</p>
          <strong>Yes</strong>
          <strong>No</strong>
        </div>
        <p>Tiny communication tools that open fast, feel calm, and help a child say or do one thing without account ceremony.</p>
      </aside>
    </section>

    <template v-if="currentRoute.id === 'home'">
      <section :class="[bemm('section'), bemm('section', 'intro')]" aria-labelledby="intro-title">
        <p :class="bemm('eyebrow')">What Tiko is</p>
        <h2 id="intro-title">A universe of small, focused apps.</h2>
        <p :class="bemm('section-lede')">
          Each one does one job: answer yes or no, type and speak, use cards, follow a sequence, or keep time visible.
          The apps are designed to open fast and stay obvious.
        </p>
      </section>

      <section :class="bemm('section')" aria-labelledby="home-tools-title">
        <div :class="bemm('section-heading')">
          <p :class="bemm('eyebrow')">The app universe</p>
          <h2 id="home-tools-title">Tiny apps, each with one clear job.</h2>
          <p>Tiko is not one giant app. It is a set of small tools that can be opened when a moment needs support.</p>
        </div>
        <div :class="bemm('app-grid')">
          <a
            v-for="tool in tools"
            :key="tool.id"
            :class="bemm('app-card')"
            :href="tool.href ?? '/tools'"
            :style="{ '--app-color': tool.accent }"
          >
            <div :class="bemm('app-card-top')">
              <span :class="bemm('app-icon')" aria-hidden="true" />
              <span :class="bemm('status')">{{ tool.status }}</span>
            </div>
            <h3>{{ tool.name }}</h3>
            <p>{{ tool.summary }}</p>
          </a>
        </div>
      </section>

      <section :class="[bemm('section'), bemm('section', 'split')]" aria-labelledby="home-trust-title">
        <div :class="bemm('section-copy')">
          <p :class="bemm('eyebrow')">Caregiver trust</p>
          <h2 id="home-trust-title">Built so the first moment is not an account form.</h2>
          <p>You should be able to try a tool before trusting it. Tiko is designed so a caregiver can open an app, see whether it helps, and only add recovery or sync when that actually matters.</p>
        </div>
        <ul :class="bemm('trust-list')" aria-label="Trust principles">
          <li v-for="principle in trustPrinciples" :key="principle">
            <Icon name="ui/check-fat" size="small" aria-hidden="true" />
            <span>{{ principle }}</span>
          </li>
        </ul>
      </section>

      <section :class="bemm('section')" aria-labelledby="home-platform-title">
        <div :class="bemm('section-heading')">
          <p :class="bemm('eyebrow')">One Tiko, many screens</p>
          <h2 id="home-platform-title">A link is the fastest way to try a tool.</h2>
          <p>iOS and Android are planned as equal clients, not afterthoughts. Native apps should follow the same calm behavior as the web apps.</p>
        </div>
        <div :class="bemm('platform-grid')">
          <article v-for="item in platformNotes" :key="item.label" :class="bemm('platform-card')">
            <strong>{{ item.label }}</strong>
            <p>{{ item.copy }}</p>
          </article>
        </div>
      </section>
    </template>

    <section v-if="currentRoute.id === 'tools'" :class="bemm('section')" :data-test="pageTestId" aria-labelledby="tools-title">
      <div :class="bemm('section-heading')">
        <p :class="bemm('eyebrow')">The app universe</p>
        <h1 id="tools-title">Tiny apps, each with one clear job.</h1>
        <p>Tiko is not one giant app. It is a set of small tools that can be opened when a moment needs support.</p>
      </div>
      <div :class="bemm('app-grid')">
        <a
          v-for="tool in tools"
          :key="tool.id"
          :class="[bemm('app-card'), bemm('app-card', 'detail')]"
          :href="tool.href ?? '/tools'"
          :style="{ '--app-color': tool.accent }"
        >
          <div :class="bemm('app-card-top')">
            <span :class="bemm('app-icon')" aria-hidden="true" />
            <span :class="bemm('status')">{{ tool.status }}</span>
          </div>
          <h2>{{ tool.name }}</h2>
          <p><strong>{{ tool.summary }}</strong></p>
          <p>{{ tool.tone }}</p>
          <h3>Use when</h3>
          <ul>
            <li v-for="moment in tool.useWhen" :key="moment">{{ moment }}</li>
          </ul>
        </a>
      </div>
    </section>

    <section v-if="currentRoute.id === 'how-it-works'" :class="[bemm('section'), bemm('section', 'split')]" :data-test="pageTestId" aria-labelledby="how-title">
      <div :class="bemm('section-copy')">
        <p :class="bemm('eyebrow')">How Tiko works</p>
        <h1 id="how-title">Open first. Setup stays in the background.</h1>
        <p>Tiko starts device-first. Apps can open and work immediately. Caregiver recovery can come later through email magic links.</p>
      </div>
      <div :class="bemm('platform-grid')">
        <article v-for="item in platformNotes" :key="item.label" :class="bemm('platform-card')">
          <strong>{{ item.label }}</strong>
          <p>{{ item.copy }}</p>
        </article>
      </div>
    </section>

    <section v-if="currentRoute.id === 'caregivers'" :class="[bemm('section'), bemm('section', 'split')]" :data-test="pageTestId" aria-labelledby="caregivers-title">
      <div :class="bemm('section-copy')">
        <p :class="bemm('eyebrow')">For caregivers</p>
        <h1 id="caregivers-title">Built so the first moment is not an account form.</h1>
        <p>You should be able to try a tool before trusting it. Tiko keeps recovery optional and out of the child-facing first moment.</p>
      </div>
      <ul :class="bemm('trust-list')" aria-label="Trust principles">
        <li v-for="principle in trustPrinciples" :key="principle">
          <Icon name="ui/check-fat" size="small" aria-hidden="true" />
          <span>{{ principle }}</span>
        </li>
      </ul>
    </section>

    <section v-if="currentRoute.id === 'faq'" :class="bemm('section')" :data-test="pageTestId" aria-labelledby="faq-title">
      <div :class="bemm('section-heading')">
        <p :class="bemm('eyebrow')">Questions adults ask first</p>
        <h1 id="faq-title">Plain answers before anyone has to set anything up.</h1>
      </div>
      <div :class="bemm('faq-list')">
        <article v-for="item in faqs" :key="item.question" :class="bemm('faq-item')">
          <h2>{{ item.question }}</h2>
          <p>{{ item.answer }}</p>
        </article>
      </div>
    </section>

    <section v-if="currentRoute.id === 'docs'" :class="[bemm('section'), bemm('docs')]" :data-test="pageTestId" aria-labelledby="docs-title">
      <div :class="bemm('docs-layout')">
        <aside :class="bemm('docs-nav')" aria-label="Documentation pages">
          <p :class="bemm('eyebrow')">Docs</p>
          <a
            v-for="page in docsPages"
            :key="page.id"
            :href="page.path"
            :aria-current="currentDocsPage.id === page.id ? 'page' : undefined"
          >
            <strong>{{ page.label }}</strong>
            <span>{{ page.summary }}</span>
          </a>
        </aside>

        <article :class="bemm('docs-article')">
          <header :class="bemm('docs-hero')">
            <p :class="bemm('eyebrow')">Tiko platform docs</p>
            <h1 id="docs-title">{{ currentDocsPage.title }}</h1>
            <p :class="bemm('lede')">{{ currentDocsPage.lede }}</p>
          </header>

          <div v-if="currentDocsPage.callouts?.length" :class="bemm('docs-callouts')">
            <article v-for="callout in currentDocsPage.callouts" :key="callout.title" :class="bemm('platform-card')">
              <strong>{{ callout.title }}</strong>
              <p>{{ callout.body }}</p>
            </article>
          </div>

          <section v-for="section in currentDocsPage.sections" :key="section.title" :class="bemm('docs-section')">
            <p v-if="section.eyebrow" :class="bemm('eyebrow')">{{ section.eyebrow }}</p>
            <h2>{{ section.title }}</h2>
            <p v-for="paragraph in section.body" :key="paragraph">{{ paragraph }}</p>
            <ul v-if="section.bullets?.length">
              <li v-for="bullet in section.bullets" :key="bullet">{{ bullet }}</li>
            </ul>
            <pre v-if="section.code"><code>{{ section.code }}</code></pre>
          </section>
        </article>
      </div>
    </section>
  </main>
</template>
