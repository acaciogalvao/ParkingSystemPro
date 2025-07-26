#!/usr/bin/env python3
"""
Comprehensive Backend API Tests for ParkSystem Pro - Reservation System Focus
Tests reservation system endpoints as requested in review
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

class ReservationSystemTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.test_results = {
            "passed": 0,
            "failed": 0,
            "total": 0,
            "details": []
        }
        self.created_reservations = []  # Track created reservations for cleanup
    
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
                    print_info(f"Response: {data}")
                else:
                    self.add_result("Health Check", False, "Invalid health response format")
            else:
                self.add_result("Health Check", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.add_result("Health Check", False, f"Connection error: {str(e)}")
    
    def test_create_reservation_valid(self):
        """Test creating reservations with valid data"""
        print_test_header("Create Reservation - Valid Cases")
        
        # Calculate tomorrow at 14:00
        tomorrow = datetime.now() + timedelta(days=1)
        reservation_date = tomorrow.strftime('%Y-%m-%d')
        reservation_time = "14:00"
        
        test_cases = [
            {
                "name": "Car Reservation - 2 hours",
                "data": {
                    "vehicleType": "car",
                    "plate": "ABC-1234",
                    "ownerName": "João Silva",
                    "ownerPhone": "(11) 99999-9999",
                    "reservationDate": reservation_date,
                    "reservationTime": reservation_time,
                    "duration": 2,
                    "payerEmail": "joao@email.com",
                    "payerCPF": "12345678901"
                },
                "expected_fee": 20.0  # Car: R$10/hour * 2 hours
            },
            {
                "name": "Motorcycle Reservation - 2 hours",
                "data": {
                    "vehicleType": "motorcycle",
                    "plate": "DEF-5678",
                    "ownerName": "Maria Santos",
                    "ownerPhone": "(21) 88888-8888",
                    "reservationDate": reservation_date,
                    "reservationTime": "15:00",
                    "duration": 2,
                    "payerEmail": "maria@email.com",
                    "payerCPF": "98765432109"
                },
                "expected_fee": 14.0  # Motorcycle: R$7/hour * 2 hours
            }
        ]
        
        for test_case in test_cases:
            try:
                response = requests.post(
                    f"{self.base_url}/api/reservations/create",
                    json=test_case["data"],
                    timeout=15
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and "data" in data:
                        reservation_data = data["data"]
                        reservation_id = reservation_data["reservationId"]
                        amount = reservation_data["amount"]
                        
                        # Track for cleanup
                        self.created_reservations.append(reservation_id)
                        
                        # Validate fee calculation
                        if amount == test_case["expected_fee"]:
                            fee_valid = True
                        else:
                            fee_valid = False
                        
                        # Validate PIX payment creation
                        has_pix = all(key in reservation_data for key in ["pixCode", "paymentId"])
                        
                        if fee_valid and has_pix:
                            self.add_result(
                                f"Create Reservation - {test_case['name']}", 
                                True, 
                                f"Reservation created successfully with correct fee R${amount:.2f} and PIX payment"
                            )
                            print_info(f"Reservation ID: {reservation_id}")
                            print_info(f"Payment ID: {reservation_data.get('paymentId', 'N/A')}")
                        else:
                            issues = []
                            if not fee_valid:
                                issues.append(f"Wrong fee: expected R${test_case['expected_fee']:.2f}, got R${amount:.2f}")
                            if not has_pix:
                                issues.append("PIX payment data missing")
                            
                            self.add_result(
                                f"Create Reservation - {test_case['name']}", 
                                False, 
                                f"Issues: {'; '.join(issues)}"
                            )
                    else:
                        self.add_result(
                            f"Create Reservation - {test_case['name']}", 
                            False, 
                            f"Invalid response format: {data}"
                        )
                else:
                    self.add_result(
                        f"Create Reservation - {test_case['name']}", 
                        False, 
                        f"HTTP {response.status_code}: {response.text}"
                    )
                    
            except Exception as e:
                self.add_result(
                    f"Create Reservation - {test_case['name']}", 
                    False, 
                    f"Request error: {str(e)}"
                )
    
    def test_create_reservation_invalid(self):
        """Test creating reservations with invalid data"""
        print_test_header("Create Reservation - Invalid Cases")
        
        # Past date/time
        yesterday = datetime.now() - timedelta(days=1)
        past_date = yesterday.strftime('%Y-%m-%d')
        
        invalid_cases = [
            {
                "name": "Invalid Plate Format",
                "data": {
                    "vehicleType": "car",
                    "plate": "INVALID123",
                    "ownerName": "Test User",
                    "ownerPhone": "(11) 99999-9999",
                    "reservationDate": (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d'),
                    "reservationTime": "14:00",
                    "duration": 2,
                    "payerEmail": "test@email.com",
                    "payerCPF": "12345678901"
                },
                "expected_error": "Formato inválido"
            },
            {
                "name": "Invalid CPF",
                "data": {
                    "vehicleType": "car",
                    "plate": "ABC-1234",
                    "ownerName": "Test User",
                    "ownerPhone": "(11) 99999-9999",
                    "reservationDate": (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d'),
                    "reservationTime": "14:00",
                    "duration": 2,
                    "payerEmail": "test@email.com",
                    "payerCPF": "invalid-cpf"
                },
                "expected_error": "CPF inválido"
            },
            {
                "name": "Past Date/Time",
                "data": {
                    "vehicleType": "car",
                    "plate": "ABC-1234",
                    "ownerName": "Test User",
                    "ownerPhone": "(11) 99999-9999",
                    "reservationDate": past_date,
                    "reservationTime": "14:00",
                    "duration": 2,
                    "payerEmail": "test@email.com",
                    "payerCPF": "12345678901"
                },
                "expected_error": "deve ser para uma data e hora futura"
            },
            {
                "name": "Invalid Vehicle Type",
                "data": {
                    "vehicleType": "truck",
                    "plate": "ABC-1234",
                    "ownerName": "Test User",
                    "ownerPhone": "(11) 99999-9999",
                    "reservationDate": (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d'),
                    "reservationTime": "14:00",
                    "duration": 2,
                    "payerEmail": "test@email.com",
                    "payerCPF": "12345678901"
                },
                "expected_error": "must be one of"
            }
        ]
        
        for test_case in invalid_cases:
            try:
                response = requests.post(
                    f"{self.base_url}/api/reservations/create",
                    json=test_case["data"],
                    timeout=15
                )
                
                if response.status_code == 400:
                    error_data = response.json()
                    error_message = error_data.get("error", "")
                    
                    if test_case["expected_error"] in error_message:
                        self.add_result(
                            f"Create Reservation Invalid - {test_case['name']}", 
                            True, 
                            f"Correctly rejected: {error_message}"
                        )
                    else:
                        self.add_result(
                            f"Create Reservation Invalid - {test_case['name']}", 
                            False, 
                            f"Wrong error message: {error_message}"
                        )
                else:
                    self.add_result(
                        f"Create Reservation Invalid - {test_case['name']}", 
                        False, 
                        f"Expected 400 error, got {response.status_code}: {response.text}"
                    )
                    
            except Exception as e:
                self.add_result(
                    f"Create Reservation Invalid - {test_case['name']}", 
                    False, 
                    f"Request error: {str(e)}"
                )
    
    def test_list_reservations(self):
        """Test GET /api/reservations endpoint"""
        print_test_header("List Reservations")
        
        try:
            response = requests.get(f"{self.base_url}/api/reservations", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    reservations = data["data"]
                    self.add_result(
                        "List Reservations", 
                        True, 
                        f"Retrieved {len(reservations)} reservations"
                    )
                    
                    # Validate reservation data structure
                    if reservations:
                        first_reservation = reservations[0]
                        required_fields = ["id", "vehicleType", "plate", "ownerName", "reservationDateTime", "duration", "fee", "status"]
                        missing_fields = [field for field in required_fields if field not in first_reservation]
                        
                        if not missing_fields:
                            print_info("Reservation data structure is valid")
                            print_info(f"Sample reservation: {first_reservation['plate']} - {first_reservation['status']}")
                        else:
                            print_warning(f"Missing fields in reservation data: {missing_fields}")
                else:
                    self.add_result("List Reservations", False, f"Invalid response format: {data}")
            else:
                self.add_result("List Reservations", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.add_result("List Reservations", False, f"Request error: {str(e)}")
    
    def test_get_specific_reservation(self):
        """Test GET /api/reservations/:id endpoint"""
        print_test_header("Get Specific Reservation")
        
        if not self.created_reservations:
            self.add_result("Get Specific Reservation", False, "No reservations created to test")
            return
        
        reservation_id = self.created_reservations[0]
        
        try:
            response = requests.get(f"{self.base_url}/api/reservations/{reservation_id}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    reservation = data["data"]
                    if reservation["id"] == reservation_id:
                        self.add_result(
                            "Get Specific Reservation", 
                            True, 
                            f"Retrieved reservation {reservation_id} successfully"
                        )
                        print_info(f"Reservation: {reservation['plate']} - {reservation['status']}")
                    else:
                        self.add_result("Get Specific Reservation", False, "Wrong reservation returned")
                else:
                    self.add_result("Get Specific Reservation", False, f"Invalid response format: {data}")
            else:
                self.add_result("Get Specific Reservation", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.add_result("Get Specific Reservation", False, f"Request error: {str(e)}")
        
        # Test with invalid reservation ID
        try:
            response = requests.get(f"{self.base_url}/api/reservations/invalid-id", timeout=10)
            
            if response.status_code == 404:
                self.add_result(
                    "Get Specific Reservation - Invalid ID", 
                    True, 
                    "Correctly returned 404 for invalid reservation ID"
                )
            else:
                self.add_result(
                    "Get Specific Reservation - Invalid ID", 
                    False, 
                    f"Expected 404, got {response.status_code}"
                )
                
        except Exception as e:
            self.add_result("Get Specific Reservation - Invalid ID", False, f"Request error: {str(e)}")
    
    def test_cancel_reservation(self):
        """Test POST /api/reservations/:id/cancel endpoint"""
        print_test_header("Cancel Reservation")
        
        if not self.created_reservations:
            self.add_result("Cancel Reservation", False, "No reservations created to test cancellation")
            return
        
        reservation_id = self.created_reservations[0]
        
        try:
            response = requests.post(f"{self.base_url}/api/reservations/{reservation_id}/cancel", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    cancel_data = data["data"]
                    
                    # Validate cancellation fee calculation (50% of 1 hour rate)
                    expected_cancellation_fee = 5.0  # 50% of R$10 (car rate)
                    actual_fee = cancel_data.get("cancellationFee", 0)
                    
                    if abs(actual_fee - expected_cancellation_fee) < 0.01:  # Allow small floating point differences
                        self.add_result(
                            "Cancel Reservation", 
                            True, 
                            f"Reservation cancelled successfully with correct 50% cancellation fee: R${actual_fee:.2f}"
                        )
                        print_info(f"Refund amount: {cancel_data.get('formattedRefundAmount', 'N/A')}")
                    else:
                        self.add_result(
                            "Cancel Reservation", 
                            False, 
                            f"Wrong cancellation fee: expected R${expected_cancellation_fee:.2f}, got R${actual_fee:.2f}"
                        )
                else:
                    self.add_result("Cancel Reservation", False, f"Invalid response format: {data}")
            else:
                self.add_result("Cancel Reservation", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.add_result("Cancel Reservation", False, f"Request error: {str(e)}")
        
        # Test cancelling invalid reservation ID
        try:
            response = requests.post(f"{self.base_url}/api/reservations/invalid-id/cancel", timeout=10)
            
            if response.status_code == 404:
                self.add_result(
                    "Cancel Reservation - Invalid ID", 
                    True, 
                    "Correctly returned 404 for invalid reservation ID"
                )
            else:
                self.add_result(
                    "Cancel Reservation - Invalid ID", 
                    False, 
                    f"Expected 404, got {response.status_code}"
                )
                
        except Exception as e:
            self.add_result("Cancel Reservation - Invalid ID", False, f"Request error: {str(e)}")
    
    def test_confirm_payment(self):
        """Test POST /api/reservations/:id/confirm-payment endpoint"""
        print_test_header("Confirm Reservation Payment")
        
        if len(self.created_reservations) < 2:
            self.add_result("Confirm Payment", False, "Need at least 2 reservations to test payment confirmation")
            return
        
        reservation_id = self.created_reservations[1]  # Use second reservation
        
        # Test with missing payment ID
        try:
            response = requests.post(
                f"{self.base_url}/api/reservations/{reservation_id}/confirm-payment",
                json={},
                timeout=10
            )
            
            if response.status_code == 400:
                error_data = response.json()
                if "Payment ID é obrigatório" in error_data.get("error", ""):
                    self.add_result(
                        "Confirm Payment - Missing Payment ID", 
                        True, 
                        "Correctly rejected request without payment ID"
                    )
                else:
                    self.add_result(
                        "Confirm Payment - Missing Payment ID", 
                        False, 
                        f"Wrong error message: {error_data.get('error', 'No error')}"
                    )
            else:
                self.add_result(
                    "Confirm Payment - Missing Payment ID", 
                    False, 
                    f"Expected 400, got {response.status_code}"
                )
                
        except Exception as e:
            self.add_result("Confirm Payment - Missing Payment ID", False, f"Request error: {str(e)}")
        
        # Test with fake payment ID (will fail Mercado Pago validation, but tests endpoint structure)
        try:
            response = requests.post(
                f"{self.base_url}/api/reservations/{reservation_id}/confirm-payment",
                json={"paymentId": "fake-payment-id"},
                timeout=10
            )
            
            # This should fail due to invalid payment ID, but endpoint should handle it gracefully
            if response.status_code in [400, 500]:
                self.add_result(
                    "Confirm Payment - Invalid Payment ID", 
                    True, 
                    f"Endpoint handled invalid payment ID appropriately (HTTP {response.status_code})"
                )
            else:
                self.add_result(
                    "Confirm Payment - Invalid Payment ID", 
                    False, 
                    f"Unexpected response for invalid payment ID: {response.status_code}"
                )
                
        except Exception as e:
            self.add_result("Confirm Payment - Invalid Payment ID", False, f"Request error: {str(e)}")
    
    def test_checkin_reservation(self):
        """Test POST /api/reservations/:id/checkin endpoint"""
        print_test_header("Reservation Check-in")
        
        if len(self.created_reservations) < 2:
            self.add_result("Reservation Check-in", False, "Need reservations to test check-in")
            return
        
        reservation_id = self.created_reservations[-1]  # Use last reservation
        
        # Test with missing required fields
        try:
            response = requests.post(
                f"{self.base_url}/api/reservations/{reservation_id}/checkin",
                json={},
                timeout=10
            )
            
            if response.status_code == 400:
                error_data = response.json()
                if "Modelo e cor do veículo são obrigatórios" in error_data.get("error", ""):
                    self.add_result(
                        "Check-in - Missing Fields", 
                        True, 
                        "Correctly rejected check-in without model and color"
                    )
                else:
                    self.add_result(
                        "Check-in - Missing Fields", 
                        False, 
                        f"Wrong error message: {error_data.get('error', 'No error')}"
                    )
            else:
                self.add_result(
                    "Check-in - Missing Fields", 
                    False, 
                    f"Expected 400, got {response.status_code}"
                )
                
        except Exception as e:
            self.add_result("Check-in - Missing Fields", False, f"Request error: {str(e)}")
        
        # Test check-in with unconfirmed reservation (should fail)
        try:
            response = requests.post(
                f"{self.base_url}/api/reservations/{reservation_id}/checkin",
                json={"model": "Honda Civic", "color": "Branco"},
                timeout=10
            )
            
            if response.status_code == 400:
                error_data = response.json()
                if "deve estar confirmada" in error_data.get("error", ""):
                    self.add_result(
                        "Check-in - Unconfirmed Reservation", 
                        True, 
                        "Correctly rejected check-in for unconfirmed reservation"
                    )
                else:
                    self.add_result(
                        "Check-in - Unconfirmed Reservation", 
                        False, 
                        f"Wrong error message: {error_data.get('error', 'No error')}"
                    )
            else:
                self.add_result(
                    "Check-in - Unconfirmed Reservation", 
                    False, 
                    f"Expected 400, got {response.status_code}: {response.text}"
                )
                
        except Exception as e:
            self.add_result("Check-in - Unconfirmed Reservation", False, f"Request error: {str(e)}")
    
    def test_reservation_availability(self):
        """Test reservation availability checking by creating overlapping reservations"""
        print_test_header("Reservation Availability Logic")
        
        # Try to create overlapping reservations for the same time slot
        tomorrow = datetime.now() + timedelta(days=1)
        reservation_date = tomorrow.strftime('%Y-%m-%d')
        reservation_time = "16:00"
        
        # First reservation
        first_reservation = {
            "vehicleType": "car",
            "plate": "TEST-001",
            "ownerName": "Test User 1",
            "ownerPhone": "(11) 99999-9999",
            "reservationDate": reservation_date,
            "reservationTime": reservation_time,
            "duration": 2,
            "payerEmail": "test1@email.com",
            "payerCPF": "12345678901"
        }
        
        try:
            response1 = requests.post(
                f"{self.base_url}/api/reservations/create",
                json=first_reservation,
                timeout=15
            )
            
            if response1.status_code == 200:
                data1 = response1.json()
                if data1.get("success"):
                    reservation_id1 = data1["data"]["reservationId"]
                    self.created_reservations.append(reservation_id1)
                    print_success("First reservation created successfully")
                    
                    # Try to create overlapping reservation
                    overlapping_reservation = {
                        "vehicleType": "car",
                        "plate": "TEST-002",
                        "ownerName": "Test User 2",
                        "ownerPhone": "(11) 88888-8888",
                        "reservationDate": reservation_date,
                        "reservationTime": "17:00",  # Overlaps with first reservation (16:00-18:00)
                        "duration": 2,
                        "payerEmail": "test2@email.com",
                        "payerCPF": "98765432109"
                    }
                    
                    response2 = requests.post(
                        f"{self.base_url}/api/reservations/create",
                        json=overlapping_reservation,
                        timeout=15
                    )
                    
                    # This should succeed if there are enough spots, or fail if all spots are taken
                    if response2.status_code == 200:
                        data2 = response2.json()
                        if data2.get("success"):
                            reservation_id2 = data2["data"]["reservationId"]
                            self.created_reservations.append(reservation_id2)
                            self.add_result(
                                "Availability Check", 
                                True, 
                                "System correctly allowed overlapping reservations (sufficient spots available)"
                            )
                        else:
                            self.add_result("Availability Check", False, f"Unexpected response: {data2}")
                    elif response2.status_code == 400:
                        error_data = response2.json()
                        if "Não há vagas disponíveis" in error_data.get("error", ""):
                            self.add_result(
                                "Availability Check", 
                                True, 
                                "System correctly rejected overlapping reservation (no spots available)"
                            )
                        else:
                            self.add_result(
                                "Availability Check", 
                                False, 
                                f"Wrong error message: {error_data.get('error', 'No error')}"
                            )
                    else:
                        self.add_result(
                            "Availability Check", 
                            False, 
                            f"Unexpected status code: {response2.status_code}"
                        )
                else:
                    self.add_result("Availability Check", False, f"First reservation failed: {data1}")
            else:
                self.add_result("Availability Check", False, f"First reservation HTTP error: {response1.status_code}")
                
        except Exception as e:
            self.add_result("Availability Check", False, f"Request error: {str(e)}")
    
    def print_summary(self):
        """Print test summary"""
        print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.ENDC}")
        print(f"{Colors.BOLD}{Colors.BLUE}RESERVATION SYSTEM TEST SUMMARY{Colors.ENDC}")
        print(f"{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.ENDC}")
        
        passed = self.test_results["passed"]
        failed = self.test_results["failed"]
        total = self.test_results["total"]
        
        if failed == 0:
            print(f"{Colors.GREEN}{Colors.BOLD}✅ ALL TESTS PASSED: {passed}/{total}{Colors.ENDC}")
        else:
            print(f"{Colors.RED}{Colors.BOLD}❌ SOME TESTS FAILED: {passed}/{total} passed, {failed} failed{Colors.ENDC}")
        
        print(f"\n{Colors.BOLD}Test Results:{Colors.ENDC}")
        for result in self.test_results["details"]:
            status = "✅" if result["passed"] else "❌"
            print(f"{status} {result['test']}: {result['message']}")
        
        print(f"\n{Colors.BOLD}Created Reservations (for cleanup):{Colors.ENDC}")
        for reservation_id in self.created_reservations:
            print(f"  - {reservation_id}")
    
    def run_reservation_tests(self):
        """Run all reservation system tests"""
        print(f"{Colors.BOLD}{Colors.BLUE}🚀 RESERVATION SYSTEM TESTS - ParkSystem Pro{Colors.ENDC}")
        print(f"{Colors.BLUE}Backend URL: {self.base_url}{Colors.ENDC}")
        print("=" * 80)
        
        # Run tests in order
        self.test_health_check()
        self.test_create_reservation_valid()
        self.test_create_reservation_invalid()
        self.test_list_reservations()
        self.test_get_specific_reservation()
        self.test_cancel_reservation()
        self.test_confirm_payment()
        self.test_checkin_reservation()
        self.test_reservation_availability()
        
        # Print summary
        self.print_summary()
        
        return self.test_results

if __name__ == "__main__":
    tester = ReservationSystemTester()
    results = tester.run_reservation_tests()
    
    # Exit with appropriate code
    sys.exit(0 if results["failed"] == 0 else 1)