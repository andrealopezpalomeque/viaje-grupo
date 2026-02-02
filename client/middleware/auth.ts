export default defineNuxtRouteMiddleware((to) => {
  // Skip middleware on server - Firebase auth only works on client
  // Protected pages use ssr: false to avoid hydration mismatches
  if (import.meta.server) {
    return
  }

  // Client-side auth check
  const { isAuthenticated, loading } = useAuth()

  // SECURITY: While auth is loading, only allow access to the login page
  // All other pages must wait for auth to resolve to prevent unauthorized access
  if (loading.value) {
    // Allow login page during loading - it will redirect if user is authenticated
    if (to.path === '/login') {
      return
    }
    // For protected routes, don't allow access during loading
    // The page will show a loading state via app.vue's authLoading check
    return
  }

  // After auth is loaded, enforce access control
  // If not authenticated and trying to access a protected route, redirect to login
  if (!isAuthenticated.value && to.path !== '/login') {
    // Use window.location.href for a clean redirect that works with pre-rendered pages
    window.location.href = '/login'
    return abortNavigation()
  }

  // If authenticated and trying to access login page, redirect to home
  if (isAuthenticated.value && to.path === '/login') {
    // Use replace to prevent back button returning to login
    return navigateTo('/', { replace: true })
  }
})
