import type { PortalStayRates } from '../../app/types/api'
import { describe, expect, it } from 'vitest'
import { ApiError } from '#iconic-ui/app/composables/useApi'
import { portalPageMessages } from '../../app/utils/authError'
import { filenameFromDisposition } from '../../app/utils/downloadFile'
import { formatSize } from '../../app/utils/formatSize'
import { availabilityPath, calendarPath, canRequestRoom, nightlyFor, requestPath, requestPayload, shiftMonth } from '../../app/utils/portalStay'

const rates: PortalStayRates = {
  commission_pct: 10,
  currency: 'USD',
  stay: { min_nights: 1, max_nights: 30, max_rooms: 4 },
  seasons: [{ code: 'LOW', name: 'Low', from: '2026-01-01', to: '2026-03-31' }],
  room_types: [{ code: 'FAM', name: 'Family' }],
  room_rates: [{ room_type: 'FAM', season: 'LOW', nightly: 144 }],
  rate_plans: [],
  length_of_stay: [],
  supplements: []
}

describe('stay search paths', () => {
  it('asks the stay search and the month grid', () => {
    expect(availabilityPath('2026-12-21', '2026-12-25', 2)).toBe(
      '/api/portal/availability?check_in=2026-12-21&check_out=2026-12-25&adults=2&rooms=1'
    )
    expect(calendarPath('2026-12', 2)).toBe('/api/portal/calendar?from=2026-12&months=1&adults=2&children=0')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
  })

  it('offers a request only for a bookable room with a price', () => {
    expect(canRequestRoom(true, 1)).toBe(true)
    expect(canRequestRoom(false, 0)).toBe(false)
    expect(canRequestRoom(true, 0)).toBe(false)
    expect(requestPath('2026-12-21', '2026-12-25', 'FAM', 2, 'BAR')).toBe(
      '/requests/new?check_in=2026-12-21&check_out=2026-12-25&room_type=FAM&adults=2&rate_plan=BAR'
    )
  })

  it('reads the net nightly for a season', () => {
    expect(nightlyFor(rates, 'FAM', 'LOW')).toBe(144)
    expect(nightlyFor(rates, 'FAM', 'HIGH')).toBeNull()
  })
})

describe('requestPayload', () => {
  it('posts the stay, the rooms and the client, and omits an empty note', () => {
    expect(requestPayload('2026-12-21', '2026-12-25', [{
      roomType: 'FAM',
      adults: 2,
      childAges: [],
      ratePlan: 'BAR'
    }], ' Elena Voss ', 'elena@guest.test', '  ')).toEqual({
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
    })
  })
})

describe('formatSize', () => {
  it('keeps the API integer and adds a byte suffix', () => {
    expect(formatSize(2048)).toBe('2,048 B')
  })
})

describe('filenameFromDisposition', () => {
  it('reads the filename the API sets', () => {
    expect(filenameFromDisposition('attachment; filename="fact-sheet-v1.pdf"')).toBe('fact-sheet-v1.pdf')
    expect(filenameFromDisposition('attachment; filename=fact-sheet-v2.pdf')).toBe('fact-sheet-v2.pdf')
    expect(filenameFromDisposition('attachment; filename*=UTF-8\'\'fact%20sheet.pdf')).toBe('fact sheet.pdf')
    expect(filenameFromDisposition(null)).toBeNull()
  })
})

describe('portalPageMessages', () => {
  it('keeps an API sentence that is not an ApiError', () => {
    expect(portalPageMessages(new Error('No query results for model.'))).toEqual([
      'No query results for model.'
    ])
  })

  it('prefers the 422 field sentences', () => {
    const error = new ApiError(422, 'The given data was invalid.', {
      yacht: ['The selected yacht is invalid.']
    })

    expect(portalPageMessages(error)).toEqual(['The selected yacht is invalid.'])
  })
})
