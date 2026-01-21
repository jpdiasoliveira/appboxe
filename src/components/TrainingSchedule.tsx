import { useBoxing } from '../context/BoxingContext';
import { Calendar, MapPin, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format, parseISO, differenceInDays, isSameWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TrainingSchedule = () => {
    const { currentUser, getUpcomingTrainings, markAttendance, attendance, canConfirmAttendance } = useBoxing();
    const allUpcomingTrainings = getUpcomingTrainings();

    // Filter only trainings for the current week
    const upcomingTrainings = allUpcomingTrainings.filter(t =>
        isSameWeek(parseISO(t.date), new Date(), { weekStartsOn: 0 }) // 0 = Sunday
    );

    const getMyAttendance = (trainingId: string) => {
        if (!currentUser) return null;
        // Use profileId (Student ID) if available, otherwise fallback to id (User ID)
        const studentId = currentUser.profileId || currentUser.id;
        return attendance.find(a => a.trainingSessionId === trainingId && a.studentId === studentId);
    };

    const handleConfirm = (trainingId: string, trainingDate: string, trainingTime: string, willAttend: boolean) => {
        if (!currentUser) return;

        if (!canConfirmAttendance(trainingDate, trainingTime)) {
            alert('Você só pode confirmar presença entre 3 dias e 1 hora antes do treino!');
            return;
        }

        // Use profileId (Student ID) if available
        markAttendance(currentUser.profileId || currentUser.id, willAttend, trainingId);
    };

    const getDaysUntil = (date: string) => {
        return differenceInDays(parseISO(date), new Date());
    };

    return (
        <div className="bg-black/30 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
                <Calendar className="w-6 h-6 text-indigo-400" />
                <div>
                    <h3 className="font-semibold text-lg">Próximos Treinos</h3>
                    <p className="text-sm text-slate-400">Confirme sua presença com antecedência</p>
                </div>
            </div>

            <div className="space-y-4">
                {upcomingTrainings.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">Nenhum treino agendado</p>
                ) : (
                    upcomingTrainings.map(training => {
                        const myAttendance = getMyAttendance(training.id);
                        const daysUntil = getDaysUntil(training.date);
                        const canConfirm = canConfirmAttendance(training.date, training.time);
                        const isPast = daysUntil < 0;

                        return (
                            <div key={training.id} className="bg-black/40 border border-white/10 rounded-lg p-4 backdrop-blur-sm">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg font-semibold text-white">
                                                {format(parseISO(training.date), "EEEE, d 'de' MMMM", { locale: ptBR })}
                                            </span>
                                            {!isPast && (
                                                <span className="text-xs text-slate-400">
                                                    ({daysUntil} {daysUntil === 1 ? 'dia' : 'dias'})
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-slate-400">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                {training.time}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <MapPin className="w-4 h-4" />
                                                {training.location}
                                            </div>
                                        </div>
                                        {training.description && (
                                            <p className="text-sm text-slate-300 mt-2">{training.description}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Attendance Confirmation */}
                                {isPast ? (
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <AlertCircle className="w-4 h-4" />
                                        Treino já passou
                                    </div>
                                ) : !canConfirm ? (
                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                                        <p className="text-amber-400 text-sm">
                                            ⚠️ Prazo de confirmação encerrado ou fora do período (3 dias a 1 hora antes)
                                        </p>
                                        {myAttendance && (
                                            <p className="text-slate-400 text-xs mt-1">
                                                Você marcou: {myAttendance.present ? 'Vou treinar ✓' : 'Vou faltar ✗'}
                                            </p>
                                        )}
                                    </div>
                                ) : myAttendance ? (
                                    <div className={`border rounded-lg p-3 ${myAttendance.present
                                        ? 'bg-emerald-500/10 border-emerald-500/20'
                                        : 'bg-red-500/10 border-red-500/20'
                                        }`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {myAttendance.present ? (
                                                    <>
                                                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                                                        <span className="text-emerald-400 font-medium">Confirmado - Vou treinar!</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <XCircle className="w-5 h-5 text-red-400" />
                                                        <span className="text-red-400 font-medium">Confirmado - Vou faltar</span>
                                                    </>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleConfirm(training.id, training.date, training.time, !myAttendance.present)}
                                                className="text-xs text-slate-400 hover:text-white underline"
                                            >
                                                Alterar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleConfirm(training.id, training.date, training.time, true)}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Vou Treinar
                                        </button>
                                        <button
                                            onClick={() => handleConfirm(training.id, training.date, training.time, false)}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            Vou Faltar
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {upcomingTrainings.length > 0 && (
                <div className="mt-4 p-3 bg-black/40 rounded-lg border border-white/10 backdrop-blur-sm">
                    <p className="text-xs text-slate-300">
                        💡 <strong>Lembre-se:</strong> Você deve confirmar sua presença ou ausência entre 3 dias e 1 hora antes do treino.
                    </p>
                </div>
            )}
        </div>
    );
};

export default TrainingSchedule;
