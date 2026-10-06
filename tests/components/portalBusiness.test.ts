import type { PortalRequest, PortalStayBooking, PortalStayCommission, PortalStayRates } from '../../app/types/api'
import { ApiError } from '#iconic-ui/app/composables/useApi'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BookingsPage from '../../app/pages/bookings.vue'
import CommissionsPage from '../../app/pages/commissions.vue'
import RequestsPage from '../../app/pages/requests/index.vue'
import RequestForm from '../../app/pages/requests/new.vue'

const request = vi.hoisted(() => vi.fn())

mockNuxtImport('useApi', () => {
  return () => ({
    request
  })
})

const session = {
  id: 1,
  name: 'Ada',
  email: 'ada@portal.test',
  agency: {
    id: 4,
    reference: 'AG-4',
    name: 'Blue Latitude'
  },
  time_zone: 'UTC'
}

function signIn(): void {
  useState('iconic.portal.session').value = session
  useState('iconic.portal.fetched').value = true
}

function pageBody<T>(rows: Array<T>) {
  return {
    data: rows,
    links: { first: null, last: null, prev: null, next: null },
    meta: {
      current_page: 1,
      from: rows.length ? 1 : null,
      last_page: 1,
      links: [],
      path: null,
      per_page: 50,
      to: rows.length || null,
      total: rows.length
    }
  }
}

const booking: PortalStayBooking = {
  id: 15,
  reference: 'ANK-2026-0005',
  check_in: '2026-09-27',
  check_out: '2026-10-01',
  room_type: { code: 'FAM', name: 'Family' },
  status: 'REQUESTED',
  lead_guest: 'Elena Voss',
  net_due: 22610,
  payment_state: 'Awaiting deposit',
  open_payment_kinds: []
}

const checkout = {
  id: 9,
  kind: 'DEPOSIT',
  amount: 2660,
  stripe_id: 'cs_test_001',
  url: 'https://checkout.stripe.com/c/pay/cs_test_001',
  status: 'OPEN',
  mode: 'test',
  created_at: '2026-09-23T12:00:00.000000Z'
}

const holdSentence = 'This request holds the room. The team will answer within 16 hours. This request is waiting on the commission-cap decision.'

const formRates: PortalStayRates = {
  commission_pct: 10,
  currency: 'USD',
  stay: { min_nights: 1, max_nights: 30, max_rooms: 4 },
  seasons: [],
  room_types: [{ code: 'FAM', name: 'Family' }],
  room_rates: [],
  rate_plans: [{
    code: 'BAR',
    name: 'Best available',
    default: true,
    adjust_pct: 0,
    refundable: true,
    deposit_pct: 30,
    balance_days: 21,
    cancellation: 'standard',
    meal_plan: 'RO'
  }],
  length_of_stay: [],
  supplements: []
}

function commission(
  status: PortalStayCommission['status'],
  payout: PortalStayCommission['payout']
): PortalStayCommission {
  return {
    reference: status === 'PAID' ? 'ANK-PAID' : `ANK-${status}`,
    check_in: '2026-09-27',
    check_out: '2026-10-04',
    room_type: { code: 'FAM', name: 'Family' },
    rate: 12,
    commission_amount: 3390,
    payable_date: '2026-11-03',
    status,
    payout
  }
}

