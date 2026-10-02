import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const localUi = resolve(import.meta.dirname, '../iconic-ui')
const uiLayer = existsSync(localUi)
  ? '../iconic-ui'
  : 'github:anakata-project/anakata-ui#v0.17.1'

export default defineNuxtConfig({
  extends: [uiLayer],

  modules: [
    (_options, nuxt) => {
      const layer = nuxt.options._layers.find(item => item.cwd.includes('iconic-ui'))
      if (layer) {
        nuxt.options.alias['#anakata-ui'] = layer.cwd
      }
    },
    '@nuxt/ui',
    '@nuxt/eslint'
  ],

  ssr: false,

  css: ['~/assets/css/portal.css'],

  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:8000'
    }
  },

  alias: existsSync(localUi)
    ? { '#anakata-ui': localUi }
    : {},

  routeRules: {
    '/accept': {
      headers: {
        'cache-control': 'no-store, private',
        'x-robots-tag': 'noindex'
      }
    },
    '/reset-password': {
      headers: {
        'cache-control': 'no-store, private',
        'x-robots-tag': 'noindex'
      }
    }
  },

  devServer: {
    port: 3002
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  i18n: {
    locales: [
      { code: 'en', language: 'en', file: 'en.json' }
    ]
  }
})
