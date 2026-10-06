<script setup lang="ts">
import type { PortalStayAvailability, PortalStayCalendar } from '../types/api'
import { portalPageMessages } from '../utils/authError'
import { availabilityPath, calendarPath, canRequestRoom, nightMark, requestPath, shiftMonth, thisMonth } from '../utils/portalStay'

type StayRange = {
  check_in: string
  check_out: string
}

const { t } = useI18n()
const { request } = useApi()
const { format } = useDates()

const stay = ref<StayRange | null>(null)
const adults = ref(2)
const month = ref(thisMonth())
const view = ref<'rooms' | 'month'>('rooms')
const pending = ref(true)
const errors = ref<Array<string>>([])
const calendar = ref<PortalStayCalendar | null>(null)
const results = ref<PortalStayAvailability | null>(null)

const limits = computed(() => calendar.value?.stay ?? results.value?.stay ?? null)

const nights = computed(() => {
  const map = new Map<string, PortalStayCalendar['nights'][number]>()

  for (const night of calendar.value?.nights ?? []) {
    map.set(night.night, night)
  }

  return map
})

function nightInfo(date: string) {
  return nightMark(nights.value.get(date))
}

async function loadCalendar(): Promise<void> {
  pending.value = true
  errors.value = []

  try {
    calendar.value = await request(calendarPath(month.value, adults.value)) as PortalStayCalendar
  } catch (caught: unknown) {
    calendar.value = null
    errors.value = portalPageMessages(caught)
  } finally {
    pending.value = false
  }
}

async function search(): Promise<void> {
  if (!stay.value) {
    errors.value = [t('availability.stayRequired')]
    return
  }

  pending.value = true
  errors.value = []
  view.value = 'rooms'

  try {
    results.value = await request(availabilityPath(stay.value.check_in, stay.value.check_out, adults.value)) as PortalStayAvailability
  } catch (caught: unknown) {
    results.value = null
    errors.value = portalPageMessages(caught)
  } finally {
    pending.value = false
  }
}

function moveMonth(delta: number): void {
  month.value = shiftMonth(month.value, delta)
  void loadCalendar()
}

void loadCalendar()
</script>

<template>
  <div>
    <form
      class="portal-filters"
      @submit.prevent="search"
    >
      <AnkStayInput
        v-if="limits"
        v-model="stay"
        :min-nights="limits.min_nights"
        :max-nights="limits.max_nights"
        :night-info="nightInfo"
      />
      <div class="field">
        <label for="av-adults">{{ t('availability.adults') }}</label>
        <input
          id="av-adults"
          v-model.number="adults"
          type="number"
          min="1"
          step="1"
          required
        >
      </div>
      <UButton
        type="submit"
        color="primary"
      >
        {{ t('availability.apply') }}
      </UButton>
      <button
        type="button"
        class="mini"
        :data-view="view"
        @click="view = view === 'rooms' ? 'month' : 'rooms'"
      >
        {{ view === 'rooms' ? t('availability.month') : t('availability.rooms') }}
      </button>
    </form>

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
    <div
      v-else-if="view === 'month' && calendar"
      class="portal-scroll"
    >
      <p class="portal-toolbar">
        <button
          type="button"
          class="mini"
          @click="moveMonth(-1)"
        >
          {{ t('availability.previous') }}
        </button>
        <span>{{ calendar.from }}</span>
        <button
          type="button"
          class="mini"
          @click="moveMonth(1)"
        >
          {{ t('availability.next') }}
        </button>
      </p>
      <table class="list mini-t">
        <thead>
          <tr>
            <th>{{ t('availability.night') }}</th>
            <th>{{ t('availability.label') }}</th>
            <th>{{ t('availability.fromPrice') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="night in calendar.nights"
            :key="night.night"
            :data-night="night.night"
          >
            <td>{{ format(night.night, 'short') }}</td>
            <td>{{ night.available ? t('availability.open') : t('availability.closed') }}</td>
            <td>
              <AnkMoney
                v-if="night.from_price !== null"
                :amount="night.from_price"
              />
              <template v-else>
                —
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div
      v-else
      class="portal-scroll"
    >
      <table class="list mini-t">
        <thead>
          <tr>
            <th>{{ t('availability.roomType') }}</th>
            <th>{{ t('availability.roomsLeft') }}</th>
            <th>{{ t('availability.plan') }}</th>
            <th>{{ t('availability.net') }}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-if="!results">
            <td colspan="5">
              {{ t('availability.prompt') }}
            </td>
          </tr>
          <tr v-else-if="results.room_types.length === 0">
            <td colspan="5">
              {{ t('availability.empty') }}
            </td>
          </tr>
          <template
            v-for="type in results?.room_types ?? []"
            :key="type.code"
          >
            <tr
              v-if="!canRequestRoom(type.bookable, type.quotes.length)"
              :data-room-type="type.code"
            >
              <td>{{ type.name }}</td>
              <td>{{ type.rooms_left }}</td>
              <td colspan="3">
                {{ type.reasons.join(', ') }}
              </td>
            </tr>
            <tr
              v-for="quote in canRequestRoom(type.bookable, type.quotes.length) ? type.quotes : []"
              :key="`${type.code}-${quote.rate_plan}`"
              :data-room-type="type.code"
            >
              <td>{{ type.name }}</td>
              <td>{{ type.rooms_left }}</td>
              <td>{{ quote.rate_plan }}</td>
              <td>
                <AnkMoney :amount="quote.total" />
              </td>
              <td>
                <NuxtLink
                  v-if="results"
                  class="mini"
                  :to="requestPath(results.check_in, results.check_out, type.code, adults, quote.rate_plan)"
                >
                  {{ t('availability.request') }}
                </NuxtLink>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
