import React, { useState } from 'react';
import { Mail, Loader2, Cpu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { TermsDialog } from '../auth/TermsDialog';
import { PrivacyDialog } from '../auth/PrivacyDialog';
import { useTradeStore } from '../../hooks/useTradeStore'; // Import useTradeStore

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const { signIn, session } = useAuth();
  const { setView } = useTradeStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await signIn(email);
      if (response.success) {
        setView('learn');
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (session) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-bg-body relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Logo and Title */}
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 backdrop-blur-sm border border-primary/20 animate-pulse shadow-[0_0_30px_rgba(97,248,0,0.15)]">
            <Cpu className="w-10 h-10 text-primary" />
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-white">
              QUANTUM<span className="text-primary">TRADE</span>
            </h1>
            <p className="text-gray-400">
              Plataforma inteligente de análise e sinais para trading
            </p>
          </div>
        </div>

        {/* Login Form */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl" />
          <div className="relative bg-bg-card/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl text-sm bg-red-500/10 border border-red-500/20 text-red-500 animate-fade-in">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full py-3 text-lg font-semibold shadow-[0_0_20px_rgba(97,248,0,0.2)] hover:shadow-[0_0_30px_rgba(97,248,0,0.3)]"
                loading={loading}
                disabled={!email || loading}
              >
                {loading ? 'Entrando...' : 'Entrar na Plataforma'}
              </Button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500">
          Ao entrar, você concorda com nossos{' '}
          <button
            onClick={() => setShowTerms(true)}
            className="text-primary hover:text-primary-hover transition-colors"
          >
            Termos de Uso
          </button>{' '}
          e{' '}
          <button
            onClick={() => setShowPrivacy(true)}
            className="text-primary hover:text-primary-hover transition-colors"
          >
            Política de Privacidade
          </button>
        </p>
      </div>

      <TermsDialog isOpen={showTerms} onClose={() => setShowTerms(false)} />
      <PrivacyDialog isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </div>
  );
};
