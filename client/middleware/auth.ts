export default defineNuxtRouteMiddleware((to) => {
  // Only run on client side
  if (process.server) {
    return
  }

  const { isAuthenticated, loading } = useAuth()

  // While loading, show the page's loading state rather than redirecting
  // Each page should handle its own loading UI
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
