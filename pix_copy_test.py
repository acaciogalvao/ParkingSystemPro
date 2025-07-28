#!/usr/bin/env python3
"""
PIX Copy Functionality Test for ParkSystem Pro
Tests the PIX payment creation and copy functionality as requested
"""

import requests
import json
import time
from datetime import datetime, timedelta
import sys

# Backend URL - Using public endpoint as per instructions  
BASE_URL = "http://localhost:8001"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_test_header(test_name):
    print(f"\n{Colors.BLUE}{Colors.BOLD}=== {test_name} ==={Colors.ENDC}")

def print_success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.ENDC}")

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.ENDC}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.ENDC}")

def print_info(message):
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.ENDC}")

class PixCopyTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.test_results = {
            "passed": 0,
            "failed": 0,
            "total": 0,
            "details": []
        }
        self.test_vehicle_id = None
        self.test_reservation_id = None
    
    def add_result(self, test_name, passed, message, details=None):
        self.test_results["total"] += 1
        if passed:
            self.test_results["passed"] += 1
            print_success(f"{test_name}: {message}")
        else:
            self.test_results["failed"] += 1
            print_error(f"{test_name}: {message}")
        
        self.test_results["details"].append({
            "test": test_name,
            "passed": passed,
            "message": message,
            "details": details
        })
    
    def test_health_check(self):
        """Test health check endpoint"""
        print_test_header("Health Check Test")
        
        try:
            response = requests.get(f"{self.base_url}/api/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "status" in data and data["status"] == "healthy":
                    self.add_result("Health Check", True, "API is healthy and responding")
                    print_info(f"MercadoPago configured: {data.get('mercadoPagoConfigured', False)}")
                else:
                    self.add_result("Health Check", False, "Invalid health response format")
            else:
                self.add_result("Health Check", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.add_result("Health Check", False, f"Connection error: {str(e)}")
    
    def setup_test_vehicle(self):
        """Create a test vehicle for PIX payment testing"""
        print_test_header("Setup Test Vehicle")
        
        try:
            vehicle_data = {
                "plate": "PIX-1234",
                "type": "car",
                "model": "Test Car",
                "color": "Branco",
                "ownerName": "Test User PIX",
                "ownerPhone": "(11) 99999-9999"
            }
            
            response = requests.post(
                f"{self.base_url}/api/vehicles/entry",
                json=vehicle_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    self.test_vehicle_id = data["data"]["vehicleId"]
                    spot = data["data"]["spot"]
                    self.add_result("Setup Vehicle", True, f"Test vehicle PIX-1234 created at spot {spot}")
                    print_info(f"Vehicle ID: {self.test_vehicle_id}")
                    return True
                else:
                    self.add_result("Setup Vehicle", False, f"Invalid response format: {data}")
            else:
                self.add_result("Setup Vehicle", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.add_result("Setup Vehicle", False, f"Request error: {str(e)}")
        
        return False
    
    def test_pix_payment_creation_for_vehicle(self):
        """Test PIX payment creation for parked vehicle"""
        print_test_header("PIX Payment Creation - Parked Vehicle")
        
        if not self.test_vehicle_id:
            self.add_result("PIX Creation Vehicle", False, "No test vehicle available")
            return None
        
        try:
            payment_data = {
                "vehicleId": self.test_vehicle_id,
                "payerEmail": "test@exemplo.com",
                "payerName": "Test User PIX",
                "payerCPF": "11144477735",  # Valid test CPF
                "payerPhone": "(11) 99999-9999"
            }
            
            response = requests.post(
                f"{self.base_url}/api/payments/pix/create",
                json=payment_data,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    pix_data = data["data"]
                    
                    # Check required fields for copy functionality
                    required_fields = ["paymentId", "pixCode", "formattedAmount"]
                    missing_fields = [field for field in required_fields if field not in pix_data]
                    
                    if not missing_fields:
                        self.add_result("PIX Creation Vehicle", True, 
                                      f"PIX payment created successfully - {pix_data['formattedAmount']}")
                        print_info(f"Payment ID: {pix_data['paymentId']}")
                        print_info(f"PIX Code length: {len(pix_data['pixCode'])} characters")
                        print_info(f"Has QR Code Base64: {'pixCodeBase64' in pix_data}")
                        
                        # Test the PIX code format
                        pix_code = pix_data['pixCode']
                        if pix_code and len(pix_code) > 50:  # PIX codes are typically long
                            print_success("✅ PIX code format appears valid")
                            return pix_data
                        else:
                            print_warning("⚠️ PIX code seems too short or invalid")
                            return pix_data
                    else:
                        self.add_result("PIX Creation Vehicle", False, f"Missing fields: {missing_fields}")
                else:
                    self.add_result("PIX Creation Vehicle", False, f"Invalid response format: {data}")
            else:
                self.add_result("PIX Creation Vehicle", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.add_result("PIX Creation Vehicle", False, f"Request error: {str(e)}")
        
        return None
    
    def setup_test_reservation(self):
        """Create a test reservation for PIX payment testing"""
        print_test_header("Setup Test Reservation")
        
        try:
            # Create reservation for tomorrow
            tomorrow = datetime.now() + timedelta(days=1)
            reservation_data = {
                "vehicleType": "car",
                "plate": "RES-5678",
                "ownerName": "Test Reservation User",
                "ownerPhone": "(11) 88888-8888",
                "reservationDate": tomorrow.strftime('%Y-%m-%d'),
                "reservationTime": "14:00",
                "duration": 2,
                "payerEmail": "reservation@exemplo.com",
                "payerCPF": "11144477735"
            }
            
            response = requests.post(
                f"{self.base_url}/api/reservations/create",
                json=reservation_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    self.test_reservation_id = data["data"]["reservationId"]
                    amount = data["data"]["formattedAmount"]
                    self.add_result("Setup Reservation", True, f"Test reservation created - {amount}")
                    print_info(f"Reservation ID: {self.test_reservation_id}")
                    return True
                else:
                    self.add_result("Setup Reservation", False, f"Invalid response format: {data}")
            else:
                self.add_result("Setup Reservation", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.add_result("Setup Reservation", False, f"Request error: {str(e)}")
        
        return False
    
    def test_pix_payment_creation_for_reservation(self):
        """Test PIX payment creation for reservation"""
        print_test_header("PIX Payment Creation - Reservation")
        
        if not self.test_reservation_id:
            self.add_result("PIX Creation Reservation", False, "No test reservation available")
            return None
        
        try:
            payment_data = {
                "payerEmail": "reservation@exemplo.com",
                "payerName": "Test Reservation User",
                "payerCPF": "11144477735",
                "payerPhone": "(11) 88888-8888"
            }
            
            response = requests.post(
                f"{self.base_url}/api/reservations/{self.test_reservation_id}/create-pix-payment",
                json=payment_data,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    pix_data = data["data"]
                    
                    # Check required fields for copy functionality
                    required_fields = ["paymentId", "pixCode", "formattedAmount"]
                    missing_fields = [field for field in required_fields if field not in pix_data]
                    
                    if not missing_fields:
                        self.add_result("PIX Creation Reservation", True, 
                                      f"PIX payment created successfully - {pix_data['formattedAmount']}")
                        print_info(f"Payment ID: {pix_data['paymentId']}")
                        print_info(f"PIX Code length: {len(pix_data['pixCode'])} characters")
                        print_info(f"Has QR Code Base64: {'pixCodeBase64' in pix_data}")
                        
                        # Test the PIX code format
                        pix_code = pix_data['pixCode']
                        if pix_code and len(pix_code) > 50:  # PIX codes are typically long
                            print_success("✅ PIX code format appears valid")
                            return pix_data
                        else:
                            print_warning("⚠️ PIX code seems too short or invalid")
                            return pix_data
                    else:
                        self.add_result("PIX Creation Reservation", False, f"Missing fields: {missing_fields}")
                else:
                    self.add_result("PIX Creation Reservation", False, f"Invalid response format: {data}")
            else:
                self.add_result("PIX Creation Reservation", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.add_result("PIX Creation Reservation", False, f"Request error: {str(e)}")
        
        return None
    
    def test_pix_code_structure(self, pix_data, context=""):
        """Test PIX code structure for copy functionality"""
        print_test_header(f"PIX Code Structure Test {context}")
        
        if not pix_data:
            self.add_result(f"PIX Structure {context}", False, "No PIX data to test")
            return
        
        try:
            pix_code = pix_data.get('pixCode', '')
            
            # Test 1: PIX code exists and is not empty
            if pix_code:
                self.add_result(f"PIX Code Exists {context}", True, "PIX code is present")
            else:
                self.add_result(f"PIX Code Exists {context}", False, "PIX code is missing or empty")
                return
            
            # Test 2: PIX code format (should be a long string)
            if len(pix_code) > 50:
                self.add_result(f"PIX Code Format {context}", True, f"PIX code has valid length: {len(pix_code)} chars")
            else:
                self.add_result(f"PIX Code Format {context}", False, f"PIX code too short: {len(pix_code)} chars")
            
            # Test 3: PIX code contains expected patterns
            if pix_code.startswith('00020126') or 'pix' in pix_code.lower():
                self.add_result(f"PIX Code Pattern {context}", True, "PIX code contains expected patterns")
            else:
                self.add_result(f"PIX Code Pattern {context}", False, "PIX code doesn't match expected patterns")
            
            # Test 4: QR Code Base64 exists
            if pix_data.get('pixCodeBase64'):
                self.add_result(f"QR Code Base64 {context}", True, "QR Code Base64 is available")
            else:
                self.add_result(f"QR Code Base64 {context}", False, "QR Code Base64 is missing")
            
            # Test 5: Amount formatting
            formatted_amount = pix_data.get('formattedAmount', '')
            if formatted_amount and 'R$' in formatted_amount:
                self.add_result(f"Amount Format {context}", True, f"Amount properly formatted: {formatted_amount}")
            else:
                self.add_result(f"Amount Format {context}", False, f"Amount format issue: {formatted_amount}")
                
        except Exception as e:
            self.add_result(f"PIX Structure {context}", False, f"Error testing structure: {str(e)}")
    
    def cleanup_test_data(self):
        """Clean up test data"""
        print_test_header("Cleanup Test Data")
        
        # Exit test vehicle if it exists
        if self.test_vehicle_id:
            try:
                response = requests.post(
                    f"{self.base_url}/api/vehicles/exit",
                    json={"vehicleId": self.test_vehicle_id},
                    timeout=10
                )
                
                if response.status_code == 200:
                    print_success("✅ Test vehicle cleaned up successfully")
                else:
                    print_warning(f"⚠️ Could not clean up test vehicle: {response.status_code}")
                    
            except Exception as e:
                print_warning(f"⚠️ Error cleaning up test vehicle: {str(e)}")
        
        # Cancel test reservation if it exists
        if self.test_reservation_id:
            try:
                response = requests.post(
                    f"{self.base_url}/api/reservations/{self.test_reservation_id}/cancel",
                    timeout=10
                )
                
                if response.status_code == 200:
                    print_success("✅ Test reservation cleaned up successfully")
                else:
                    print_warning(f"⚠️ Could not clean up test reservation: {response.status_code}")
                    
            except Exception as e:
                print_warning(f"⚠️ Error cleaning up test reservation: {str(e)}")
    
    def run_all_tests(self):
        """Run all PIX copy functionality tests"""
        print(f"\n{Colors.BLUE}{Colors.BOLD}🚀 PIX COPY FUNCTIONALITY TEST - ParkSystem Pro{Colors.ENDC}")
        print(f"{Colors.BLUE}Backend URL: {self.base_url}{Colors.ENDC}")
        print("=" * 80)
        
        # 1. Health check
        self.test_health_check()
        
        # 2. Setup and test vehicle PIX payment
        if self.setup_test_vehicle():
            vehicle_pix_data = self.test_pix_payment_creation_for_vehicle()
            if vehicle_pix_data:
                self.test_pix_code_structure(vehicle_pix_data, "- Vehicle")
        
        # 3. Setup and test reservation PIX payment
        if self.setup_test_reservation():
            reservation_pix_data = self.test_pix_payment_creation_for_reservation()
            if reservation_pix_data:
                self.test_pix_code_structure(reservation_pix_data, "- Reservation")
        
        # 4. Cleanup
        self.cleanup_test_data()
        
        # 5. Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print(f"{Colors.BOLD}{Colors.BLUE}📊 PIX COPY TEST SUMMARY{Colors.ENDC}")
        print("=" * 60)
        print(f"Total Tests: {self.test_results['total']}")
        print(f"{Colors.GREEN}Passed: {self.test_results['passed']}{Colors.ENDC}")
        print(f"{Colors.RED}Failed: {self.test_results['failed']}{Colors.ENDC}")
        
        if self.test_results['total'] > 0:
            success_rate = (self.test_results['passed'] / self.test_results['total']) * 100
            print(f"Success Rate: {success_rate:.1f}%")
        
        # Print failed tests
        failed_tests = [test for test in self.test_results['details'] if not test['passed']]
        if failed_tests:
            print(f"\n{Colors.RED}{Colors.BOLD}❌ FAILED TESTS:{Colors.ENDC}")
            for test in failed_tests:
                print(f"{Colors.RED}  • {test['test']}: {test['message']}{Colors.ENDC}")
        
        print("\n" + "=" * 60)
        
        if self.test_results['failed'] == 0:
            print(f"{Colors.GREEN}{Colors.BOLD}🎉 ALL PIX COPY TESTS PASSED!{Colors.ENDC}")
            print(f"{Colors.GREEN}PIX copy functionality is working correctly.{Colors.ENDC}")
        else:
            print(f"{Colors.RED}{Colors.BOLD}🚨 PIX COPY FUNCTIONALITY HAS ISSUES!{Colors.ENDC}")
            print(f"{Colors.RED}Please check the failed tests above.{Colors.ENDC}")

def main():
    tester = PixCopyTester()
    tester.run_all_tests()
    
    # Return exit code based on test results
    return 0 if tester.test_results['failed'] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())