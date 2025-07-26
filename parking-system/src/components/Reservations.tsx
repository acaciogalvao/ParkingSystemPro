import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/components/ui/use-toast";
import { formatPlateInput, validateBrazilianPlate } from "@/utils/plateValidation";
import { 
  Calendar, 
  Clock, 
  Car, 
  Bike, 
  Plus, 
  MapPin, 
  CreditCard,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  QrCode
} from "lucide-react";

interface Reservation {
  id: string;
  vehicleType: 'car' | 'motorcycle';
  plate: string;
  ownerName: string;
  ownerPhone: string;
  reservationDateTime: string;
  duration: number;
  fee: number;
  formattedFee: string;
  status: 'pending_payment' | 'confirmed' | 'active' | 'expired' | 'cancelled';
  createdAt: string;
  expiresAt: string;
  formattedDateTime: string;
  endDateTime: string;
  formattedEndDateTime: string;
  paymentId?: string;
  vehicleId?: string;
  spot?: string;
}

interface NewReservation {
  vehicleType: 'car' | 'motorcycle';
  plate: string;
  ownerName: string;
  ownerPhone: string;
  reservationDate: string;
  reservationTime: string;
  duration: number;
  payerEmail: string;
  payerCPF: string;
}

export function Reservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNewReservation, setShowNewReservation] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [newReservation, setNewReservation] = useState<NewReservation>({
    vehicleType: 'car',
    plate: '',
    ownerName: '',
    ownerPhone: '',
    reservationDate: '',
    reservationTime: '',
    duration: 1,
    payerEmail: '',
    payerCPF: ''
  });

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const backendUrl = import.meta.env.VITE_BACKEND_URL || '';

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const response = await fetch(`${backendUrl}/reservations`);
      const data = await response.json();
      
      if (data.success) {
        setReservations(data.data);
      } else {
        console.error('Error fetching reservations:', data.error);
        toast({
          title: "Erro ao carregar reservas",
          description: data.error || "Erro desconhecido",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast({
        title: "Erro de conexão",
        description: "Erro ao carregar reservas. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof NewReservation, value: string | number) => {
    if (field === 'plate') {
      value = formatPlateInput(value as string);
    }
    
    setNewReservation(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const { plate, ownerName, ownerPhone, reservationDate, reservationTime, payerEmail, payerCPF } = newReservation;
    
    if (!plate || !ownerName || !ownerPhone || !reservationDate || !reservationTime || !payerEmail || !payerCPF) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return false;
    }

    const plateValidation = validateBrazilianPlate(plate);
    if (!plateValidation.isValid) {
      toast({
        title: "Placa inválida",
        description: plateValidation.error,
        variant: "destructive"
      });
      return false;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payerEmail)) {
      toast({
        title: "Email inválido",
        description: "Digite um email válido.",
        variant: "destructive"
      });
      return false;
    }

    // Validate CPF (basic)
    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    if (!cpfRegex.test(payerCPF)) {
      toast({
        title: "CPF inválido",
        description: "Digite um CPF válido no formato XXX.XXX.XXX-XX.",
        variant: "destructive"
      });
      return false;
    }

    // Validate date/time is in the future
    const reservationDateTime = new Date(`${reservationDate}T${reservationTime}:00`);
    if (reservationDateTime <= new Date()) {
      toast({
        title: "Data/hora inválida",
        description: "A reserva deve ser para uma data e hora futura.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleCreateReservation = async () => {
    if (!validateForm()) return;

    setCreating(true);
    try {
      const response = await fetch(`${backendUrl}/reservations/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newReservation),
      });

      const data = await response.json();

      if (data.success) {
        setPaymentData(data.data);
        setShowPayment(true);
        setShowNewReservation(false);
        
        toast({
          title: "Reserva criada!",
          description: "Realize o pagamento para confirmar a reserva.",
        });

        // Reset form
        setNewReservation({
          vehicleType: 'car',
          plate: '',
          ownerName: '',
          ownerPhone: '',
          reservationDate: '',
          reservationTime: '',
          duration: 1,
          payerEmail: '',
          payerCPF: ''
        });

        fetchReservations();
      } else {
        toast({
          title: "Erro ao criar reserva",
          description: data.error || "Erro desconhecido",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar reserva. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta reserva? Será cobrada uma taxa de cancelamento de 50% do valor de 1 hora.')) {
      return;
    }

    try {
      const response = await fetch(`${backendUrl}/reservations/${reservationId}/cancel`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Reserva cancelada",
          description: data.message,
        });
        fetchReservations();
      } else {
        toast({
          title: "Erro ao cancelar reserva",
          description: data.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      toast({
        title: "Erro",
        description: "Erro ao cancelar reserva. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending_payment: { color: "bg-yellow-500", text: "Pagamento Pendente" },
      confirmed: { color: "bg-blue-500", text: "Confirmada" },
      active: { color: "bg-green-500", text: "Ativa" },
      expired: { color: "bg-red-500", text: "Expirada" },
      cancelled: { color: "bg-gray-500", text: "Cancelada" }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <Badge className={`${config.color} text-white`}>
        {config.text}
      </Badge>
    );
  };

  const filteredReservations = reservations.filter(reservation => {
    if (filterStatus !== 'all' && reservation.status !== filterStatus) return false;
    if (filterType !== 'all' && reservation.vehicleType !== filterType) return false;
    return true;
  });

  const handleReservationClick = (reservation: Reservation) => {
    if (reservation.status === 'pending_payment') {
      // Open payment modal for pending payment reservations
      setSelectedReservation(reservation);
      setPaymentData({
        reservationId: reservation.id,
        amount: reservation.fee,
        formattedAmount: reservation.formattedFee,
        vehicle: {
          plate: reservation.plate,
          type: reservation.vehicleType,
          owner: reservation.ownerName
        }
      });
      setShowPayment(true);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30); // At least 30 minutes from now
    return now.toISOString().slice(0, 16);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reservas</h2>
          <p className="text-muted-foreground">Gerencie reservas de vagas</p>
        </div>
        
        <Dialog open={showNewReservation} onOpenChange={setShowNewReservation}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Reserva
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Reserva</DialogTitle>
              <DialogDescription>
                Preencha os dados para criar uma nova reserva
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Vehicle Type */}
              <div>
                <Label htmlFor="vehicleType">Tipo de Veículo</Label>
                <Select 
                  value={newReservation.vehicleType} 
                  onValueChange={(value: 'car' | 'motorcycle') => handleInputChange('vehicleType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">
                      <div className="flex items-center">
                        <Car className="h-4 w-4 mr-2" />
                        Carro
                      </div>
                    </SelectItem>
                    <SelectItem value="motorcycle">
                      <div className="flex items-center">
                        <Bike className="h-4 w-4 mr-2" />
                        Moto
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Plate */}
              <div>
                <Label htmlFor="plate">Placa</Label>
                <Input
                  id="plate"
                  value={newReservation.plate}
                  onChange={(e) => handleInputChange('plate', e.target.value)}
                  placeholder="ABC-1234 ou ABC1A12"
                  maxLength={8}
                />
              </div>

              {/* Owner Info */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="ownerName">Proprietário</Label>
                  <Input
                    id="ownerName"
                    value={newReservation.ownerName}
                    onChange={(e) => handleInputChange('ownerName', e.target.value)}
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <Label htmlFor="ownerPhone">Telefone</Label>
                  <Input
                    id="ownerPhone"
                    value={newReservation.ownerPhone}
                    onChange={(e) => handleInputChange('ownerPhone', e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="reservationDate">Data</Label>
                  <Input
                    id="reservationDate"
                    type="date"
                    value={newReservation.reservationDate}
                    onChange={(e) => handleInputChange('reservationDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label htmlFor="reservationTime">Hora</Label>
                  <Input
                    id="reservationTime"
                    type="time"
                    value={newReservation.reservationTime}
                    onChange={(e) => handleInputChange('reservationTime', e.target.value)}
                  />
                </div>
              </div>

              {/* Duration */}
              <div>
                <Label htmlFor="duration">Duração (horas)</Label>
                <Select 
                  value={newReservation.duration.toString()} 
                  onValueChange={(value) => handleInputChange('duration', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(hour => (
                      <SelectItem key={hour} value={hour.toString()}>
                        {hour} hora{hour > 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Info */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="payerEmail">Email</Label>
                  <Input
                    id="payerEmail"
                    type="email"
                    value={newReservation.payerEmail}
                    onChange={(e) => handleInputChange('payerEmail', e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label htmlFor="payerCPF">CPF</Label>
                  <Input
                    id="payerCPF"
                    value={newReservation.payerCPF}
                    onChange={(e) => handleInputChange('payerCPF', e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>

              {/* Price Preview */}
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="flex justify-between text-sm">
                  <span>Tipo:</span>
                  <span>{newReservation.vehicleType === 'car' ? 'Carro' : 'Moto'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Duração:</span>
                  <span>{newReservation.duration}h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Taxa/hora:</span>
                  <span>R$ {newReservation.vehicleType === 'car' ? '10,00' : '7,00'}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>R$ {((newReservation.vehicleType === 'car' ? 10 : 7) * newReservation.duration).toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowNewReservation(false)}
                  disabled={creating}
                >
                  Cancelar
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleCreateReservation}
                  disabled={creating}
                >
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar Reserva
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pagamento da Reserva</DialogTitle>
            <DialogDescription>
              Escaneie o QR Code PIX para pagar a reserva
            </DialogDescription>
          </DialogHeader>
          
          {paymentData && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-2">
                  {paymentData.formattedAmount}
                </div>
                <p className="text-sm text-muted-foreground">
                  Placa: {paymentData.vehicle.plate}
                </p>
              </div>

              {paymentData.pixCodeBase64 && (
                <div className="flex justify-center">
                  <img 
                    src={`data:image/png;base64,${paymentData.pixCodeBase64}`}
                    alt="QR Code PIX"
                    className="w-48 h-48"
                  />
                </div>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Você tem 30 minutos para realizar o pagamento. Após a confirmação do pagamento, sua reserva será ativada.
                </AlertDescription>
              </Alert>

              <Button 
                className="w-full"
                onClick={() => setShowPayment(false)}
              >
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pending_payment">Pagamento Pendente</SelectItem>
            <SelectItem value="confirmed">Confirmada</SelectItem>
            <SelectItem value="active">Ativa</SelectItem>
            <SelectItem value="expired">Expirada</SelectItem>
            <SelectItem value="cancelled">Cancelada</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="car">Carros</SelectItem>
            <SelectItem value="motorcycle">Motos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reservations List */}
      <div className="grid gap-4">
        {filteredReservations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma reserva encontrada</h3>
              <p className="text-muted-foreground text-center">
                {reservations.length === 0 
                  ? "Não há reservas cadastradas ainda."
                  : "Não há reservas que correspondam aos filtros selecionados."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredReservations.map(reservation => (
            <Card key={reservation.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {reservation.vehicleType === 'car' ? (
                        <Car className="h-5 w-5" />
                      ) : (
                        <Bike className="h-5 w-5" />
                      )}
                      {reservation.plate}
                    </CardTitle>
                    <CardDescription>
                      {reservation.ownerName} • {reservation.ownerPhone}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(reservation.status)}
                    <div className="text-lg font-semibold text-green-600">
                      {reservation.formattedFee}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{reservation.formattedDateTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{reservation.duration}h de duração</span>
                  </div>
                  {reservation.spot && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>Vaga {reservation.spot}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Término:</span>
                    <span>{reservation.formattedEndDateTime}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  {reservation.status === 'confirmed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelReservation(reservation.id)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  )}
                  
                  {reservation.status === 'pending_payment' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelReservation(reservation.id)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}