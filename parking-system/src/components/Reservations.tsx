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
  QrCode,
  Copy
} from "lucide-react";

interface ReservationPixPayment {
  paymentId: string;
  amount: number;
  formattedAmount: string;
  pixCode: string;
  pixCodeBase64: string;
  ticketUrl?: string;
  expiresAt: string;
  reservationId: string;
}

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
  payerEmail?: string;
  payerCPF?: string;
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

// Função para validar CPF
const validateCPF = (cpf: string): boolean => {
  cpf = cpf.replace(/\D/g, '');
  
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) {
    return false;
  }
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf[i]) * (10 - i);
  }
  let digit1 = (sum * 10) % 11;
  if (digit1 === 10) digit1 = 0;
  
  if (parseInt(cpf[9]) !== digit1) {
    return false;
  }
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf[i]) * (11 - i);
  }
  let digit2 = (sum * 10) % 11;
  if (digit2 === 10) digit2 = 0;
  
  return parseInt(cpf[10]) === digit2;
};

// Formatação automática de telefone durante digitação
const formatPhoneInput = (value: string): string => {
  // Remove tudo que não for número
  const numbersOnly = value.replace(/\D/g, '');
  
  // Limita a 11 dígitos (DDD + 9 dígitos)
  const limitedNumbers = numbersOnly.slice(0, 11);
  
  // Aplica a máscara baseada na quantidade de dígitos
  if (limitedNumbers.length <= 2) {
    return `(${limitedNumbers}`;
  } else if (limitedNumbers.length <= 7) {
    return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2)}`;
  } else {
    return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2, 7)}-${limitedNumbers.slice(7)}`;
  }
};

// Função robusta para copiar texto com fallback
const copyToClipboard = async (text: string): Promise<boolean> => {
  // Método 1: Tentar usar a API Clipboard moderna
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.warn('Clipboard API falhou, tentando método alternativo:', error);
    }
  }
  
  // Método 2: Fallback usando textarea temporário
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    
    return successful;
  } catch (error) {
    console.error('Método de fallback falhou:', error);
    return false;
  }
};

