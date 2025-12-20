export default defineNuxtRouteMiddleware((to) => {
  // On server side, we can't check Firebase auth state
  // So we redirect unauthenticated routes to login by default during SSR
  // The client will then handle the actual auth check
  if (process.server) {
    // During SSR, always render login page for /login route
    // For other routes, let them render - client will redirect if needed
    if (to.path === '/login') {
      return // Allow login page to render
    }
    // For protected routes during SSR, redirect to login
    // This ensures SSR output matches what client will show for unauthenticated users
    return navigateTo('/login')
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
