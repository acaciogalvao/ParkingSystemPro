import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VehicleEntry } from "@/components/VehicleEntry";
import { VehicleSearch } from "@/components/VehicleSearch";
import { Reports } from "@/components/Reports";
import { Timer } from "@/components/Timer";
import { formatBrazilianDecimal } from "@/utils/formatters";
import { 
  Car, 
  Bike, 
  MapPin, 
  DollarSign, 
  Clock, 
  Users, 
  TrendingUp,
  Plus,
  Search,
  Filter,
  BarChart3
} from "lucide-react";

interface Vehicle {
  id: string;
  plate: string;
  type: 'car' | 'motorcycle';
  model: string;
  color: string;
  ownerName: string;
  entryTime: string;
  spot: string;
  entryTimestamp?: string;
  duration?: {
    hours: number;
    minutes: number;
    seconds: number;
    formatted: string;
  };
  estimatedFee?: string;
}

interface ParkingSpot {
  id: string;
  type: 'car' | 'motorcycle';
  isOccupied: boolean;
  isReserved: boolean;
  vehicleId?: string | null;
  vehicle?: {
    id: string;
    plate: string;
    ownerName: string;
    entryTime: string;
    duration: {
      hours: number;
      minutes: number;
      seconds: number;
      formatted: string;
    };
    estimatedFee: string;
  };
}

interface DashboardStats {
  totalCarsParked: number;
  totalMotorcyclesParked: number;
  availableSpots: number;
  todayRevenue: number;
  occupancyRate: number;
}