describe('bookings page', () => {
  beforeEach(() => {
    request.mockReset()
    signIn()
    request.mockResolvedValue(pageBody([booking]))
  })

  it('renders the API fields and the same fields in the drawer', async () => {
    const wrapper = await mountSuspended(BookingsPage, { route: '/bookings' })
    await flushPromises()

    expect(request).toHaveBeenCalledWith('/api/portal/bookings')
    expect(wrapper.get('[data-field="net_due"]').text()).toBe('USD 22,610')
    expect(wrapper.get('[data-field="payment_state"]').text()).toBe('Awaiting deposit')
    expect(wrapper.text()).toContain('Elena Voss')
    expect(wrapper.text()).toContain('Family')
    expect(wrapper.text()).toContain('REQUESTED')
    expect(wrapper.text()).not.toContain('Guests')
    expect(wrapper.text()).not.toContain('Documents')
    expect(wrapper.text()).not.toContain('Payments')

    await wrapper.get('[data-booking="ANK-2026-0005"]').trigger('click')
    await flushPromises()

    const drawer = document.querySelector('[data-booking-drawer]')

    expect(drawer).not.toBeNull()
    expect(drawer?.textContent).toContain('ANK-2026-0005')
    expect(drawer?.textContent).toContain('27 Sep 2026')
    expect(drawer?.textContent).toContain('1 Oct 2026')
    expect(drawer?.textContent).toContain('Family')
    expect(drawer?.textContent).toContain('REQUESTED')
    expect(drawer?.textContent).toContain('Elena Voss')
    expect(drawer?.textContent).toContain('USD 22,610')
    expect(drawer?.textContent).toContain('Awaiting deposit')
    expect(drawer?.textContent).not.toContain('Guests')
    expect(drawer?.textContent).not.toContain('Payments')
    wrapper.unmount()
  })

  it('starts a deposit checkout from the drawer', async () => {
    request.mockImplementation(async (url: string) => {
      if (url.includes('payment-link')) {
        return checkout
      }

      return pageBody([booking])
    })

    const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => {})
    const wrapper = await mountSuspended(BookingsPage, { route: '/bookings' })
    await flushPromises()
    await wrapper.get('[data-booking="ANK-2026-0005"]').trigger('click')
    await flushPromises()

    const button = document.querySelector<HTMLButtonElement>('[data-pay]')
    expect(button?.textContent).toContain('Pay deposit')
    expect(button?.dataset.kind).toBe('DEPOSIT')
    button?.click()
    await flushPromises()

    expect(request).toHaveBeenCalledWith('/api/portal/bookings/15/payment-link', {
      method: 'POST',
      body: { kind: 'DEPOSIT' }
    })
    expect(assign).toHaveBeenCalledWith(checkout.url)
    assign.mockRestore()
    wrapper.unmount()
  })

  it('hides pay when the booking is paid, closed, or already has that link open', async () => {
    const hidden: Array<PortalStayBooking> = [
      { ...booking, reference: 'PAID', payment_state: 'Paid in full' },
      { ...booking, reference: 'CANCELLED', status: 'CANCELLED' },
      { ...booking, reference: 'OPEN', open_payment_kinds: ['DEPOSIT'] }
    ]

    for (const row of hidden) {
      request.mockResolvedValue(pageBody([row]))
      const wrapper = await mountSuspended(BookingsPage, { route: '/bookings' })
      await flushPromises()
      await wrapper.get(`[data-booking="${row.reference ?? ''}"]`).trigger('click')
      await flushPromises()
      expect(document.querySelector('[data-pay]')).toBeNull()
      wrapper.unmount()
    }
  })

  it('starts a balance checkout when the deposit is already received', async () => {
    const row: PortalStayBooking = {
      ...booking,
      reference: 'BAL',
      payment_state: 'Deposit received'
    }
    request.mockImplementation(async (url: string) => {
      if (url.includes('payment-link')) {
        return { ...checkout, kind: 'BALANCE' }
      }

      return pageBody([row])
    })

    const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => {})
    const wrapper = await mountSuspended(BookingsPage, { route: '/bookings' })
    await flushPromises()
    await wrapper.get('[data-booking="BAL"]').trigger('click')
    await flushPromises()

    const button = document.querySelector<HTMLButtonElement>('[data-pay]')
    expect(button?.textContent).toContain('Pay balance')
    button?.click()
    await flushPromises()

    expect(request).toHaveBeenCalledWith('/api/portal/bookings/15/payment-link', {
      method: 'POST',
      body: { kind: 'BALANCE' }
    })
    assign.mockRestore()
    wrapper.unmount()
  })

  it('shows the server refusal in the drawer', async () => {
    request.mockImplementation(async (url: string) => {
      if (url.includes('payment-link')) {
        throw new ApiError(422, 'The given data was invalid.', {
          kind: ['An open Deposit link already exists — cancel it first.']
        })
      }

      return pageBody([booking])
    })

    const wrapper = await mountSuspended(BookingsPage, { route: '/bookings' })
    await flushPromises()
    await wrapper.get('[data-booking="ANK-2026-0005"]').trigger('click')
    await flushPromises()
    document.querySelector<HTMLButtonElement>('[data-pay]')?.click()
    await flushPromises()

    expect(document.querySelector('[data-pay-error]')?.textContent).toContain('An open Deposit link already exists — cancel it first.')
    wrapper.unmount()
  })
})

