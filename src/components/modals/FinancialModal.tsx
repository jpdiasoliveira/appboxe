import { useState } from 'react';
import { useBoxing } from '../../context/BoxingContext';
import { X, DollarSign } from 'lucide-react';
import type { PlanType, PricingConfig } from '../../types';

interface FinancialModalProps {
    onClose: () => void;
}

const FinancialModal = ({ onClose }: FinancialModalProps) => {
    const { students, pricingConfig, updatePricingConfig } = useBoxing();
    const [activeTab, setActiveTab] = useState<'summary' | 'config'>('summary');
    const [config, setConfig] = useState(pricingConfig);

    const totalRevenue = students.reduce((acc, student) => {
        if (!student.active) return acc;
        if (student.monthlyFee && student.monthlyFee > 0) return acc + student.monthlyFee;

        // Fallback to configured price
        const plan = (student.planType || 'monthly') as keyof PricingConfig;
        const type = (student.athleteType || 'functional') as keyof PricingConfig['monthly'];

        const price = pricingConfig[plan]?.[type] || 0;
        return acc + price;
    }, 0);

    const handleSaveConfig = () => {
        updatePricingConfig(config);
        alert('Preços atualizados!');
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <div className="bg-slate-800 rounded-2xl w-full max-w-2xl border border-slate-700 shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white">Gestão Financeira</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex border-b border-slate-700">
                    <button
                        className={`flex-1 p-4 text-sm font-medium transition-colors ${activeTab === 'summary' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-white'}`}
                        onClick={() => setActiveTab('summary')}
                    >
                        Resumo
                    </button>
                    <button
                        className={`flex-1 p-4 text-sm font-medium transition-colors ${activeTab === 'config' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-white'}`}
                        onClick={() => setActiveTab('config')}
                    >
                        Configuração de Preços
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === 'summary' ? (
                        <div className="text-center py-8">
                            <div className="inline-flex p-4 bg-emerald-500/20 rounded-full mb-4">
                                <DollarSign className="w-12 h-12 text-emerald-400" />
                            </div>
                            <h3 className="text-slate-400 mb-2">Receita Mensal Estimada</h3>
                            <p className="text-4xl font-bold text-white">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
                            </p>
                            <p className="text-sm text-slate-500 mt-4 max-w-md mx-auto mb-8">
                                * Cálculo baseado nas mensalidades personalizadas dos alunos ou nos valores configurados para cada plano.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                                {(['monthly', 'semiannual', 'annual', 'daily'] as PlanType[]).map(plan => {
                                    const planRevenue = students.reduce((acc, student) => {
                                        if (!student.active || student.planType !== plan) return acc;
                                        if (student.monthlyFee && student.monthlyFee > 0) return acc + student.monthlyFee;

                                        const p = plan as keyof PricingConfig;
                                        const t = (student.athleteType || 'functional') as keyof PricingConfig['monthly'];
                                        const price = pricingConfig[p]?.[t] || 0;
                                        return acc + price;
                                    }, 0);

                                    if (planRevenue === 0) return null;

                                    return (
                                        <div key={plan} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                                            <h4 className="text-slate-400 text-sm capitalize mb-1">
                                                {plan === 'semiannual' ? 'Semestral' : plan === 'monthly' ? 'Mensal' : plan === 'annual' ? 'Anual' : 'Diária'}
                                            </h4>
                                            <p className="text-xl font-bold text-white">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(planRevenue)}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                            {Object.entries(config).map(([plan, types]) => (
                                <div key={plan} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                                    <h3 className="text-white font-medium capitalize mb-3 border-b border-slate-700 pb-2">
                                        Plano {plan === 'semiannual' ? 'Semestral' : plan === 'monthly' ? 'Mensal' : plan === 'annual' ? 'Anual' : 'Diária'}
                                    </h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        {Object.entries(types).map(([type, price]) => (
                                            <div key={type}>
                                                <label className="block text-xs text-slate-400 mb-1 capitalize">
                                                    {type === 'private' ? 'Particular' : type}
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">R$</span>
                                                    <input
                                                        type="number"
                                                        value={price as number}
                                                        onChange={e => setConfig({
                                                            ...config,
                                                            [plan as keyof PricingConfig]: { ...config[plan as keyof PricingConfig], [type]: parseFloat(e.target.value) || 0 }
                                                        })}
                                                        className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 pl-8 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <div className="flex justify-end pt-4">
                                <button
                                    onClick={handleSaveConfig}
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    Salvar Preços
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FinancialModal;
