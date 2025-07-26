import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Lock,
  User,
  Mail,
  Phone
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

interface CardPaymentProps {
  vehicle: Vehicle;
  onSuccess: () => void;
  onCancel: () => void;
  isOpen: boolean;
}

interface PaymentData {
  paymentId: string;
  amount: number;
  formattedAmount: string;
  status: string;
  paymentMethod: string;
  cardBrand: string;
  cardLastFourDigits: string;
  installments: number;
}

// Função para validar CPF
function validateCPF(cpf: string): boolean {
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
}

// Função para validar número do cartão (Luhn algorithm)
function validateCardNumber(cardNumber: string): boolean {
  cardNumber = cardNumber.replace(/\D/g, '');
  
  if (cardNumber.length < 13 || cardNumber.length > 19) {
    return false;
  }
  
  let sum = 0;
  let alternate = false;
  
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let n = parseInt(cardNumber.charAt(i));
    
    if (alternate) {
      n *= 2;
      if (n > 9) {
        n = (n % 10) + 1;
      }
    }
    
    sum += n;
    alternate = !alternate;
  }
  
  return (sum % 10) === 0;
}

// Função para detectar bandeira do cartão
function detectCardBrand(cardNumber: string): string {
  cardNumber = cardNumber.replace(/\D/g, '');
  
  if (/^4/.test(cardNumber)) return 'visa';
  if (/^5[1-5]/.test(cardNumber) || /^2[2-7]/.test(cardNumber)) return 'mastercard';
  if (/^3[47]/.test(cardNumber)) return 'amex';
  if (/^6/.test(cardNumber)) return 'discover';
  if (/^35/.test(cardNumber)) return 'jcb';
  
  return 'unknown';
}

// Função para formatar número do cartão
function formatCardNumber(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  const groups = cleaned.match(/.{1,4}/g) || [];
  return groups.join(' ').substr(0, 19);
}

// Função para formatar data de expiração
function formatExpiryDate(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length >= 2) {
    return cleaned.substr(0, 2) + '/' + cleaned.substr(2, 2);
  }
  return cleaned;
}

// Função para formatar CPF
function formatCPF(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  const groups = cleaned.match(/^(\d{3})(\d{3})(\d{3})(\d{2})$/);
  if (groups) {
    return `${groups[1]}.${groups[2]}.${groups[3]}-${groups[4]}`;
  }
  return cleaned;
}

