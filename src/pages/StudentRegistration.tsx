import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useBoxing } from '../context/BoxingContext';
import { UserPlus, ArrowLeft } from 'lucide-react';
import type { PlanType } from '../types';

const StudentRegistration = () => {
    const navigate = useNavigate();
    const { registerStudent } = useBoxing();
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        name: '',
        email: '',
        phone: '',
        birthDate: '',
        height: '',
        weight: '',
        goal: '',
        paymentDay: '1',
        planType: 'monthly' as PlanType,
        athleteType: 'functional' as 'athlete' | 'functional',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('As senhas não coincidem');
            return;
        }

        if (formData.password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres');
            return;
        }

        const success = registerStudent(
            {
                username: formData.username,
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                birthDate: formData.birthDate,
                height: parseFloat(formData.height),
                weight: parseFloat(formData.weight),
                goal: formData.goal,
                paymentDay: parseInt(formData.paymentDay),
                planType: formData.planType,
                athleteType: formData.athleteType,
            },
            formData.password
        );

        if (!success) {
            setError('Nome de usuário já existe. Escolha outro.');
            return;
        }

        alert('Cadastro realizado com sucesso! Faça login para continuar.');
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4">
            <div className="max-w-2xl mx-auto">
                <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Voltar para o login
                </Link>

                <div className="bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700">
                    <div className="flex items-center gap-3 mb-6">
                        <UserPlus className="w-8 h-8 text-emerald-400" />
                        <h1 className="text-3xl font-bold">Cadastro de Aluno</h1>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg mb-6">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Login Credentials */}
                        <div className="space-y-4 pb-6 border-b border-slate-700">
                            <h3 className="text-lg font-semibold text-emerald-400">Dados de Acesso</h3>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Nome de Usuário</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Senha</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Confirmar Senha</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        value={formData.confirmPassword}
                                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Personal Information */}
                        <div className="space-y-4 pb-6 border-b border-slate-700">
                            <h3 className="text-lg font-semibold text-emerald-400">Dados Pessoais</h3>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Nome Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Telefone</label>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Data de Nascimento</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.birthDate}
                                    onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Altura (cm)</label>
                                    <input
                                        type="number"
                                        required
                                        min="100"
                                        max="250"
                                        value={formData.height}
                                        onChange={e => setFormData({ ...formData, height: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Peso (kg)</label>
                                    <input
                                        type="number"
                                        required
                                        min="30"
                                        max="200"
                                        step="0.1"
                                        value={formData.weight}
                                        onChange={e => setFormData({ ...formData, weight: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Training Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-emerald-400">Informações de Treino</h3>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Objetivo no Boxe</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={formData.goal}
                                    onChange={e => setFormData({ ...formData, goal: e.target.value })}
                                    placeholder="Descreva seu objetivo ao treinar boxe..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Tipo de Plano</label>
                                    <select
                                        value={formData.planType}
                                        onChange={e => setFormData({ ...formData, planType: e.target.value as PlanType })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                    >
                                        <option value="daily">Diária</option>
                                        <option value="monthly">Mensal</option>
                                        <option value="annual">Anual</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Tipo de Treino</label>
                                    <select
                                        value={formData.athleteType}
                                        onChange={e => setFormData({ ...formData, athleteType: e.target.value as any })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                    >
                                        <option value="functional">Funcional</option>
                                        <option value="athlete">Atleta</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Dia de Vencimento da Mensalidade</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    max="31"
                                    value={formData.paymentDay}
                                    onChange={e => setFormData({ ...formData, paymentDay: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button
                                type="button"
                                onClick={() => navigate('/')}
                                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                            >
                                Cadastrar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default StudentRegistration;
