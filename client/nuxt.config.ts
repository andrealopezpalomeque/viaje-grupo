// https://nuxt.com/docs/api/configuration/nuxt-config
import Icons from 'unplugin-icons/vite'

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vueuse/nuxt'
  ],

  components: [
    {
      path: '~/components',
      pathPrefix: false
    }
  ],

  vite: {
    plugins: [
      Icons({
        autoInstall: true,
        compiler: 'vue3'
      })
    ]
  },

  typescript: {
    strict: true,
    typeCheck: true
  },

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'Text The Check - Expense Tracker',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        {
          name: 'description',
          content: 'Collaborative expense tracking platform for group vacations'
        },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }
      ],
      link: [
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&family=Inter:wght@400;500;600&display=swap'
        }
      ]
    }
  },

  runtimeConfig: {
    public: {
      firebaseApiKey: process.env.FIREBASE_API_KEY || '',
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
      firebaseAppId: process.env.FIREBASE_APP_ID || ''
    }
  },

  // Route rules for static generation
  // Don't prerender root "/" - it requires auth check
  // The SPA fallback (200.html) will handle it client-side
  routeRules: {
    '/': { prerender: false },
    '/login': { prerender: true },
    '/profile': { prerender: true }
  }
})