export function Reservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNewReservation, setShowNewReservation] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [pixPaymentData, setPixPaymentData] = useState<ReservationPixPayment | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [paymentStep, setPaymentStep] = useState<'form' | 'qr' | 'checking'>('form');
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

  // Countdown timer for PIX payment expiration
  useEffect(() => {
    if (pixPaymentData && paymentStep === 'qr') {
      const expirationTime = new Date(pixPaymentData.expiresAt).getTime();
      
      const updateTimer = () => {
        const now = new Date().getTime();
        const timeLeft = Math.max(0, expirationTime - now);
        setTimeLeft(timeLeft);
        
        if (timeLeft === 0) {
          setPixError('Tempo de pagamento expirado. Gere um novo código PIX.');
          setPaymentStep('form');
          setPixPaymentData(null);
        }
      };
      
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      
      return () => clearInterval(interval);
    }
  }, [pixPaymentData, paymentStep]);

  // Poll payment status when in checking step
  useEffect(() => {
    if (paymentStep === 'checking' && pixPaymentData) {
      const checkPaymentStatus = async () => {
        try {
          const response = await fetch(`${backendUrl}/payments/pix/status/${pixPaymentData.paymentId}`);
          const result = await response.json();
          
          if (result.success && result.data.status === 'approved') {
            // Confirm reservation payment
            const confirmResponse = await fetch(`${backendUrl}/reservations/${pixPaymentData.reservationId}/confirm-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                paymentId: pixPaymentData.paymentId
              })
            });
            
            const confirmResult = await confirmResponse.json();
            
            if (confirmResult.success) {
              toast({
                title: "Pagamento confirmado!",
                description: "Sua reserva foi confirmada com sucesso.",
              });
              setShowPayment(false);
              setSelectedReservation(null);
              setPixPaymentData(null);
              setPaymentStep('form');
              fetchReservations();
            } else {
              setPixError(confirmResult.error || 'Erro ao confirmar pagamento');
              setPaymentStep('qr');
            }
          }
        } catch (error) {
          console.error('Error checking payment status:', error);
        }
      };
      
      const interval = setInterval(checkPaymentStatus, 3000); // Check every 3 seconds
      
      return () => clearInterval(interval);
    }
  }, [paymentStep, pixPaymentData, backendUrl]);

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
    } else if (field === 'payerCPF') {
      value = formatCPF(value as string);
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

    // Validate CPF
    if (!validateCPF(payerCPF)) {
      toast({
        title: "CPF inválido",
        description: "Digite um CPF válido.",
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
      setPaymentStep('form');
      setPixPaymentData(null);
      setPixError(null);
      setShowPayment(true);
    }
  };

  const createReservationPixPayment = async () => {
    if (!selectedReservation) return;

    setPixLoading(true);
    setPixError(null);

    try {
      // Use the reservation data that already has the correct payer information
      const response = await fetch(`${backendUrl}/reservations/${selectedReservation.id}/create-pix-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payerEmail: selectedReservation.payerEmail || 'reserva@exemplo.com',
          payerName: selectedReservation.ownerName,
          payerCPF: selectedReservation.payerCPF || '11144477735', // Use valid CPF from reservation
          payerPhone: selectedReservation.ownerPhone || ''
        }),
      });

      const result = await response.json();

      if (result.success) {
        setPixPaymentData(result.data);
        setPaymentStep('qr');
      } else {
        setPixError(result.error || 'Erro ao criar pagamento PIX');
      }
    } catch (error) {
      console.error('Error creating PIX payment:', error);
      setPixError('Erro de conexão. Tente novamente.');
    } finally {
      setPixLoading(false);
    }
  };

  const copyPixCode = async () => {
    if (!pixPaymentData?.pixCode) {
      toast({
        title: "Erro ao copiar",
        description: "Código PIX não disponível.",
        variant: "destructive"
      });
      return;
    }

    const success = await copyToClipboard(pixPaymentData.pixCode);
    
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Código copiado!",
        description: "Código PIX copiado para a área de transferência.",
      });
    } else {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o código PIX. Tente selecionar e copiar manualmente.",
        variant: "destructive"
      });
    }
  };

  const formatTime = (milliseconds: number): string => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
                    maxLength={14}
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

      {/* Payment Modal with PIX Integration */}
      {showPayment && paymentData && selectedReservation && (
        <Dialog open={showPayment} onOpenChange={() => setShowPayment(false)}>
          <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Pagamento da Reserva
              </DialogTitle>
              <DialogDescription>
                Reserva da vaga para {selectedReservation?.plate}
              </DialogDescription>
            </DialogHeader>

            {/* Reservation Info */}
            <Card className="mb-4">
              <CardContent className="pt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-lg">{selectedReservation?.plate}</p>
                    <p className="text-sm text-gray-600">{selectedReservation?.ownerName}</p>
                    <p className="text-sm text-gray-600">
                      {selectedReservation?.formattedDateTime} • {selectedReservation?.duration}h
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">
                      {selectedReservation?.vehicleType === 'car' ? 'Carro' : 'Moto'}
                    </Badge>
                    <p className="text-lg font-bold text-green-600 mt-1">
                      {selectedReservation?.formattedFee}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {pixError && (
              <Alert className="mb-4 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {pixError}
                </AlertDescription>
              </Alert>
            )}

            {/* Step 1: Payment Form */}
            {paymentStep === 'form' && (
              <div className="space-y-4">
                <Alert className="mb-4 border-blue-200 bg-blue-50">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    Clique no botão abaixo para gerar o QR code PIX e realizar o pagamento desta reserva.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowPayment(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={createReservationPixPayment}
                    disabled={pixLoading}
                    className="flex-1"
                  >
                    {pixLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <QrCode className="w-4 h-4 mr-2" />
                        Gerar PIX
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: PIX QR Code */}
            {paymentStep === 'qr' && pixPaymentData && (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600 mb-2">
                    {pixPaymentData.formattedAmount}
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>Expira em: {formatTime(timeLeft)}</span>
                  </div>
                </div>

                {/* PIX QR Code */}
                <div className="text-center space-y-4">
                  <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 inline-block">
                    {pixPaymentData.pixCodeBase64 ? (
                      <img 
                        src={pixPaymentData.pixCodeBase64.startsWith('data:') ? pixPaymentData.pixCodeBase64 : `data:image/png;base64,${pixPaymentData.pixCodeBase64}`}
                        alt="QR Code PIX" 
                        className="w-48 h-48 mx-auto"
                      />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded">
                        <QrCode className="w-16 h-16 text-gray-400" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Escaneie o QR Code com seu app do banco ou copie o código PIX
                    </p>
                    
                    <div className="flex gap-2">
                      <Input
                        value={pixPaymentData.pixCode}
                        readOnly
                        className="text-xs font-mono"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={copyPixCode}
                        className="whitespace-nowrap"
                      >
                        {copied ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-1" />
                            Copiar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowPayment(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={() => setPaymentStep('checking')}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Já Paguei
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Checking Payment */}
            {paymentStep === 'checking' && (
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
                
                <div>
                  <p className="font-medium">Verificando pagamento...</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Aguarde enquanto confirmamos seu pagamento PIX
                  </p>
                </div>

                <Button 
                  variant="outline" 
                  onClick={() => setPaymentStep('qr')}
                  className="w-full"
                >
                  Voltar ao QR Code
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

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
            <Card 
              key={reservation.id} 
              className={`transition-all duration-200 cursor-pointer hover:shadow-md ${
                reservation.status === 'pending_payment' ? 'hover:bg-yellow-50 border-yellow-200' : 'hover:bg-gray-50'
              }`}
              onClick={() => handleReservationClick(reservation)}
            >
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelReservation(reservation.id);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  )}
                  
                  {reservation.status === 'pending_payment' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelReservation(reservation.id);
                      }}
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