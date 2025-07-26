import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Clock, 
  Car, 
  Bike, 
  Filter,
  Calendar,
  Download,
  RefreshCw,
  User,
  MapPin,
  DollarSign,
  TrendingUp,
  Loader2
} from "lucide-react";
import { formatBrazilianCurrency } from "@/utils/formatters";

interface VehicleTimeData {
  id: string;
  plate: string;
  type: 'car' | 'motorcycle';
  model: string;
  color: string;
  ownerName: string;
  ownerPhone: string;
  spot: string;
  status: 'parked' | 'exited';
  entryTime: string;
  exitTime: string | null;
  entryTimestamp: string;
  exitTimestamp: string | null;
  duration: {
    hours: number;
    minutes: number;
    totalMinutes: number;
  } | null;
  durationFormatted: string | null;
  fee: number;
  estimatedFee: number | null;
  formattedFee: string;
  paymentMethod: string;
}

interface ReportSummary {
  totalVehicles: number;
  parkedVehicles: number;
  exitedVehicles: number;
  totalRevenue: number;
  formattedRevenue: string;
  period: {
    start: string;
    end: string;
  };
}

interface VehicleTimesReportData {
  vehicles: VehicleTimeData[];
  summary: ReportSummary;
  pagination: {
    total: number;
    limit: number;
    hasMore: boolean;
  };
}

export function VehicleTimesReport() {
  const [reportData, setReportData] = useState<VehicleTimesReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  
  // Filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    vehicleType: 'all',
    status: 'all',
    limit: 50
  });

  const backendUrl = import.meta.env.VITE_BACKEND_URL || '/api';

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.vehicleType !== 'all') params.append('vehicleType', filters.vehicleType);
      if (filters.status !== 'all') params.append('status', filters.status);
      params.append('limit', filters.limit.toString());
      
      const response = await fetch(`${backendUrl}/reports/vehicle-times?${params}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar relatório de horários');
      }
      
      const result = await response.json();
      if (result.success) {
        setReportData(result.data);
      } else {
        throw new Error(result.detail || 'Erro desconhecido');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    fetchReport();
  };

  const toggleCardExpansion = (vehicleId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(vehicleId)) {
        newSet.delete(vehicleId);
      } else {
        newSet.add(vehicleId);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'parked':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Estacionado</Badge>;
      case 'exited':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Saiu</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const getVehicleIcon = (type: string) => {
    return type === 'car' ? 
      <Car className="w-4 h-4 text-blue-600" /> : 
      <Bike className="w-4 h-4 text-green-600" />;
  };

  if (loading) {
    return (
      <div className="px-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Relatório de Horários
            </CardTitle>
            <CardDescription>Carregando relatório...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
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
              Relatório de Horários
            </CardTitle>
            <CardDescription>Erro ao carregar relatório</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchReport} variant="outline">
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
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold">Relatório de Horários</h2>
        <p className="text-sm text-gray-600">
          Horários detalhados de entrada e saída dos veículos
        </p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 text-sm flex items-center">
          <Filter className="w-4 h-4 mr-2" />
          Filtros
        </h3>
        <div className="space-y-3">
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="startDate" className="text-xs">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="endDate" className="text-xs">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="h-10 text-sm"
              />
            </div>
          </div>

          {/* Type and Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipo de Veículo</Label>
              <Select value={filters.vehicleType} onValueChange={(value) => handleFilterChange('vehicleType', value)}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="car">Carros</SelectItem>
                  <SelectItem value="motorcycle">Motos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="parked">Estacionados</SelectItem>
                  <SelectItem value="exited">Saíram</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={applyFilters} className="w-full h-10 text-sm">
            <Filter className="w-4 h-4 mr-2" />
            Aplicar Filtros
          </Button>
        </div>
      </Card>

      {/* Summary */}
      {reportData?.summary && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total de Veículos</p>
                <p className="text-lg font-bold">{reportData.summary.totalVehicles}</p>
                <p className="text-xs text-gray-500">{reportData.summary.period.start} - {reportData.summary.period.end}</p>
              </div>
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Receita Total</p>
                <p className="text-lg font-bold">{reportData.summary.formattedRevenue}</p>
                <p className="text-xs text-gray-500">{reportData.summary.exitedVehicles} saídas</p>
              </div>
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Estacionados</p>
                <p className="text-lg font-bold">{reportData.summary.parkedVehicles}</p>
                <p className="text-xs text-gray-500">atualmente</p>
              </div>
              <MapPin className="h-5 w-5 text-orange-600" />
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Saíram</p>
                <p className="text-lg font-bold">{reportData.summary.exitedVehicles}</p>
                <p className="text-xs text-gray-500">no período</p>
              </div>
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
          </Card>
        </div>
      )}

      {/* Vehicle List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Detalhes dos Veículos</CardTitle>
              <CardDescription className="text-sm">
                {reportData?.vehicles.length || 0} veículo(s) encontrado(s)
              </CardDescription>
            </div>
            <Button onClick={fetchReport} variant="outline" size="sm">
              <RefreshCw className="w-3 h-3 mr-1" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!reportData?.vehicles.length ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum veículo encontrado no período</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reportData.vehicles.map((vehicle) => {
                const isExpanded = expandedCards.has(vehicle.id);
                return (
                  <div
                    key={vehicle.id}
                    className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => toggleCardExpansion(vehicle.id)}
                  >
                    {/* Basic Info - Always Visible */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                          {getVehicleIcon(vehicle.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm">{vehicle.plate}</p>
                            {getStatusBadge(vehicle.status)}
                          </div>
                          <p className="text-xs text-gray-600">{vehicle.model} • {vehicle.color}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <MapPin className="w-3 h-3" />
                            <span>Vaga {vehicle.spot}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600">Entrada</p>
                        <p className="text-sm font-semibold">{vehicle.entryTime}</p>
                        {vehicle.durationFormatted && (
                          <p className="text-xs text-blue-600">{vehicle.durationFormatted}</p>
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Proprietário</p>
                            <p className="text-sm font-medium">{vehicle.ownerName}</p>
                            {vehicle.ownerPhone && (
                              <p className="text-xs text-gray-500">{vehicle.ownerPhone}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Valor</p>
                            <p className="text-sm font-semibold text-green-600">{vehicle.formattedFee}</p>
                            <p className="text-xs text-gray-500">{vehicle.paymentMethod}</p>
                          </div>
                        </div>

                        {vehicle.exitTime && (
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Horário de Saída</p>
                            <p className="text-sm font-medium">{vehicle.exitTime}</p>
                          </div>
                        )}

                        {vehicle.duration && (
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Tempo de Permanência</p>
                            <p className="text-sm font-medium">
                              {vehicle.duration.hours}h {vehicle.duration.minutes}m 
                              <span className="text-xs text-gray-500 ml-1">
                                ({vehicle.duration.totalMinutes} min)
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Actions */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 text-sm">Exportar Relatório de Horários</h3>
        <div className="space-y-2">
          <Button variant="outline" className="w-full h-10 justify-start">
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
          <Button variant="outline" className="w-full h-10 justify-start">
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
        </div>
      </Card>
    </div>
  );
}