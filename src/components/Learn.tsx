import React from 'react';
import { Card } from './ui/Card';
import { Play, BookOpen, Info } from 'lucide-react';

export const Learn: React.FC = () => {

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <BookOpen className="text-primary" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Tutorial da Plataforma</h2>
              <p className="text-sm text-gray-400">Aprenda a usar todas as funcionalidades</p>
            </div>
          </div>

          <div className="aspect-video rounded-lg overflow-hidden bg-black/50 border border-white/5">
            <iframe
              className="w-full h-full"
              src="https://www.youtube.com/embed/szKsU-LQ_w4"
              title="Tutorial ZENITHATLAS"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Instale o App</h2>
            <p className="text-gray-400 mt-1">
              Acesse o ZENITHATLAS diretamente da sua tela inicial
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="text-center text-gray-400 py-4">
              <p>Acesse via navegador web em qualquer dispositivo</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-lg">
              <Play className="text-primary" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Como Começar</h3>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Configure suas preferências de trading
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Escolha o par de trading desejado
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Selecione o timeframe adequado
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Ative a automação e monitore os sinais
                </li>
              </ul>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-lg">
              <Info className="text-primary" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Dicas Importantes</h3>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Comece com valores pequenos
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Monitore os resultados regularmente
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Ajuste as configurações conforme necessário
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Mantenha um registro de suas operações
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

    </div>
  );
};
