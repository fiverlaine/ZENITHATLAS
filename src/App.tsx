import React, { useState, useEffect } from 'react';
import { SimpleHeader } from './components/layout/SimpleHeader';
import { BottomNav } from './components/layout/BottomNav';
import { Sidebar } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';
import { LoginForm } from './components/auth/LoginForm';
import { Dashboard } from './components/Dashboard';
import { Analytics } from './components/Analytics';
import { History } from './components/History';
import { Learn } from './components/Learn';
import { AdminPanel } from './components/admin/AdminPanel';
import { useTradeStore } from './hooks/useTradeStore';
import { useAuth } from './hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function App() {
  // Check for admin route
  const isAdminRoute = window.location.pathname === '/a1c909fe301e7082';

  const { session, loading: authLoading, initialized } = useAuth();
  const { loadPendingSignals, initializeSignals, subscribeRealtime } = useTradeStore();
  const [initError, setInitError] = useState<string | null>(null);
  const [showLearn, setShowLearn] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'analytics' | 'history'>('home');

  // Inicialização do app após autenticação
  useEffect(() => {
    let mounted = true;

    const initializeApp = async () => {
      if (!session) return;
      try {
        setInitError(null);
        // Carrega dados em background sem bloquear UI
        await Promise.all([
          initializeSignals(),
          loadPendingSignals()
        ]);
      } catch (error) {
        console.error('Error loading initial data:', error);
        if (mounted) {
          setInitError('Erro ao carregar dados iniciais. Tente recarregar a página.');
        }
      }
    };

    if (initialized && session) {
      initializeApp();
    }

    return () => {
      mounted = false;
    };
  }, [session, initialized, loadPendingSignals, initializeSignals]);

  // Supabase Realtime subscription para sinais
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const setupRealtime = async () => {
      if (!session) return;
      unsubscribe = await subscribeRealtime();
    };
    setupRealtime();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [session, subscribeRealtime]);

  // Listener para quando a aba volta a ficar ativa - recarrega dados silenciosamente
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && session) {
        console.log('App: Tab visible, syncing pending signals silently');
        loadPendingSignals().catch(console.error);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session, loadPendingSignals]);

  // Render Admin Panel if route matches
  if (isAdminRoute) {
    return <AdminPanel />;
  }

  // Loading states
  if (!initialized || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="animate-spin text-green-500 mx-auto mb-4" size={32} />
          <p className="text-gray-400">Iniciando...</p>
        </div>
      </div>
    );
  }

  // Login screen
  if (!session) {
    return <LoginForm />;
  }

  // Main app
  return (
    <div className="min-h-screen flex flex-col bg-bg-body text-white">
      <SimpleHeader onShowLearn={() => setShowLearn(!showLearn)} />

      {/* Desktop Sidebar */}
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      <main className="flex-1 overflow-hidden md:ml-64 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {initError ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-500">
              <p>{initError}</p>
            </div>
          ) : showLearn ? (
            <div className="space-y-6">
              <button
                onClick={() => setShowLearn(false)}
                className="text-green-500 hover:text-green-400 transition-colors flex items-center gap-2"
              >
                ← Voltar ao Dashboard
              </button>
              <Learn />
            </div>
          ) : (
            <>
              {currentView === 'home' && <Dashboard />}
              {currentView === 'analytics' && <Analytics />}
              {currentView === 'history' && <History />}
            </>
          )}
        </div>
      </main>

      {/* Bottom Navigation - apenas quando não está na tela Learn */}
      {!showLearn && (
        <BottomNav
          currentView={currentView}
          onViewChange={setCurrentView}
        />
      )}

      <Footer />
    </div>
  );
}
