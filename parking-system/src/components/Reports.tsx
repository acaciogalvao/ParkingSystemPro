import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Loader2
} from "lucide-react";
import { useState, useEffect } from "react";

export function Reports() {
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
        
        // Fetch monthly reports
        const reportsResponse = await fetch(`${backendUrl}/reports/monthly`);
        const reportsResult = await reportsResponse.json();
        setReportsData(reportsResult.data);
        
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
    revenueData: Object.entries(reportsData.dailyRevenue || {}).map(([date, revenue]) => ({
      day: new Date(date).toLocaleDateString('pt-BR', { weekday: 'short' }),
      revenue: revenue as number
    })).slice(-7),
    
    entriesData: Object.entries(reportsData.dailyEntries || {}).map(([date, entries]) => ({
      day: new Date(date).toLocaleDateString('pt-BR', { weekday: 'short' }),
      entries: entries as number
    })).slice(-7),
    
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

      {/* Quick Actions */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        <Button variant="outline" size="sm" className="whitespace-nowrap flex-shrink-0">
          <Calendar className="w-3 h-3 mr-1" />
          Período
        </Button>
        <Button variant="outline" size="sm" className="whitespace-nowrap flex-shrink-0">
          <Download className="w-3 h-3 mr-1" />
          Exportar
        </Button>
      </div>

      {/* Stats Summary - Mobile Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Receita</p>
              <p className="text-sm font-bold">R$ {formatBrazilianCurrency(monthlyStats.totalRevenue)}</p>
              <Badge variant="outline" className="text-xs text-green-600 border-green-600">+12.5%</Badge>
            </div>
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Veículos</p>
              <p className="text-sm font-bold">{monthlyStats.totalVehicles.toLocaleString('pt-BR')}</p>
              <Badge variant="outline" className="text-xs text-green-600 border-green-600">+8.2%</Badge>
            </div>
            <Car className="h-5 w-5 text-blue-600" />
          </div>
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Ocupação</p>
              <p className="text-sm font-bold">{monthlyStats.avgOccupancy}%</p>
              <Badge variant="outline" className="text-xs text-blue-600 border-blue-600">-2.1%</Badge>
            </div>
            <TrendingUp className="h-5 w-5 text-purple-600" />
          </div>
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Tempo Médio</p>
              <p className="text-sm font-bold">{monthlyStats.avgStayTime}</p>
              <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-600">+5.3%</Badge>
            </div>
            <Clock className="h-5 w-5 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Revenue Chart - Mobile */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 text-sm">Receita Semanal</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={revenueData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="day" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10 }}
            />
            <YAxis hide />
            <Tooltip 
              formatter={(value) => [`R$ ${formatBrazilianCurrency(value)}`, 'Receita']}
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

      {/* Vehicle Type Distribution - Mobile */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 text-sm">Distribuição por Tipo</h3>
        <div className="space-y-3">
          {vehicleTypeData.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm font-medium">{item.name}</span>
              </div>
              <span className="text-sm font-bold">{item.value}%</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Occupancy Chart - Mobile */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 text-sm">Ocupação por Horário</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={occupancyData.slice(0, 8)} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="hour" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9 }}
            />
            <YAxis hide />
            <Tooltip 
              formatter={(value) => [`${value}%`, 'Ocupação']}
              labelFormatter={(label) => `${label}`}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <Bar dataKey="occupancy" fill="#10B981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Mostrando primeiros 8 horários
        </p>
      </Card>

      {/* Export Options - Mobile */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 text-sm">Exportar Relatórios</h3>
        <div className="space-y-2">
          <Button variant="outline" className="w-full h-10 justify-start">
            <Download className="w-4 h-4 mr-2" />
            Relatório PDF
          </Button>
          <Button variant="outline" className="w-full h-10 justify-start">
            <Download className="w-4 h-4 mr-2" />
            Planilha Excel
          </Button>
          <Button variant="outline" className="w-full h-10 justify-start">
            <Download className="w-4 h-4 mr-2" />
            Dados CSV
          </Button>
        </div>
      </Card>
    </div>
  );
}