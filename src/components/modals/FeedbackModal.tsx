import { useState } from 'react';
import { MessageSquarePlus, Send } from 'lucide-react';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const FeedbackModal = ({ isOpen, onClose }: FeedbackModalProps) => {
    const [feedbackText, setFeedbackText] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-2xl w-full max-w-md border border-slate-700 p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <MessageSquarePlus className="w-6 h-6 text-indigo-400" />
                    Sugestões e Feedback
                </h2>
                <p className="text-slate-400 text-sm mb-4">
                    Envie suas sugestões para melhorar as aulas ou deixe seu feedback sobre os treinos.
                </p>
                <textarea
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none h-32 mb-4 resize-none"
                    placeholder="Digite sua mensagem aqui..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                />
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => {
                            if (feedbackText.trim()) {
                                alert('Feedback enviado com sucesso! Obrigado.');
                                setFeedbackText('');
                                onClose();
                            }
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Send className="w-4 h-4" />
                        Enviar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FeedbackModal;
