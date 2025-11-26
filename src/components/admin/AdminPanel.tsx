import React, { useState, useEffect } from 'react';
import { signalService } from '../../services/signalService';
import { systemService } from '../../services/systemService';
import { supabase } from '../../services/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Trash2, Plus, LogOut, Power, Loader2 } from 'lucide-react';

export const AdminPanel: React.FC = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [signals, setSignals] = useState<any[]>([]);
    const [systemEnabled, setSystemEnabled] = useState(true);
    const [loadingSystem, setLoadingSystem] = useState(false);
    const [newSignal, setNewSignal] = useState({
        pair: 'BTC/USDT',
        type: 'buy',
        scheduled_time: '',
        timeframe: 1
    });

    useEffect(() => {
        const savedAuth = localStorage.getItem('admin_auth');
        if (savedAuth === 'true') {
            setIsLoggedIn(true);
            fetchSignals();
            fetchSystemStatus();

            // Subscribe to realtime changes - sinais
            const signalsChannel = supabase
                .channel('admin_signals_changes')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'admin_signals'
                }, () => {
                    fetchSignals();
                })
                .subscribe();

            // Subscribe to realtime changes - system settings
            const unsubscribeSystem = systemService.subscribeToSystemSettings((enabled) => {
                setSystemEnabled(enabled);
            });

            return () => {
                supabase.removeChannel(signalsChannel);
                unsubscribeSystem();
            };
        }
    }, []);

    const fetchSystemStatus = async () => {
        const enabled = await systemService.isSystemEnabled();
        setSystemEnabled(enabled);
    };

    const handleToggleSystem = async () => {
        setLoadingSystem(true);
        const newStatus = !systemEnabled;
        const success = await systemService.setSystemEnabled(newStatus);
        if (success) {
            setSystemEnabled(newStatus);
        } else {
            alert('Erro ao atualizar status do sistema');
        }
        setLoadingSystem(false);
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (email === 'admin@gmail.com' && password === 'Matematica123*') {
            setIsLoggedIn(true);
            localStorage.setItem('admin_auth', 'true');
            fetchSignals();
        } else {
            alert('Credenciais inválidas');
        }
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        localStorage.removeItem('admin_auth');
    };

    const fetchSignals = async () => {
        const data = await signalService.getAdminSignals();
        setSignals(data);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSignal.scheduled_time) {
            alert('Selecione um horário');
            return;
        }

        // Converter para ISO string com timezone correto
        const date = new Date(newSignal.scheduled_time);
        date.setSeconds(0);
        date.setMilliseconds(0);
        const isoString = date.toISOString();

        const result = await signalService.createAdminSignal({
            ...newSignal,
            scheduled_time: isoString,
            type: newSignal.type as 'buy' | 'sell'
        });

        if (result) {
            alert('Sinal agendado com sucesso!');
            fetchSignals();
            setNewSignal({ ...newSignal, scheduled_time: '' });
        } else {
            alert('Erro ao agendar sinal');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir este sinal?')) {
            await signalService.deleteAdminSignal(id);
            fetchSignals();
        }
    };

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black p-4">
                <Card className="w-full max-w-md p-8 bg-bg-card border-white/10">
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">Admin Access</h2>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-2 rounded bg-white/5 border border-white/10 text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-2 rounded bg-white/5 border border-white/10 text-white"
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full">Login</Button>
                    </form>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black p-6 text-white">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-primary">Painel de Controle de Sinais</h1>
                    <Button variant="secondary" onClick={handleLogout} className="flex items-center gap-2">
                        <LogOut size={16} /> Sair
                    </Button>
                </div>

                {/* Card de Controle do Sistema */}
                <Card className={`p-6 border-2 transition-all ${systemEnabled
                    ? 'bg-gradient-to-r from-green-500/10 to-green-500/5 border-green-500/30'
                    : 'bg-gradient-to-r from-red-500/10 to-red-500/5 border-red-500/30'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${systemEnabled ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                                <Power size={28} className={systemEnabled ? 'text-green-500' : 'text-red-500'} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Sistema de Sinais</h2>
                                <p className="text-sm text-gray-400">
                                    {systemEnabled
                                        ? 'Ativo - Gerando sinais técnicos + sinais admin'
                                        : 'Desativado - Apenas sinais do admin'
                                    }
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleToggleSystem}
                            disabled={loadingSystem}
                            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 focus:outline-none ${systemEnabled ? 'bg-green-500' : 'bg-red-500'
                                } ${loadingSystem ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            {loadingSystem ? (
                                <Loader2 className="w-5 h-5 text-white animate-spin mx-auto" />
                            ) : (
                                <span
                                    className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${systemEnabled ? 'translate-x-9' : 'translate-x-1'
                                        }`}
                                />
                            )}
                        </button>
                    </div>

                    <div className={`mt-4 p-3 rounded-lg ${systemEnabled ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        <p className="text-xs text-gray-300">
                            {systemEnabled ? (
                                <>
                                    <span className="font-bold text-green-400">✓ Sistema Completo:</span> Todos os usuários podem gerar sinais usando as estratégias técnicas (Protocolo V4, Momentum Alpha, etc.) além dos sinais agendados pelo admin.
                                </>
                            ) : (
                                <>
                                    <span className="font-bold text-red-400">⚠ Modo Admin:</span> Apenas os sinais agendados neste painel serão enviados aos usuários. As estratégias técnicas estão desativadas.
                                </>
                            )}
                        </p>
                    </div>
                </Card>

                <Card className="p-6 bg-bg-card border-white/10">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Plus className="text-primary" size={20} />
                        Agendar Novo Sinal
                    </h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Par</label>
                            <select
                                value={newSignal.pair}
                                onChange={(e) => setNewSignal({ ...newSignal, pair: e.target.value })}
                                className="w-full p-2 rounded bg-white/5 border border-white/10 text-white"
                            >
                                <option value="BTC/USDT" className="bg-gray-900 text-white">BTC/USDT</option>
                                <option value="ETH/USDT" className="bg-gray-900 text-white">ETH/USDT</option>
                                <option value="BNB/USDT" className="bg-gray-900 text-white">BNB/USDT</option>
                                <option value="ADA/USDT" className="bg-gray-900 text-white">ADA/USDT</option>
                                <option value="SOL/USDT" className="bg-gray-900 text-white">SOL/USDT</option>
                                <option value="XRP/USDT" className="bg-gray-900 text-white">XRP/USDT</option>
                                <option value="DOT/USDT" className="bg-gray-900 text-white">DOT/USDT</option>
                                <option value="MATIC/USDT" className="bg-gray-900 text-white">MATIC/USDT</option>
                                <option value="LINK/USDT" className="bg-gray-900 text-white">LINK/USDT</option>
                                <option value="AVAX/USDT" className="bg-gray-900 text-white">AVAX/USDT</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Tipo</label>
                            <select
                                value={newSignal.type}
                                onChange={(e) => setNewSignal({ ...newSignal, type: e.target.value })}
                                className="w-full p-2 rounded bg-white/5 border border-white/10 text-white"
                            >
                                <option value="buy" className="bg-gray-900 text-white">Compra (Call)</option>
                                <option value="sell" className="bg-gray-900 text-white">Venda (Put)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Horário</label>
                            <input
                                type="datetime-local"
                                value={newSignal.scheduled_time}
                                onChange={(e) => setNewSignal({ ...newSignal, scheduled_time: e.target.value })}
                                className="w-full p-2 rounded bg-white/5 border border-white/10 text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Timeframe (min)</label>
                            <select
                                value={newSignal.timeframe}
                                onChange={(e) => setNewSignal({ ...newSignal, timeframe: Number(e.target.value) })}
                                className="w-full p-2 rounded bg-white/5 border border-white/10 text-white"
                            >
                                <option value={1} className="bg-gray-900 text-white">1 Minuto</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <Button type="submit" className="w-full">Agendar Sinal</Button>
                        </div>
                    </form>
                </Card>

                <Card className="p-6 bg-bg-card border-white/10">
                    <h2 className="text-xl font-bold mb-4">Sinais Agendados</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/10 text-gray-400">
                                    <th className="p-3">Horário</th>
                                    <th className="p-3">Par</th>
                                    <th className="p-3">Tipo</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {signals.map((signal) => (
                                    <tr key={signal.id} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="p-3">
                                            {new Date(signal.scheduled_time).toLocaleString('pt-BR')}
                                        </td>
                                        <td className="p-3 font-bold">{signal.pair}</td>
                                        <td className={`p-3 font-bold ${signal.type === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                                            {signal.type === 'buy' ? 'COMPRA' : 'VENDA'}
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-xs ${signal.status === 'executed' ? 'bg-green-500/20 text-green-500' :
                                                signal.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                                                    signal.status === 'expired' ? 'bg-gray-500/20 text-gray-400' :
                                                        'bg-red-500/20 text-red-500'
                                                }`}>
                                                {signal.status === 'executed' ? 'EXECUTADO' :
                                                    signal.status === 'pending' ? 'PENDENTE' :
                                                        signal.status === 'expired' ? 'EXPIRADO' :
                                                            signal.status}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <button
                                                onClick={() => handleDelete(signal.id)}
                                                className="text-red-500 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {signals.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500">
                                            Nenhum sinal agendado
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};
