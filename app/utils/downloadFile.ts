import { ApiError, type ApiErrorStatus } from '#iconic-ui/app/composables/useApi'

const API_STATUSES: ReadonlyArray<number> = [401, 403, 409, 419, 422]

export function filenameFromDisposition(header: string | null): string | null {
  if (header === null || header === '') {
    return null
  }

  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)

  if (encoded?.[1]) {
    const raw = encoded[1].trim().replace(/"/g, '')

    try {
      return decodeURIComponent(raw)
    } catch {
      return raw
    }
  }

  const quoted = /filename="([^"]+)"/i.exec(header)

  if (quoted?.[1]) {
    return quoted[1]
  }

  const plain = /filename=([^;]+)/i.exec(header)

  if (plain?.[1]) {
    return plain[1].trim()
  }

  return null
}

async function messageFrom(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()

    if (
      typeof body === 'object'
      && body !== null
      && 'message' in body
      && typeof body.message === 'string'
      && body.message !== ''
    ) {
      return body.message
    }
  } catch {
    return ''
  }

  return ''
}

function fail(status: number, message: string): never {
  const sentence = message || 'Request failed'

  if (API_STATUSES.includes(status)) {
    const error = new ApiError(status as ApiErrorStatus, sentence)

    try {
      void useNuxtApp().callHook('iconic:api-error', error)
    } catch {
      // Called outside a Nuxt app, in a unit test.
    }

    throw error
  }

  throw new Error(sentence)
}

export async function downloadPortalFile(path: string, baseURL: string): Promise<void> {
  const root = baseURL.replace(/\/$/, '')
  const response = await fetch(`${root}${path}`, {
    credentials: 'include'
  })

  if (!response.ok) {
    fail(response.status, await messageFrom(response))
  }

  const blob = await response.blob()
  const filename = filenameFromDisposition(response.headers.get('Content-Disposition')) ?? 'download'
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
