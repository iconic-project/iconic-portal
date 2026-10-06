import type { PortalStayCalendar, PortalStayRates } from '../../app/types/api'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AvailabilityPage from '../../app/pages/availability.vue'
import MaterialsPage from '../../app/pages/materials.vue'
import RatesPage from '../../app/pages/rates.vue'

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

const stayRates: PortalStayRates = {
  commission_pct: 15,
  currency: 'USD',
  stay: { min_nights: 1, max_nights: 30, max_rooms: 4 },
  seasons: [{ code: 'PEAK', name: 'Peak', from: '2026-12-20', to: '2026-12-31' }],
  room_types: [{ code: 'FAM', name: 'Family' }],
  room_rates: [{ room_type: 'FAM', season: 'PEAK', nightly: 306 }],
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
  length_of_stay: [{ min_nights: 7, discount_pct: 10 }],
  supplements: [{
    code: 'FEST',
    label: 'Festive',
    from: '2026-12-24',
    to: '2026-12-26',
    per_night: 18,
    basis: 'ROOM'
  }]
}

const calendar: PortalStayCalendar = {
  from: '2026-12',
  months: 1,
  adults: 2,
  children: 0,
  commission_pct: 10,
  stay: { min_nights: 1, max_nights: 30, max_rooms: 4 },
  nights: [{
    night: '2026-12-21',
    available: true,
    from_price: 90,
    closed_to_arrival: false,
    closed_to_departure: false,
    min_stay: 1
  }]
}

describe('rates page', () => {
  beforeEach(() => {
    request.mockReset()
    signIn()
  })

  it('renders the season matrix and the commission percent', async () => {
    request.mockResolvedValue(stayRates)

    const wrapper = await mountSuspended(RatesPage, { route: '/rates' })
    await flushPromises()

    expect(wrapper.text()).toContain('NET RATES (PUBLIC − 15%) · PUBLIC PRICES NEVER SHOWN')
    expect(wrapper.get('[data-room-type="FAM"]').text()).toContain('Family')
    expect(wrapper.get('[data-rate="FAM-PEAK"]').text()).toContain('306')
    expect(wrapper.get('[data-plan="BAR"]').text()).toContain('Best available')
    expect(wrapper.get('[data-supplement="FEST"]').text()).toContain('18')
    expect(wrapper.text()).not.toContain('13,300')
    expect(request).toHaveBeenCalledWith('/api/portal/rates')
  })
})

describe('availability page', () => {
  beforeEach(() => {
    request.mockReset()
    signIn()
    request.mockResolvedValue(calendar)
  })

  it('shows the month grid and does not offer a request before a search', async () => {
    const wrapper = await mountSuspended(AvailabilityPage, { route: '/availability' })
    await flushPromises()

    expect(wrapper.text()).toContain('Choose dates to see rooms.')
    expect(wrapper.findAll('a').filter(link => link.text() === 'Request')).toHaveLength(0)

    await wrapper.get('[data-view="rooms"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-night="2026-12-21"]').text()).toContain('USD 90')
  })
})

describe('materials page', () => {
  beforeEach(() => {
    request.mockReset()
    signIn()
  })

  it('shows the API note when the list is empty', async () => {
    request.mockResolvedValue({
      data: [],
      meta: { note: 'assets pending upload' }
    })

    const wrapper = await mountSuspended(MaterialsPage, { route: '/materials' })
    await flushPromises()

    expect(wrapper.text()).toContain('assets pending upload')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('downloads through the portal file route', async () => {
    request.mockResolvedValue({
      data: [{
        id: 7,
        title: 'Fact sheet',
        kind: 'FACT_SHEET',
        size: 2048,
        version: 2,
        updated: '2026-09-01T12:00:00Z'
      }],
      meta: { note: 'assets pending upload' }
    })

    const fetchMock = vi.fn().mockResolvedValue(new Response(new Blob(['pdf']), {
      status: 200,
      headers: { 'Content-Disposition': 'attachment; filename="fact-sheet-v2.pdf"' }
    }))
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fact-sheet')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    const wrapper = await mountSuspended(MaterialsPage, { route: '/materials' })
    await flushPromises()

    expect(wrapper.text()).toContain('FACT_SHEET')
    expect(wrapper.text()).toContain('2,048 B')
    expect(wrapper.text()).not.toContain('assets pending upload')

    await wrapper.get('button.mini').trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/portal/sales-materials/7/file',
      { credentials: 'include' }
    )
  })
})
