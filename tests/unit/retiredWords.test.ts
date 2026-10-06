import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const banned = /\b(yachts?|cabins?)\b/i

function localeFiles(dir: string, out: Array<string> = []): Array<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      localeFiles(path, out)
    } else if (name.endsWith('.json')) {
      out.push(path)
    }
  }

  return out
}

describe('locale copy', () => {
  it('does not say yacht or cabin', () => {
    const hits = localeFiles('i18n').filter(file => banned.test(readFileSync(file, 'utf8')))

    expect(hits).toEqual([])
  })
})
