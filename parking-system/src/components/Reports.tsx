import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { formatBrazilianCurrency, formatCurrencyBR } from "@/utils/formatters";
import { exportReport } from "@/utils/exportUtils";
import { 
  TrendingUp, 
  DollarSign, 
  Car, 
  Clock, 
  Download,
  Calendar,
  Loader2,
  BarChart3,
  List
} from "lucide-react";
import { useState, useEffect } from "react";
import { VehicleTimesReport } from "./VehicleTimesReport";

export function Reports() {
  const [activeTab, setActiveTab] = useState("statistics");
  const [reportsData, setReportsData] = useState<any>(null);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || '/api';

  // Fetch real data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch dashboard stats
        const statsResponse = await fetch(`${backendUrl}/dashboard/stats`);
        const statsData = await statsResponse.json();
        setDashboardStats(statsData);
        
        // Fetch monthly reports with payment method data
        const reportsResponse = await fetch(`${backendUrl}/reports/export`);
        const reportsResult = await reportsResponse.json();
        if (reportsResult.success) {
          setReportsData(reportsResult.data);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching reports data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [backendUrl]);

  // Handle export
  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      setExportLoading(format);
      await exportReport(format);
      
      // Show success message
      alert(`Relatório exportado com sucesso em formato ${format.toUpperCase()}!`);
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Erro ao exportar relatório. Tente novamente.');
    } finally {
      setExportLoading(null);
    }
  };

  // Process data for charts
  const processedData = reportsData ? {
    revenueData: reportsData.dailyData ? reportsData.dailyData.slice(-7).map(day => ({
      day: new Date(day.date).toLocaleDateString('pt-BR', { weekday: 'short' }),
      revenue: day.revenue
    })) : [],
    
    entriesData: reportsData.dailyData ? reportsData.dailyData.slice(-7).map(day => ({
      day: new Date(day.date).toLocaleDateString('pt-BR', { weekday: 'short' }),
      entries: day.entries
    })) : [],
    
    vehicleTypeData: dashboardStats ? [
      { name: 'Carros', value: dashboardStats.totalCarsParked, color: '#3B82F6' },
      { name: 'Motos', value: dashboardStats.totalMotorcyclesParked, color: '#10B981' }
    ] : []
  } : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 space-y-4">
      {/* Header - Mobile */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold">Relatórios</h2>
        <p className="text-sm text-gray-600">Análise do estacionamento</p>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12 rounded-xl bg-gray-100">
          <TabsTrigger value="statistics" className="text-xs h-12 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span>Estatísticas</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="times" className="text-xs h-12 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <div className="flex items-center gap-2">
              <List className="w-4 h-4" />
              <span>Horários</span>
            </div>
          </TabsTrigger>
        </TabsList>

        {/* Statistics Tab - Original Reports Content */}
        <TabsContent value="statistics" className="space-y-4">{/* Quick Actions */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        <Button variant="outline" size="sm" className="whitespace-nowrap flex-shrink-0">
          <Calendar className="w-3 h-3 mr-1" />
          Período
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="whitespace-nowrap flex-shrink-0"
          onClick={() => handleExport('pdf')}
          disabled={exportLoading === 'pdf'}
        >
          {exportLoading === 'pdf' ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Download className="w-3 h-3 mr-1" />
          )}
          Exportar PDF
        </Button>
      </div>

      {/* Stats Summary - Mobile Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Receita Total</p>
              <p className="text-sm font-bold">{formatCurrencyBR(reportsData?.summary?.totalRevenue || 0)}</p>
              <Badge variant="outline" className="text-xs text-green-600 border-green-600">Total</Badge>
            </div>
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Carros</p>
              <p className="text-sm font-bold">{dashboardStats?.totalCarsParked || 0}</p>
              <Badge variant="outline" className="text-xs text-blue-600 border-blue-600">Atual</Badge>
            </div>
            <Car className="h-5 w-5 text-blue-600" />
          </div>
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Transações</p>
              <p className="text-sm font-bold">{reportsData?.summary?.totalExits || 0}</p>
              <Badge variant="outline" className="text-xs text-purple-600 border-purple-600">Total</Badge>
            </div>
            <TrendingUp className="h-5 w-5 text-purple-600" />
          </div>
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Ocupação</p>
              <p className="text-sm font-bold">{dashboardStats?.occupancyRate?.toFixed(1) || 0}%</p>
              <Badge variant="outline" className="text-xs text-orange-600 border-orange-600">Atual</Badge>
            </div>
            <Clock className="h-5 w-5 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Revenue Chart - Mobile */}
      {processedData?.revenueData && processedData.revenueData.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3 text-sm">Receita dos Últimos 7 Dias</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={processedData.revenueData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="day" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10 }}
              />
              <YAxis hide />
              <Tooltip 
                formatter={(value) => [`R$ ${formatBrazilianCurrency(value as number)}`, 'Receita']}
                labelFormatter={(label) => `${label}`}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Entries Chart - Mobile */}
      {processedData?.entriesData && processedData.entriesData.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3 text-sm">Entradas dos Últimos 7 Dias</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={processedData.entriesData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="day" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10 }}
              />
              <YAxis hide />
              <Tooltip 
                formatter={(value) => [`${value}`, 'Entradas']}
                labelFormatter={(label) => `${label}`}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="entries" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Vehicle Type Distribution - Mobile */}
      {processedData?.vehicleTypeData && processedData.vehicleTypeData.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3 text-sm">Veículos Estacionados Atualmente</h3>
          <div className="space-y-3">
            {processedData.vehicleTypeData.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <span className="text-sm font-bold">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Payment Methods Distribution - Mobile */}
      {reportsData?.paymentMethods && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3 text-sm">Distribuição por Forma de Pagamento</h3>
          <div className="space-y-3">
            {Object.entries(reportsData.paymentMethods).map(([method, data]) => {
              const methodNames = {
                cash: 'Dinheiro',
                pix: 'PIX',
                credit_card: 'Cartão de Crédito',
                debit_card: 'Cartão de Débito'
              };
              const colors = {
                cash: '#10B981',
                pix: '#8B5CF6',
                credit_card: '#F59E0B',
                debit_card: '#EF4444'
              };
              
              if (data.count === 0) return null;
              
              return (
                <div key={method} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: colors[method] }}
                    ></div>
                    <span className="text-sm font-medium">{methodNames[method]}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{data.count} transações</div>
                    <div className="text-xs text-gray-600">{formatCurrencyBR(data.revenue)}</div>
                    <div className="text-xs text-gray-500">{data.percentage.toFixed(1)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Export Options - Mobile */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 text-sm">Exportar Relatórios</h3>
        <div className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full h-10 justify-start"
            onClick={() => handleExport('pdf')}
            disabled={exportLoading === 'pdf'}
          >
            {exportLoading === 'pdf' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Relatório PDF
          </Button>
          <Button 
            variant="outline" 
            className="w-full h-10 justify-start"
            onClick={() => handleExport('excel')}
            disabled={exportLoading === 'excel'}
          >
            {exportLoading === 'excel' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Planilha Excel
          </Button>
          <Button 
            variant="outline" 
            className="w-full h-10 justify-start"
            onClick={() => handleExport('csv')}
            disabled={exportLoading === 'csv'}
          >
            {exportLoading === 'csv' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Dados CSV
          </Button>
        </div>
      </Card>
    </div>
  );
}