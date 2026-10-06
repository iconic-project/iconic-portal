<script setup lang="ts">
import type { PortalStayCommission } from '../types/api'
import { portalPageMessages } from '../utils/authError'
import { listPath } from '../utils/listPath'
import { commissionStatusKey, commissionStatusTone } from '../utils/portalStatus'

type CommissionsBody = {
  data: Array<PortalStayCommission>
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
const rows = ref<Array<PortalStayCommission>>([])
const meta = ref<CommissionsBody['meta'] | null>(null)

async function load(): Promise<void> {
  pending.value = true
  errors.value = []

  try {
    const body = await request(listPath('/api/portal/commissions', page.value)) as CommissionsBody

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

function rateLabel(rate: number | null): string {
  if (rate === null) {
    return '—'
  }

  return t('commissions.ratePct', { pct: String(rate) })
}

function paidLine(row: PortalStayCommission): string {
  if (row.payout === null) {
    return ''
  }

  const date = format(row.payout.paid_on, 'short')

  if (row.payout.reference) {
    return t('commissions.paidLine', { date, reference: row.payout.reference })
  }

  return date
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
              <th>{{ t('commissions.colReference') }}</th>
              <th>{{ t('commissions.colStay') }}</th>
              <th>{{ t('commissions.colRate') }}</th>
              <th>{{ t('commissions.colAmount') }}</th>
              <th>{{ t('commissions.colPayable') }}</th>
              <th>{{ t('commissions.colStatus') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-if="rows.length === 0"
              class="dr-empty"
            >
              <td colspan="6">
                {{ t('commissions.empty') }}
              </td>
            </tr>
            <tr
              v-for="(row, index) in rows"
              :key="`${row.reference ?? 'commission'}-${String(index)}`"
              :data-commission="row.status"
            >
              <td class="bk-ref">
                {{ row.reference ?? '—' }}
              </td>
              <td>{{ format(row.check_in, 'short') }} – {{ format(row.check_out, 'short') }}</td>
              <td>{{ rateLabel(row.rate) }}</td>
              <td>
                <AnkMoney :amount="row.commission_amount" />
              </td>
              <td>{{ format(row.payable_date, 'short') }}</td>
              <td>
                <AnkPill
                  :tone="commissionStatusTone(row.status)"
                  :data-status="row.status"
                >
                  {{ t(commissionStatusKey(row.status)) }}
                </AnkPill>
                <div
                  v-if="paidLine(row)"
                  class="gmeta"
                >
                  {{ paidLine(row) }}
                </div>
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
  </div>
</template>
