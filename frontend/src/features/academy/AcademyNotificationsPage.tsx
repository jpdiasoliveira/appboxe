import { Button } from '../../components/ui/Button'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { PageHeader } from '../../components/ui/PageHeader'
import { useNotifications } from '../../hooks/useNotifications'

export function AcademyNotificationsPage() {
  const { items, unreadCount, loading, markRead, markAllRead } = useNotifications()

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Notificações"
        description="Alertas da academia — novos leads, lembretes e avisos do sistema."
        actions={
          unreadCount > 0 ? (
            <Button type="button" variant="ghost" onClick={() => void markAllRead()}>
              Marcar todas como lidas
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Carregando notificações...</p>
      ) : items.length === 0 ? (
        <FeedbackMessage variant="info">
          Nenhuma notificação no momento. Você verá aqui avisos sobre leads, alunos e lembretes da
          academia.
        </FeedbackMessage>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
          {items.map((n) => (
            <li
              key={n.id}
              className={`px-4 py-4 ${n.read_at ? 'opacity-70' : 'bg-[var(--color-bg-elevated)]/20'}`}
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => {
                  if (!n.read_at) void markRead(n.id)
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{n.title}</p>
                  {!n.read_at ? (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]" />
                  ) : null}
                </div>
                {n.body ? (
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">{n.body}</p>
                ) : null}
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                  {new Date(n.created_at).toLocaleString('pt-BR')}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
