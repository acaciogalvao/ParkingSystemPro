#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for ParkingSystemPro
Tests all parking management endpoints with real scenarios
"""

import requests
import sys
import json
from datetime import datetime
import time

class ParkingSystemTester:
    def __init__(self, base_url="https://61bbffc0-2138-4a36-9098-cea77739ad49.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_vehicles = []

    def log(self, message, level="INFO"):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and 'message' in response_data:
                        self.log(f"   Message: {response_data['message']}")
                    return True, response_data
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    self.log(f"   Error: {error_data}")
                except:
                    self.log(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Network Error: {str(e)}", "ERROR")
            return False, {}

    def test_health_check(self):
        """Test API health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        success, response = self.run_test(
            "Dashboard Statistics",
            "GET", 
            "dashboard/stats",
            200
        )
        
        if success and response:
            self.log(f"   Cars Parked: {response.get('totalCarsParked', 0)}")
            self.log(f"   Motorcycles Parked: {response.get('totalMotorcyclesParked', 0)}")
            self.log(f"   Available Spots: {response.get('availableSpots', 0)}")
            self.log(f"   Occupancy Rate: {response.get('occupancyRate', 0):.1f}%")
        
        return success

    def test_parking_spots(self):
        """Test parking spots endpoints"""
        # Test basic spots endpoint
        success1, spots_data = self.run_test(
            "Get Parking Spots",
            "GET",
            "spots",
            200
        )
        
        # Test spots with duration
        success2, spots_duration_data = self.run_test(
            "Get Spots with Duration",
            "GET",
            "spots/with-duration", 
            200
        )
        
        # Test spots synchronization
        success3, sync_data = self.run_test(
            "Synchronize Parking Spots",
            "POST",
            "spots/sync",
            200
        )
        
        if success1 and spots_data:
            total_spots = len(spots_data)
            occupied_spots = len([s for s in spots_data if s.get('isOccupied')])
            self.log(f"   Total Spots: {total_spots}")
            self.log(f"   Occupied: {occupied_spots}")
            self.log(f"   Available: {total_spots - occupied_spots}")
        
        return success1 and success2 and success3

    def test_vehicle_entry(self):
        """Test vehicle entry with different scenarios"""
        test_vehicles = [
            {
                "plate": "ABC-1234",
                "type": "car",
                "model": "Honda Civic",
                "color": "Preto",
                "ownerName": "João Silva",
                "ownerPhone": "(11) 99999-9999"
            },
            {
                "plate": "XYZ-5678", 
                "type": "motorcycle",
                "model": "Honda CB600",
                "color": "Azul",
                "ownerName": "Maria Santos",
                "ownerPhone": "(11) 88888-8888"
            },
            {
                "plate": "DEF9G87",  # Mercosul format
                "type": "car",
                "model": "Toyota Corolla",
                "color": "Branco",
                "ownerName": "Pedro Costa"
            }
        ]
        
        all_success = True
        
        for i, vehicle in enumerate(test_vehicles):
            success, response = self.run_test(
                f"Vehicle Entry #{i+1} ({vehicle['plate']})",
                "POST",
                "vehicles/entry",
                200,
                data=vehicle
            )
            
            if success and response:
                vehicle_id = response.get('data', {}).get('vehicleId')
                spot = response.get('data', {}).get('spot')
                if vehicle_id:
                    self.created_vehicles.append({
                        'id': vehicle_id,
                        'plate': vehicle['plate'],
                        'spot': spot
                    })
                    self.log(f"   Vehicle ID: {vehicle_id}, Spot: {spot}")
            
            all_success = all_success and success
            
            # Small delay between entries
            time.sleep(0.5)
        
        return all_success

    def test_invalid_vehicle_entry(self):
        """Test vehicle entry validation"""
        invalid_vehicles = [
            {
                "plate": "INVALID",  # Invalid plate format
                "type": "car",
                "model": "Test Car",
                "color": "Red",
                "ownerName": "Test User"
            },
            {
                "plate": "ABC-1234",  # Duplicate plate (should fail if already exists)
                "type": "car", 
                "model": "Test Car",
                "color": "Red",
                "ownerName": "Test User"
            }
        ]
        
        success_count = 0
        
        for i, vehicle in enumerate(invalid_vehicles):
            success, response = self.run_test(
                f"Invalid Vehicle Entry #{i+1}",
                "POST",
                "vehicles/entry",
                400,  # Expecting validation error
                data=vehicle
            )
            if success:
                success_count += 1
        
        return success_count == len(invalid_vehicles)

    def test_vehicle_listing(self):
        """Test vehicle listing endpoints"""
        # Test basic vehicle listing
        success1, vehicles_data = self.run_test(
            "Get All Vehicles",
            "GET",
            "vehicles",
            200
        )
        
        # Test vehicles with duration
        success2, vehicles_duration_data = self.run_test(
            "Get Vehicles with Duration",
            "GET",
            "vehicles/with-duration",
            200
        )
        
        if success1 and vehicles_data:
            self.log(f"   Total Parked Vehicles: {len(vehicles_data)}")
            for vehicle in vehicles_data[:3]:  # Show first 3
                self.log(f"   - {vehicle.get('plate')} ({vehicle.get('type')}) at {vehicle.get('spot')}")
        
        return success1 and success2

    def test_vehicle_search(self):
        """Test vehicle search functionality"""
        search_tests = [
            {"plate": "ABC", "description": "Search by partial plate"},
            {"owner": "João", "description": "Search by owner name"},
            {"plate": "XYZ", "owner": "Maria", "description": "Search by plate and owner"}
        ]
        
        all_success = True
        
        for search in search_tests:
            params = {k: v for k, v in search.items() if k != "description"}
            success, response = self.run_test(
                search["description"],
                "GET",
                "vehicles/search",
                200,
                params=params
            )
            
            if success and response:
                results = response.get('data', [])
                self.log(f"   Found {len(results)} vehicles")
            
            all_success = all_success and success
        
        return all_success

    def test_vehicle_duration(self):
        """Test real-time vehicle duration tracking"""
        if not self.created_vehicles:
            self.log("⚠️  No vehicles available for duration testing")
            return True
        
        vehicle = self.created_vehicles[0]
        success, response = self.run_test(
            f"Get Vehicle Duration ({vehicle['plate']})",
            "GET",
            f"vehicles/{vehicle['id']}/duration",
            200
        )
        
        if success and response:
            duration = response.get('duration', {})
            self.log(f"   Duration: {duration.get('formatted', 'N/A')}")
            self.log(f"   Estimated Fee: R$ {response.get('estimatedFee', '0.00')}")
        
        return success

    def test_vehicle_update(self):
        """Test vehicle information update"""
        if not self.created_vehicles:
            self.log("⚠️  No vehicles available for update testing")
            return True
        
        vehicle = self.created_vehicles[0]
        update_data = {
            "ownerPhone": "(11) 77777-7777",
            "color": "Verde"
        }
        
        success, response = self.run_test(
            f"Update Vehicle ({vehicle['plate']})",
            "PUT",
            f"vehicles/{vehicle['id']}",
            200,
            data=update_data
        )
        
        return success

    def test_vehicle_exit(self):
        """Test vehicle exit processing"""
        if not self.created_vehicles:
            self.log("⚠️  No vehicles available for exit testing")
            return True
        
        # Test exit for the last created vehicle
        vehicle = self.created_vehicles[-1]
        exit_data = {
            "vehicleId": vehicle['id']
        }
        
        success, response = self.run_test(
            f"Process Vehicle Exit ({vehicle['plate']})",
            "POST",
            "vehicles/exit",
            200,
            data=exit_data
        )
        
        if success and response:
            exit_info = response.get('data', {})
            self.log(f"   Duration: {exit_info.get('duration', 'N/A')}")
            self.log(f"   Fee: {exit_info.get('fee', 'N/A')}")
            # Remove from created vehicles list
            self.created_vehicles = [v for v in self.created_vehicles if v['id'] != vehicle['id']]
        
        return success

    def test_reports_and_history(self):
        """Test reporting endpoints"""
        # Test monthly report
        success1, monthly_data = self.run_test(
            "Monthly Report",
            "GET",
            "reports/monthly",
            200
        )
        
        # Test operations history
        success2, history_data = self.run_test(
            "Operations History",
            "GET",
            "history",
            200
        )
        
        if success1 and monthly_data:
            report_data = monthly_data.get('data', {})
            self.log(f"   Total Operations: {report_data.get('totalOperations', 0)}")
        
        if success2 and history_data:
            operations = history_data.get('data', [])
            self.log(f"   Recent Operations: {len(operations)}")
        
        return success1 and success2

    def run_all_tests(self):
        """Run complete test suite"""
        self.log("🚀 Starting ParkingSystemPro Backend API Tests")
        self.log(f"   Backend URL: {self.base_url}")
        self.log("=" * 60)
        
        test_results = []
        
        # Core API Tests
        test_results.append(("Health Check", self.test_health_check()))
        test_results.append(("Dashboard Stats", self.test_dashboard_stats()))
        test_results.append(("Parking Spots", self.test_parking_spots()))
        
        # Vehicle Management Tests
        test_results.append(("Vehicle Entry", self.test_vehicle_entry()))
        test_results.append(("Invalid Entry Validation", self.test_invalid_vehicle_entry()))
        test_results.append(("Vehicle Listing", self.test_vehicle_listing()))
        test_results.append(("Vehicle Search", self.test_vehicle_search()))
        test_results.append(("Vehicle Duration", self.test_vehicle_duration()))
        test_results.append(("Vehicle Update", self.test_vehicle_update()))
        test_results.append(("Vehicle Exit", self.test_vehicle_exit()))
        
        # Reporting Tests
        test_results.append(("Reports & History", self.test_reports_and_history()))
        
        # Final Statistics
        self.log("=" * 60)
        self.log("📊 TEST RESULTS SUMMARY")
        self.log("=" * 60)
        
        for test_name, result in test_results:
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{status} - {test_name}")
        
        self.log("=" * 60)
        self.log(f"📈 Overall Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            self.log("🎉 ALL TESTS PASSED! Backend API is working correctly.")
            return 0
        else:
            self.log(f"⚠️  {self.tests_run - self.tests_passed} tests failed. Check the logs above.")
            return 1

def main():
    """Main test execution"""
    tester = ParkingSystemTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())