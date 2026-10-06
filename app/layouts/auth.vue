<script setup lang="ts">
const { t } = useI18n()

type WindowKind = 'dark' | 'lit' | 'warm'

const windows = ref<WindowKind[]>([
  'dark', 'dark', 'lit', 'dark', 'dark', 'warm', 'dark', 'dark',
  'dark', 'warm', 'dark', 'dark', 'lit', 'dark', 'lit', 'dark',
  'dark', 'dark', 'dark', 'lit', 'warm', 'dark', 'dark', 'dark',
  'lit', 'dark', 'warm', 'dark', 'dark', 'dark', 'lit', 'dark',
  'warm', 'lit', 'dark', 'warm', 'lit', 'dark', 'warm', 'dark'
])

let timer: ReturnType<typeof setInterval> | undefined

function rollKind(): WindowKind {
  const roll = Math.random()
  if (roll < 0.62) {
    return 'dark'
  }
  if (roll < 0.84) {
    return 'lit'
  }
  return 'warm'
}

function stepWindows(): void {
  const next = windows.value.slice()
  for (let index = 0; index < next.length; index++) {
    if (Math.random() < 0.28) {
      next[index] = rollKind()
    }
  }
  windows.value = next
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return
  }
  timer = setInterval(stepWindows, 5000)
})

onBeforeUnmount(() => {
  if (timer !== undefined) {
    clearInterval(timer)
  }
})
</script>

<template>
  <div class="auth-layout">
    <div class="auth-stage">
      <div class="auth-stage-top">
        <AnkWordmark size="lg" />
        <p class="auth-stage-kicker">
          {{ t('auth.deskEyebrow') }}
        </p>
      </div>

      <div class="auth-stage-copy">
        <h1 class="auth-stage-title">
          {{ t('auth.deskHeadline') }}
        </h1>
        <p class="auth-stage-body">
          {{ t('auth.deskBody') }}
        </p>

        <div
          class="auth-facade"
          aria-hidden="true"
        >
          <span
            v-for="(kind, index) in windows"
            :key="index"
            class="auth-window"
            :data-kind="kind"
          />
          <span class="auth-canopy" />
        </div>

        <div
          class="auth-key"
          aria-hidden="true"
        >
          <span class="auth-key-chip" />
          <span class="auth-key-meta">
            <span class="auth-key-kicker">{{ t('auth.deskKey') }}</span>
            <span class="auth-key-name">{{ t('auth.deskEyebrow') }}</span>
          </span>
        </div>
      </div>

      <ul class="auth-desk">
        <li>{{ t('auth.deskRates') }}</li>
        <li>{{ t('auth.deskBookings') }}</li>
      </ul>
    </div>

    <div class="auth-pane">
      <div class="auth-theme">
        <AnkThemeToggle />
      </div>

      <div class="auth-column">
        <slot />
      </div>
    </div>
  </div>
</template>
