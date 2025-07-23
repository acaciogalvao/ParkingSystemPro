import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Car, Bike, CheckCircle, AlertCircle } from "lucide-react";

interface VehicleEntryProps {
  onSuccess: () => void;
}

// Validação de placas brasileiras (antigo e Mercosul)
const validateBrazilianPlate = (plate: string): { isValid: boolean; type: string | null; error: string | null } => {
  if (!plate) {
    return { isValid: false, type: null, error: null };
  }

  // Remove espaços
  const cleanPlate = plate.trim().replace(/\s+/g, '');
  
  // Formato antigo: ABC-1234 (3 letras + hífen + 4 números = 8 caracteres)
  const oldFormatRegex = /^[A-Z]{3}-\d{4}$/;
  
  // Formato Mercosul: ABC1A12 (3 letras + 1 número + 1 letra + 2 números = 7 caracteres)
  const mercosulRegex = /^[A-Z]{3}\d[A-Z]\d{2}$/;
  
  if (oldFormatRegex.test(cleanPlate)) {
    return { isValid: true, type: 'antigo', error: null };
  }
  
  if (mercosulRegex.test(cleanPlate)) {
    return { isValid: true, type: 'mercosul', error: null };
  }
  
  // Verificar se está em processo de digitação (não mostrar erro até ter pelo menos 7 caracteres para Mercosul ou 8 para antigo)
  if (cleanPlate.length < 7) {
    return { isValid: false, type: null, error: null };
  }
  
  return { 
    isValid: false, 
    type: null, 
    error: 'Formato inválido. Use ABC-1234 (antigo) ou ABC1A12 (Mercosul)' 
  };
};

// Formatação automática da placa durante digitação
const formatPlateInput = (value: string): string => {
  // Remove caracteres não permitidos e converte para maiúsculo
  let cleaned = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  
  // Se já tem hífen, é formato antigo - manter como está
  if (cleaned.includes('-')) {
    return cleaned;
  }
  
  // Auto-formatação para formato antigo: ABC1234 -> ABC-1234
  // Inserir hífen apenas se o 5º caractere for um número
  if (cleaned.length >= 4) {
    // Verifica se os primeiros 3 caracteres são letras
    const first3 = cleaned.slice(0, 3);
    const fourth = cleaned.slice(3, 4);
    const fifth = cleaned.slice(4, 5);
    
    if (/^[A-Z]{3}$/.test(first3) && /^\d$/.test(fourth)) {
      // Se o 5º caractere existir e for um número, é formato antigo - adicionar hífen
      if (fifth && /^\d$/.test(fifth)) {
        return first3 + '-' + cleaned.slice(3);
      }
      // Se ainda não digitou o 5º caractere, aguardar
      else if (!fifth) {
        return cleaned;
      }
      // Se o 5º caractere for letra, é Mercosul - não adicionar hífen
      else {
        return cleaned;
      }
    }
  }
  
  return cleaned;
};

export function VehicleEntry({ onSuccess }: VehicleEntryProps) {
  const [formData, setFormData] = useState({
    plate: "",
    type: "",
    model: "",
    color: "",
    ownerName: "",
    ownerPhone: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [plateValidation, setPlateValidation] = useState<{ isValid: boolean; type: string | null; error: string | null }>({ isValid: false, type: null, error: null });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    // Validar placa antes do envio
    const plateCheck = validateBrazilianPlate(formData.plate);
    if (!plateCheck.isValid) {
      setMessage({
        type: 'error',
        text: plateCheck.error || 'Placa inválida'
      });
      setIsSubmitting(false);
      return;
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Success simulation
      setMessage({
        type: 'success',
        text: `Veículo ${formData.plate} registrado! Vaga: ${formData.type === 'car' ? 'A-' : 'M-'}${Math.floor(Math.random() * 50) + 1}`
      });
      
      // Reset form
      setFormData({
        plate: "",
        type: "",
        model: "",
        color: "",
        ownerName: "",
        ownerPhone: ""
      });
      
      // Reset validation
      setPlateValidation({ isValid: false, type: null, error: null });
      
      setTimeout(() => {
        onSuccess();
      }, 2000);
      
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Erro ao registrar veículo. Tente novamente.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'plate') {
      const formattedValue = formatPlateInput(value);
      const validation = validateBrazilianPlate(formattedValue);
      setPlateValidation(validation);
      setFormData(prev => ({ ...prev, [field]: formattedValue }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <div className="px-4 space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Car className="w-5 h-5" />
            Nova Entrada
          </CardTitle>
          <CardDescription className="text-sm">
            Registre um novo veículo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Vehicle Type - Mobile First */}
            <div className="space-y-2">
              <Label htmlFor="type" className="text-sm font-medium">Tipo de Veículo</Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="car">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4" />
                      Carro
                    </div>
                  </SelectItem>
                  <SelectItem value="motorcycle">
                    <div className="flex items-center gap-2">
                      <Bike className="w-4 h-4" />
                      Moto
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* License Plate - Mobile Optimized com Validação */}
            <div className="space-y-2">
              <Label htmlFor="plate" className="text-sm font-medium">Placa do Veículo</Label>
              <Input
                id="plate"
                placeholder="ABC-1234 ou ABC1A12"
                value={formData.plate}
                onChange={(e) => handleInputChange('plate', e.target.value)}
                maxLength={8}
                className={`h-12 text-center text-lg font-mono tracking-wider ${
                  plateValidation.error 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                    : plateValidation.isValid 
                    ? 'border-green-500 focus:border-green-500 focus:ring-green-500' 
                    : ''
                }`}
                required
              />
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
              <p className="text-xs text-gray-500">
                Formatos aceitos: ABC-1234 (antigo) ou ABC1A12 (Mercosul)
              </p>
            </div>

            {/* Vehicle Details - Stacked for Mobile */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="model" className="text-sm font-medium">Modelo</Label>
                <Input
                  id="model"
                  placeholder="Honda Civic"
                  value={formData.model}
                  onChange={(e) => handleInputChange('model', e.target.value)}
                  className="h-12"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color" className="text-sm font-medium">Cor</Label>
                <Select value={formData.color} onValueChange={(value) => handleInputChange('color', value)}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Selecione a cor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Branco">Branco</SelectItem>
                    <SelectItem value="Preto">Preto</SelectItem>
                    <SelectItem value="Prata">Prata</SelectItem>
                    <SelectItem value="Azul">Azul</SelectItem>
                    <SelectItem value="Vermelho">Vermelho</SelectItem>
                    <SelectItem value="Cinza">Cinza</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Owner Details - Stacked for Mobile */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ownerName" className="text-sm font-medium">Nome do Proprietário</Label>
                <Input
                  id="ownerName"
                  placeholder="João Silva"
                  value={formData.ownerName}
                  onChange={(e) => handleInputChange('ownerName', e.target.value)}
                  className="h-12"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerPhone" className="text-sm font-medium">Telefone (Opcional)</Label>
                <Input
                  id="ownerPhone"
                  placeholder="(11) 99999-9999"
                  value={formData.ownerPhone}
                  onChange={(e) => handleInputChange('ownerPhone', e.target.value)}
                  className="h-12"
                />
              </div>
            </div>

            {/* Message */}
            {message && (
              <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                {message.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                  {message.text}
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Button - Mobile Optimized */}
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-medium" 
              disabled={isSubmitting || !formData.plate || !plateValidation.isValid || !formData.type || !formData.model || !formData.ownerName}
            >
              {isSubmitting ? 'Registrando...' : 'Registrar Entrada'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}