export default function ParkingSystem() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState<DashboardStats>({
    totalCarsParked: 0,
    totalMotorcyclesParked: 0,
    availableSpots: 0,
    todayRevenue: 0,
    occupancyRate: 0
  });
  const [recentVehicles, setRecentVehicles] = useState<Vehicle[]>([]);
  const [parkingSpots, setParkingSpots] = useState<ParkingSpot[]>([]);
  const [loading, setLoading] = useState(true);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001';

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch stats
        const statsResponse = await fetch(`${backendUrl}/dashboard/stats`);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }

        // Fetch recent vehicles with duration
        const vehiclesResponse = await fetch(`${backendUrl}/vehicles/with-duration`);
        if (vehiclesResponse.ok) {
          const vehiclesData = await vehiclesResponse.json();
          setRecentVehicles(vehiclesData.slice(0, 3)); // Only show 3 most recent
        }

        // Fetch parking spots with duration
        const spotsResponse = await fetch(`${backendUrl}/spots/with-duration`);
        if (spotsResponse.ok) {
          const spotsData = await spotsResponse.json();
          setParkingSpots(spotsData);
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Keep default mock data if API fails
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    
    // Set up real-time updates every 5 seconds
    const interval = setInterval(fetchDashboardData, 5000);
    
    return () => clearInterval(interval);
  }, [backendUrl]);

  // Refresh data when tab changes to dashboard
  useEffect(() => {
    if (activeTab === "dashboard") {
      const fetchStats = async () => {
        try {
          const response = await fetch(`${backendUrl}/dashboard/stats`);
          if (response.ok) {
            const data = await response.json();
            setStats(data);
          }
        } catch (error) {
          console.error('Error refreshing stats:', error);
        }
      };
      fetchStats();
    }
  }, [activeTab, backendUrl]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Mobile Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <Car className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ParkSystem Pro</h1>
                <p className="text-xs text-gray-600">Gestão de Estacionamento</p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-green-600 border-green-600 text-xs mb-1">
                ● Online
              </Badge>
              <p className="text-xs text-gray-500">23 veículos</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Mobile Navigation */}
          <div className="px-3 py-3">
            <TabsList className="grid w-full grid-cols-3 h-14 rounded-xl bg-gray-100">
              <TabsTrigger value="dashboard" className="text-xs h-14 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <div className="flex flex-col items-center gap-1">
                  <TrendingUp className="w-5 h-5" />
                  <span>Dashboard</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="entry" className="text-xs h-14 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <div className="flex flex-col items-center gap-1">
                  <Plus className="w-5 h-5" />
                  <span>Entrada</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="vehicles" className="text-xs h-14 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <div className="flex flex-col items-center gap-1">
                  <Search className="w-5 h-5" />
                  <span>Veículos</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Secondary Navigation */}
          <div className="px-3 pb-3">
            <div className="flex gap-3 overflow-x-auto scrollbar-hide">
              <Button 
                variant={activeTab === "spots" ? "default" : "outline"} 
                size="sm" 
                onClick={() => setActiveTab("spots")}
                className="whitespace-nowrap flex-shrink-0 h-10 px-4"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Vagas
              </Button>
              <Button 
                variant={activeTab === "reports" ? "default" : "outline"} 
                size="sm" 
                onClick={() => setActiveTab("reports")}
                className="whitespace-nowrap flex-shrink-0 h-10 px-4"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Relatórios
              </Button>
              <Button 
                variant={activeTab === "history" ? "default" : "outline"} 
                size="sm" 
                onClick={() => setActiveTab("history")}
                className="whitespace-nowrap flex-shrink-0 h-10 px-4"
              >
                <Clock className="w-4 h-4 mr-2" />
                Histórico
              </Button>
            </div>
          </div>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="px-3 space-y-4 pb-6">
            {/* Quick Stats - Mobile Optimized */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Carros</p>
                    <p className="text-lg font-bold">{stats.totalCarsParked}</p>
                    <p className="text-xs text-gray-500">de 50</p>
                  </div>
                  <Car className="h-6 w-6 text-blue-600" />
                </div>
              </Card>
              
              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Motos</p>
                    <p className="text-lg font-bold">{stats.totalMotorcyclesParked}</p>
                    <p className="text-xs text-gray-500">de 20</p>
                  </div>
                  <Bike className="h-6 w-6 text-green-600" />
                </div>
              </Card>
              
              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Disponíveis</p>
                    <p className="text-lg font-bold">{stats.availableSpots}</p>
                    <p className="text-xs text-gray-500">vagas</p>
                  </div>
                  <MapPin className="h-6 w-6 text-orange-600" />
                </div>
              </Card>
              
              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Ocupação</p>
                    <p className="text-lg font-bold">{formatBrazilianDecimal(stats.occupancyRate, 0)}%</p>
                    <p className="text-xs text-gray-500">atual</p>
                  </div>
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </Card>
            </div>

            {/* Quick Actions - Mobile */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4 text-sm">Ações Rápidas</h3>
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  className="h-14 text-sm flex-col gap-1 p-3" 
                  onClick={() => setActiveTab("entry")}
                >
                  <Plus className="w-5 h-5" />
                  Nova Entrada
                </Button>
                <Button 
                  className="h-14 text-sm flex-col gap-1 p-3" 
                  variant="outline"
                  onClick={() => setActiveTab("vehicles")}
                >
                  <Search className="w-5 h-5" />
                  Buscar Veículo
                </Button>
                <Button 
                  className="h-14 text-sm flex-col gap-1 p-3" 
                  variant="outline"
                  onClick={() => setActiveTab("vehicles")}
                >
                  <DollarSign className="w-5 h-5" />
                  Processar Saída
                </Button>
                <Button 
                  className="h-14 text-sm flex-col gap-1 p-3" 
                  variant="outline"
                  onClick={() => setActiveTab("spots")}
                >
                  <MapPin className="w-5 h-5" />
                  Ver Vagas
                </Button>
              </div>
            </Card>

            {/* Recent Activity - Mobile */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4 text-sm">Atividade Recente</h3>
              <div className="space-y-3">
                {recentVehicles.slice(0, 3).map((vehicle) => (
                  <div key={vehicle.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border-l-4 border-blue-500">
                    <div className="flex items-center space-x-3">
                      {vehicle.type === 'car' ? (
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Car className="w-5 h-5 text-blue-600" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <Bike className="w-5 h-5 text-green-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-sm">{vehicle.plate}</p>
                        <p className="text-xs text-gray-600">{vehicle.model}</p>
                        <p className="text-xs text-gray-500">{vehicle.ownerName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs mb-1">{vehicle.spot}</Badge>
                      <p className="text-xs text-gray-500">{vehicle.entryTime}</p>
                      {vehicle.entryTimestamp && (
                        <div className="text-xs text-green-600 mt-1">
                          <Timer entryTime={vehicle.entryTimestamp} showFee={true} vehicleType={vehicle.type} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button 
                variant="outline" 
                className="w-full mt-4 text-sm h-12"
                onClick={() => setActiveTab("vehicles")}
              >
                Ver Todos os Veículos
              </Button>
            </Card>
          </TabsContent>

          {/* Spots Tab - Mobile Optimized */}
          <TabsContent value="spots" className="px-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Vagas</h2>
                <p className="text-sm text-gray-600">Mapa do estacionamento</p>
              </div>
              <Button variant="outline" size="sm">
                <Filter className="w-3 h-3 mr-1" />
                Filtros
              </Button>
            </div>

            {/* Spot Status Summary - Mobile */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <div className="w-4 h-4 bg-green-500 rounded mx-auto mb-1"></div>
                <p className="text-xs font-medium">Disponível</p>
                <p className="text-lg font-bold text-green-600">{parkingSpots.filter(s => !s.isOccupied && !s.isReserved).length}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <div className="w-4 h-4 bg-red-500 rounded mx-auto mb-1"></div>
                <p className="text-xs font-medium">Ocupada</p>
                <p className="text-lg font-bold text-red-600">{parkingSpots.filter(s => s.isOccupied).length}</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                <div className="w-4 h-4 bg-yellow-500 rounded mx-auto mb-1"></div>
                <p className="text-xs font-medium">Reservada</p>
                <p className="text-lg font-bold text-yellow-600">{parkingSpots.filter(s => s.isReserved).length}</p>
              </div>
            </div>

            {/* Parking Grid - Mobile Optimized */}
            <div className="space-y-4">
              {/* Car Spots */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center">
                  <Car className="w-4 h-4 mr-2" />
                  Vagas para Carros (A-01 a A-50)
                </h3>
                <div className="grid grid-cols-8 gap-1">
                  {parkingSpots.filter(spot => spot.type === 'car').map((spot) => (
                    <div
                      key={spot.id}
                      className={`
                        aspect-square rounded border-2 flex flex-col items-center justify-center text-xs font-medium relative
                        ${spot.isOccupied 
                          ? 'bg-red-100 border-red-300 text-red-700' 
                          : spot.isReserved 
                          ? 'bg-yellow-100 border-yellow-300 text-yellow-700'
                          : 'bg-green-100 border-green-300 text-green-700'
                        }
                      `}
                    >
                      <span className="text-xs font-bold">
                        {spot.id.split('-')[1]}
                      </span>
                      {spot.isOccupied && spot.vehicle && (
                        <div className="absolute inset-0 bg-red-500/90 rounded flex flex-col items-center justify-center text-white text-[10px] p-1">
                          <div className="font-bold">{spot.vehicle.plate}</div>
                          <Timer 
                            entryTime={spot.vehicle.entryTime} 
                            className="text-[8px] text-white"
                            vehicleType="car"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Motorcycle Spots */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center">
                  <Bike className="w-4 h-4 mr-2" />
                  Vagas para Motos (M-01 a M-20)
                </h3>
                <div className="grid grid-cols-8 gap-1">
                  {parkingSpots.filter(spot => spot.type === 'motorcycle').map((spot) => (
                    <div
                      key={spot.id}
                      className={`
                        aspect-square rounded border-2 flex flex-col items-center justify-center text-xs font-medium relative
                        ${spot.isOccupied 
                          ? 'bg-red-100 border-red-300 text-red-700' 
                          : spot.isReserved 
                          ? 'bg-yellow-100 border-yellow-300 text-yellow-700'
                          : 'bg-green-100 border-green-300 text-green-700'
                        }
                      `}
                    >
                      <span className="text-xs font-bold">
                        {spot.id.split('-')[1]}
                      </span>
                      {spot.isOccupied && spot.vehicle && (
                        <div className="absolute inset-0 bg-red-500/90 rounded flex flex-col items-center justify-center text-white text-[10px] p-1">
                          <div className="font-bold">{spot.vehicle.plate}</div>
                          <Timer 
                            entryTime={spot.vehicle.entryTime} 
                            className="text-[8px] text-white"
                            vehicleType="motorcycle"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Vehicles Tab */}
          <TabsContent value="vehicles">
            <VehicleSearch />
          </TabsContent>

          {/* Entry Tab */}
          <TabsContent value="entry">
            <VehicleEntry onSuccess={() => {
              setActiveTab("dashboard");
              // Refresh dashboard data after successful entry
              setTimeout(async () => {
                try {
                  const response = await fetch(`${backendUrl}/dashboard/stats`);
                  if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                  }
                  const vehiclesResponse = await fetch(`${backendUrl}/vehicles`);
                  if (vehiclesResponse.ok) {
                    const vehiclesData = await vehiclesResponse.json();
                    setRecentVehicles(vehiclesData.slice(0, 3));
                  }
                } catch (error) {
                  console.error('Error refreshing data:', error);
                }
              }, 1000);
            }} />
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Operações</CardTitle>
                <CardDescription>Consulta de entradas e saídas anteriores</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-gray-500 py-8">Funcionalidade em desenvolvimento...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Reports />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
