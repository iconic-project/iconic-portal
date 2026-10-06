import type { PortalStayCalendar, PortalStayRates, PortalStayRequestInput } from '../types/api'

export type NightMark = {
  disabled?: boolean
  closedToArrival?: boolean
  closedToDeparture?: boolean
  price?: number
  minStay?: number
}

export type RoomDraft = {
  roomType: string
  adults: number
  childAges: Array<number>
  ratePlan: string
}

export function thisMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function shiftMonth(from: string, delta: number): string {
  const match = /^(\d{4})-(\d{2})$/.exec(from)

  if (!match) {
    return from
  }

  const cursor = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1 + delta, 1))

  return `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`
}

export function availabilityPath(checkIn: string, checkOut: string, adults: number): string {
  const params = new URLSearchParams({
    check_in: checkIn,
    check_out: checkOut,
    adults: String(adults),
    rooms: '1'
  })

  return `/api/portal/availability?${params.toString()}`
}

export function calendarPath(from: string, adults: number): string {
  const params = new URLSearchParams({
    from,
    months: '1',
    adults: String(adults),
    children: '0'
  })

  return `/api/portal/calendar?${params.toString()}`
}

export function canRequestRoom(bookable: boolean, quotes: number): boolean {
  return bookable && quotes > 0
}

export function requestPath(checkIn: string, checkOut: string, roomType: string, adults: number, ratePlan: string): string {
  const params = new URLSearchParams({
    check_in: checkIn,
    check_out: checkOut,
    room_type: roomType,
    adults: String(adults),
    rate_plan: ratePlan
  })

  return `/requests/new?${params.toString()}`
}

export function nightMark(night: PortalStayCalendar['nights'][number] | undefined): NightMark {
  if (!night) {
    return {}
  }

  return {
    disabled: !night.available,
    closedToArrival: night.closed_to_arrival,
    closedToDeparture: night.closed_to_departure,
    price: night.from_price ?? undefined,
    minStay: night.min_stay > 0 ? night.min_stay : undefined
  }
}

export function nightlyFor(rates: PortalStayRates, roomType: string, season: string): number | null {
  const row = rates.room_rates.find(rate => rate.room_type === roomType && rate.season === season)

  return row ? row.nightly : null
}

export function requestPayload(
  checkIn: string,
  checkOut: string,
  rooms: Array<RoomDraft>,
  clientName: string,
  clientEmail: string,
  notes: string
): PortalStayRequestInput {
  const payload: PortalStayRequestInput = {
    check_in: checkIn,
    check_out: checkOut,
    rooms: rooms.map((room) => {
      const row: PortalStayRequestInput['rooms'][number] = {
        room_type: room.roomType,
        adults: room.adults,
        child_ages: room.childAges
      }

      if (room.ratePlan !== '') {
        row.rate_plan = room.ratePlan
      }

      return row
    }),
    client: {
      name: clientName.trim(),
      email: clientEmail.trim()
    },
    client_of_record: true
  }
  const note = notes.trim()

  if (note !== '') {
    payload.notes = note
  }

  return payload
}
