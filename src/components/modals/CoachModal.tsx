import { X, MessageCircle, Instagram, Facebook, GraduationCap, Building2 } from 'lucide-react';
import type { Professor } from '../../types';

interface CoachModalProps {
    isOpen: boolean;
    onClose: () => void;
    professors: Professor[];
    mode?: 'school' | 'professor';
    title?: string;
}

const CoachModal = ({ isOpen, onClose, professors, mode = 'professor', title }: CoachModalProps) => {
    if (!isOpen) return null;

    const modalTitle = title || (mode === 'school' ? 'Conheça a Boxe School' : 'Conheça seu Treinador');
    const filteredProfessors = mode === 'school'
        ? professors.filter(p => p.name.toLowerCase().includes('dias') || p.name.toLowerCase().includes('school'))
        : professors.filter(p => !p.name.toLowerCase().includes('dias') && !p.name.toLowerCase().includes('school'));

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <div className="bg-slate-900 rounded-2xl w-full max-w-lg border border-slate-700 shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        {mode === 'school' ? (
                            <Building2 className="w-6 h-6 text-indigo-400" />
                        ) : (
                            <GraduationCap className="w-6 h-6 text-indigo-400" />
                        )}
                        <h2 className="text-xl font-bold text-white">{modalTitle}</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[70vh]">
                    {filteredProfessors.length === 0 ? (
                        <p className="text-slate-500 text-center py-8 italic">
                            {mode === 'school' ? 'Informações da escola não encontradas.' : 'Nenhum professor cadastrado.'}
                        </p>
                    ) : (
                        filteredProfessors.map(prof => (
                            <div key={prof.id} className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-2">{prof.name}</h3>
                                    {prof.bio && (
                                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                                            {prof.bio}
                                        </p>
                                    )}
                                </div>
                                {(prof.whatsapp || prof.instagram || prof.facebook) && (
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-400 mb-3">Contatos e Redes Sociais</h4>
                                        <div className="flex gap-4">
                                            {prof.whatsapp && (
                                                <a href={`https://wa.me/${prof.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg transition-colors group">
                                                    <MessageCircle className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
                                                </a>
                                            )}
                                            {prof.instagram && (
                                                <a href={`https://instagram.com/${prof.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 rounded-lg transition-colors group">
                                                    <Instagram className="w-6 h-6 text-pink-400 group-hover:scale-110 transition-transform" />
                                                </a>
                                            )}
                                            {prof.facebook && (
                                                <a href={prof.facebook} target="_blank" rel="noopener noreferrer" className="p-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg transition-colors group">
                                                    <Facebook className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {prof.portfolioUrl && (
                                    <div className="pt-4 mt-4 border-t border-slate-800">
                                        <a
                                            href={prof.portfolioUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-medium"
                                        >
                                            <GraduationCap className="w-5 h-5" />
                                            {mode === 'school' ? 'Ver Portfólio da Escola' : 'Ver Portfólio do Treinador'}
                                        </a>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default CoachModal;
