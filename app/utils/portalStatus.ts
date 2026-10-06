import type { PortalBooking, PortalCommission } from '../types/api'

export type PillTone = 'neutral' | 'ok' | 'warn' | 'coral' | 'sand'

export function bookingStatusTone(status: PortalBooking['status']): PillTone {
  switch (status) {
    case 'CONFIRMED':
    case 'FULLY_PAID':
    case 'IN_HOUSE':
    case 'CHECKED_OUT':
      return 'ok'
    case 'ON_HOLD_AGENCY':
    case 'PENDING_PAYMENT':
    case 'OVERDUE':
    case 'WAITLISTED':
      return 'warn'
    case 'CANCELLED':
    case 'CANCELLED_POSTPAID':
    case 'RELEASED':
    case 'NO_SHOW':
      return 'coral'
    case 'REQUESTED':
      return 'sand'
  }
}

export function commissionStatusTone(status: PortalCommission['status']): PillTone {
  switch (status) {
    case 'PAID':
      return 'ok'
    case 'PAYABLE':
      return 'warn'
    case 'EARNED_ON_COMPLETION':
      return 'sand'
    case 'BLOCKED':
    case 'CANCELLED':
      return 'coral'
  }
}

export function bookingStatusKey(status: PortalBooking['status']): string {
  return `bookingStatus.${status}`
}

export function commissionStatusKey(status: PortalCommission['status']): string {
  return `commissionStatus.${status}`
}
