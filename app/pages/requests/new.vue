<script setup lang="ts">
import type { PortalRequestCreated, PortalStayRates } from '../../types/api'
import { portalAuthMessages, singleQuery } from '../../utils/authError'
import { requestPayload, type RoomDraft } from '../../utils/portalStay'
import { bookingStatusKey, bookingStatusTone } from '../../utils/portalStatus'

type StayRange = {
  check_in: string
  check_out: string
}

const { t } = useI18n()
const route = useRoute()
const { request } = useApi()

const rates = ref<PortalStayRates | null>(null)
const stay = ref<StayRange | null>(null)
const rooms = ref<Array<RoomDraft>>([{
  roomType: '',
  adults: 2,
  childAges: [],
  ratePlan: ''
}])
const clientName = ref('')
const clientEmail = ref('')
const notes = ref('')
const acknowledged = ref(false)
const submitting = ref(false)
const errors = ref<Array<string>>([])
const created = ref<PortalRequestCreated | null>(null)

const limits = computed(() => rates.value?.stay ?? null)
const typeItems = computed(() => (rates.value?.room_types ?? []).map(type => ({
  label: type.name,
  value: type.code
})))
const planItems = computed(() => (rates.value?.rate_plans ?? []).map(plan => ({
  label: plan.name,
  value: plan.code
})))

function addRoom(): void {
  const max = limits.value?.max_rooms ?? rooms.value.length

  if (rooms.value.length >= max) {
    return
  }

  const first = rooms.value[0]
  rooms.value.push({
    roomType: first?.roomType ?? '',
    adults: first?.adults ?? 2,
    childAges: [],
    ratePlan: first?.ratePlan ?? ''
  })
}

function removeRoom(index: number): void {
  if (rooms.value.length < 2) {
    return
  }

  rooms.value.splice(index, 1)
}

function applyQuery(): void {
  const checkIn = singleQuery(route.query.check_in)
  const checkOut = singleQuery(route.query.check_out)
  const roomType = singleQuery(route.query.room_type)
  const ratePlan = singleQuery(route.query.rate_plan)
  const adults = Number(singleQuery(route.query.adults))
  const first = rooms.value[0]

  if (!first) {
    return
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(checkIn) && /^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
    stay.value = { check_in: checkIn, check_out: checkOut }
  }

  if (roomType !== '') {
    first.roomType = roomType
  }

  if (ratePlan !== '') {
    first.ratePlan = ratePlan
  }

  if (Number.isInteger(adults) && adults > 0) {
    first.adults = adults
  }
}

async function loadRates(): Promise<void> {
  try {
    rates.value = await request('/api/portal/rates') as PortalStayRates
    const fallback = rates.value.rate_plans.find(plan => plan.default)?.code ?? rates.value.rate_plans[0]?.code ?? ''
    const type = rates.value.room_types[0]?.code ?? ''

    for (const room of rooms.value) {
      if (room.roomType === '') {
        room.roomType = type
      }

      if (room.ratePlan === '') {
        room.ratePlan = fallback
      }
    }
  } catch (caught: unknown) {
    errors.value = portalAuthMessages(caught)
  }
}

async function onSubmit(): Promise<void> {
  errors.value = []

  if (clientEmail.value.trim() === '') {
    errors.value = [t('requests.emailRequired')]
    return
  }

  if (!acknowledged.value) {
    errors.value = [t('requests.acknowledgeRequired')]
    return
  }

  if (!stay.value) {
    errors.value = [t('requests.stayRequired')]
    return
  }

  if (rooms.value.some(room => room.roomType === '')) {
    errors.value = [t('requests.roomRequired')]
    return
  }

  submitting.value = true

  try {
    created.value = await request('/api/portal/requests', {
      method: 'POST',
      body: requestPayload(
        stay.value.check_in,
        stay.value.check_out,
        rooms.value,
        clientName.value,
        clientEmail.value,
        notes.value
      )
    }) as PortalRequestCreated
  } catch (caught: unknown) {
    errors.value = portalAuthMessages(caught)
  } finally {
    submitting.value = false
  }
}

applyQuery()
void loadRates()
</script>

<template>
  <div>
    <div
      v-if="created"
      data-request-result
    >
      <p
        v-for="reference in created.references"
        :key="reference"
        class="bk-ref"
      >
        {{ reference }}
      </p>
      <p>
        <AnkPill :tone="bookingStatusTone(created.status)">
          {{ t(bookingStatusKey(created.status)) }}
        </AnkPill>
      </p>
      <p class="notice">
        {{ created.message }}
      </p>
      <p>
        <NuxtLink
          to="/requests"
          class="auth-link"
        >
          {{ t('requests.backToList') }}
        </NuxtLink>
      </p>
    </div>
    <form
      v-else
      class="portal-form"
      @submit.prevent="onSubmit"
    >
      <div
        v-if="errors.length"
        class="warnbox"
      >
        <p
          v-for="message in errors"
          :key="message"
        >
          {{ message }}
        </p>
      </div>

      <AnkStayInput
        v-if="limits"
        v-model="stay"
        :min-nights="limits.min_nights"
        :max-nights="limits.max_nights"
      />

      <div>
        <p class="prevl">
          {{ t('requests.rooms') }}
        </p>
        <div class="portal-rooms">
          <div
            v-for="(room, index) in rooms"
            :key="index"
            class="portal-room"
          >
            <div class="field">
              <label :for="`req-type-${String(index)}`">{{ t('requests.roomType') }}</label>
              <USelect
                :id="`req-type-${String(index)}`"
                v-model="room.roomType"
                class="w-full"
                :items="typeItems"
              />
            </div>
            <div class="field">
              <label :for="`req-plan-${String(index)}`">{{ t('requests.plan') }}</label>
              <USelect
                :id="`req-plan-${String(index)}`"
                v-model="room.ratePlan"
                class="w-full"
                :items="planItems"
              />
            </div>
            <div class="field">
              <label :for="`req-adults-${String(index)}`">{{ t('requests.adults') }}</label>
              <input
                :id="`req-adults-${String(index)}`"
                v-model.number="room.adults"
                type="number"
                min="1"
                step="1"
                required
              >
            </div>
            <button
              v-if="rooms.length > 1"
              type="button"
              class="mini"
              @click="removeRoom(index)"
            >
              {{ t('requests.removeRoom') }}
            </button>
          </div>
        </div>
        <p class="portal-toolbar">
          <button
            type="button"
            class="mini"
            @click="addRoom"
          >
            {{ t('requests.addRoom') }}
          </button>
        </p>
      </div>

      <div class="field">
        <label for="req-name">{{ t('requests.clientName') }}</label>
        <input
          id="req-name"
          v-model="clientName"
          type="text"
          autocomplete="name"
          required
        >
      </div>

      <div class="field">
        <label for="req-email">{{ t('requests.clientEmail') }}</label>
        <input
          id="req-email"
          v-model="clientEmail"
          type="email"
          autocomplete="email"
        >
      </div>

      <div class="field">
        <label for="req-notes">{{ t('requests.notes') }}</label>
        <textarea
          id="req-notes"
          v-model="notes"
          rows="4"
        />
      </div>

      <label
        class="portal-check"
        for="req-ack"
      >
        <input
          id="req-ack"
          v-model="acknowledged"
          type="checkbox"
        >
        <span>{{ t('requests.acknowledge') }}</span>
      </label>

      <div>
        <UButton
          type="submit"
          color="primary"
          :loading="submitting"
          :disabled="submitting"
        >
          {{ t('requests.submit') }}
        </UButton>
      </div>
    </form>
  </div>
</template>
