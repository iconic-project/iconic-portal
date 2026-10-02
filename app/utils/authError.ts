import { ApiError } from '#iconic-ui/app/composables/useApi'

function throttleMessage(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) {
    return null
  }

  const body = error as {
    status?: number
    statusCode?: number
    message?: string
    data?: { message?: string }
  }

  const status = typeof body.status === 'number'
    ? body.status
    : body.statusCode

  if (status !== 429) {
    return null
  }

  if (typeof body.data?.message === 'string' && body.data.message) {
    return body.data.message
  }

  if (typeof body.message === 'string' && body.message) {
    return body.message
  }

  return null
}

export function portalPageMessages(error: unknown): Array<string> {
  const lines = portalAuthMessages(error)

  if (lines.length > 0) {
    return lines
  }

  if (error instanceof Error && error.message) {
    return [error.message]
  }

  return []
}

export function portalAuthMessages(error: unknown): Array<string> {
  if (error instanceof ApiError) {
    if (error.status === 422) {
      const lines: Array<string> = []

      for (const messages of Object.values(error.errors ?? {})) {
        for (const message of messages) {
          if (message) {
            lines.push(message)
          }
        }
      }

      if (lines.length > 0) {
        return lines
      }
    }

    if (error.message) {
      return [error.message]
    }

    return []
  }

  const throttled = throttleMessage(error)

  return throttled ? [throttled] : []
}

export function singleQuery(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0]
  }

  return ''
}
