import { AlertCircle } from 'lucide-react';

interface PaymentAlertModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PaymentAlertModal = ({ isOpen, onClose }: PaymentAlertModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[150]">
            <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-red-500/50 shadow-2xl p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Atenção!</h2>
                <h3 className="text-xl font-semibold text-red-400 mb-4">Mensalidade Vencida</h3>
                <p className="text-slate-300 mb-8">
                    Sua mensalidade consta como vencida em nosso sistema. Por favor, entre em contato com a administração para regularizar sua situação e continuar treinando.
                </p>
                <button
                    onClick={onClose}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors"
                >
                    Entendi, vou verificar
                </button>
            </div>
        </div>
    );
};

export default PaymentAlertModal;
