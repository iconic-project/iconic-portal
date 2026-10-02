<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div class="portal-brand">
    <AnkWordmark />
    <small>{{ t('shell.brand') }}</small>
  </div>
</template>