describe('commissions page', () => {
  beforeEach(() => {
    request.mockReset()
    signIn()
    request.mockResolvedValue(pageBody([
      commission('BLOCKED', null),
      commission('EARNED_ON_COMPLETION', null),
      commission('PAYABLE', null),
      commission('PAID', { paid_on: '2026-11-03', reference: 'ANK-PAID' }),
      commission('CANCELLED', null)
    ]))
  })

  it('renders the five statuses and the payout on a paid row', async () => {
    const wrapper = await mountSuspended(CommissionsPage, { route: '/commissions' })
    await flushPromises()

    expect(wrapper.get('[data-status="BLOCKED"]').attributes('data-tone')).toBe('coral')
    expect(wrapper.text()).toContain('BLOCKED')
    expect(wrapper.text()).toContain('EARNED ON COMPLETION')
    expect(wrapper.text()).toContain('PAYABLE')
    expect(wrapper.text()).toContain('PAID')
    expect(wrapper.text()).toContain('CANCELLED')
    expect(wrapper.get('[data-commission="PAID"]').text()).toContain('3 Nov 2026')
    expect(wrapper.get('[data-commission="PAID"]').text()).toContain('ANK-PAID')
    expect(wrapper.get('[data-commission="BLOCKED"]').text()).not.toContain('Paid')
    expect(wrapper.get('[data-commission="BLOCKED"]').text()).toContain('12%')
    expect(wrapper.get('[data-commission="BLOCKED"]').text()).toContain('USD 3,390')
  })
})

describe('requests page', () => {
  beforeEach(() => {
    request.mockReset()
    signIn()
  })

  it('renders the next step in the API\'s words', async () => {
    const row: PortalRequest = {
      id: 16,
      reference: 'REQ-2026-0004',
      status: 'REQUESTED',
      lead_guest: 'Elena Voss',
      next: 'This request does not hold a cabin. The team will answer within 16 hours.',
      payment_state: 'Awaiting deposit',
      open_payment_kinds: []
    }
    request.mockResolvedValue(pageBody([row]))

    const wrapper = await mountSuspended(RequestsPage, { route: '/requests' })
    await flushPromises()

    expect(wrapper.get('[data-field="next"]').text()).toBe(row.next)
    expect(wrapper.text()).toContain('REQ-2026-0004')
    expect(wrapper.text()).toContain('Elena Voss')
  })

  it('starts a deposit checkout from the request drawer', async () => {
    const row: PortalRequest = {
      id: 16,
      reference: 'REQ-2026-0004',
      status: 'REQUESTED',
      lead_guest: 'Elena Voss',
      next: 'This request does not hold a cabin. The team will answer within 16 hours.',
      payment_state: 'Awaiting deposit',
      open_payment_kinds: []
    }
    request.mockImplementation(async (url: string) => {
      if (url.includes('payment-link')) {
        return checkout
      }

      return pageBody([row])
    })

    const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => {})
    const wrapper = await mountSuspended(RequestsPage, { route: '/requests' })
    await flushPromises()
    await wrapper.get('[data-request="REQ-2026-0004"]').trigger('click')
    await flushPromises()

    const drawer = document.querySelector('[data-request-drawer]')
    expect(drawer?.textContent).toContain('REQ-2026-0004')
    expect(drawer?.textContent).toContain('Elena Voss')
    document.querySelector<HTMLButtonElement>('[data-pay]')?.click()
    await flushPromises()

    expect(request).toHaveBeenCalledWith('/api/portal/bookings/16/payment-link', {
      method: 'POST',
      body: { kind: 'DEPOSIT' }
    })
    expect(assign).toHaveBeenCalledWith(checkout.url)
    assign.mockRestore()
    wrapper.unmount()
  })
})

