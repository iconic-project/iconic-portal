import type { PortalAvailabilityRow } from '../../app/types/api'
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

function availabilityRow(
  id: number,
  code: PortalAvailabilityRow['label']['code'],
  text: string
): PortalAvailabilityRow {
  return {
    id,
    itinerary: 'WEST',
    yacht: 'ANAMARA',
    embark: '2026-09-27',
    disembark: '2026-10-04',
    festive: false,
    rate_year: 2026,
    status: 'ON_SALE',
    label: { code, text },
    net_rates: { suite_pp: 22610, owner_pp: 30524 }
  }
}

function availabilityBody(rows: Array<PortalAvailabilityRow>) {
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

describe('rates page', () => {
  beforeEach(() => {
    request.mockReset()
    signIn()
  })

  it('renders the payload integers and the commission percent from the agency', async () => {
    request.mockImplementation(async (url: string) => {
      if (url === '/api/portal/me') {
        return {
          agency: {
            name: 'Blue Latitude',
            reference: 'AG-4',
            commission_pct: 15,
            payment_terms: 'Net 30',
            status: 'APPROVED'
          },
          user: { id: 1, name: 'Ada', email: 'ada@portal.test' },
          materials_exist: false
        }
      }

      return {
        data: [{ year: 2026, suite_pp: 22610, owner_pp: 30524, charter_week: 169575 }]
      }
    })

    const wrapper = await mountSuspended(RatesPage, { route: '/rates' })
    await flushPromises()

    expect(wrapper.text()).toContain('NET RATES (PUBLIC − 15%) · PUBLIC PRICES NEVER SHOWN')
    expect(wrapper.get('[data-field="suite_pp"]').text()).toBe('USD 22,610')
    expect(wrapper.text()).toContain('USD 30,524')
    expect(wrapper.text()).toContain('USD 169,575')
    expect(request).toHaveBeenCalledWith('/api/portal/rates')
  })
})

describe('availability page', () => {
  beforeEach(() => {
    request.mockReset()
    signIn()
    request.mockResolvedValue(availabilityBody([
      availabilityRow(3, 'FULL', 'FULL · WAITLIST'),
      availabilityRow(9, 'AVAILABLE', 'AVAILABLE')
    ]))
  })

  it('hides Request on a sold-out departure and links an open one', async () => {
    const wrapper = await mountSuspended(AvailabilityPage, { route: '/availability' })
    await flushPromises()

    const requests = wrapper.findAll('a').filter(link => link.text() === 'Request')

    expect(wrapper.text()).toContain('FULL · WAITLIST')
    expect(requests).toHaveLength(1)
    expect(requests[0]?.attributes('href')).toContain('/requests/new')
    expect(requests[0]?.attributes('href')).toContain('departure_id=9')
    expect(wrapper.get('[data-departure="3"]').text()).not.toContain('Request')
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
