import { ApiError } from '#iconic-ui/app/composables/useApi'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AcceptPage from '../../app/pages/accept.vue'
import ResetPage from '../../app/pages/reset-password.vue'

const request = vi.hoisted(() => vi.fn())

mockNuxtImport('useApi', () => {
  return () => ({
    request
  })
})

const tokenSentence = 'This password reset token is invalid.'
const passwordSentence = 'The password field must be at least 8 characters.'

async function fillPasswords(wrapper: Awaited<ReturnType<typeof mountSuspended>>): Promise<void> {
  const fields = wrapper.findAll('input[type="password"]')
  await fields[0]?.setValue('short')
  await fields[1]?.setValue('short')
  await wrapper.get('form').trigger('submit')
}

describe('token pages', () => {
  beforeEach(() => {
    request.mockReset()
  })

  it('renders the API token sentence and a password rule on accept', async () => {
    request.mockRejectedValue(new ApiError(422, 'The given data was invalid.', {
      token: [tokenSentence],
      password: [passwordSentence]
    }))

    const wrapper = await mountSuspended(AcceptPage, {
      route: '/accept?token=used-once&email=ada@agency.test'
    })

    await fillPasswords(wrapper)

    expect(wrapper.text()).toContain(tokenSentence)
    expect(wrapper.text()).toContain(passwordSentence)
    expect(wrapper.text()).not.toContain('This invitation has expired')
  })

  it('renders the API token sentence and a password rule on reset', async () => {
    request.mockRejectedValue(new ApiError(422, 'The given data was invalid.', {
      token: [tokenSentence],
      password: [passwordSentence]
    }))

    const wrapper = await mountSuspended(ResetPage, {
      route: '/reset-password?token=used-once&email=ada@agency.test'
    })

    await fillPasswords(wrapper)

    expect(wrapper.text()).toContain(tokenSentence)
    expect(wrapper.text()).toContain(passwordSentence)
    expect(wrapper.text()).not.toContain('This reset link has expired')
  })
})
