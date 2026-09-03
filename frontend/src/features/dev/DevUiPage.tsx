import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { Input } from '../../components/ui/Input'
import { KpiCard } from '../../components/ui/KpiCard'

export function DevUiPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <h1 className="text-2xl font-bold">RingPro — UI Kit</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard label="Alunos" value={127} trend="+12%" trendPositive />
        <KpiCard label="Inadimplência" value="8%" trend="+2%" />
      </div>
      <Card>
        <div className="mb-4 flex gap-2">
          <Badge variant="success">ATIVO</Badge>
          <Badge variant="danger">INADIMPLENTE</Badge>
          <Badge variant="warning">Experimental</Badge>
        </div>
        <Input placeholder="Input de teste" />
        <div className="mt-4 flex gap-2">
          <Button>Primary</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
        <div className="mt-6 space-y-3">
          <FeedbackMessage variant="success">Operação concluída com sucesso.</FeedbackMessage>
          <FeedbackMessage variant="error">Não foi possível salvar. Tente novamente.</FeedbackMessage>
          <FeedbackMessage variant="warning">Atenção: vencimento em 3 dias.</FeedbackMessage>
          <FeedbackMessage variant="info">Dica: você pode editar isso depois em Configurações.</FeedbackMessage>
        </div>
      </Card>
    </div>
  )
}
