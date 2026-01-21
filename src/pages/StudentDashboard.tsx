
import { useBoxing } from '../context/BoxingContext';
import AttendanceControl from '../components/AttendanceControl';
import { LogOut, User, CreditCard, Activity } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const StudentDashboard = () => {
  const { currentUser, students, logout, getStudentStatus } = useBoxing();

  // In a real app, we'd fetch the specific student data. 
  // Here we find the student that matches the logged in ID (or mock ID)
  const student = students.find(s => s.id === currentUser?.id) || students[0]; // Fallback for demo
  const status = getStudentStatus(student);
  const isOverdue = status === 'overdue';

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-8">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Olá, {student.name.split(' ')[0]}</h1>
            <p className="text-slate-400">Vamos treinar hoje?</p>
          </div>
          <button
            onClick={logout}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-300"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Status Card */}
        <div className={`p-6 rounded-xl border ${isOverdue
          ? 'bg-red-500/10 border-red-500/50'
          : 'bg-emerald-500/10 border-emerald-500/50'
          }`}>
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className={`w-6 h-6 ${isOverdue ? 'text-red-400' : 'text-emerald-400'}`} />
            <h3 className={`font-semibold text-lg ${isOverdue ? 'text-red-400' : 'text-emerald-400'}`}>
              {isOverdue ? 'Pagamento Pendente' : 'Mensalidade em Dia'}
            </h3>
          </div>
          <p className="text-slate-300 text-sm">
            {isOverdue
              ? 'Sua mensalidade venceu. Por favor, regularize para continuar treinando.'
              : `Próximo vencimento: ${student.lastPaymentDate ? format(parseISO(student.lastPaymentDate), "d 'de' MMMM", { locale: ptBR }) : 'N/A'}`
            }
          </p>
        </div>

        {/* Plan Info */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3 mb-4 text-blue-400">
            <User className="w-6 h-6" />
            <h3 className="font-semibold text-lg">Seu Plano</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Tipo</span>
              <span className="text-white font-medium capitalize">{student.planType}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Categoria</span>
              <span className="text-white font-medium capitalize flex items-center gap-2">
                <Activity className="w-4 h-4" />
                {student.athleteType}
              </span>
            </div>
          </div>
        </div>

        {/* Attendance */}
        <AttendanceControl />
      </div>
    </div>
  );
};

export default StudentDashboard;
