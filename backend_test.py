#!/usr/bin/env python3
"""
Comprehensive Backend API Tests for ParkSystem Pro
Tests all endpoints with valid and invalid scenarios
"""

import requests
import json
import time
from datetime import datetime
import sys

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

class ParkSystemTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.test_results = {
            "passed": 0,
            "failed": 0,
            "total": 0,
            "details": []
        }
        self.registered_vehicles = []  # Track registered vehicles for cleanup
    
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
    
    def test_vehicle_entry_valid(self):
        """Test vehicle entry with valid data"""
        print_test_header("Vehicle Entry - Valid Cases")
        
        # Test cases with different valid plates and vehicle types
        test_cases = [
            {
                "name": "Old Format Car",
                "data": {
                    "plate": "GHI-5678",
                    "type": "car",
                    "model": "Honda Civic",
                    "color": "Branco",
                    "ownerName": "João Silva",
                    "ownerPhone": "(11) 99999-9999"
                }
            },
            {
                "name": "Mercosul Format Motorcycle", 
                "data": {
                    "plate": "JKL3C45",
                    "type": "motorcycle",
                    "model": "Honda CB600",
                    "color": "Preto",
                    "ownerName": "Maria Santos"
                }
            },
            {
                "name": "Old Format Motorcycle",
                "data": {
                    "plate": "MNO-4321",
                    "type": "motorcycle", 
                    "model": "Yamaha MT-07",
                    "color": "Azul",
                    "ownerName": "Pedro Costa",
                    "ownerPhone": "(21) 88888-8888"
                }
            }
        ]
        
        for test_case in test_cases:
            try:
                response = requests.post(
                    f"{self.base_url}/api/vehicles/entry",
                    json=test_case["data"],
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and "data" in data:
                        vehicle_id = data["data"]["vehicleId"]
                        spot = data["data"]["spot"]
                        self.registered_vehicles.append(vehicle_id)
                        
                        # Validate spot format
                        if test_case["data"]["type"] == "car" and spot.startswith("A-"):
                            spot_valid = True
                        elif test_case["data"]["type"] == "motorcycle" and spot.startswith("M-"):
                            spot_valid = True
                        else:
                            spot_valid = False
                        
                        if spot_valid:
                            self.add_result(
                                f"Vehicle Entry - {test_case['name']}", 
                                True, 
                                f"Vehicle {test_case['data']['plate']} registered successfully at spot {spot}"
                            )
                        else:
                            self.add_result(
                                f"Vehicle Entry - {test_case['name']}", 
                                False, 
                                f"Invalid spot allocation: {spot} for {test_case['data']['type']}"
                            )
                    else:
                        self.add_result(
                            f"Vehicle Entry - {test_case['name']}", 
                            False, 
                            f"Invalid response format: {data}"
                        )
                else:
                    self.add_result(
                        f"Vehicle Entry - {test_case['name']}", 
                        False, 
                        f"HTTP {response.status_code}: {response.text}"
                    )
                    
            except Exception as e:
                self.add_result(
                    f"Vehicle Entry - {test_case['name']}", 
                    False, 
                    f"Request error: {str(e)}"
                )
    
    def test_vehicle_entry_invalid(self):
        """Test vehicle entry with invalid data"""
        print_test_header("Vehicle Entry - Invalid Cases")
        
        invalid_cases = [
            {
                "name": "Invalid Plate Format",
                "data": {
                    "plate": "INVALID123",
                    "type": "car",
                    "model": "Test Car",
                    "color": "Branco",
                    "ownerName": "Test User"
                },
                "expected_error": "Formato inválido"
            },
            {
                "name": "Duplicate Vehicle",
                "data": {
                    "plate": "GHI-5678",  # Should be a new plate we're registering
                    "type": "car",
                    "model": "Another Car",
                    "color": "Preto",
                    "ownerName": "Another User"
                },
                "expected_error": "já está estacionado"
            }
        ]
        
        for test_case in invalid_cases:
            try:
                response = requests.post(
                    f"{self.base_url}/api/vehicles/entry",
                    json=test_case["data"],
                    timeout=10
                )
                
                if response.status_code == 400:
                    error_data = response.json()
                    if test_case["expected_error"] in error_data.get("detail", ""):
                        self.add_result(
                            f"Vehicle Entry Invalid - {test_case['name']}", 
                            True, 
                            f"Correctly rejected: {error_data['detail']}"
                        )
                    else:
                        self.add_result(
                            f"Vehicle Entry Invalid - {test_case['name']}", 
                            False, 
                            f"Wrong error message: {error_data.get('detail', 'No detail')}"
                        )
                else:
                    self.add_result(
                        f"Vehicle Entry Invalid - {test_case['name']}", 
                        False, 
                        f"Expected 400 error, got {response.status_code}: {response.text}"
                    )
                    
            except Exception as e:
                self.add_result(
                    f"Vehicle Entry Invalid - {test_case['name']}", 
                    False, 
                    f"Request error: {str(e)}"
                )
    
    def test_get_vehicles(self):
        """Test getting list of parked vehicles"""
        print_test_header("Get Vehicles List")
        
        try:
            response = requests.get(f"{self.base_url}/api/vehicles", timeout=10)
            
            if response.status_code == 200:
                vehicles = response.json()
                if isinstance(vehicles, list):
                    vehicle_count = len(vehicles)
                    self.add_result(
                        "Get Vehicles", 
                        True, 
                        f"Retrieved {vehicle_count} parked vehicles"
                    )
                    
                    # Validate vehicle data structure
                    if vehicle_count > 0:
                        first_vehicle = vehicles[0]
                        required_fields = ["id", "plate", "type", "model", "color", "ownerName", "spot", "status"]
                        missing_fields = [field for field in required_fields if field not in first_vehicle]
                        
                        if not missing_fields:
                            print_info(f"Vehicle data structure is valid")
                            print_info(f"Sample vehicle: {first_vehicle['plate']} at spot {first_vehicle['spot']}")
                        else:
                            print_warning(f"Missing fields in vehicle data: {missing_fields}")
                else:
                    self.add_result("Get Vehicles", False, "Response is not a list")
            else:
                self.add_result("Get Vehicles", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.add_result("Get Vehicles", False, f"Request error: {str(e)}")
    
    def test_search_vehicles(self):
        """Test vehicle search functionality"""
        print_test_header("Vehicle Search")
        
        search_tests = [
            {
                "name": "Search by Plate",
                "params": {"plate": "ABC"},
                "description": "Search vehicles with plates containing 'ABC'"
            },
            {
                "name": "Search by Owner",
                "params": {"owner": "Silva"},
                "description": "Search vehicles with owners containing 'Silva'"
            },
            {
                "name": "Search by Plate and Owner",
                "params": {"plate": "DEF", "owner": "Santos"},
                "description": "Search with both plate and owner filters"
            }
        ]
        
        for test in search_tests:
            try:
                response = requests.get(
                    f"{self.base_url}/api/vehicles/search",
                    params=test["params"],
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and "data" in data:
                        results = data["data"]
                        self.add_result(
                            f"Vehicle Search - {test['name']}", 
                            True, 
                            f"Search returned {len(results)} results"
                        )
                        print_info(f"{test['description']}")
                    else:
                        self.add_result(
                            f"Vehicle Search - {test['name']}", 
                            False, 
                            f"Invalid response format: {data}"
                        )
                else:
                    self.add_result(
                        f"Vehicle Search - {test['name']}", 
                        False, 
                        f"HTTP {response.status_code}: {response.text}"
                    )
                    
            except Exception as e:
                self.add_result(
                    f"Vehicle Search - {test['name']}", 
                    False, 
                    f"Request error: {str(e)}"
                )
    
    def test_parking_spots(self):
        """Test parking spots endpoint"""
        print_test_header("Parking Spots")
        
        try:
            response = requests.get(f"{self.base_url}/api/spots", timeout=10)
            
            if response.status_code == 200:
                spots = response.json()
                if isinstance(spots, list):
                    total_spots = len(spots)
                    car_spots = [s for s in spots if s["type"] == "car"]
                    motorcycle_spots = [s for s in spots if s["type"] == "motorcycle"]
                    occupied_spots = [s for s in spots if s["isOccupied"]]
                    
                    self.add_result(
                        "Parking Spots", 
                        True, 
                        f"Retrieved {total_spots} spots ({len(car_spots)} cars, {len(motorcycle_spots)} motorcycles, {len(occupied_spots)} occupied)"
                    )
                    
                    # Validate spot structure
                    if total_spots > 0:
                        sample_spot = spots[0]
                        required_fields = ["id", "type", "isOccupied", "isReserved"]
                        missing_fields = [field for field in required_fields if field not in sample_spot]
                        
                        if not missing_fields:
                            print_info("Spot data structure is valid")
                        else:
                            print_warning(f"Missing fields in spot data: {missing_fields}")
                else:
                    self.add_result("Parking Spots", False, "Response is not a list")
            else:
                self.add_result("Parking Spots", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.add_result("Parking Spots", False, f"Request error: {str(e)}")
    
    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        print_test_header("Dashboard Statistics")
        
        try:
            response = requests.get(f"{self.base_url}/api/dashboard/stats", timeout=10)
            
            if response.status_code == 200:
                stats = response.json()
                required_fields = ["totalCarsParked", "totalMotorcyclesParked", "availableSpots", "todayRevenue", "occupancyRate"]
                missing_fields = [field for field in required_fields if field not in stats]
                
                if not missing_fields:
                    self.add_result(
                        "Dashboard Stats", 
                        True, 
                        f"Stats retrieved successfully"
                    )
                    print_info(f"Cars: {stats['totalCarsParked']}, Motorcycles: {stats['totalMotorcyclesParked']}")
                    print_info(f"Available spots: {stats['availableSpots']}, Occupancy: {stats['occupancyRate']:.1f}%")
                    print_info(f"Today's revenue: R$ {stats['todayRevenue']:.2f}")
                else:
                    self.add_result("Dashboard Stats", False, f"Missing fields: {missing_fields}")
            else:
                self.add_result("Dashboard Stats", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.add_result("Dashboard Stats", False, f"Request error: {str(e)}")
    
    def test_monthly_report(self):
        """Test monthly report endpoint"""
        print_test_header("Monthly Report")
        
        try:
            response = requests.get(f"{self.base_url}/api/reports/monthly", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    report_data = data["data"]
                    required_fields = ["dailyEntries", "dailyRevenue", "totalOperations"]
                    missing_fields = [field for field in required_fields if field not in report_data]
                    
                    if not missing_fields:
                        self.add_result(
                            "Monthly Report", 
                            True, 
                            f"Report generated with {report_data['totalOperations']} operations"
                        )
                        print_info(f"Daily entries data points: {len(report_data['dailyEntries'])}")
                        print_info(f"Daily revenue data points: {len(report_data['dailyRevenue'])}")
                    else:
                        self.add_result("Monthly Report", False, f"Missing fields: {missing_fields}")
                else:
                    self.add_result("Monthly Report", False, f"Invalid response format: {data}")
            else:
                self.add_result("Monthly Report", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.add_result("Monthly Report", False, f"Request error: {str(e)}")
    
    def test_operations_history(self):
        """Test operations history endpoint"""
        print_test_header("Operations History")
        
        try:
            response = requests.get(f"{self.base_url}/api/history", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    operations = data["data"]
                    self.add_result(
                        "Operations History", 
                        True, 
                        f"Retrieved {len(operations)} operations"
                    )
                    
                    # Validate operation structure
                    if operations:
                        sample_op = operations[0]
                        required_fields = ["id", "type", "plate", "spot", "time"]
                        missing_fields = [field for field in required_fields if field not in sample_op]
                        
                        if not missing_fields:
                            print_info("Operation data structure is valid")
                            print_info(f"Latest operation: {sample_op['type']} - {sample_op['plate']} at {sample_op['time']}")
                        else:
                            print_warning(f"Missing fields in operation data: {missing_fields}")
                else:
                    self.add_result("Operations History", False, f"Invalid response format: {data}")
            else:
                self.add_result("Operations History", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.add_result("Operations History", False, f"Request error: {str(e)}")
    
    def test_vehicle_exit(self):
        """Test vehicle exit functionality"""
        print_test_header("Vehicle Exit")
        
        if not self.registered_vehicles:
            self.add_result("Vehicle Exit", False, "No vehicles registered to test exit")
            return
        
        # Test exit with first registered vehicle
        vehicle_id = self.registered_vehicles[0]
        
        try:
            response = requests.post(
                f"{self.base_url}/api/vehicles/exit",
                json={"vehicleId": vehicle_id},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    exit_data = data["data"]
                    self.add_result(
                        "Vehicle Exit", 
                        True, 
                        f"Vehicle {exit_data['plate']} exited successfully from spot {exit_data['spot']}"
                    )
                    print_info(f"Duration: {exit_data['duration']}, Fee: {exit_data['fee']}")
                    
                    # Remove from registered vehicles list
                    self.registered_vehicles.remove(vehicle_id)
                else:
                    self.add_result("Vehicle Exit", False, f"Invalid response format: {data}")
            else:
                self.add_result("Vehicle Exit", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.add_result("Vehicle Exit", False, f"Request error: {str(e)}")
        
        # Test exit with invalid vehicle ID
        try:
            response = requests.post(
                f"{self.base_url}/api/vehicles/exit",
                json={"vehicleId": "invalid-id"},
                timeout=10
            )
            
            if response.status_code == 404:
                self.add_result(
                    "Vehicle Exit - Invalid ID", 
                    True, 
                    "Correctly rejected invalid vehicle ID"
                )
            else:
                self.add_result(
                    "Vehicle Exit - Invalid ID", 
                    False, 
                    f"Expected 404 error, got {response.status_code}"
                )
                
        except Exception as e:
            self.add_result("Vehicle Exit - Invalid ID", False, f"Request error: {str(e)}")
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print(f"{Colors.BOLD}{Colors.BLUE}🚀 Starting ParkSystem Pro Backend API Tests{Colors.ENDC}")
        print(f"{Colors.BLUE}Backend URL: {self.base_url}{Colors.ENDC}")
        print("=" * 60)
        
        # Run tests in logical order
        self.test_health_check()
        self.test_parking_spots()
        self.test_vehicle_entry_valid()
        self.test_vehicle_entry_invalid()
        self.test_get_vehicles()
        self.test_search_vehicles()
        self.test_dashboard_stats()
        self.test_monthly_report()
        self.test_operations_history()
        self.test_vehicle_exit()  # Test exit last to clean up
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print(f"{Colors.BOLD}{Colors.BLUE}📊 TEST SUMMARY{Colors.ENDC}")
        print("=" * 60)
        
        total = self.test_results["total"]
        passed = self.test_results["passed"]
        failed = self.test_results["failed"]
        success_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"Total Tests: {total}")
        print(f"{Colors.GREEN}Passed: {passed}{Colors.ENDC}")
        print(f"{Colors.RED}Failed: {failed}{Colors.ENDC}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if failed > 0:
            print(f"\n{Colors.RED}{Colors.BOLD}❌ FAILED TESTS:{Colors.ENDC}")
            for result in self.test_results["details"]:
                if not result["passed"]:
                    print(f"{Colors.RED}  • {result['test']}: {result['message']}{Colors.ENDC}")
        
        print("\n" + "=" * 60)
        
        if success_rate >= 90:
            print(f"{Colors.GREEN}{Colors.BOLD}🎉 EXCELLENT! Backend API is working very well!{Colors.ENDC}")
        elif success_rate >= 70:
            print(f"{Colors.YELLOW}{Colors.BOLD}⚠️  GOOD! Backend API is mostly working with some issues.{Colors.ENDC}")
        else:
            print(f"{Colors.RED}{Colors.BOLD}🚨 CRITICAL! Backend API has significant issues.{Colors.ENDC}")

def main():
    """Main test execution"""
    tester = ParkSystemTester()
    tester.run_all_tests()
    
    # Return exit code based on results
    if tester.test_results["failed"] == 0:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()