import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Car, Bike, Search, Clock, DollarSign, LogOut } from "lucide-react";

interface Vehicle {
  id: string;
  plate: string;
  type: 'car' | 'motorcycle';
  model: string;
  color: string;
  ownerName: string;
  ownerPhone?: string;
  entryTime: string;
  spot: string;
  status: string;
}

export function VehicleSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001';

  // Fetch vehicles on component mount
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await fetch(`${backendUrl}/vehicles`);
        if (response.ok) {
          const data = await response.json();
          setVehicles(data);
        }
      } catch (error) {
        console.error('Error fetching vehicles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, [backendUrl]);

  // Search vehicles
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      // If no search term, fetch all vehicles
      try {
        const response = await fetch(`${backendUrl}/api/vehicles`);
        if (response.ok) {
          const data = await response.json();
          setVehicles(data);
        }
      } catch (error) {
        console.error('Error fetching vehicles:', error);
      }
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${backendUrl}/api/vehicles/search?plate=${encodeURIComponent(searchTerm)}&owner=${encodeURIComponent(searchTerm)}`);
      if (response.ok) {
        const result = await response.json();
        setVehicles(result.data);
      }
    } catch (error) {
      console.error('Error searching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  // Process vehicle exit
  const handleExit = async (vehicle: Vehicle) => {
    try {
      setProcessing(true);
      const response = await fetch(`${backendUrl}/api/vehicles/exit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicleId: vehicle.id
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Saída processada com sucesso!\nPlaca: ${result.data.plate}\nVaga: ${result.data.spot}\nDuração: ${result.data.duration}\nValor: ${result.data.fee}`);
        
        // Refresh vehicles list
        const vehiclesResponse = await fetch(`${backendUrl}/api/vehicles`);
        if (vehiclesResponse.ok) {
          const data = await vehiclesResponse.json();
          setVehicles(data);
        }
        
        setSelectedVehicle(null);
      } else {
        const error = await response.json();
        alert(`Erro: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error processing exit:', error);
      alert('Erro ao processar saída');
    } finally {
      setProcessing(false);
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => 
    vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.spot.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="px-4 space-y-4">
      {/* Search Bar - Mobile Optimized */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5" />
            Buscar Veículos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Digite a placa, nome ou modelo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} className="h-12 px-6">
                <Search className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-xs text-gray-600">
              {loading ? 'Carregando...' : `${filteredVehicles.length} veículo${filteredVehicles.length !== 1 ? 's' : ''} encontrado${filteredVehicles.length !== 1 ? 's' : ''}`}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Cards - Mobile First */}
      <div className="space-y-3">
        {loading ? (
          <Card className="p-4">
            <div className="text-center text-gray-500">Carregando veículos...</div>
          </Card>
        ) : filteredVehicles.length === 0 ? (
          <Card className="p-4">
            <div className="text-center text-gray-500">
              {searchTerm ? 'Nenhum veículo encontrado' : 'Nenhum veículo estacionado'}
            </div>
          </Card>
        ) : (
          filteredVehicles.map((vehicle) => (
            <Card key={vehicle.id} className="p-4">
              <div className="space-y-3">
                {/* Vehicle Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {vehicle.type === 'car' ? (
                      <Car className="w-6 h-6 text-blue-600" />
                    ) : (
                      <Bike className="w-6 h-6 text-green-600" />
                    )}
                    <div>
                      <p className="font-bold text-lg">{vehicle.plate}</p>
                      <p className="text-sm text-gray-600">{vehicle.model}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">{vehicle.spot}</Badge>
                </div>

                {/* Vehicle Details */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Proprietário</p>
                    <p className="font-medium">{vehicle.ownerName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Cor</p>
                    <p className="font-medium">{vehicle.color}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Entrada</p>
                    <p className="font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {vehicle.entryTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <p className="font-medium">{vehicle.status}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => setSelectedVehicle(vehicle)}
                      >
                        Ver Detalhes
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] max-w-md">
                      <DialogHeader>
                        <DialogTitle>Detalhes do Veículo</DialogTitle>
                        <DialogDescription>
                          Informações completas do veículo estacionado
                        </DialogDescription>
                      </DialogHeader>
                      {selectedVehicle && (
                        <div className="space-y-4">
                          <div className="text-center pb-4 border-b">
                            <p className="text-2xl font-bold">{selectedVehicle.plate}</p>
                            <p className="text-gray-600">{selectedVehicle.model} - {selectedVehicle.color}</p>
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Proprietário:</span>
                              <span className="font-medium">{selectedVehicle.ownerName}</span>
                            </div>
                            {selectedVehicle.ownerPhone && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Telefone:</span>
                                <span className="font-medium">{selectedVehicle.ownerPhone}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gray-600">Vaga:</span>
                              <span className="font-medium">{selectedVehicle.spot}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Entrada:</span>
                              <span className="font-medium">{selectedVehicle.entryTime}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Tipo:</span>
                              <span className="font-medium">
                                {selectedVehicle.type === 'car' ? 'Carro' : 'Moto'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                  
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => handleExit(vehicle)}
                    disabled={processing}
                    className="flex items-center gap-1"
                  >
                    <LogOut className="w-3 h-3" />
                    {processing ? 'Processando...' : 'Saída'}
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}