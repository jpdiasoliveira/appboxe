import { useState } from 'react'
import { BellIcon } from '@heroicons/react/24/outline'
import { useNotifications } from '../hooks/useNotifications'

export function NotificationBell() {
  const { items, unreadCount, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        className="relative rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notificações"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Fechar"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-lg">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
              <span className="text-sm font-semibold">Notificações</span>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  className="text-xs text-[var(--color-primary)] hover:underline"
                  onClick={() => void markAllRead()}
                >
                  Marcar todas lidas
                </button>
              ) : null}
            </div>
            <ul className="max-h-72 overflow-y-auto">
              {items.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
                  Nenhuma notificação.
                </li>
              ) : (
                items.map((n) => (
                  <li
                    key={n.id}
                    className={`border-b border-[var(--color-border)] px-4 py-3 text-sm last:border-0 ${
                      n.read_at ? 'opacity-60' : 'bg-[var(--color-bg-elevated)]/30'
                    }`}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => {
                        if (!n.read_at) void markRead(n.id)
                      }}
                    >
                      <p className="font-medium">{n.title}</p>
                      {n.body ? (
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{n.body}</p>
                      ) : null}
                      <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                        {new Date(n.created_at).toLocaleString('pt-BR')}
                      </p>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  )
}
