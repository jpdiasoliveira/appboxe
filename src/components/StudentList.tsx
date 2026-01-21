import { useState, Fragment } from 'react';
import type { Student } from '../types';
import { useBoxing } from '../context/BoxingContext';
import { Edit, Trash2, CheckCircle, AlertCircle, ChevronDown, ChevronUp, User, Calendar, Ruler, Weight, Target } from 'lucide-react';
import { format, parseISO, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StudentListProps {
    onEdit: (student: Student) => void;
}

const StudentList: React.FC<StudentListProps> = ({ onEdit }) => {
    const { students, deleteStudent, getStudentStatus } = useBoxing();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const calculateAge = (birthDate: string) => {
        return differenceInYears(new Date(), parseISO(birthDate));
    };

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-sm font-semibold">
                        <tr>
                            <th className="p-4 w-12"></th>
                            <th className="p-4">Nome</th>
                            <th className="p-4">Plano</th>
                            <th className="p-4">Tipo</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Pagamento</th>
                            <th className="p-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {students.map((student) => {
                            const status = getStudentStatus(student);
                            const isOverdue = status === 'overdue';
                            const isExpanded = expandedId === student.id;

                            return (
                                <Fragment key={student.id}>
                                    <tr className="hover:bg-slate-700/50 transition-colors">
                                        <td className="p-4">
                                            <button
                                                onClick={() => toggleExpand(student.id)}
                                                className="text-slate-400 hover:text-white transition-colors"
                                            >
                                                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                            </button>
                                        </td>
                                        <td className="p-4 font-medium text-white">{student.name}</td>
                                        <td className="p-4 capitalize">{student.planType}</td>
                                        <td className="p-4 capitalize">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${student.athleteType === 'athlete'
                                                ? 'bg-orange-500/10 text-orange-400'
                                                : 'bg-blue-500/10 text-blue-400'
                                                }`}>
                                                {student.athleteType}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${isOverdue
                                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                }`}>
                                                {isOverdue ? <AlertCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                                                {isOverdue ? 'Pendente' : 'Em dia'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm">
                                            {student.lastPaymentDate
                                                ? format(parseISO(student.lastPaymentDate), "d 'de' MMMM", { locale: ptBR })
                                                : 'N/A'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => onEdit(student)}
                                                    className="p-2 hover:bg-slate-600 rounded-lg text-slate-400 hover:text-white transition-colors"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`Tem certeza que deseja remover ${student.name}?`)) {
                                                            deleteStudent(student.id);
                                                        }
                                                    }}
                                                    className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Expanded Row */}
                                    {isExpanded && (
                                        <tr className="bg-slate-750">
                                            <td colSpan={7} className="p-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Contact Information */}
                                                    <div className="space-y-3">
                                                        <h4 className="text-sm font-semibold text-slate-400 uppercase mb-3">Contato</h4>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <User className="w-4 h-4 text-slate-500" />
                                                            <span className="text-slate-400">Usuário:</span>
                                                            <span className="text-white">{student.username}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <span className="text-slate-400">Email:</span>
                                                            <span className="text-white">{student.email}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <span className="text-slate-400">Telefone:</span>
                                                            <span className="text-white">{student.phone}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Calendar className="w-4 h-4 text-slate-500" />
                                                            <span className="text-slate-400">Idade:</span>
                                                            <span className="text-white">{calculateAge(student.birthDate)} anos</span>
                                                            <span className="text-slate-500 text-xs">
                                                                ({format(parseISO(student.birthDate), "dd/MM/yyyy")})
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Physical & Training Info */}
                                                    <div className="space-y-3">
                                                        <h4 className="text-sm font-semibold text-slate-400 uppercase mb-3">Dados Físicos & Treino</h4>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Ruler className="w-4 h-4 text-slate-500" />
                                                            <span className="text-slate-400">Altura:</span>
                                                            <span className="text-white">{student.height} cm</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Weight className="w-4 h-4 text-slate-500" />
                                                            <span className="text-slate-400">Peso:</span>
                                                            <span className="text-white">{student.weight} kg</span>
                                                        </div>
                                                        <div className="flex items-start gap-2 text-sm">
                                                            <Target className="w-4 h-4 text-slate-500 mt-0.5" />
                                                            <div>
                                                                <span className="text-slate-400">Objetivo:</span>
                                                                <p className="text-white mt-1">{student.goal}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StudentList;
