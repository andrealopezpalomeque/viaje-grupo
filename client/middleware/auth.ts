export default defineNuxtRouteMiddleware((to) => {
  // Skip middleware on server - Firebase auth only works on client
  // Protected pages use ssr: false to avoid hydration mismatches
  if (import.meta.server) {
    return
  }

  // Client-side auth check
  const { isAuthenticated, loading } = useAuth()

  // While loading, don't redirect - let the page show loading state
  if (loading.value) {
    return
  }

  // After auth is loaded, check authentication
  // If not authenticated and trying to access a protected route, redirect to login
  // Use direct window.location.href for a true full page reload
  // This ensures the pre-rendered login page with styles is fetched fresh
  if (!isAuthenticated.value && to.path !== '/login') {
    window.location.href = '/login'
    // Abort the current navigation
    return abortNavigation()
  }

  // If authenticated and trying to access login page, redirect to home
  if (isAuthenticated.value && to.path === '/login') {
    return navigateTo('/')
  }
})
