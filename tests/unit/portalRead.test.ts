import { describe, expect, it } from 'vitest'
import { ApiError } from '#iconic-ui/app/composables/useApi'
import { canRequestDeparture } from '../../app/utils/availabilityLabel'
import { availabilityPath, monthToRange } from '../../app/utils/availabilityQuery'
import { portalPageMessages } from '../../app/utils/authError'
import { filenameFromDisposition } from '../../app/utils/downloadFile'
import { formatSize } from '../../app/utils/formatSize'

describe('monthToRange', () => {
  it('turns a month range into the first and last calendar days', () => {
    expect(monthToRange('2026-01', '2026-02')).toEqual({
      from: '2026-01-01',
      to: '2026-02-28'
    })
    expect(monthToRange('2024-02', '')).toEqual({
      from: '2024-02-01',
      to: undefined
    })
    expect(monthToRange('', '2024-02')).toEqual({
      from: undefined,
      to: '2024-02-29'
    })
  })

  it('omits a month that is not YYYY-MM', () => {
    expect(monthToRange('September', '2026-13')).toEqual({
      from: undefined,
      to: undefined
    })
  })
})

describe('availabilityPath', () => {
  it('sends the API filters and omits an empty page', () => {
    expect(availabilityPath({
      fromMonth: '2026-09',
      toMonth: '2026-10',
      yacht: ' ANAMARA ',
      itinerary: 'WEST',
      page: 1
    })).toBe('/api/portal/availability?from=2026-09-01&to=2026-10-31&yacht=ANAMARA&itinerary=WEST')
  })

  it('adds the page the API paginator reads', () => {
    expect(availabilityPath({
      fromMonth: '',
      toMonth: '',
      yacht: '',
      itinerary: '',
      page: 2
    })).toBe('/api/portal/availability?page=2')
  })
})

describe('canRequestDeparture', () => {
  it('offers a request only for a week the portal can ask for', () => {
    expect(canRequestDeparture('AVAILABLE')).toBe(true)
    expect(canRequestDeparture('LIMITED')).toBe(true)
    expect(canRequestDeparture('ONLY_N_LEFT')).toBe(true)
    expect(canRequestDeparture('FULL')).toBe(false)
    expect(canRequestDeparture('CLOSED')).toBe(false)
    expect(canRequestDeparture('CHARTER')).toBe(false)
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
