<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { tikoApps } from '../content/appUniverse'
import { trustPrinciples, platformNotes } from '../siteContent'
</script>

<template>
  <!-- Hero -->
  <section class="home-hero">
    <div class="home-hero__inner container">
      <div class="home-hero__copy">
        <p class="eyebrow">Small tools for big moments</p>
        <h1 class="display-1 home-hero__heading">
          Tiko helps children<br />communicate calmly.
        </h1>
        <p class="body-lg home-hero__lede">
          Open a tiny app, use it right away.
          No passwords, no login walls, no setup ceremony —
          just clear tools for everyday moments.
        </p>
        <div class="home-hero__actions">
          <RouterLink to="/apps/yes-no" class="home-hero__btn home-hero__btn--primary">
            Try Yes No — it's free
          </RouterLink>
          <RouterLink to="/apps" class="home-hero__btn home-hero__btn--outline">
            See all apps
          </RouterLink>
        </div>
        <p class="home-hero__note">Works on any device. No account required.</p>
      </div>

      <div class="home-hero__visual" aria-hidden="true">
        <div class="home-hero__device">
          <div class="home-hero__device-top">
            <span class="home-hero__device-dot" />
            <span class="home-hero__device-dot" style="background:#f6c85f" />
          </div>
          <p class="home-hero__device-question">Are you hungry?</p>
          <div class="home-hero__device-choices">
            <span class="home-hero__choice home-hero__choice--yes">Yes</span>
            <span class="home-hero__choice home-hero__choice--no">No</span>
          </div>
        </div>
        <div class="home-hero__floating-card home-hero__floating-card--1">
          <span class="home-hero__fc-dot" style="background:var(--app-type)" />
          <span>Type</span>
        </div>
        <div class="home-hero__floating-card home-hero__floating-card--2">
          <span class="home-hero__fc-dot" style="background:var(--app-cards)" />
          <span>Cards</span>
        </div>
        <div class="home-hero__floating-card home-hero__floating-card--3">
          <span class="home-hero__fc-dot" style="background:var(--app-timer)" />
          <span>Timer</span>
        </div>
      </div>
    </div>
  </section>

  <!-- App universe strip -->
  <section class="section section--tight">
    <div class="container">
      <div class="home-apps__header">
        <div>
          <p class="eyebrow">The app universe</p>
          <h2 class="display-2">Tiny apps.<br />One clear job each.</h2>
        </div>
        <RouterLink to="/apps" class="home-apps__see-all">
          View all apps →
        </RouterLink>
      </div>

      <div class="home-apps__grid">
        <RouterLink
          v-for="app in tikoApps"
          :key="app.id"
          :to="app.path"
          class="home-app-card"
          :style="{ '--app-color': app.color, '--app-color-light': app.colorLight }"
        >
          <div class="home-app-card__icon" aria-hidden="true" />
          <div class="home-app-card__body">
            <span
              class="badge"
              :class="app.status === 'available' ? 'badge--available' : 'badge--planned'"
            >
              {{ app.statusLabel }}
            </span>
            <h3 class="home-app-card__name">{{ app.name }}</h3>
            <p class="home-app-card__summary">{{ app.summary }}</p>
          </div>
        </RouterLink>
      </div>
    </div>
  </section>

  <!-- Trust section -->
  <section class="section home-trust">
    <div class="container">
      <div class="home-trust__layout">
        <div class="home-trust__copy">
          <p class="eyebrow">Caregiver trust</p>
          <h2 class="display-2">Built so the first moment is not an account form.</h2>
          <p class="body-lg">
            You should be able to try a tool before trusting it.
            Tiko is designed so a caregiver can open an app, see whether it helps,
            and only add recovery or sync when that actually matters.
          </p>
          <RouterLink to="/caregivers" class="home-trust__link">
            Read our trust principles →
          </RouterLink>
        </div>
        <ul class="home-trust__list" aria-label="Trust principles">
          <li v-for="principle in trustPrinciples" :key="principle" class="home-trust__item">
            <span class="home-trust__check" aria-hidden="true">✓</span>
            <span>{{ principle }}</span>
          </li>
        </ul>
      </div>
    </div>
  </section>

  <!-- Platform section -->
  <section class="section">
    <div class="container">
      <div class="home-platform__header">
        <p class="eyebrow">One Tiko, many screens</p>
        <h2 class="display-2">A link is the fastest way to try a tool.</h2>
        <p class="body-lg">
          iOS and Android are planned as equal clients, not afterthoughts.
          Native apps follow the same calm behaviour as the web apps.
        </p>
      </div>
      <div class="home-platform__grid">
        <article v-for="item in platformNotes" :key="item.label" class="home-platform__card card">
          <strong class="home-platform__card-label">{{ item.label }}</strong>
          <p class="body-sm">{{ item.copy }}</p>
        </article>
      </div>
    </div>
  </section>

  <!-- CTA banner -->
  <section class="home-cta section--tight">
    <div class="container">
      <div class="home-cta__inner">
        <div class="home-cta__copy">
          <h2 class="display-3" style="color:white">Ready to try?</h2>
          <p style="color:rgba(255,255,255,0.7);font-size:1rem;line-height:1.65">
            Yes No is live on the web right now. No account, no setup.
          </p>
        </div>
        <div class="home-cta__actions">
          <a href="https://yesno.tikoapps.org" class="home-cta__btn" target="_blank" rel="noopener">
            Open Yes No
          </a>
          <RouterLink to="/apps" class="home-cta__btn home-cta__btn--ghost">
            See all apps
          </RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
