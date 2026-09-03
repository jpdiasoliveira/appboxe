import { Capacitor } from '@capacitor/core'
import { supabase } from './supabase'
import { isCapacitorNative } from './deep-link'

export type PushPlatform = 'android' | 'ios' | 'web'

export function pushPathForKind(kind: string, token?: string): string {
  if (kind === 'student_invite' && token) {
    return `/convite/${token}`
  }
  if (kind.startsWith('invoice_')) {
    return '/student/pagamento'
  }
  return '/student/dashboard'
}

export async function registerPushDeviceToken(token: string, platform: PushPlatform): Promise<void> {
  const { error } = await supabase.functions.invoke('register-push-token', {
    body: { token, platform },
  })
  if (error) throw error
}

type NavigateFn = (to: string, options?: { replace?: boolean }) => void

export async function initStudentPushRegistration(navigate: NavigateFn): Promise<() => void> {
  if (!isCapacitorNative()) return () => {}

  const { PushNotifications } = await import('@capacitor/push-notifications')

  const permission = await PushNotifications.requestPermissions()
  if (permission.receive !== 'granted') return () => {}

  await PushNotifications.register()

  const registrationListener = await PushNotifications.addListener('registration', async (event) => {
    const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android'
    try {
      await registerPushDeviceToken(event.value, platform)
    } catch (error) {
      console.error('[push] falha ao registrar token:', error)
    }
  })

  const actionListener = await PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (event) => {
      const data = event.notification.data as Record<string, string | undefined> | undefined
      const path =
        (typeof data?.path === 'string' && data.path) ||
        pushPathForKind(data?.kind ?? '', data?.token)
      navigate(path, { replace: true })
    },
  )

  const receivedListener = await PushNotifications.addListener(
    'pushNotificationReceived',
    (notification) => {
      const data = notification.data as Record<string, string | undefined> | undefined
      const path =
        (typeof data?.path === 'string' && data.path) ||
        pushPathForKind(data?.kind ?? '', data?.token)
      if (path) navigate(path, { replace: false })
    },
  )

  return () => {
    void registrationListener.remove()
    void actionListener.remove()
    void receivedListener.remove()
  }
}
