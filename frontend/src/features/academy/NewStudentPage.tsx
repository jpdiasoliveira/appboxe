import { useNavigate } from 'react-router-dom'
import { NewStudentForm } from './components/NewStudentForm'

export function NewStudentPage() {
  const navigate = useNavigate()

  return (
    <div className="max-w-lg">
      <h2 className="mb-6 text-2xl font-semibold">Novo aluno</h2>
      <NewStudentForm
        onSuccess={() => navigate('/academy/alunos')}
        onCancel={() => navigate('/academy/alunos')}
        showCancel
      />
    </div>
  )
}
