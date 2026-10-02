// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'
import { getDefaultAttributes } from 'eslint-plugin-better-tailwindcss/api/defaults'

export default withNuxt(
  betterTailwindcss.configs['correctness-error'],
  {
    settings: {
      'better-tailwindcss': {
        entryPoint: '../iconic-ui/app/assets/css/main.css',
        attributes: [
          ...getDefaultAttributes(),
          ['^v-bind:ui$', [{ match: 'objectValues' }]]
        ]
      }
    },
    rules: {
      'better-tailwindcss/no-unknown-classes': ['error', {
        ignore: [
          '^(portal-app|portal-side|portal-brand|brand-mark--dark|brand-mark--light|portal-nav|portal-link|is-on|portal-prow|portal-main|portal-head|portal-who|portal-agency|who-email|mono|portal-placeholder|auth-layout|auth-theme|auth-column|auth-form|auth-actions|auth-link|notice|warnbox|bbnote|prevl|gmeta|list|mini-t|list-pager|portal-filters|portal-scroll|portal-toolbar|portal-form|portal-cabins|portal-cabin|portal-check|portal-row|field|mini|dr-empty|kv|bk-ref)$'
        ]
      }]
    }
  }
)
