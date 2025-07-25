import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBrazilianCurrency } from "@/utils/formatters";
import { 
  TrendingUp, 
  DollarSign, 
  Car, 
  Clock, 
  Download,
  Calendar
} from "lucide-react";

export function Reports() {
  // Dados simulados para os gráficos
  const revenueData = [
    { day: 'Seg', revenue: 580 },
    { day: 'Ter', revenue: 720 },
    { day: 'Qua', revenue: 490 },
    { day: 'Qui', revenue: 840 },
    { day: 'Sex', revenue: 950 },
    { day: 'Sáb', revenue: 1200 },
    { day: 'Dom', revenue: 800 }
  ];

  const occupancyData = [
    { hour: '08:00', occupancy: 25 },
    { hour: '09:00', occupancy: 45 },
    { hour: '10:00', occupancy: 65 },
    { hour: '11:00', occupancy: 80 },
    { hour: '12:00', occupancy: 90 },
    { hour: '13:00', occupancy: 85 },
    { hour: '14:00', occupancy: 75 },
    { hour: '15:00', occupancy: 70 },
    { hour: '16:00', occupancy: 85 },
    { hour: '17:00', occupancy: 95 },
    { hour: '18:00', occupancy: 80 },
    { hour: '19:00', occupancy: 60 }
  ];

  const vehicleTypeData = [
    { name: 'Carros', value: 78, color: '#3B82F6' },
    { name: 'Motos', value: 22, color: '#10B981' }
  ];

  const monthlyStats = {
    totalRevenue: 18750.50,
    totalVehicles: 2847,
    avgOccupancy: 67.3,
    avgStayTime: '3h 45min'
  };

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
              <p className="text-sm font-bold">R$ {monthlyStats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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
              formatter={(value) => [`R$ ${value}`, 'Receita']}
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