export function CardPayment({ vehicle, onSuccess, onCancel, isOpen }: CardPaymentProps) {
  const [step, setStep] = useState<'form' | 'processing' | 'success' | 'error'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  
  // Form data
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [payerCPF, setPayerCPF] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [paymentType, setPaymentType] = useState<'credit' | 'debit'>('credit');
  const [installments, setInstallments] = useState(1);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || '';

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setError('');
      setPaymentData(null);
      setPayerName('');
      setPayerEmail('');
      setPayerCPF('');
      setPayerPhone('');
      setCardNumber('');
      setCardExpiry('');
      setCardCVV('');
      setCardHolderName('');
      setPaymentType('credit');
      setInstallments(1);
    }
  }, [isOpen]);

  const validateForm = (): string | null => {
    if (!payerName.trim()) return 'Nome do pagador é obrigatório';
    if (!payerEmail.trim()) return 'Email é obrigatório';
    if (!validateCPF(payerCPF)) return 'CPF inválido';
    if (!cardNumber.trim()) return 'Número do cartão é obrigatório';
    if (!validateCardNumber(cardNumber)) return 'Número do cartão inválido';
    if (!cardExpiry.trim() || cardExpiry.length < 5) return 'Data de expiração inválida';
    if (!cardCVV.trim() || cardCVV.length < 3) return 'CVV inválido';
    if (!cardHolderName.trim()) return 'Nome no cartão é obrigatório';
    
    // Validate expiry date
    const [month, year] = cardExpiry.split('/');
    const expDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
    const now = new Date();
    if (expDate < now) return 'Cartão expirado';
    
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    setStep('processing');

    try {
      // In a real implementation, you would tokenize the card data securely
      // For demo purposes, we'll simulate a card token
      const cardBrand = detectCardBrand(cardNumber);
      const cardToken = `card_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const cardLastFour = cardNumber.replace(/\D/g, '').slice(-4);

      const response = await fetch(`${backendUrl}/api/payments/card/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicleId: vehicle.id,
          payerEmail: payerEmail,
          payerName: payerName,
          payerCPF: payerCPF.replace(/\D/g, ''),
          payerPhone: payerPhone,
          cardToken: cardToken,
          cardBrand: cardBrand,
          cardLastFourDigits: cardLastFour,
          paymentType: paymentType,
          installments: paymentType === 'credit' ? installments : 1
        })
      });

      const result = await response.json();

      if (result.success) {
        setPaymentData(result.data);
        if (result.data.status === 'approved') {
          setStep('success');
          setTimeout(() => {
            onSuccess();
          }, 2000);
        } else {
          // Start polling for payment status
          pollPaymentStatus(result.data.paymentId);
        }
      } else {
        setError(result.error || 'Erro ao processar pagamento');
        setStep('error');
      }
    } catch (error) {
      console.error('Error creating card payment:', error);
      setError('Erro de conexão. Tente novamente.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = async (paymentId: string) => {
    const maxAttempts = 30; // 30 attempts = 30 seconds
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/payments/card/status/${paymentId}`);
        const result = await response.json();

        if (result.success) {
          if (result.data.status === 'approved') {
            setStep('success');
            setTimeout(() => {
              onSuccess();
            }, 2000);
            return;
          } else if (result.data.status === 'rejected') {
            setError('Pagamento foi rejeitado');
            setStep('error');
            return;
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 1000); // Check again in 1 second
        } else {
          setError('Timeout na verificação do pagamento');
          setStep('error');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 1000);
        } else {
          setError('Erro na verificação do pagamento');
          setStep('error');
        }
      }
    };

    checkStatus();
  };

  const renderForm = () => (
    <div className="space-y-6">
      {/* Payment Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Tipo de Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={paymentType === 'credit' ? 'default' : 'outline'}
              onClick={() => setPaymentType('credit')}
              className="h-12 flex flex-col items-center justify-center"
            >
              <CreditCard className="w-5 h-5 mb-1" />
              <span className="text-sm">Crédito</span>
            </Button>
            <Button
              variant={paymentType === 'debit' ? 'default' : 'outline'}
              onClick={() => setPaymentType('debit')}
              className="h-12 flex flex-col items-center justify-center"
            >
              <CreditCard className="w-5 h-5 mb-1" />
              <span className="text-sm">Débito</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Card Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Lock className="w-5 h-5 mr-2" />
            Dados do Cartão
          </CardTitle>
          <CardDescription>
            Seus dados são protegidos e criptografados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="cardNumber">Número do Cartão</Label>
            <Input
              id="cardNumber"
              placeholder="0000 0000 0000 0000"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              maxLength={19}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cardExpiry">Validade</Label>
              <Input
                id="cardExpiry"
                placeholder="MM/AA"
                value={cardExpiry}
                onChange={(e) => setCardExpiry(formatExpiryDate(e.target.value))}
                maxLength={5}
              />
            </div>
            <div>
              <Label htmlFor="cardCVV">CVV</Label>
              <Input
                id="cardCVV"
                placeholder="123"
                value={cardCVV}
                onChange={(e) => setCardCVV(e.target.value.replace(/\D/g, ''))}
                maxLength={4}
                type="password"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="cardHolderName">Nome no Cartão</Label>
            <Input
              id="cardHolderName"
              placeholder="Nome como está no cartão"
              value={cardHolderName}
              onChange={(e) => setCardHolderName(e.target.value.toUpperCase())}
            />
          </div>
          
          {paymentType === 'credit' && (
            <div>
              <Label htmlFor="installments">Parcelas</Label>
              <Select value={installments.toString()} onValueChange={(value) => setInstallments(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}x sem juros
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <User className="w-5 h-5 mr-2" />
            Dados do Pagador
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="payerName">Nome Completo</Label>
            <Input
              id="payerName"
              placeholder="Nome completo do pagador"
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="payerEmail">Email</Label>
            <Input
              id="payerEmail"
              type="email"
              placeholder="email@exemplo.com"
              value={payerEmail}
              onChange={(e) => setPayerEmail(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="payerCPF">CPF</Label>
            <Input
              id="payerCPF"
              placeholder="000.000.000-00"
              value={payerCPF}
              onChange={(e) => setPayerCPF(formatCPF(e.target.value))}
              maxLength={14}
            />
          </div>
          
          <div>
            <Label htmlFor="payerPhone">Telefone (opcional)</Label>
            <Input
              id="payerPhone"
              placeholder="(11) 99999-9999"
              value={payerPhone}
              onChange={(e) => setPayerPhone(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={loading}
          className="flex-1"
        >
          {loading ? 'Processando...' : 'Pagar'}
        </Button>
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div className="text-center py-8">
      <Clock className="w-16 h-16 mx-auto mb-4 text-blue-600 animate-spin" />
      <h3 className="text-lg font-semibold mb-2">Processando Pagamento</h3>
      <p className="text-gray-600">
        Aguarde enquanto processamos seu pagamento com cartão...
      </p>
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center py-8">
      <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
      <h3 className="text-lg font-semibold mb-2">Pagamento Aprovado!</h3>
      <p className="text-gray-600 mb-4">
        Seu pagamento foi processado com sucesso.
      </p>
      {paymentData && (
        <div className="bg-green-50 p-4 rounded-lg border">
          <p className="text-sm text-green-800">
            <strong>Método:</strong> {paymentData.paymentMethod}
          </p>
          <p className="text-sm text-green-800">
            <strong>Cartão:</strong> {paymentData.cardBrand.toUpperCase()} **** {paymentData.cardLastFourDigits}
          </p>
          <p className="text-sm text-green-800">
            <strong>Valor:</strong> {paymentData.formattedAmount}
          </p>
          {paymentData.installments > 1 && (
            <p className="text-sm text-green-800">
              <strong>Parcelas:</strong> {paymentData.installments}x
            </p>
          )}
        </div>
      )}
    </div>
  );

  const renderError = () => (
    <div className="text-center py-8">
      <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
      <h3 className="text-lg font-semibold mb-2">Erro no Pagamento</h3>
      <p className="text-gray-600 mb-4">{error}</p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button onClick={() => setStep('form')} className="flex-1">
          Tentar Novamente
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Pagamento com Cartão
          </DialogTitle>
          <DialogDescription>
            Veículo: {vehicle.plate} | Vaga: {vehicle.spot}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {step === 'form' && renderForm()}
          {step === 'processing' && renderProcessing()}
          {step === 'success' && renderSuccess()}
          {step === 'error' && renderError()}
        </div>
      </DialogContent>
    </Dialog>
  );
}