describe('request form', () => {
  beforeEach(() => {
    request.mockReset()
    signIn()
  })

  async function fill(wrapper: Awaited<ReturnType<typeof mountSuspended>>, email: string): Promise<void> {
    await wrapper.get('#req-name').setValue('Elena Voss')
    await wrapper.get('#req-email').setValue(email)
    await wrapper.get('#req-ack').setValue(true)
  }

  it('refuses an empty client email before posting', async () => {
    const wrapper = await mountSuspended(RequestForm, { route: '/requests/new?check_in=2026-12-21&check_out=2026-12-25&room_type=FAM&adults=2&rate_plan=BAR' })
    await flushPromises()

    await wrapper.get('#req-name').setValue('Elena Voss')
    await wrapper.get('#req-ack').setValue(true)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(request).not.toHaveBeenCalledWith('/api/portal/requests', expect.anything())
    expect(wrapper.text()).toContain('A client email is required.')
    expect(wrapper.text()).not.toContain('USD')
  })

  it('does not post until the acknowledgement is checked', async () => {
    const wrapper = await mountSuspended(RequestForm, { route: '/requests/new?check_in=2026-12-21&check_out=2026-12-25&room_type=FAM&adults=2&rate_plan=BAR' })
    await flushPromises()

    await wrapper.get('#req-name').setValue('Elena Voss')
    await wrapper.get('#req-email').setValue('elena@guest.test')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(request).not.toHaveBeenCalledWith('/api/portal/requests', expect.anything())
    expect(wrapper.text()).toContain('Confirm that the client of record is the end guest.')
  })

  it('shows the created reference and the hold sentence', async () => {
    request.mockImplementation(async (url: string, options?: { method?: string }) => {
      if (options?.method === 'POST') {
        return {
          references: ['REQ-2026-0008'],
          status: 'REQUESTED',
          message: 'This request holds the room. The team will answer within 16 hours.'
        }
      }

      return formRates
    })

    const wrapper = await mountSuspended(RequestForm, { route: '/requests/new?check_in=2026-12-21&check_out=2026-12-25&room_type=FAM&adults=2&rate_plan=BAR' })
    await flushPromises()
    await fill(wrapper, 'elena@guest.test')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(request).toHaveBeenCalledWith('/api/portal/requests', {
      method: 'POST',
      body: {
        check_in: '2026-12-21',
        check_out: '2026-12-25',
        rooms: [{
          room_type: 'FAM',
          adults: 2,
          child_ages: [],
          rate_plan: 'BAR'
        }],
        client: { name: 'Elena Voss', email: 'elena@guest.test' },
        client_of_record: true
      }
    })
    expect(wrapper.get('[data-request-result]').text()).toContain('REQ-2026-0008')
    expect(wrapper.get('[data-request-result]').text()).toContain('This request holds the room. The team will answer within 16 hours.')
  })

  it('shows the hold sentence the API returns for an over-cap request', async () => {
    request.mockImplementation(async (_url: string, options?: { method?: string }) => {
      if (options?.method === 'POST') {
        return {
          references: ['REQ-2026-0009'],
          status: 'ON_HOLD_AGENCY',
          message: holdSentence
        }
      }

      return formRates
    })

    const wrapper = await mountSuspended(RequestForm, { route: '/requests/new?check_in=2026-12-21&check_out=2026-12-25&room_type=FAM&adults=2&rate_plan=BAR' })
    await flushPromises()
    await fill(wrapper, 'elena@guest.test')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-request-result]').text()).toContain(holdSentence)
    expect(wrapper.text()).toContain('ON HOLD AGENCY')
  })

  it('shows a refused stay in the API\'s words', async () => {
    request.mockImplementation(async (_url: string, options?: { method?: string }) => {
      if (options?.method === 'POST') {
        throw new ApiError(422, 'The given data was invalid.', {
          rooms: ['SOLD_OUT']
        })
      }

      return formRates
    })

    const wrapper = await mountSuspended(RequestForm, { route: '/requests/new?check_in=2026-12-21&check_out=2026-12-25&room_type=FAM&adults=2&rate_plan=BAR' })
    await flushPromises()
    await fill(wrapper, 'elena@guest.test')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('SOLD_OUT')
    expect(wrapper.find('[data-request-result]').exists()).toBe(false)
  })
})
