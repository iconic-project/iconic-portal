import type { PortalLoginInput, PortalSession } from '../types/api'

const SESSION_STATE = 'iconic.portal.session'
const FETCHED_STATE = 'iconic.portal.fetched'

let fetchPromise: Promise<void> | null = null

export function usePortalSession() {
  const session = useState<PortalSession | null>(SESSION_STATE, () => null)
  const fetched = useState(FETCHED_STATE, () => false)
  const { request } = useApi()

  const isSignedIn = computed(() => session.value !== null)

  async function fetchMe(): Promise<void> {
    try {
      session.value = await request('/api/portal/auth/me') as PortalSession
    } catch {
      session.value = null
    } finally {
      fetched.value = true
    }
  }

  function ensureSession(): Promise<void> {
    if (fetched.value) {
      return Promise.resolve()
    }

    if (!fetchPromise) {
      fetchPromise = fetchMe().finally(() => {
        fetchPromise = null
      })
    }

    return fetchPromise
  }

  async function login(email: string, password: string): Promise<PortalSession> {
    const body: PortalLoginInput = { email, password }
    const me = await request('/api/portal/auth/login', {
      method: 'POST',
      body
    }) as PortalSession

    session.value = me
    fetched.value = true

    return me
  }

  function setSession(me: PortalSession): void {
    session.value = me
    fetched.value = true
  }

  function clearSession(): void {
    session.value = null
    fetched.value = true
  }

  async function logout(): Promise<void> {
    clearSession()

    try {
      await request('/api/portal/auth/logout', { method: 'POST' })
    } catch {
      // The cookie may already be gone.
    }

    clearNuxtData()
    await navigateTo('/login')
  }

  return {
    session,
    isSignedIn,
    ensureSession,
    login,
    logout,
    setSession,
    clearSession
  }
}
