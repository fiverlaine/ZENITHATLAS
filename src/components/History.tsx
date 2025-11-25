import React, { useState, useMemo } from 'react';
import { RecentSignals } from './dashboard/RecentSignals';
import { useTradeStore } from '../hooks/useTradeStore';
import { History as HistoryIcon, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

export const History: React.FC = () => {
  const { signals } = useTradeStore();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filtrar apenas sinais finalizados
  const completedSignals = useMemo(() => {
    return signals.filter(s => s && s.result && s.id);
  }, [signals]);

  // Calcular paginação
  const totalPages = Math.ceil(completedSignals.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSignals = completedSignals.slice(startIndex, endIndex);

  // Funções de navegação
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  // Gerar array de páginas para exibir
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, start + maxVisiblePages - 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-3 rounded-xl">
            <HistoryIcon className="text-primary" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Histórico</h1>
            <p className="text-gray-400">Todas as suas operações finalizadas</p>
          </div>
        </div>

        {/* Informações de paginação */}
        <div className="text-right">
          <p className="text-sm text-gray-400">
            Mostrando {startIndex + 1}-{Math.min(endIndex, completedSignals.length)} de {completedSignals.length}
          </p>
          <p className="text-xs text-gray-500">
            {totalPages} página{totalPages !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Histórico paginado */}
      <RecentSignals signals={currentSignals} maxItems={itemsPerPage} />

      {/* Controles de Paginação */}
      {totalPages > 1 && (
        <Card className="bg-bg-card/50 border-white/5">
          <div className="flex items-center justify-between">
            {/* Informações da página atual */}
            <div className="text-sm text-gray-400">
              Página {currentPage} de {totalPages}
            </div>

            {/* Controles de navegação */}
            <div className="flex items-center gap-2">
              {/* Primeira página */}
              <Button
                onClick={goToFirstPage}
                variant="secondary"
                className="p-2"
                disabled={currentPage === 1}
              >
                <ChevronsLeft size={16} />
              </Button>

              {/* Página anterior */}
              <Button
                onClick={goToPreviousPage}
                variant="secondary"
                className="p-2"
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </Button>

              {/* Números das páginas */}
              <div className="flex items-center gap-1">
                {getPageNumbers().map((page) => (
                  <Button
                    key={page}
                    onClick={() => goToPage(page)}
                    variant={currentPage === page ? 'primary' : 'secondary'}
                    className="w-10 h-10 text-sm"
                  >
                    {page}
                  </Button>
                ))}
              </div>

              {/* Próxima página */}
              <Button
                onClick={goToNextPage}
                variant="secondary"
                className="p-2"
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={16} />
              </Button>

              {/* Última página */}
              <Button
                onClick={goToLastPage}
                variant="secondary"
                className="p-2"
                disabled={currentPage === totalPages}
              >
                <ChevronsRight size={16} />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Estado vazio */}
      {completedSignals.length === 0 && (
        <Card className="bg-bg-card/50 border-white/5">
          <div className="text-center py-12">
            <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <HistoryIcon className="text-gray-400" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-400 mb-2">Nenhuma Operação Finalizada</h3>
            <p className="text-gray-500">
              Não há operações finalizadas no seu histórico.
              Inicie o sistema para começar a gerar operações.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

