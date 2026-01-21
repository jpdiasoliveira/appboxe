import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useBoxing } from '../context/BoxingContext';
import { Plus, Trash2, Calendar, MapPin, X, Repeat, Eye, EyeOff } from 'lucide-react';
import { format, parseISO, addWeeks, addDays, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TrainingManager = () => {
    const { currentUser, addTrainingSession, deleteTrainingSession, getUpcomingTrainings, attendance, students } = useBoxing();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [showAllTrainings, setShowAllTrainings] = useState(false);
    const [formData, setFormData] = useState({
        date: '',
        time: '19:00',
        location: 'CT Boxing Club - Rua Principal, 123',
        description: '',
        isRecurring: false,
        weeks: 1,
    });

    const allUpcomingTrainings = getUpcomingTrainings();

    // Filter to show only next 2 weeks by default
    const twoWeeksFromNow = addDays(new Date(), 14);
    const upcomingTrainings = showAllTrainings
        ? allUpcomingTrainings
        : allUpcomingTrainings.filter(t => isBefore(parseISO(t.date), twoWeeksFromNow));

    const hiddenTrainingsCount = allUpcomingTrainings.length - upcomingTrainings.length;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentUser) return;

        const sessionsToCreate = [];
        const startDate = parseISO(formData.date);

        const weeksToCreate = formData.isRecurring ? formData.weeks : 1;

        for (let i = 0; i < weeksToCreate; i++) {
            const sessionDate = addWeeks(startDate, i);
            sessionsToCreate.push({
                date: format(sessionDate, 'yyyy-MM-dd'),
                time: formData.time,
                location: formData.location,
                description: formData.description,
                createdBy: currentUser.profileId || currentUser.id,
            });
        }

        // Create all sessions
        for (const session of sessionsToCreate) {
            await addTrainingSession(session);
        }

        setFormData({
            date: '',
            time: '19:00',
            location: 'CT Boxing Club - Rua Principal, 123',
            description: '',
            isRecurring: false,
            weeks: 1,
        });
        setIsFormOpen(false);
    };

    const getAttendanceForTraining = (trainingId: string) => {
        const trainingAttendance = attendance.filter(a => a.trainingSessionId === trainingId);
        const present = trainingAttendance.filter(a => a.present).length;
        const absent = trainingAttendance.filter(a => !a.present).length;
        const noResponse = students.length - trainingAttendance.length;
        return { present, absent, noResponse };
    };

    return (
        <div className="bg-black/30 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow-lg">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Calendar className="w-6 h-6 text-indigo-400" />
                    <div>
                        <h3 className="font-semibold text-lg">Próximos Treinos</h3>
                        <p className="text-sm text-slate-400">
                            {showAllTrainings
                                ? `Mostrando todos os ${allUpcomingTrainings.length} treinos`
                                : `Próximas 2 semanas (${upcomingTrainings.length} treinos)`
                            }
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {hiddenTrainingsCount > 0 && (
                        <button
                            onClick={() => setShowAllTrainings(!showAllTrainings)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-lg font-medium transition-colors"
                            title={showAllTrainings ? "Mostrar apenas próximas 2 semanas" : `Ver todos os ${allUpcomingTrainings.length} treinos`}
                        >
                            {showAllTrainings ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            {showAllTrainings ? "Ocultar" : `+${hiddenTrainingsCount}`}
                        </button>
                    )}
                    <button
                        onClick={() => setIsFormOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/40 hover:to-purple-500/40 border border-indigo-500/30 text-indigo-100 rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] backdrop-blur-md"
                    >
                        <Plus className="w-5 h-5" />
                        Novo Treino
                    </button>
                </div>
            </div>

            {/* Training List */}
            <div className="space-y-3">
                {upcomingTrainings.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">Nenhum treino agendado</p>
                ) : (
                    upcomingTrainings.map(training => {
                        const stats = getAttendanceForTraining(training.id);
                        return (
                            <div key={training.id} className="bg-black/40 border border-white/10 rounded-lg p-4 backdrop-blur-sm">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-lg font-semibold text-white">
                                                {format(parseISO(training.date), "EEEE, d 'de' MMMM", { locale: ptBR })}
                                            </span>
                                            <span className="text-emerald-400 text-sm font-medium">
                                                {training.time}
                                            </span>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                                <MapPin className="w-4 h-4" />
                                                {training.location}
                                            </div>
                                            {training.description && (
                                                <p className="text-sm text-slate-300 mt-2">{training.description}</p>
                                            )}
                                        </div>

                                        {/* Attendance Stats */}
                                        <div className="mt-3 flex gap-4 text-xs">
                                            <span className="text-emerald-400">
                                                ✓ {stats.present} Confirmados
                                            </span>
                                            <span className="text-red-400">
                                                ✗ {stats.absent} Faltas
                                            </span>
                                            <span className="text-slate-400">
                                                – {stats.noResponse} Sem resposta
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            if (confirm('Remover este treino?')) {
                                                deleteTrainingSession(training.id);
                                            }
                                        }}
                                        className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Add Training Form Modal */}
            {isFormOpen && createPortal(
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-slate-700">
                            <h2 className="text-xl font-bold text-white">Novo Treino</h2>
                            <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Data</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.date}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Horário</label>
                                <input
                                    type="time"
                                    required
                                    value={formData.time}
                                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Local</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Descrição (opcional)</label>
                                <textarea
                                    rows={3}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Ex: Treino focado em técnica..."
                                />
                            </div>

                            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                                <div className="flex items-center gap-2 mb-3">
                                    <Repeat className="w-4 h-4 text-indigo-400" />
                                    <span className="text-sm font-medium text-white">Recorrência</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.isRecurring}
                                            onChange={e => setFormData({ ...formData, isRecurring: e.target.checked })}
                                            className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800"
                                        />
                                        <span className="text-sm text-slate-300">Repetir semanalmente</span>
                                    </label>

                                    {formData.isRecurring && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-slate-400">por</span>
                                            <input
                                                type="number"
                                                min="1"
                                                max="12"
                                                value={formData.weeks}
                                                onChange={e => setFormData({ ...formData, weeks: parseInt(e.target.value) || 1 })}
                                                className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                            <span className="text-sm text-slate-400">semanas</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
                                >
                                    Can celar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    Criar Treino
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default TrainingManager;
