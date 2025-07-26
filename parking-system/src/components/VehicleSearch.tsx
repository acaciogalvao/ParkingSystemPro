import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Timer } from "@/components/Timer";
import { PixPayment } from "@/components/PixPayment";
import { CardPayment } from "@/components/CardPayment";
import { Car, Bike, Search, Clock, DollarSign, LogOut, CheckCircle, AlertCircle, CreditCard } from "lucide-react";
import { validateBrazilianPlate, formatPlateInput, looksLikePlate, shouldAutoSearch, type PlateValidationResult } from "@/utils/plateValidation";

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
  entryTimestamp?: string;
  duration?: {
    hours: number;
    minutes: number;
    seconds: number;
    formatted: string;
  };
  estimatedFee?: string;
}

export function VehicleSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [plateValidation, setPlateValidation] = useState<PlateValidationResult>({ isValid: false, type: null, error: null });
  const [isPlateSearch, setIsPlateSearch] = useState(false);
  const [pixPaymentVehicle, setPixPaymentVehicle] = useState<Vehicle | null>(null);
  const [isPixPaymentOpen, setIsPixPaymentOpen] = useState(false);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001';

  // Fetch vehicles on component mount
  useEffect(() => {
    const fetchVehicles = async () => {
      await fetchAllVehicles();
    };

    fetchVehicles();
    
    // Set up real-time updates every 5 seconds
    const interval = setInterval(fetchVehicles, 5000);
    
    return () => clearInterval(interval);
  }, [backendUrl]);

  // Handle search input change with plate validation
  const handleSearchChange = (value: string) => {
    // Always format input to uppercase first
    const upperValue = value.toUpperCase();
    
    // Check if it looks like a plate to apply plate-specific formatting
    if (looksLikePlate(upperValue)) {
      const formattedValue = formatPlateInput(upperValue);
      const validation = validateBrazilianPlate(formattedValue);
      setPlateValidation(validation);
      setSearchTerm(formattedValue);
      setIsPlateSearch(true);
      
      // Auto-search for valid complete plates
      if (shouldAutoSearch(formattedValue, validation)) {
        performSearch(formattedValue);
      }
    } else {
      // Regular text search - but still keep uppercase for consistency
      setSearchTerm(upperValue);
      setPlateValidation({ isValid: false, type: null, error: null });
      setIsPlateSearch(false);
      
      // Auto-search for text with 3+ characters
      if (upperValue.trim().length >= 3) {
        performSearch(upperValue);
      } else if (upperValue.trim().length === 0) {
        // Reset to show all vehicles when search is cleared
        fetchAllVehicles();
      }
    }
  };

  // Separate function to perform search
  const performSearch = async (term: string) => {
    if (!term.trim()) {
      await fetchAllVehicles();
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${backendUrl}/vehicles/search?plate=${encodeURIComponent(term)}&owner=${encodeURIComponent(term)}`);
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

  // Function to fetch all vehicles
  const fetchAllVehicles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${backendUrl}/vehicles/with-duration`);
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

  // Process vehicle exit
  const handleExit = async (vehicle: Vehicle) => {
    try {
      setProcessing(true);
      const response = await fetch(`${backendUrl}/vehicles/exit`, {
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
        
        // Refresh vehicles list with duration
        const vehiclesResponse = await fetch(`${backendUrl}/vehicles/with-duration`);
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

  // Open PIX payment modal
  const handlePixPayment = (vehicle: Vehicle) => {
    setPixPaymentVehicle(vehicle);
    setIsPixPaymentOpen(true);
  };

  // Handle successful PIX payment
  const handlePixPaymentSuccess = async () => {
    setIsPixPaymentOpen(false);
    setPixPaymentVehicle(null);
    
    // Refresh vehicles list
    await fetchAllVehicles();
    
    // Show success message
    alert('Pagamento PIX confirmado! Saída processada com sucesso.');
  };

  // Handle PIX payment cancellation
  const handlePixPaymentCancel = () => {
    setIsPixPaymentOpen(false);
    setPixPaymentVehicle(null);
  };

  // Filter vehicles based on current search term (for local filtering when needed)
  const filteredVehicles = vehicles.filter(vehicle => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      vehicle.plate.toLowerCase().includes(searchLower) ||
      vehicle.ownerName.toLowerCase().includes(searchLower) ||
      vehicle.model.toLowerCase().includes(searchLower) ||
      vehicle.spot.toLowerCase().includes(searchLower)
    );
  });

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
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Digite a placa, nome ou modelo..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  maxLength={isPlateSearch ? (searchTerm.includes('-') ? 8 : 7) : undefined}
                  className={`h-12 ${
                    isPlateSearch 
                      ? plateValidation.error 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                        : plateValidation.isValid 
                        ? 'border-green-500 focus:border-green-500 focus:ring-green-500' 
                        : ''
                      : ''
                  } ${isPlateSearch ? 'text-center font-mono tracking-wider' : ''}`}
                  onKeyPress={(e) => e.key === 'Enter' && performSearch(searchTerm)}
                />
                <Button onClick={() => performSearch(searchTerm)} className="h-12 px-6">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Plate validation feedback */}
              {isPlateSearch && (
                <div className="space-y-1">
                  {plateValidation.error && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {plateValidation.error}
                    </p>
                  )}
                  {plateValidation.isValid && plateValidation.type && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Placa válida (formato {plateValidation.type})
                    </p>
                  )}
                  {!plateValidation.error && !plateValidation.isValid && searchTerm.length > 0 && (
                    <p className="text-xs text-gray-500">
                      Formatos aceitos: ABC-1234 (antigo) ou ABC1A12 (Mercosul)
                    </p>
                  )}
                </div>
              )}
            </div>
            
            <div className="text-xs text-gray-600">
              {loading ? 'Carregando...' : `${filteredVehicles.length} veículo${filteredVehicles.length !== 1 ? 's' : ''} encontrado${filteredVehicles.length !== 1 ? 's' : ''}`}
              {isPlateSearch && plateValidation.isValid && (
                <span className="text-green-600 ml-2">• Busca por placa ativa</span>
              )}
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
                    {vehicle.entryTimestamp && (
                      <div className="text-xs text-green-600 mt-1">
                        <Timer entryTime={vehicle.entryTimestamp} showFee={true} />
                      </div>
                    )}
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
                            {selectedVehicle.entryTimestamp && (
                              <div className="flex justify-between items-center bg-green-50 p-2 rounded">
                                <span className="text-gray-600">Tempo permanência:</span>
                                <div className="font-medium text-green-600">
                                  <Timer entryTime={selectedVehicle.entryTimestamp} showFee={true} />
                                </div>
                              </div>
                            )}
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
                    variant="default" 
                    size="sm" 
                    onClick={() => handlePixPayment(vehicle)}
                    disabled={processing}
                    className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
                  >
                    <CreditCard className="w-3 h-3" />
                    PIX
                  </Button>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleExit(vehicle)}
                    disabled={processing}
                    className="flex items-center gap-1"
                  >
                    <DollarSign className="w-3 h-3" />
                    {processing ? 'Processando...' : 'Dinheiro'}
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* PIX Payment Modal */}
      {pixPaymentVehicle && (
        <PixPayment
          vehicle={pixPaymentVehicle}
          onSuccess={handlePixPaymentSuccess}
          onCancel={handlePixPaymentCancel}
          isOpen={isPixPaymentOpen}
        />
      )}
    </div>
  );
}