<script setup lang="ts">
import type { PortalStayRates } from '../types/api'
import { portalPageMessages } from '../utils/authError'
import { nightlyFor } from '../utils/portalStay'

const { t } = useI18n()
const { request } = useApi()
const { format } = useDates()

const pending = ref(true)
const errors = ref<Array<string>>([])
const rates = ref<PortalStayRates | null>(null)

function cell(roomType: string, season: string): number | null {
  if (!rates.value) {
    return null
  }

  return nightlyFor(rates.value, roomType, season)
}

async function load(): Promise<void> {
  pending.value = true
  errors.value = []

  try {
    rates.value = await request('/api/portal/rates') as PortalStayRates
  } catch (caught: unknown) {
    rates.value = null
    errors.value = portalPageMessages(caught)
  } finally {
    pending.value = false
  }
}

void load()
</script>

<template>
  <div>
    <p
      v-if="pending"
      class="bbnote"
    >
      …
    </p>
    <div
      v-else-if="errors.length"
      class="warnbox"
    >
      <p
        v-for="message in errors"
        :key="message"
      >
        {{ message }}
      </p>
    </div>
    <template v-else-if="rates">
      <p class="prevl">
        {{ t('rates.line', { pct: String(rates.commission_pct) }) }}
      </p>
      <p class="portal-toolbar">
        <span
          v-for="season in rates.seasons"
          :key="season.code"
          :data-season="season.code"
        >
          {{ season.name }} · {{ format(season.from, 'short') }} – {{ format(season.to, 'short') }}
        </span>
      </p>
      <div
        v-if="rates.room_rates.length === 0"
        class="bbnote"
      >
        {{ t('rates.empty') }}
      </div>
      <div
        v-else
        class="portal-scroll"
      >
        <table class="list mini-t">
          <thead>
            <tr>
              <th>{{ t('rates.roomType') }}</th>
              <th
                v-for="season in rates.seasons"
                :key="season.code"
              >
                {{ season.name }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="type in rates.room_types"
              :key="type.code"
              :data-room-type="type.code"
            >
              <td>{{ type.name }}</td>
              <td
                v-for="season in rates.seasons"
                :key="season.code"
                :data-rate="`${type.code}-${season.code}`"
              >
                <AnkMoney
                  v-if="cell(type.code, season.code) !== null"
                  :amount="cell(type.code, season.code) ?? 0"
                />
                <template v-else>
                  —
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="prevl">
        {{ t('rates.plans') }}
      </p>
      <ul>
        <li
          v-for="plan in rates.rate_plans"
          :key="plan.code"
          :data-plan="plan.code"
        >
          {{ plan.name }} · {{ plan.code }}
          <template v-if="plan.adjust_pct !== 0">
            · {{ plan.adjust_pct }}%
          </template>
        </li>
      </ul>

      <p class="prevl">
        {{ t('rates.lengthOfStay') }}
      </p>
      <ul>
        <li
          v-for="band in rates.length_of_stay"
          :key="band.min_nights"
        >
          {{ t('rates.losBand', { nights: String(band.min_nights), pct: String(band.discount_pct) }) }}
        </li>
      </ul>

      <p class="prevl">
        {{ t('rates.supplements') }}
      </p>
      <ul>
        <li
          v-for="row in rates.supplements"
          :key="row.code"
          :data-supplement="row.code"
        >
          {{ row.label }} ·
          <AnkMoney :amount="row.per_night" />
          · {{ row.basis }}
        </li>
      </ul>
    </template>
  </div>
</template>
