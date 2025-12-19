export const useToast = () => {
  // Access the toast instance from the Nuxt app
  const { $toast } = useNuxtApp()

  return {
    success: (message: string) => $toast.success(message),
    error: (message: string) => $toast.error(message),
    info: (message: string) => $toast.info(message),
    warning: (message: string) => $toast.warning(message)
  }
}
