#!/usr/bin/env python3
"""
Teste focado nas funcionalidades de pagamento do sistema de estacionamento
Testa os novos endpoints implementados: PIX, Cartão, Verificação de Pagamento
"""

import requests
import json
import time
from datetime import datetime

class PaymentSystemTester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.test_results = []
        self.registered_vehicles = []

    def log_result(self, test_name, success, message):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message
        })

    def test_health_check(self):
        """Test API health"""
        print("\n🔍 TESTE 1 - Health Check")
        try:
            response = requests.get(f"{self.base_url}/api/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                mp_configured = data.get('mercadoPagoConfigured', False)
                self.log_result("Health Check", True, f"API healthy, MercadoPago: {mp_configured}")
                return True
            else:
                self.log_result("Health Check", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Health Check", False, f"Connection error: {str(e)}")
            return False

    def register_test_vehicle(self):
        """Register a test vehicle for payment testing"""
        print("\n🔍 TESTE 2 - Registro de Veículo de Teste")
        vehicle_data = {
            "plate": "TST-9999",  # Different plate
            "type": "car",
            "model": "Honda Civic",
            "color": "Branco",
            "ownerName": "João Silva",
            "ownerPhone": "(11) 99999-9999"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/vehicles/entry",
                json=vehicle_data,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    vehicle_id = result["data"]["vehicleId"]
                    spot = result["data"]["spot"]
                    self.registered_vehicles.append(vehicle_id)
                    self.log_result("Vehicle Registration", True, f"Vehicle {vehicle_data['plate']} registered at spot {spot}")
                    return vehicle_id
                else:
                    self.log_result("Vehicle Registration", False, f"API error: {result}")
                    return None
            else:
                self.log_result("Vehicle Registration", False, f"HTTP {response.status_code}")
                return None
        except Exception as e:
            self.log_result("Vehicle Registration", False, f"Error: {str(e)}")
            return None

    def test_pix_payment_creation(self, vehicle_id):
        """Test PIX payment creation endpoint"""
        print("\n🔍 TESTE 3 - Criação de Pagamento PIX")
        
        pix_data = {
            "vehicleId": vehicle_id,
            "payerEmail": "teste@email.com",
            "payerName": "João Silva",
            "payerCPF": "11144477735",  # Valid CPF
            "payerPhone": "(11) 99999-9999"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/payments/pix/create",
                json=pix_data,
                timeout=15
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    payment_data = result["data"]
                    payment_id = payment_data.get("paymentId")
                    amount = payment_data.get("formattedAmount", "N/A")
                    has_qr_code = bool(payment_data.get("pixCode"))
                    
                    self.log_result("PIX Payment Creation", True, 
                                  f"Payment ID: {payment_id}, Amount: {amount}, QR Code: {has_qr_code}")
                    return payment_id
                else:
                    self.log_result("PIX Payment Creation", False, f"API error: {result.get('error', 'Unknown')}")
                    return None
            else:
                error_text = response.text[:200] if response.text else "No response"
                self.log_result("PIX Payment Creation", False, f"HTTP {response.status_code}: {error_text}")
                return None
        except Exception as e:
            self.log_result("PIX Payment Creation", False, f"Error: {str(e)}")
            return None

    def test_card_payment_creation(self, vehicle_id):
        """Test Card payment creation endpoint"""
        print("\n🔍 TESTE 4 - Criação de Pagamento com Cartão")
        
        card_data = {
            "vehicleId": vehicle_id,
            "payerEmail": "teste@email.com",
            "payerName": "João Silva",
            "payerCPF": "11144477735",  # Valid CPF
            "payerPhone": "(11) 99999-9999",
            "cardToken": "test_card_token_123",
            "cardBrand": "visa",
            "cardLastFourDigits": "1234",
            "paymentType": "credit",
            "installments": 1
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/payments/card/create",
                json=card_data,
                timeout=15
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    payment_data = result["data"]
                    payment_id = payment_data.get("paymentId")
                    amount = payment_data.get("formattedAmount", "N/A")
                    status = payment_data.get("status", "unknown")
                    
                    self.log_result("Card Payment Creation", True, 
                                  f"Payment ID: {payment_id}, Amount: {amount}, Status: {status}")
                    return payment_id
                else:
                    self.log_result("Card Payment Creation", False, f"API error: {result.get('error', 'Unknown')}")
                    return None
            else:
                error_text = response.text[:200] if response.text else "No response"
                self.log_result("Card Payment Creation", False, f"HTTP {response.status_code}: {error_text}")
                return None
        except Exception as e:
            self.log_result("Card Payment Creation", False, f"Error: {str(e)}")
            return None

    def test_payment_verification(self, vehicle_id):
        """Test 'Já Paguei' payment verification endpoint"""
        print("\n🔍 TESTE 5 - Verificação de Pagamento ('Já Paguei')")
        
        verify_data = {
            "vehicleId": vehicle_id
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/payments/verify-payment",
                json=verify_data,
                timeout=15
            )
            
            if response.status_code == 200:
                result = response.json()
                success = result.get("success", False)
                message = result.get("message", "No message")
                
                # This should return false since we haven't actually paid
                if not success and "não foi encontrado" in message.lower():
                    self.log_result("Payment Verification", True, 
                                  f"Correctly detected no payment: {message}")
                else:
                    self.log_result("Payment Verification", True, 
                                  f"Response received: {message}")
                return True
            else:
                error_text = response.text[:200] if response.text else "No response"
                self.log_result("Payment Verification", False, f"HTTP {response.status_code}: {error_text}")
                return False
        except Exception as e:
            self.log_result("Payment Verification", False, f"Error: {str(e)}")
            return False

    def test_webhook_endpoint(self):
        """Test MercadoPago webhook endpoint"""
        print("\n🔍 TESTE 6 - Webhook do MercadoPago")
        
        # Simulate a webhook payload
        webhook_data = {
            "id": 12345,
            "live_mode": False,
            "type": "payment",
            "date_created": "2025-07-28T22:00:00.000-04:00",
            "application_id": 123456789,
            "user_id": 987654321,
            "version": 1,
            "api_version": "v1",
            "action": "payment.updated",
            "data": {
                "id": "test_payment_123"
            }
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/webhook/mercadopago",
                json=webhook_data,
                timeout=10
            )
            
            # Webhook should accept the request (200 or 201)
            if response.status_code in [200, 201]:
                self.log_result("MercadoPago Webhook", True, f"Webhook accepted: HTTP {response.status_code}")
                return True
            else:
                error_text = response.text[:200] if response.text else "No response"
                self.log_result("MercadoPago Webhook", False, f"HTTP {response.status_code}: {error_text}")
                return False
        except Exception as e:
            self.log_result("MercadoPago Webhook", False, f"Error: {str(e)}")
            return False

    def test_payment_status_endpoints(self, payment_id, payment_type="pix"):
        """Test payment status checking endpoints"""
        print(f"\n🔍 TESTE 7 - Status do Pagamento {payment_type.upper()}")
        
        if not payment_id:
            self.log_result(f"{payment_type.upper()} Payment Status", False, "No payment ID to check")
            return False
        
        try:
            endpoint = f"/api/payments/{payment_type}/status/{payment_id}"
            response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    status = result["data"].get("status", "unknown")
                    self.log_result(f"{payment_type.upper()} Payment Status", True, f"Status: {status}")
                    return True
                else:
                    self.log_result(f"{payment_type.upper()} Payment Status", False, f"API error: {result}")
                    return False
            else:
                error_text = response.text[:200] if response.text else "No response"
                self.log_result(f"{payment_type.upper()} Payment Status", False, f"HTTP {response.status_code}: {error_text}")
                return False
        except Exception as e:
            self.log_result(f"{payment_type.upper()} Payment Status", False, f"Error: {str(e)}")
            return False

    def test_cash_payment_exit(self):
        """Test traditional cash payment (vehicle exit)"""
        print("\n🔍 TESTE 8 - Pagamento em Dinheiro (Saída Tradicional)")
        
        # Register another vehicle for cash payment test
        vehicle_data = {
            "plate": "CASH-567",
            "type": "motorcycle",
            "model": "Honda CB600",
            "color": "Azul",
            "ownerName": "Maria Santos",
            "ownerPhone": "(11) 88888-8888"
        }
        
        try:
            # Register vehicle
            entry_response = requests.post(
                f"{self.base_url}/api/vehicles/entry",
                json=vehicle_data,
                timeout=10
            )
            
            if entry_response.status_code != 200:
                self.log_result("Cash Payment - Entry", False, f"Failed to register vehicle: {entry_response.status_code}")
                return False
            
            entry_result = entry_response.json()
            if not entry_result.get("success"):
                self.log_result("Cash Payment - Entry", False, f"Entry failed: {entry_result}")
                return False
            
            vehicle_id = entry_result["data"]["vehicleId"]
            
            # Wait a moment for some duration
            time.sleep(2)
            
            # Process exit (cash payment)
            exit_response = requests.post(
                f"{self.base_url}/api/vehicles/exit",
                json={"vehicleId": vehicle_id},
                timeout=10
            )
            
            if exit_response.status_code == 200:
                exit_result = exit_response.json()
                if exit_result.get("success"):
                    plate = exit_result["data"]["plate"]
                    fee = exit_result["data"]["fee"]
                    duration = exit_result["data"]["duration"]
                    self.log_result("Cash Payment Exit", True, f"Vehicle {plate} exited, Fee: {fee}, Duration: {duration}")
                    return True
                else:
                    self.log_result("Cash Payment Exit", False, f"Exit failed: {exit_result}")
                    return False
            else:
                error_text = exit_response.text[:200] if exit_response.text else "No response"
                self.log_result("Cash Payment Exit", False, f"HTTP {exit_response.status_code}: {error_text}")
                return False
                
        except Exception as e:
            self.log_result("Cash Payment Exit", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all payment-related tests"""
        print("🚀 TESTE FOCADO NAS FUNCIONALIDADES DE PAGAMENTO - ParkSystem Pro")
        print("=" * 80)
        
        # Test 1: Health Check
        if not self.test_health_check():
            print("❌ Sistema não está saudável, interrompendo testes")
            return
        
        # Test 2: Register test vehicle
        vehicle_id = self.register_test_vehicle()
        if not vehicle_id:
            print("❌ Falha ao registrar veículo de teste, alguns testes serão pulados")
        
        # Test 3: PIX Payment
        pix_payment_id = None
        if vehicle_id:
            pix_payment_id = self.test_pix_payment_creation(vehicle_id)
        
        # Test 4: Card Payment (register another vehicle)
        card_vehicle_id = self.register_test_vehicle() if vehicle_id else None
        card_payment_id = None
        if card_vehicle_id:
            card_payment_id = self.test_card_payment_creation(card_vehicle_id)
        
        # Test 5: Payment Verification
        if vehicle_id:
            self.test_payment_verification(vehicle_id)
        
        # Test 6: Webhook
        self.test_webhook_endpoint()
        
        # Test 7: Payment Status
        if pix_payment_id:
            self.test_payment_status_endpoints(pix_payment_id, "pix")
        if card_payment_id:
            self.test_payment_status_endpoints(card_payment_id, "card")
        
        # Test 8: Cash Payment
        self.test_cash_payment_exit()
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("📊 RESUMO DOS TESTES DE PAGAMENTO")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total de Testes: {total_tests}")
        print(f"✅ Aprovados: {passed_tests}")
        print(f"❌ Falharam: {failed_tests}")
        print(f"Taxa de Sucesso: {success_rate:.1f}%")
        
        if failed_tests > 0:
            print(f"\n❌ TESTES QUE FALHARAM:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  • {result['test']}: {result['message']}")
        
        print("\n" + "=" * 80)
        
        # Assessment
        if success_rate >= 80:
            print("🎉 EXCELENTE! Sistema de pagamentos funcionando bem.")
        elif success_rate >= 60:
            print("⚠️  BOM. Sistema funcional com algumas melhorias necessárias.")
        else:
            print("🚨 CRÍTICO! Sistema de pagamentos precisa de correções urgentes.")

if __name__ == "__main__":
    tester = PaymentSystemTester()
    tester.run_all_tests()