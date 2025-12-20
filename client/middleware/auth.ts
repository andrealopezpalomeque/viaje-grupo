export default defineNuxtRouteMiddleware((to) => {
  // Skip middleware on server - Firebase auth only works on client
  // Protected pages use ssr: false to avoid hydration mismatches
  if (process.server) {
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
  if (!isAuthenticated.value && to.path !== '/login') {
    return navigateTo('/login')
  }

  // If authenticated and trying to access login page, redirect to home
  if (isAuthenticated.value && to.path === '/login') {
    return navigateTo('/')
  }
})
