import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface NotificationRow {
  id: string
  title: string
  body: string | null
  read_at: string | null
  created_at: string
  academy_id: string | null
}

export function useNotifications() {
  const { user } = useAuth()
  const [items, setItems] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) {
      setItems([])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('notifications')
      .select('id, title, body, read_at, created_at, academy_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setItems((data ?? []) as NotificationRow[])
    setLoading(false)
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  const unreadCount = items.filter((n) => !n.read_at).length

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
    await load()
  }

  async function markAllRead() {
    if (!user) return
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null)
    await load()
  }

  return { items, unreadCount, loading, markRead, markAllRead, refresh: load }
}
