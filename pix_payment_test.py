#!/usr/bin/env python3
"""
PIX Payment System Test for ParkSystem Pro
Tests the PIX payment functionality specifically as requested
"""

import requests
import json
import time
from datetime import datetime

# Backend URL
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

class PixPaymentTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.test_results = {
            "passed": 0,
            "failed": 0,
            "total": 0
        }
    
    def add_result(self, test_name, passed, message):
        self.test_results["total"] += 1
        if passed:
            self.test_results["passed"] += 1
            print_success(f"{test_name}: {message}")
        else:
            self.test_results["failed"] += 1
            print_error(f"{test_name}: {message}")
    
    def test_find_tst_vehicle(self):
        """Find the TST-1234 vehicle"""
        print_test_header("Finding TST-1234 Vehicle")
        
        try:
            # Search for TST-1234 vehicle
            response = requests.get(f"{self.base_url}/api/vehicles/search?plate=TST-1234", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("data"):
                    vehicles = data["data"]
                    if vehicles:
                        vehicle = vehicles[0]
                        vehicle_id = vehicle["id"]
                        plate = vehicle["plate"]
                        spot = vehicle["spot"]
                        status = vehicle["status"]
                        
                        print_info(f"Found vehicle: {plate} at spot {spot} (Status: {status})")
                        print_info(f"Vehicle ID: {vehicle_id}")
                        
                        if status == "parked":
                            self.add_result("Find TST-1234", True, f"Vehicle {plate} found and parked at {spot}")
                            return vehicle_id
                        else:
                            self.add_result("Find TST-1234", False, f"Vehicle {plate} found but not parked (Status: {status})")
                            return None
                    else:
                        self.add_result("Find TST-1234", False, "No vehicles found with plate TST-1234")
                        return None
                else:
                    self.add_result("Find TST-1234", False, f"Invalid response format: {data}")
                    return None
            else:
                self.add_result("Find TST-1234", False, f"HTTP {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            self.add_result("Find TST-1234", False, f"Request error: {str(e)}")
            return None
    
    def test_pix_payment_creation(self, vehicle_id):
        """Test PIX payment creation"""
        print_test_header("PIX Payment Creation Test")
        
        if not vehicle_id:
            self.add_result("PIX Payment Creation", False, "No vehicle ID provided")
            return None
        
        try:
            # Create PIX payment
            payment_data = {
                "vehicleId": vehicle_id,
                "payerEmail": "joao@test.com",
                "payerName": "João Silva",
                "payerCPF": "11144477735",  # Valid CPF
                "payerPhone": "(11) 99999-9999"
            }
            
            print_info(f"Creating PIX payment for vehicle ID: {vehicle_id}")
            response = requests.post(
                f"{self.base_url}/api/payments/pix/create",
                json=payment_data,
                timeout=15
            )
            
            print_info(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print_info(f"Response data: {json.dumps(data, indent=2)}")
                
                if data.get("success"):
                    payment_info = data.get("data", {})
                    payment_id = payment_info.get("paymentId")
                    amount = payment_info.get("amount")
                    formatted_amount = payment_info.get("formattedAmount")
                    pix_code = payment_info.get("pixCode")
                    pix_code_base64 = payment_info.get("pixCodeBase64")
                    
                    print_success(f"PIX payment created successfully!")
                    print_info(f"Payment ID: {payment_id}")
                    print_info(f"Amount: {formatted_amount} (Raw: {amount})")
                    print_info(f"PIX Code length: {len(pix_code) if pix_code else 0} characters")
                    print_info(f"PIX Code (first 50 chars): {pix_code[:50] if pix_code else 'None'}...")
                    print_info(f"QR Code Base64 present: {'Yes' if pix_code_base64 else 'No'}")
                    
                    # Check if it's not demo
                    is_demo = (pix_code == "demo_qr_code_string" or 
                              (pix_code and "demo" in pix_code.lower()) or
                              (payment_id and "demo" in str(payment_id).lower()))
                    
                    if is_demo:
                        print_warning("⚠️ PIX payment appears to be in DEMO mode")
                        self.add_result("PIX Payment Creation", True, "PIX payment created (DEMO mode)")
                    else:
                        print_success("✅ PIX payment appears to be REAL (production mode)")
                        self.add_result("PIX Payment Creation", True, "PIX payment created (PRODUCTION mode)")
                    
                    # Validate PIX code
                    if pix_code and len(pix_code) > 100:
                        print_success("✅ PIX code appears valid (length > 100 characters)")
                    else:
                        print_warning(f"⚠️ PIX code might be invalid (length: {len(pix_code) if pix_code else 0})")
                    
                    return payment_id
                else:
                    error_msg = data.get("error", "Unknown error")
                    self.add_result("PIX Payment Creation", False, f"API returned error: {error_msg}")
                    return None
            else:
                error_text = response.text
                print_error(f"HTTP {response.status_code}: {error_text}")
                self.add_result("PIX Payment Creation", False, f"HTTP {response.status_code}: {error_text}")
                return None
                
        except Exception as e:
            self.add_result("PIX Payment Creation", False, f"Request error: {str(e)}")
            return None
    
    def test_pix_payment_status(self, payment_id):
        """Test PIX payment status check"""
        print_test_header("PIX Payment Status Check")
        
        if not payment_id:
            self.add_result("PIX Payment Status", False, "No payment ID provided")
            return
        
        try:
            response = requests.get(f"{self.base_url}/api/payments/pix/status/{payment_id}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    status_info = data.get("data", {})
                    status = status_info.get("status")
                    status_detail = status_info.get("statusDetail")
                    
                    print_info(f"Payment status: {status}")
                    print_info(f"Status detail: {status_detail}")
                    
                    self.add_result("PIX Payment Status", True, f"Status check successful: {status}")
                else:
                    error_msg = data.get("error", "Unknown error")
                    self.add_result("PIX Payment Status", False, f"Status check failed: {error_msg}")
            else:
                self.add_result("PIX Payment Status", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.add_result("PIX Payment Status", False, f"Request error: {str(e)}")
    
    def run_all_tests(self):
        """Run all PIX payment tests"""
        print(f"{Colors.BOLD}{Colors.BLUE}🚀 PIX PAYMENT SYSTEM TEST - ParkSystem Pro{Colors.ENDC}")
        print(f"{Colors.BLUE}Backend URL: {self.base_url}{Colors.ENDC}")
        print("=" * 80)
        
        # Test 1: Find TST-1234 vehicle
        vehicle_id = self.test_find_tst_vehicle()
        
        # Test 2: Create PIX payment
        payment_id = self.test_pix_payment_creation(vehicle_id)
        
        # Test 3: Check payment status
        if payment_id:
            self.test_pix_payment_status(payment_id)
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print(f"{Colors.BOLD}{Colors.BLUE}📊 PIX PAYMENT TEST SUMMARY{Colors.ENDC}")
        print("=" * 60)
        print(f"Total Tests: {self.test_results['total']}")
        print(f"{Colors.GREEN}Passed: {self.test_results['passed']}{Colors.ENDC}")
        print(f"{Colors.RED}Failed: {self.test_results['failed']}{Colors.ENDC}")
        
        if self.test_results['total'] > 0:
            success_rate = (self.test_results['passed'] / self.test_results['total']) * 100
            print(f"Success Rate: {success_rate:.1f}%")
        
        print("=" * 60)
        
        if self.test_results['failed'] == 0:
            print(f"{Colors.GREEN}{Colors.BOLD}🎉 ALL PIX PAYMENT TESTS PASSED!{Colors.ENDC}")
        else:
            print(f"{Colors.YELLOW}{Colors.BOLD}⚠️  SOME TESTS FAILED - CHECK RESULTS ABOVE{Colors.ENDC}")

if __name__ == "__main__":
    tester = PixPaymentTester()
    tester.run_all_tests()