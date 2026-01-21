
import { useBoxing } from '../context/BoxingContext';
import { CheckCircle, XCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AttendanceControl = () => {
    const { currentUser, attendance, markAttendance } = useBoxing();
    const today = new Date().toISOString().split('T')[0];

    const todayRecord = attendance.find(
        a => a.studentId === currentUser?.id && a.date === today
    );

    const handleAttendance = (present: boolean) => {
        if (currentUser) {
            markAttendance(currentUser.id, present);
        }
    };

    return (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <div className="flex items-center gap-3 mb-6 text-indigo-400">
                <Calendar className="w-6 h-6" />
                <h3 className="font-semibold text-lg">
                    Treino de Hoje - {format(new Date(), "d 'de' MMMM", { locale: ptBR })}
                </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => handleAttendance(true)}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${todayRecord?.present === true
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400'
                        }`}
                >
                    <CheckCircle className="w-8 h-8" />
                    <span className="font-semibold">Vou Treinar</span>
                </button>

                <button
                    onClick={() => handleAttendance(false)}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${todayRecord?.present === false
                        ? 'bg-red-500/20 border-red-500 text-red-400'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-red-500/50 hover:text-red-400'
                        }`}
                >
                    <XCircle className="w-8 h-8" />
                    <span className="font-semibold">Vou Faltar</span>
                </button>
            </div>

            {todayRecord && (
                <div className="mt-4 text-center text-sm text-slate-400">
                    Status confirmado: <span className="text-white font-medium">{todayRecord.present ? 'Presença' : 'Ausência'}</span>
                </div>
            )}
        </div>
    );
};

export default AttendanceControl;
