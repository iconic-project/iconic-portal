<script setup lang="ts">
import { NAV } from '../navigation'

const PAGE_TITLES: Record<string, string> = {
  '/requests/new': 'requests.newTitle'
}

const { t } = useI18n()
const route = useRoute()
const { session, logout } = usePortalSession()

const pageTitle = computed(() => {
  const mapped = PAGE_TITLES[route.path]

  if (mapped) {
    return t(mapped)
  }

  const item = NAV.find(entry => entry.to === route.path)

  return item ? t(item.labelKey) : t('shell.brand')
})

function navIsOn(to: string): boolean {
  return route.path === to || route.path.startsWith(`${to}/`)
}

useHead(() => ({
  title: pageTitle.value
}))
</script>

<template>
  <div class="portal-app">
    <aside class="portal-side">
      <PortalBrand />
      <nav
        class="portal-nav"
        :aria-label="t('shell.brand')"
      >
        <NuxtLink
          v-for="item in NAV"
          :key="item.to"
          :to="item.to"
          class="portal-link"
          :class="{ 'is-on': navIsOn(item.to) }"
        >
          {{ t(item.labelKey) }}
        </NuxtLink>
      </nav>
    </aside>

    <main class="portal-main">
      <div class="portal-head">
        <h1>{{ pageTitle }}</h1>
        <div class="portal-who">
          <span
            v-if="session?.agency.name"
            class="portal-agency"
          >{{ session.agency.name }}</span>
          <span class="mono">{{ t('shell.signedInAs') }}</span>
          <span
            v-if="session"
            class="who-email"
          >{{ session.name }}</span>
          <AnkThemeToggle />
          <UButton
            color="neutral"
            variant="outline"
            @click="logout"
          >
            {{ t('shell.signOut') }}
          </UButton>
        </div>
      </div>
      <slot />
    </main>
  </div>
</template>
