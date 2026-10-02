import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

const uiRoot = resolve(import.meta.dirname, '../iconic-ui')

export default defineConfig(async () => ({
  test: {
    projects: [
      {
        resolve: {
          alias: {
            '#anakata-ui': uiRoot
          }
        },
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          environment: 'node'
        }
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['tests/components/**/*.test.ts'],
          environment: 'nuxt'
        }
      })
    ]
  }
}))
