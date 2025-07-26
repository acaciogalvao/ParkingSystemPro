import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  QrCode, 
  Copy, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  CreditCard,
  Smartphone
} from "lucide-react";

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
  entryTimestamp?: string;
}

interface PixPaymentProps {
  vehicle: Vehicle;
  onSuccess: () => void;
  onCancel: () => void;
  isOpen: boolean;
}

interface PaymentData {
  paymentId: string;
  amount: number;
  formattedAmount: string;
  pixCode: string;
  pixCodeBase64: string;
  ticketUrl?: string;
  expiresAt: string;
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

// Formatação de CPF
const formatCPF = (value: string): string => {
  const numbersOnly = value.replace(/\D/g, '');
  const limitedNumbers = numbersOnly.slice(0, 11);
  
  if (limitedNumbers.length <= 3) {
    return limitedNumbers;
  } else if (limitedNumbers.length <= 6) {
    return `${limitedNumbers.slice(0, 3)}.${limitedNumbers.slice(3)}`;
  } else if (limitedNumbers.length <= 9) {
    return `${limitedNumbers.slice(0, 3)}.${limitedNumbers.slice(3, 6)}.${limitedNumbers.slice(6)}`;
  } else {
    return `${limitedNumbers.slice(0, 3)}.${limitedNumbers.slice(3, 6)}.${limitedNumbers.slice(6, 9)}-${limitedNumbers.slice(9)}`;
  }
};

export function PixPayment({ vehicle, onSuccess, onCancel, isOpen }: PixPaymentProps) {
  const [step, setStep] = useState<'form' | 'payment' | 'checking'>('form');
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [formData, setFormData] = useState({
    payerName: vehicle.ownerName || '',
    payerEmail: '',
    payerCPF: '',
    payerPhone: vehicle.ownerPhone || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || '/api';

  // Countdown timer for payment expiration
  useEffect(() => {
    if (paymentData && step === 'payment') {
      const expirationTime = new Date(paymentData.expiresAt).getTime();
      
      const updateTimer = () => {
        const now = new Date().getTime();
        const timeLeft = Math.max(0, expirationTime - now);
        setTimeLeft(timeLeft);
        
        if (timeLeft === 0) {
          setError('Tempo de pagamento expirado. Gere um novo código PIX.');
          setStep('form');
          setPaymentData(null);
        }
      };
      
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      
      return () => clearInterval(interval);
    }
  }, [paymentData, step]);

  // Poll payment status when in checking step
  useEffect(() => {
    if (step === 'checking' && paymentData) {
      const checkPaymentStatus = async () => {
        try {
          const response = await fetch(`${backendUrl}/payments/pix/status/${paymentData.paymentId}`);
          const result = await response.json();
          
          if (result.success && result.data.status === 'approved') {
            // Confirm payment
            const confirmResponse = await fetch(`${backendUrl}/payments/pix/confirm`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                paymentId: paymentData.paymentId,
                vehicleId: vehicle.id
              })
            });
            
            const confirmResult = await confirmResponse.json();
            
            if (confirmResult.success) {
              onSuccess();
            } else {
              setError(confirmResult.error || 'Erro ao confirmar pagamento');
              setStep('payment');
            }
          }
        } catch (error) {
          console.error('Error checking payment status:', error);
        }
      };
      
      const interval = setInterval(checkPaymentStatus, 3000); // Check every 3 seconds
      
      return () => clearInterval(interval);
    }
  }, [step, paymentData, vehicle.id, backendUrl, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validações
    if (!validateCPF(formData.payerCPF)) {
      setError('CPF inválido');
      setLoading(false);
      return;
    }

    if (!formData.payerEmail || !formData.payerName) {
      setError('Nome e email são obrigatórios');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${backendUrl}/payments/pix/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: vehicle.id,
          payerEmail: formData.payerEmail,
          payerName: formData.payerName,
          payerCPF: formData.payerCPF.replace(/\D/g, ''),
          payerPhone: formData.payerPhone
        }),
      });

      const result = await response.json();

      if (result.success) {
        setPaymentData(result.data);
        setStep('payment');
      } else {
        setError(result.error || 'Erro ao criar pagamento PIX');
      }
    } catch (error) {
      console.error('Error creating PIX payment:', error);
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const copyPixCode = async () => {
    if (paymentData?.pixCode) {
      try {
        await navigator.clipboard.writeText(paymentData.pixCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Error copying to clipboard:', error);
      }
    }
  };

  const formatTime = (milliseconds: number): string => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'payerCPF') {
      const formattedValue = formatCPF(value);
      setFormData(prev => ({ ...prev, [field]: formattedValue }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !loading && onCancel()}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Pagamento PIX
          </DialogTitle>
          <DialogDescription>
            Processamento de saída do veículo {vehicle.plate}
          </DialogDescription>
        </DialogHeader>

        {/* Vehicle Info */}
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-lg">{vehicle.plate}</p>
                <p className="text-sm text-gray-600">{vehicle.model} - {vehicle.color}</p>
                <p className="text-sm text-gray-600">Vaga: {vehicle.spot}</p>
              </div>
              <Badge variant="outline">{vehicle.type === 'car' ? 'Carro' : 'Moto'}</Badge>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Step 1: Payment Form */}
        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payerName">Nome Completo</Label>
              <Input
                id="payerName"
                value={formData.payerName}
                onChange={(e) => handleInputChange('payerName', e.target.value)}
                placeholder="Seu nome completo"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payerEmail">Email</Label>
              <Input
                id="payerEmail"
                type="email"
                value={formData.payerEmail}
                onChange={(e) => handleInputChange('payerEmail', e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payerCPF">CPF</Label>
              <Input
                id="payerCPF"
                value={formData.payerCPF}
                onChange={(e) => handleInputChange('payerCPF', e.target.value)}
                placeholder="000.000.000-00"
                maxLength={14}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payerPhone">Telefone (Opcional)</Label>
              <Input
                id="payerPhone"
                value={formData.payerPhone}
                onChange={(e) => handleInputChange('payerPhone', e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={loading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Gerando PIX...' : 'Gerar PIX'}
              </Button>
            </div>
          </form>
        )}

        {/* Step 2: Payment QR Code */}
        {step === 'payment' && paymentData && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600 mb-2">
                {paymentData.formattedAmount}
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Expira em: {formatTime(timeLeft)}</span>
              </div>
            </div>

            <Separator />

            {/* PIX QR Code */}
            <div className="text-center space-y-4">
              <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 inline-block">
                {paymentData.pixCodeBase64 ? (
                  <img 
                    src={`data:image/png;base64,${paymentData.pixCodeBase64}`}
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
                    value={paymentData.pixCode}
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

            <Separator />

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={onCancel}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                onClick={() => setStep('checking')}
                className="flex-1"
              >
                <Smartphone className="w-4 h-4 mr-2" />
                Já Paguei
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Checking Payment */}
        {step === 'checking' && (
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
              onClick={() => setStep('payment')}
              className="w-full"
            >
              Voltar ao QR Code
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}