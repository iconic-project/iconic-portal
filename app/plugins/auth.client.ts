import { unauthorizedSessionAction } from '../utils/session'

export default defineNuxtPlugin(() => {
  const { session, clearSession } = usePortalSession()

  useNuxtApp().hook('iconic:api-error', (error) => {
    if (error.status !== 401) {
      return
    }

    const action = unauthorizedSessionAction(session.value !== null)

    if (!action.clear) {
      return
    }

    clearSession()
    clearNuxtData()
    void navigateTo(action.to)
  })
})
