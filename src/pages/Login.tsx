import { useState } from 'react';
import { useBoxing } from '../context/BoxingContext';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';

const Login = () => {
    const { login, currentUser } = useBoxing();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const success = login(username, password);

        if (!success) {
            setError('Usuário ou senha incorretos');
            return;
        }

        // Navigate immediately after successful login
        // The login function updates currentUser, but we need to check the role after state update
        setTimeout(() => {
            if (currentUser) {
                navigate(currentUser.role === 'professor' ? '/professor' : '/student');
            }
        }, 100);
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-700">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">Boxe School</h1>
                    <p className="text-slate-400">Sistema de Gerenciamento de Treinos</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Usuário</label>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Digite seu usuário"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Senha</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Digite sua senha"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-105 font-semibold"
                    >
                        <LogIn className="w-5 h-5" />
                        Entrar
                    </button>
                </form>

                <div className="border-t border-slate-700 pt-6 space-y-3">
                    <p className="text-center text-slate-400 text-sm mb-4">Não tem uma conta?</p>

                    <Link
                        to="/register/student"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-105 font-semibold"
                    >
                        <UserPlus className="w-5 h-5" />
                        Cadastrar-se
                    </Link>

                    {/* Hidden professor registration - accessible via /register/professor/secret */}
                </div>
            </div>
        </div>
    );
};

export default Login;
