import { useState, useEffect } from 'react';
import { useBoxing } from '../context/BoxingContext';
import { CheckCircle, XCircle, Users, Calendar, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AttendanceList = () => {
    const { students, attendance, getUpcomingTrainings } = useBoxing();
    const upcomingTrainings = getUpcomingTrainings();
    const [selectedTrainingId, setSelectedTrainingId] = useState<string>('');

    // Set default selected training to the first upcoming one
    useEffect(() => {
        if (upcomingTrainings.length > 0 && !selectedTrainingId) {
            setSelectedTrainingId(upcomingTrainings[0].id);
        }
    }, [upcomingTrainings, selectedTrainingId]);

    const selectedTraining = upcomingTrainings.find(t => t.id === selectedTrainingId);

    // Get attendance records for selected training
    const trainingAttendance = selectedTrainingId
        ? attendance.filter(a => a.trainingSessionId === selectedTrainingId)
        : [];

    // Separate into present and absent
    const presentStudentIds = new Set(
        trainingAttendance.filter(a => a.present).map(a => a.studentId)
    );
    const absentStudentIds = new Set(
        trainingAttendance.filter(a => !a.present).map(a => a.studentId)
    );

    const presentStudents = students.filter(s => presentStudentIds.has(s.id));
    const absentStudents = students.filter(s => absentStudentIds.has(s.id));
    const noResponseStudents = students.filter(
        s => !presentStudentIds.has(s.id) && !absentStudentIds.has(s.id)
    );

    if (upcomingTrainings.length === 0) {
        return (
            <div className="bg-black/30 backdrop-blur-md p-6 rounded-xl border border-white/10 text-center shadow-lg">
                <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-slate-400">Nenhum treino agendado</h3>
                <p className="text-slate-500">Crie um treino para ver a lista de presença.</p>
            </div>
        );
    }

    return (
        <div className="bg-black/30 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <Calendar className="w-6 h-6 text-indigo-400" />
                    <div>
                        <h3 className="font-semibold text-lg">Lista de Presença</h3>
                        <p className="text-sm text-slate-400">
                            Acompanhe as confirmações
                        </p>
                    </div>
                </div>

                {/* Training Selector */}
                <div className="relative">
                    <select
                        value={selectedTrainingId}
                        onChange={(e) => setSelectedTrainingId(e.target.value)}
                        className="appearance-none bg-slate-900 border border-slate-700 rounded-lg pl-4 pr-10 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer min-w-[250px]"
                    >
                        {upcomingTrainings.map(training => (
                            <option key={training.id} value={training.id}>
                                {format(parseISO(training.date), "dd/MM - EEEE", { locale: ptBR })} às {training.time}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {selectedTraining && (
                <div className="mb-6 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 flex items-center justify-between text-sm">
                    <span className="text-slate-400">Local: <span className="text-white">{selectedTraining.location}</span></span>
                    {selectedTraining.description && (
                        <span className="text-slate-400 hidden md:inline">Obs: <span className="text-white">{selectedTraining.description}</span></span>
                    )}
                </div>
            )}

            <div className="grid md:grid-cols-3 gap-4">
                {/* Present */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                        <h4 className="font-semibold text-emerald-400">
                            Vão Treinar ({presentStudents.length})
                        </h4>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {presentStudents.length === 0 ? (
                            <p className="text-slate-500 text-sm">Nenhum aluno confirmou presença</p>
                        ) : (
                            presentStudents.map(student => (
                                <div
                                    key={student.id}
                                    className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3"
                                >
                                    <p className="text-white font-medium text-sm">{student.name}</p>
                                    <p className="text-emerald-400 text-xs">{student.athleteType}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Absent */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-red-400" />
                        <h4 className="font-semibold text-red-400">
                            Vão Faltar ({absentStudents.length})
                        </h4>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {absentStudents.length === 0 ? (
                            <p className="text-slate-500 text-sm">Nenhum aluno marcou falta</p>
                        ) : (
                            absentStudents.map(student => (
                                <div
                                    key={student.id}
                                    className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"
                                >
                                    <p className="text-white font-medium text-sm">{student.name}</p>
                                    <p className="text-red-400 text-xs">{student.athleteType}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* No Response */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-slate-400" />
                        <h4 className="font-semibold text-slate-400">
                            Sem Resposta ({noResponseStudents.length})
                        </h4>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {noResponseStudents.length === 0 ? (
                            <p className="text-slate-500 text-sm">Todos responderam</p>
                        ) : (
                            noResponseStudents.map(student => (
                                <div
                                    key={student.id}
                                    className="bg-slate-700/50 border border-slate-600 rounded-lg p-3"
                                >
                                    <p className="text-white font-medium text-sm">{student.name}</p>
                                    <p className="text-slate-400 text-xs">{student.athleteType}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className="mt-6 pt-6 border-t border-slate-700 grid grid-cols-3 gap-4 text-center">
                <div>
                    <p className="text-2xl font-bold text-emerald-400">{presentStudents.length}</p>
                    <p className="text-xs text-slate-400">Presentes</p>
                </div>
                <div>
                    <p className="text-2xl font-bold text-red-400">{absentStudents.length}</p>
                    <p className="text-xs text-slate-400">Ausentes</p>
                </div>
                <div>
                    <p className="text-2xl font-bold text-slate-400">{noResponseStudents.length}</p>
                    <p className="text-xs text-slate-400">Sem Resposta</p>
                </div>
            </div>
        </div>
    );
};

export default AttendanceList;
