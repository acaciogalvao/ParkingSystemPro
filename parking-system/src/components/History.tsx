import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  Car, 
  Bike, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw,
  Calendar,
  XCircle
} from "lucide-react";

interface HistoryEntry {
  id: string;
  type: 'entry' | 'exit' | 'update' | 'reservation_cancelled' | 'reservation_created' | 'reservation_payment_confirmed';
  plate: string;
  spot: string;
  time: string;
  timestamp: string;
}

export function History() {
  const [historyData, setHistoryData] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || '/api';

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${backendUrl}/history`);
      if (!response.ok) {
        throw new Error('Erro ao buscar histórico');
      }
      
      const result = await response.json();
      setHistoryData(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [backendUrl]);

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'entry':
        return <ArrowUpRight className="w-4 h-4 text-green-600" />;
      case 'exit':
        return <ArrowDownLeft className="w-4 h-4 text-red-600" />;
      case 'update':
        return <RefreshCw className="w-4 h-4 text-blue-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getOperationBadge = (type: string) => {
    switch (type) {
      case 'entry':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Entrada</Badge>;
      case 'exit':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Saída</Badge>;
      case 'update':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Atualização</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const getVehicleIcon = (spot: string) => {
    if (spot.startsWith('M-')) {
      return <Bike className="w-4 h-4 text-green-600" />;
    }
    return <Car className="w-4 h-4 text-blue-600" />;
  };

  if (loading) {
    return (
      <div className="px-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Histórico de Operações
            </CardTitle>
            <CardDescription>Carregando histórico...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Histórico de Operações
            </CardTitle>
            <CardDescription>Erro ao carregar histórico</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchHistory} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar Novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5" />
                Histórico de Operações
              </CardTitle>
              <CardDescription>
                Últimas {historyData.length} operações realizadas
              </CardDescription>
            </div>
            <Button onClick={fetchHistory} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {historyData.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma operação encontrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyData.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border-l-4 border-gray-300 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      {getOperationIcon(entry.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm">{entry.plate}</p>
                        {getOperationBadge(entry.type)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        {getVehicleIcon(entry.spot)}
                        <span>Vaga {entry.spot}</span>
                        <span>•</span>
                        <span>{entry.time}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">
                      {new Date(entry.timestamp).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}