// Hero
.home-hero {
  background: var(--surface-page);
  border-bottom: 1px solid var(--border);
  overflow: hidden;

  &__inner {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.7fr);
    gap: clamp(2rem, 6vw, 5rem);
    align-items: center;
    padding-top: clamp(3rem, 8vw, 6rem);
    padding-bottom: clamp(3rem, 8vw, 6rem);
  }

  &__copy {
    display: flex;
    flex-direction: column;
    gap: var(--sp-6);
  }

  &__heading {
    max-width: 14ch;
  }

  &__lede {
    max-width: 44ch;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-3);
    margin-top: var(--sp-2);
  }

  &__btn {
    display: inline-flex;
    align-items: center;
    padding: 14px 28px;
    border-radius: 999px;
    font-weight: 600;
    font-size: 0.95rem;
    text-decoration: none;
    transition: transform 0.15s, opacity 0.15s, box-shadow 0.15s;

    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }

    &--primary {
      background: var(--text-primary);
      color: white;
    }

    &--outline {
      background: white;
      color: var(--text-primary);
      border: 1.5px solid var(--border-strong);
    }
  }

  &__note {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  // Device mockup
  &__visual {
    position: relative;
    display: flex;
    justify-content: center;
  }

  &__device {
    background: var(--text-primary);
    color: white;
    border-radius: 28px;
    padding: 20px;
    width: 240px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: var(--shadow-lg);
  }

  &__device-top {
    display: flex;
    gap: 6px;
  }

  &__device-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
  }

  &__device-question {
    font-size: 0.95rem;
    color: rgba(255,255,255,0.7);
    text-align: center;
    padding: 0 4px;
  }

  &__device-choices {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__choice {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 60px;
    border-radius: 16px;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 1.5rem;
  }

  &__choice--yes {
    background: #16b8a6;
    color: white;
  }

  &__choice--no {
    background: #ff8a65;
    color: white;
  }

  // Floating accent cards
  &__floating-card {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: white;
    border: 1px solid var(--border);
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-primary);
    box-shadow: var(--shadow-sm);

    &--1 { top: 0; right: 0; }
    &--2 { bottom: 20%; left: -10%; }
    &--3 { bottom: 0; right: 10%; }
  }

  &__fc-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: block;
  }
}

// App grid
.home-apps {
  &__header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--sp-4);
    margin-bottom: var(--sp-8);
  }

  &__see-all {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-secondary);
    text-decoration: none;
    white-space: nowrap;
    padding-bottom: 4px;

    &:hover { color: var(--text-primary); }
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: var(--sp-3);
  }
}

.home-app-card {
  display: flex;
  flex-direction: column;
  background: var(--surface-card);
  border: 1px solid var(--border);
  border-top: 4px solid var(--app-color);
  border-radius: 16px;
  overflow: hidden;
  text-decoration: none;
  transition: transform 0.15s, box-shadow 0.15s;
  box-shadow: var(--shadow-sm);

  &:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-md);
  }

  &__icon {
    height: 80px;
    background: color-mix(in srgb, var(--app-color-light) 60%, white);
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    padding: var(--sp-4);
  }

  &__name {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 800;
    letter-spacing: -0.01em;
    color: var(--text-primary);
  }

  &__summary {
    font-size: 0.8rem;
    line-height: 1.55;
    color: var(--text-secondary);
  }
}

// Trust
.home-trust {
  background: var(--surface-subtle);
  border-block: 1px solid var(--border);

  &__layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: clamp(2rem, 6vw, 5rem);
    align-items: start;
  }

  &__copy {
    display: flex;
    flex-direction: column;
    gap: var(--sp-6);
  }

  &__link {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-secondary);
    text-decoration: none;

    &:hover { color: var(--text-primary); }
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    padding: var(--sp-8);
    background: white;
    border: 1px solid var(--border);
    border-radius: 20px;
    box-shadow: var(--shadow-sm);
  }

  &__item {
    display: flex;
    align-items: flex-start;
    gap: var(--sp-3);
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  &__check {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    background: #d1fae5;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 0.7rem;
    color: #065f46;
    font-weight: 700;
  }
}

// Platform
.home-platform {
  &__header {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
    max-width: 52ch;
    margin-bottom: var(--sp-8);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--sp-4);
  }

  &__card {
    padding: var(--sp-6);
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }

  &__card-label {
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 800;
    color: var(--text-primary);
  }
}

// CTA
.home-cta {
  background: var(--text-primary);
  margin-top: clamp(var(--sp-12), 10vw, var(--sp-24));

  &__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--sp-6);
    padding-block: clamp(var(--sp-10), 7vw, var(--sp-16));
  }

  &__copy {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-3);
  }

  &__btn {
    display: inline-flex;
    align-items: center;
    padding: 14px 28px;
    border-radius: 999px;
    font-weight: 600;
    font-size: 0.95rem;
    text-decoration: none;
    background: #f6c85f;
    color: #111;
    transition: opacity 0.15s, transform 0.15s;

    &:hover {
      opacity: 0.9;
      transform: translateY(-2px);
    }

    &--ghost {
      background: rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.8);
      border: 1px solid rgba(255,255,255,0.15);
    }
  }
}

// Responsive
@media (max-width: 900px) {
  .home-apps__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .home-hero__inner {
    grid-template-columns: 1fr;
  }

  .home-hero__visual {
    display: none;
  }

  .home-trust__layout {
    grid-template-columns: 1fr;
  }

  .home-cta__inner {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 560px) {
  .home-apps__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
