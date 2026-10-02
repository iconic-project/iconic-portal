import { describe, expect, it } from 'vitest'
import { ApiError } from '#iconic-ui/app/composables/useApi'
import { portalAuthMessages } from '../../app/utils/authError'
import {
  lostSessionTarget,
  postLoginPath,
  sessionDecision,
  unauthorizedSessionAction
} from '../../app/utils/session'

describe('sessionDecision', () => {
  it('sends a signed-out visitor to login and back', () => {
    expect(sessionDecision('/rates', false)).toEqual({
      type: 'redirect',
      to: { path: '/login', query: { redirect: '/rates' } }
    })
    expect(postLoginPath('/rates')).toBe('/rates')
    expect(postLoginPath('/bookings?page=2')).toBe('/bookings?page=2')
  })

  it('drops external and auth-page redirects', () => {
    expect(postLoginPath('https://x')).toBe('/rates')
    expect(postLoginPath('//evil.com')).toBe('/rates')
    expect(postLoginPath('/\\evil.com')).toBe('/rates')
    expect(postLoginPath('/login')).toBe('/rates')
    expect(postLoginPath('/forgot')).toBe('/rates')
    expect(postLoginPath('/accept?token=a')).toBe('/rates')
    expect(postLoginPath('/reset-password?token=a')).toBe('/rates')
    expect(postLoginPath(null)).toBe('/rates')
  })

  it('sends a signed-in visitor away from login', () => {
    expect(sessionDecision('/login', true)).toEqual({
      type: 'redirect',
      to: '/rates'
    })
    expect(sessionDecision('/rates', true)).toEqual({ type: 'allow' })
  })
})

describe('unauthorizedSessionAction', () => {
  it('clears a live session and returns to sign-in with a neutral notice', () => {
    expect(unauthorizedSessionAction(true)).toEqual({
      clear: true,
      to: lostSessionTarget()
    })
    expect(lostSessionTarget()).toEqual({
      path: '/login',
      query: { notice: 'session' }
    })
  })

  it('ignores a 401 when nobody is signed in', () => {
    expect(unauthorizedSessionAction(false)).toEqual({ clear: false })
  })
})

describe('portalAuthMessages', () => {
  it('uses the API field sentences, including a password rule', () => {
    const error = new ApiError(422, 'The given data was invalid.', {
      token: ['This password reset token is invalid.'],
      password: ['The password field must be at least 8 characters.']
    })

    expect(portalAuthMessages(error)).toEqual([
      'This password reset token is invalid.',
      'The password field must be at least 8 characters.'
    ])
  })

  it('uses the same neutral login sentence for every refusal', () => {
    const sentence = 'These credentials do not match our records.'
    const error = new ApiError(422, sentence, { email: [sentence] })

    expect(portalAuthMessages(error)).toEqual([sentence])
  })

  it('reads a throttle body that is not an ApiError', () => {
    expect(portalAuthMessages({
      statusCode: 429,
      data: { message: 'Too Many Attempts.' }
    })).toEqual(['Too Many Attempts.'])
  })
})
