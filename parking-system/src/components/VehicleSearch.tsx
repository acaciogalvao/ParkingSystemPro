import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Car, Bike, Search, Clock, DollarSign, LogOut } from "lucide-react";

interface Vehicle {
  id: number;
  plate: string;
  type: 'car' | 'motorcycle';
  model: string;
  color: string;
  ownerName: string;
  ownerPhone: string;
  entryTime: string;
  spot: string;
  duration: string;
  amount: number;
}

export function VehicleSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Dados simulados de veículos estacionados
  const vehicles: Vehicle[] = [
    {
      id: 1,
      plate: "ABC-1234",
      type: "car",
      model: "Honda Civic",
      color: "Branco",
      ownerName: "João Silva",
      ownerPhone: "(11) 99999-9999",
      entryTime: "14:30",
      spot: "A-15",
      duration: "2h 30min",
      amount: 15.00
    },
    {
      id: 2,
      plate: "XYZ-5678",
      type: "motorcycle",
      model: "Yamaha MT-03",
      color: "Preto",
      ownerName: "Maria Santos",
      ownerPhone: "(11) 88888-8888",
      entryTime: "13:45",
      spot: "M-08",
      duration: "3h 15min",
      amount: 9.75
    },
    {
      id: 3,
      plate: "DEF-9012",
      type: "car",
      model: "Toyota Corolla",
      color: "Prata",
      ownerName: "Pedro Costa",
      ownerPhone: "(11) 77777-7777",
      entryTime: "12:15",
      spot: "A-22",
      duration: "4h 45min",
      amount: 28.50
    },
    {
      id: 4,
      plate: "GHI-3456",
      type: "car",
      model: "Volkswagen Golf",
      color: "Azul",
      ownerName: "Ana Oliveira",
      ownerPhone: "(11) 66666-6666",
      entryTime: "10:00",
      spot: "A-05",
      duration: "7h 00min",
      amount: 42.00
    },
    {
      id: 5,
      plate: "JKL-7890",
      type: "motorcycle",
      model: "Honda CB 600",
      color: "Vermelho",
      ownerName: "Carlos Mendes",
      ownerPhone: "(11) 55555-5555",
      entryTime: "15:30",
      spot: "M-12",
      duration: "1h 30min",
      amount: 4.50
    }
  ];

  const filteredVehicles = vehicles.filter(vehicle => 
    vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.spot.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExit = (vehicle: Vehicle) => {
    alert(`Processando saída do veículo ${vehicle.plate}. Valor total: R$ ${vehicle.amount.toFixed(2)}`);
    // Aqui seria implementada a lógica real de saída
  };

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
            <Input
              placeholder="Digite a placa, nome ou modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12"
            />
            <div className="text-xs text-gray-600">
              {filteredVehicles.length} veículo{filteredVehicles.length !== 1 ? 's' : ''} encontrado{filteredVehicles.length !== 1 ? 's' : ''}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Cards - Mobile First */}
      <div className="space-y-3">
        {filteredVehicles.map((vehicle) => (
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
                  <p className="text-gray-500">Tempo</p>
                  <p className="font-medium">{vehicle.duration}</p>
                </div>
              </div>

              {/* Value and Actions */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-1 text-green-600 font-bold">
                  <DollarSign className="w-4 h-4" />
                  R$ {vehicle.amount.toFixed(2)}
                </div>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedVehicle(vehicle)}
                      >
                        Detalhes
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="mx-4 rounded-lg">
                      <DialogHeader>
                        <DialogTitle>Detalhes do Veículo</DialogTitle>
                        <DialogDescription>
                          Informações completas
                        </DialogDescription>
                      </DialogHeader>
                      {selectedVehicle && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-3">
                            <div className="p-3 bg-gray-50 rounded">
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Placa</label>
                              <p className="text-xl font-bold">{selectedVehicle.plate}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 bg-gray-50 rounded">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tipo</label>
                                <p className="font-medium">{selectedVehicle.type === 'car' ? 'Carro' : 'Moto'}</p>
                              </div>
                              <div className="p-3 bg-gray-50 rounded">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vaga</label>
                                <p className="font-medium">{selectedVehicle.spot}</p>
                              </div>
                            </div>
                            <div className="p-3 bg-gray-50 rounded">
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Modelo</label>
                              <p className="font-medium">{selectedVehicle.model}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded">
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Proprietário</label>
                              <p className="font-medium">{selectedVehicle.ownerName}</p>
                              <p className="text-sm text-gray-600">{selectedVehicle.ownerPhone}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 bg-gray-50 rounded">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Entrada</label>
                                <p className="font-medium">{selectedVehicle.entryTime}</p>
                              </div>
                              <div className="p-3 bg-gray-50 rounded">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tempo</label>
                                <p className="font-medium">{selectedVehicle.duration}</p>
                              </div>
                            </div>
                            <div className="p-3 bg-green-50 rounded border border-green-200">
                              <label className="text-xs font-medium text-green-600 uppercase tracking-wide">Valor Total</label>
                              <p className="text-2xl font-bold text-green-600">R$ {selectedVehicle.amount.toFixed(2)}</p>
                            </div>
                          </div>
                          <Button 
                            className="w-full h-12"
                            onClick={() => handleExit(selectedVehicle)}
                          >
                            <LogOut className="w-4 h-4 mr-2" />
                            Processar Saída
                          </Button>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                  <Button 
                    size="sm" 
                    onClick={() => handleExit(vehicle)}
                  >
                    <LogOut className="w-3 h-3 mr-1" />
                    Saída
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
        
        {filteredVehicles.length === 0 && searchTerm && (
          <Card className="p-8">
            <div className="text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum veículo encontrado</p>
              <p className="text-sm text-gray-400">Tente buscar por placa, nome ou modelo</p>
            </div>
          </Card>
        )}
        
        {filteredVehicles.length === 0 && !searchTerm && (
          <Card className="p-8">
            <div className="text-center">
              <Car className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Use a busca acima</p>
              <p className="text-sm text-gray-400">Digite para encontrar veículos</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}