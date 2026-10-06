<script setup lang="ts">
import type { PortalStayBooking } from '../types/api'
import { portalPageMessages } from '../utils/authError'
import { listPath } from '../utils/listPath'
import { bookingStatusKey, bookingStatusTone } from '../utils/portalStatus'

type BookingsBody = {
  data: Array<PortalStayBooking>
  meta: {
    current_page: number
    last_page: number
    total: number
  }
}

const { t } = useI18n()
const { request } = useApi()
const { format } = useDates()

const page = ref(1)
const pending = ref(true)
const errors = ref<Array<string>>([])
const rows = ref<Array<PortalStayBooking>>([])
const meta = ref<BookingsBody['meta'] | null>(null)
const selected = ref<PortalStayBooking | null>(null)

async function load(): Promise<void> {
  pending.value = true
  errors.value = []

  try {
    const body = await request(listPath('/api/portal/bookings', page.value)) as BookingsBody

    rows.value = body.data
    meta.value = body.meta
  } catch (caught: unknown) {
    rows.value = []
    meta.value = null
    errors.value = portalPageMessages(caught)
  } finally {
    pending.value = false
  }
}

function go(next: number): void {
  page.value = next
  void load()
}

function openBooking(row: PortalStayBooking): void {
  selected.value = row
}

function onDrawer(open: boolean): void {
  if (!open) {
    selected.value = null
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
    <template v-else>
      <div class="portal-scroll">
        <table class="list mini-t">
          <thead>
            <tr>
              <th>{{ t('bookings.colReference') }}</th>
              <th>{{ t('bookings.colCheckIn') }}</th>
              <th>{{ t('bookings.colCheckOut') }}</th>
              <th>{{ t('bookings.colRoomType') }}</th>
              <th>{{ t('bookings.colStatus') }}</th>
              <th>{{ t('bookings.colClient') }}</th>
              <th>{{ t('bookings.colNetDue') }}</th>
              <th>{{ t('bookings.colNext') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-if="rows.length === 0"
              class="dr-empty"
            >
              <td colspan="8">
                {{ t('bookings.empty') }}
              </td>
            </tr>
            <tr
              v-for="(row, index) in rows"
              :key="`${row.reference ?? 'booking'}-${String(index)}`"
              class="portal-row"
              role="button"
              tabindex="0"
              :aria-label="row.reference ?? t('nav.bookings')"
              :data-booking="row.reference ?? ''"
              @click="openBooking(row)"
              @keydown.enter.prevent="openBooking(row)"
            >
              <td class="bk-ref">
                {{ row.reference ?? '—' }}
              </td>
              <td>{{ format(row.check_in, 'short') }}</td>
              <td>{{ format(row.check_out, 'short') }}</td>
              <td>{{ row.room_type?.name ?? '—' }}</td>
              <td>
                <AnkPill
                  :tone="bookingStatusTone(row.status)"
                  :data-status="row.status"
                >
                  {{ t(bookingStatusKey(row.status)) }}
                </AnkPill>
              </td>
              <td>{{ row.lead_guest }}</td>
              <td data-field="net_due">
                <AnkMoney :amount="row.net_due" />
              </td>
              <td data-field="payment_state">
                {{ row.payment_state }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        v-if="meta && meta.last_page > 1"
        class="list-pager"
      >
        <button
          type="button"
          :disabled="meta.current_page <= 1"
          @click="go(meta.current_page - 1)"
        >
          {{ t('lists.previous') }}
        </button>
        <span>{{ t('lists.pager', { page: String(meta.current_page), total: String(meta.total) }) }}</span>
        <button
          type="button"
          :disabled="meta.current_page >= meta.last_page"
          @click="go(meta.current_page + 1)"
        >
          {{ t('lists.next') }}
        </button>
      </div>
    </template>

    <USlideover
      :open="selected !== null"
      :title="selected?.reference ?? t('nav.bookings')"
      @update:open="onDrawer"
    >
      <template #body>
        <div
          v-if="selected"
          data-booking-drawer
        >
          <div class="kv">
            <span>{{ t('bookings.colReference') }}</span>
            <span class="bk-ref">{{ selected.reference ?? '—' }}</span>
          </div>
          <div class="kv">
            <span>{{ t('bookings.colCheckIn') }}</span>
            <span>{{ format(selected.check_in, 'short') }}</span>
          </div>
          <div class="kv">
            <span>{{ t('bookings.colCheckOut') }}</span>
            <span>{{ format(selected.check_out, 'short') }}</span>
          </div>
          <div class="kv">
            <span>{{ t('bookings.colRoomType') }}</span>
            <span>{{ selected.room_type?.name ?? '—' }}</span>
          </div>
          <div class="kv">
            <span>{{ t('bookings.colStatus') }}</span>
            <span>
              <AnkPill :tone="bookingStatusTone(selected.status)">
                {{ t(bookingStatusKey(selected.status)) }}
              </AnkPill>
            </span>
          </div>
          <div class="kv">
            <span>{{ t('bookings.colClient') }}</span>
            <span>{{ selected.lead_guest }}</span>
          </div>
          <div class="kv">
            <span>{{ t('bookings.colNetDue') }}</span>
            <span>
              <AnkMoney :amount="selected.net_due" />
            </span>
          </div>
          <div class="kv">
            <span>{{ t('bookings.colNext') }}</span>
            <span>{{ selected.payment_state }}</span>
          </div>
          <PortalPayButton
            :id="selected.id"
            :status="selected.status"
            :payment-state="selected.payment_state"
            :open-payment-kinds="selected.open_payment_kinds"
          />
        </div>
      </template>
    </USlideover>
  </div>
</template>
