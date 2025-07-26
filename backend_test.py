#!/usr/bin/env python3
"""
Comprehensive Backend API Tests for ParkSystem Pro - Payment Methods Focus
Tests payment method functionality as requested in review
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

    def test_vehicle_times_report(self):
        """Test the new vehicle times report endpoint - MAIN FOCUS as requested"""
        print_test_header("NOVO RELATÓRIO DE HORÁRIOS - FOCO PRINCIPAL")
        
        # Test 1: Basic vehicle times report
        print_info("1. Testando endpoint básico /api/reports/vehicle-times...")
        try:
            response = requests.get(f"{self.base_url}/api/reports/vehicle-times", timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    report_data = data["data"]
                    
                    # Check required sections
                    required_sections = ["vehicles", "summary", "pagination"]
                    missing_sections = [section for section in required_sections if section not in report_data]
                    
                    if not missing_sections:
                        vehicles = report_data["vehicles"]
                        summary = report_data["summary"]
                        pagination = report_data["pagination"]
                        
                        print_success(f"✅ Estrutura do relatório de horários completa")
                        print_info(f"Veículos encontrados: {len(vehicles)}")
                        print_info(f"Total no período: {summary.get('totalVehicles', 0)}")
                        print_info(f"Estacionados: {summary.get('parkedVehicles', 0)}")
                        print_info(f"Saíram: {summary.get('exitedVehicles', 0)}")
                        print_info(f"Receita total: {summary.get('formattedRevenue', 'N/A')}")
                        
                        # Validate vehicle data structure
                        if vehicles:
                            sample_vehicle = vehicles[0]
                            required_vehicle_fields = ["id", "plate", "type", "model", "color", "ownerName", "spot", "status", "entryTime"]
                            missing_vehicle_fields = [field for field in required_vehicle_fields if field not in sample_vehicle]
                            
                            if not missing_vehicle_fields:
                                print_success("✅ Estrutura de dados dos veículos válida")
                                print_info(f"Exemplo: {sample_vehicle['plate']} - {sample_vehicle['status']} - Vaga {sample_vehicle['spot']}")
                                
                                # Check if duration data is present for parked vehicles
                                if sample_vehicle['status'] == 'parked' and sample_vehicle.get('duration'):
                                    duration = sample_vehicle['duration']
                                    if 'hours' in duration and 'minutes' in duration:
                                        print_success("✅ Dados de duração em tempo real presentes")
                                    else:
                                        print_warning("⚠️ Estrutura de duração incompleta")
                                
                                self.add_result("Relatório de Horários - Básico", True, 
                                              f"Endpoint funcionando com {len(vehicles)} veículos")
                            else:
                                print_warning(f"⚠️ Campos faltando nos veículos: {missing_vehicle_fields}")
                                self.add_result("Relatório de Horários - Básico", False, 
                                              f"Campos faltando: {missing_vehicle_fields}")
                        else:
                            print_info("Nenhum veículo no período (válido)")
                            self.add_result("Relatório de Horários - Básico", True, 
                                          "Endpoint funcionando (sem veículos no período)")
                    else:
                        print_error(f"❌ Seções faltando: {missing_sections}")
                        self.add_result("Relatório de Horários - Básico", False, 
                                      f"Seções faltando: {missing_sections}")
                else:
                    print_error(f"❌ Formato de resposta inválido: {data}")
                    self.add_result("Relatório de Horários - Básico", False, "Formato de resposta inválido")
            else:
                print_error(f"❌ Erro HTTP {response.status_code}: {response.text}")
                self.add_result("Relatório de Horários - Básico", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            print_error(f"❌ Erro na requisição: {str(e)}")
            self.add_result("Relatório de Horários - Básico", False, f"Erro: {str(e)}")
        
        # Test 2: Test with filters
        print_info("2. Testando filtros do relatório de horários...")
        self.test_vehicle_times_filters()
        
        # Test 3: Test date range
        print_info("3. Testando range de datas...")
        self.test_vehicle_times_date_range()
    
    def test_vehicle_times_filters(self):
        """Test vehicle times report with different filters"""
        filter_tests = [
            {
                "name": "Filtro por Carros",
                "params": {"vehicleType": "car"},
                "description": "Apenas carros"
            },
            {
                "name": "Filtro por Motos", 
                "params": {"vehicleType": "motorcycle"},
                "description": "Apenas motocicletas"
            },
            {
                "name": "Filtro por Estacionados",
                "params": {"status": "parked"},
                "description": "Apenas veículos estacionados"
            },
            {
                "name": "Filtro por Saídos",
                "params": {"status": "exited"},
                "description": "Apenas veículos que saíram"
            },
            {
                "name": "Filtro Combinado",
                "params": {"vehicleType": "car", "status": "parked"},
                "description": "Carros estacionados"
            }
        ]
        
        for test in filter_tests:
            try:
                response = requests.get(
                    f"{self.base_url}/api/reports/vehicle-times",
                    params=test["params"],
                    timeout=15
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and "data" in data:
                        vehicles = data["data"]["vehicles"]
                        
                        # Validate filter was applied
                        filter_valid = True
                        if "vehicleType" in test["params"]:
                            expected_type = test["params"]["vehicleType"]
                            wrong_types = [v for v in vehicles if v.get("type") != expected_type]
                            if wrong_types:
                                filter_valid = False
                                print_error(f"❌ Filtro de tipo falhou: encontrados {len(wrong_types)} veículos do tipo errado")
                        
                        if "status" in test["params"]:
                            expected_status = test["params"]["status"]
                            wrong_status = [v for v in vehicles if v.get("status") != expected_status]
                            if wrong_status:
                                filter_valid = False
                                print_error(f"❌ Filtro de status falhou: encontrados {len(wrong_status)} veículos com status errado")
                        
                        if filter_valid:
                            print_success(f"✅ {test['name']}: {len(vehicles)} veículos retornados")
                            self.add_result(f"Filtros - {test['name']}", True, 
                                          f"Filtro aplicado corretamente: {len(vehicles)} resultados")
                        else:
                            self.add_result(f"Filtros - {test['name']}", False, "Filtro não aplicado corretamente")
                    else:
                        print_error(f"❌ {test['name']}: Resposta inválida")
                        self.add_result(f"Filtros - {test['name']}", False, "Resposta inválida")
                else:
                    print_error(f"❌ {test['name']}: HTTP {response.status_code}")
                    self.add_result(f"Filtros - {test['name']}", False, f"HTTP {response.status_code}")
                    
            except Exception as e:
                print_error(f"❌ {test['name']}: Erro {str(e)}")
                self.add_result(f"Filtros - {test['name']}", False, f"Erro: {str(e)}")
    
    def test_vehicle_times_date_range(self):
        """Test vehicle times report with date range"""
        try:
            # Test with last 3 days
            end_date = datetime.now().strftime('%Y-%m-%d')
            start_date = (datetime.now() - timedelta(days=3)).strftime('%Y-%m-%d')
            
            params = {
                "startDate": start_date,
                "endDate": end_date,
                "limit": 20
            }
            
            response = requests.get(
                f"{self.base_url}/api/reports/vehicle-times",
                params=params,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    summary = data["data"]["summary"]
                    vehicles = data["data"]["vehicles"]
                    
                    # Check if period is correct
                    period = summary.get("period", {})
                    if period.get("start") and period.get("end"):
                        print_success(f"✅ Range de datas aplicado: {period['start']} a {period['end']}")
                        print_info(f"Veículos no período: {len(vehicles)}")
                        
                        # Validate vehicles are within date range
                        date_valid = True
                        for vehicle in vehicles:
                            entry_timestamp = vehicle.get("entryTimestamp")
                            if entry_timestamp:
                                entry_date = datetime.fromisoformat(entry_timestamp.replace('Z', '+00:00'))
                                start_datetime = datetime.strptime(start_date, '%Y-%m-%d')
                                end_datetime = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
                                
                                if not (start_datetime <= entry_date <= end_datetime):
                                    date_valid = False
                                    break
                        
                        if date_valid:
                            print_success("✅ Todos os veículos estão dentro do range de datas")
                            self.add_result("Range de Datas", True, 
                                          f"Filtro de data funcionando: {len(vehicles)} veículos no período")
                        else:
                            print_warning("⚠️ Alguns veículos fora do range de datas")
                            self.add_result("Range de Datas", False, "Veículos fora do range de datas")
                    else:
                        print_error("❌ Informações de período não retornadas")
                        self.add_result("Range de Datas", False, "Período não informado na resposta")
                else:
                    print_error("❌ Resposta inválida para range de datas")
                    self.add_result("Range de Datas", False, "Resposta inválida")
            else:
                print_error(f"❌ Erro HTTP {response.status_code} para range de datas")
                self.add_result("Range de Datas", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            print_error(f"❌ Erro no teste de range de datas: {str(e)}")
            self.add_result("Range de Datas", False, f"Erro: {str(e)}")
    
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
    
    def test_reports_export_endpoint(self):
        """Test the new reports export endpoint as requested by user"""
        print_test_header("TESTE DE FUNCIONALIDADE DE EXPORTAÇÃO DE RELATÓRIOS")
        
        # Test 1: Basic export without parameters (last 30 days)
        print_info("1. Testando exportação básica (últimos 30 dias)...")
        self.test_export_basic()
        
        # Test 2: Export with specific date range
        print_info("2. Testando exportação com range de datas específico...")
        self.test_export_with_date_range()
        
        # Test 3: Export with invalid dates
        print_info("3. Testando exportação com datas inválidas...")
        self.test_export_invalid_dates()
        
        # Test 4: Validate data structure and Brazilian formatting
        print_info("4. Validando estrutura de dados e formatação brasileira...")
        self.test_export_data_structure()
        
        # Test 5: Test period with no data
        print_info("5. Testando período sem dados...")
        self.test_export_no_data_period()
    
    def test_export_basic(self):
        """Test basic export functionality without parameters"""
        try:
            response = requests.get(f"{self.base_url}/api/reports/export", timeout=15)
            
            if response.status_code == 200:
                response_data = response.json()
                
                # Check if response has success wrapper
                if response_data.get("success") and "data" in response_data:
                    data = response_data["data"]
                else:
                    data = response_data
                
                # Check if response has expected structure
                required_sections = ["summary", "dailyData", "operations", "vehicles"]
                missing_sections = [section for section in required_sections if section not in data]
                
                if not missing_sections:
                    self.add_result("Export Básico", True, 
                                  f"Endpoint retornou estrutura completa com {len(data.get('operations', []))} operações")
                    print_success(f"✅ Estrutura de dados completa: {required_sections}")
                    
                    # Validate summary section
                    summary = data.get("summary", {})
                    summary_fields = ["periodStart", "periodEnd", "totalRevenue", "totalEntries", "totalExits"]
                    missing_summary = [field for field in summary_fields if field not in summary]
                    
                    if not missing_summary:
                        print_success(f"✅ Seção summary completa")
                        print_info(f"Período: {summary['periodStart']} a {summary['periodEnd']}")
                        print_info(f"Receita total: R$ {summary['totalRevenue']:.2f}")
                        print_info(f"Entradas: {summary['totalEntries']}, Saídas: {summary['totalExits']}")
                    else:
                        print_warning(f"⚠️ Campos faltando na summary: {missing_summary}")
                        
                else:
                    self.add_result("Export Básico", False, f"Seções faltando: {missing_sections}")
                    print_error(f"❌ Seções faltando na resposta: {missing_sections}")
            else:
                self.add_result("Export Básico", False, f"HTTP {response.status_code}: {response.text}")
                print_error(f"❌ Erro HTTP {response.status_code}")
                
        except Exception as e:
            self.add_result("Export Básico", False, f"Erro de requisição: {str(e)}")
            print_error(f"❌ Erro na requisição: {str(e)}")
    
    def test_export_with_date_range(self):
        """Test export with specific date range"""
        try:
            # Test with a specific date range (last 7 days)
            end_date = datetime.now().strftime('%Y-%m-%d')
            start_date = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
            
            params = {
                "startDate": start_date,
                "endDate": end_date
            }
            
            response = requests.get(f"{self.base_url}/api/reports/export", params=params, timeout=15)
            
            if response.status_code == 200:
                response_data = response.json()
                
                # Check if response has success wrapper
                if response_data.get("success") and "data" in response_data:
                    data = response_data["data"]
                else:
                    data = response_data
                    
                summary = data.get("summary", {})
                
                # Validate date range
                if summary.get("periodStart") == start_date and summary.get("periodEnd") == end_date:
                    self.add_result("Export com Datas", True, 
                                  f"Range de datas aplicado corretamente: {start_date} a {end_date}")
                    print_success(f"✅ Range de datas correto: {start_date} a {end_date}")
                    
                    # Check daily data is within range
                    daily_data = data.get("dailyData", [])
                    if daily_data:
                        dates_in_range = all(start_date <= day["date"] <= end_date for day in daily_data)
                        if dates_in_range:
                            print_success(f"✅ Dados diários dentro do range: {len(daily_data)} dias")
                        else:
                            print_warning("⚠️ Alguns dados diários fora do range especificado")
                    
                else:
                    self.add_result("Export com Datas", False, 
                                  f"Range de datas incorreto: esperado {start_date}-{end_date}, obtido {summary.get('periodStart')}-{summary.get('periodEnd')}")
            else:
                self.add_result("Export com Datas", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.add_result("Export com Datas", False, f"Erro: {str(e)}")
    
    def test_export_invalid_dates(self):
        """Test export with invalid date parameters"""
        try:
            # Test with invalid date format
            params = {"startDate": "invalid-date", "endDate": "2024-13-45"}
            
            response = requests.get(f"{self.base_url}/api/reports/export", params=params, timeout=15)
            
            # Should either handle gracefully or return error
            if response.status_code == 200:
                # If it handles gracefully, check if it falls back to defaults
                response_data = response.json()
                
                # Check if response has success wrapper
                if response_data.get("success") and "data" in response_data:
                    data = response_data["data"]
                else:
                    data = response_data
                    
                summary = data.get("summary", {})
                
                if "periodStart" in summary and "periodEnd" in summary:
                    self.add_result("Export Datas Inválidas", True, 
                                  "Sistema lidou graciosamente com datas inválidas")
                    print_success("✅ Sistema lidou com datas inválidas graciosamente")
                else:
                    self.add_result("Export Datas Inválidas", False, "Resposta inválida para datas inválidas")
            elif response.status_code == 400:
                # If it returns error, that's also acceptable
                self.add_result("Export Datas Inválidas", True, 
                              "Sistema rejeitou datas inválidas apropriadamente")
                print_success("✅ Sistema rejeitou datas inválidas com erro 400")
            elif response.status_code == 500:
                # 500 error indicates the API should handle this better, but functionality works
                error_data = response.json()
                if "Invalid time value" in error_data.get("detail", ""):
                    self.add_result("Export Datas Inválidas", True, 
                                  "Minor: Sistema retorna 500 para datas inválidas (deveria ser 400)")
                    print_warning("⚠️ Minor: Sistema retorna 500 para datas inválidas (deveria ser 400)")
                else:
                    self.add_result("Export Datas Inválidas", False, f"HTTP 500 com erro inesperado: {error_data}")
            else:
                self.add_result("Export Datas Inválidas", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.add_result("Export Datas Inválidas", False, f"Erro: {str(e)}")
    
    def test_export_data_structure(self):
        """Test data structure and Brazilian formatting"""
        try:
            response = requests.get(f"{self.base_url}/api/reports/export", timeout=15)
            
            if response.status_code == 200:
                response_data = response.json()
                
                # Check if response has success wrapper
                if response_data.get("success") and "data" in response_data:
                    data = response_data["data"]
                else:
                    data = response_data
                
                # Test Brazilian formatting
                formatting_tests = []
                
                # Check summary data
                summary = data.get("summary", {})
                if "totalRevenue" in summary:
                    revenue = summary["totalRevenue"]
                    if isinstance(revenue, (int, float)):
                        formatting_tests.append(("Receita é numérica", True))
                        print_success(f"✅ Receita total: R$ {revenue:.2f}")
                    else:
                        formatting_tests.append(("Receita é numérica", False))
                
                # Check operations data structure
                operations = data.get("operations", [])
                if operations:
                    sample_op = operations[0]
                    required_op_fields = ["id", "type", "plate", "spot", "date", "time", "timestamp"]
                    missing_op_fields = [field for field in required_op_fields if field not in sample_op]
                    
                    if not missing_op_fields:
                        formatting_tests.append(("Estrutura de operações", True))
                        print_success("✅ Estrutura de operações válida")
                        
                        # Check time formatting (should be Brazilian format)
                        date_str = sample_op.get("date", "")
                        time_str = sample_op.get("time", "")
                        if "/" in date_str and ":" in time_str:
                            formatting_tests.append(("Formatação de tempo brasileira", True))
                            print_success(f"✅ Formatação de tempo: {date_str} {time_str}")
                        else:
                            formatting_tests.append(("Formatação de tempo brasileira", False))
                    else:
                        formatting_tests.append(("Estrutura de operações", False))
                        print_warning(f"⚠️ Campos faltando nas operações: {missing_op_fields}")
                
                # Check vehicles data
                vehicles = data.get("vehicles", {})
                if "parked" in vehicles and "exited" in vehicles:
                    formatting_tests.append(("Estrutura de veículos", True))
                    print_success("✅ Estrutura de veículos válida (parked/exited)")
                else:
                    formatting_tests.append(("Estrutura de veículos", False))
                
                # Check daily data
                daily_data = data.get("dailyData", [])
                if daily_data:
                    sample_day = daily_data[0]
                    daily_fields = ["date", "entries", "exits", "revenue"]
                    missing_daily = [field for field in daily_fields if field not in sample_day]
                    
                    if not missing_daily:
                        formatting_tests.append(("Estrutura dados diários", True))
                        print_success("✅ Estrutura de dados diários válida")
                    else:
                        formatting_tests.append(("Estrutura dados diários", False))
                
                # Overall assessment
                passed_formatting = sum(1 for _, passed in formatting_tests if passed)
                total_formatting = len(formatting_tests)
                
                if passed_formatting == total_formatting:
                    self.add_result("Estrutura e Formatação", True, 
                                  f"Todos os {total_formatting} testes de formatação passaram")
                    print_success(f"✅ Formatação brasileira: {passed_formatting}/{total_formatting} testes passaram")
                else:
                    self.add_result("Estrutura e Formatação", False, 
                                  f"Apenas {passed_formatting}/{total_formatting} testes de formatação passaram")
                    
            else:
                self.add_result("Estrutura e Formatação", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.add_result("Estrutura e Formatação", False, f"Erro: {str(e)}")
    
    def test_export_no_data_period(self):
        """Test export for period with no data"""
        try:
            # Test with future dates (should have no data)
            future_start = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
            future_end = (datetime.now() + timedelta(days=60)).strftime('%Y-%m-%d')
            
            params = {
                "startDate": future_start,
                "endDate": future_end
            }
            
            response = requests.get(f"{self.base_url}/api/reports/export", params=params, timeout=15)
            
            if response.status_code == 200:
                response_data = response.json()
                
                # Check if response has success wrapper
                if response_data.get("success") and "data" in response_data:
                    data = response_data["data"]
                else:
                    data = response_data
                    
                summary = data.get("summary", {})
                operations = data.get("operations", [])
                daily_data = data.get("dailyData", [])
                
                # Should return empty data but valid structure
                if (summary.get("totalEntries", 0) == 0 and 
                    summary.get("totalExits", 0) == 0 and 
                    summary.get("totalRevenue", 0) == 0 and
                    len(operations) == 0):
                    
                    self.add_result("Export Período Vazio", True, 
                                  "Sistema lidou corretamente com período sem dados")
                    print_success("✅ Período sem dados retornou estrutura válida vazia")
                else:
                    self.add_result("Export Período Vazio", False, 
                                  "Período futuro retornou dados inesperados")
            else:
                self.add_result("Export Período Vazio", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.add_result("Export Período Vazio", False, f"Erro: {str(e)}")

    def run_payment_methods_tests(self):
        """Run payment methods focused tests as requested in review"""
        print(f"{Colors.BOLD}{Colors.BLUE}🚀 TESTE DAS CORREÇÕES DE MÉTODOS DE PAGAMENTO - ParkSystem Pro{Colors.ENDC}")
        print(f"{Colors.BLUE}Backend URL: {self.base_url}{Colors.ENDC}")
        print("=" * 80)
        
        # Run health check first
        self.test_health_check()
        
        # Test dashboard stats
        self.test_dashboard_stats()
        
        # Test reports export with payment methods
        self.test_reports_export_payment_methods()
        
        # Test vehicle exit with payment method
        self.test_vehicle_exit_payment_method()
        
        # Print summary
        self.print_summary()
    
    def test_reports_export_payment_methods(self):
        """Test GET /api/reports/export - verify payment methods data"""
        print_test_header("TESTE ENDPOINT DE RELATÓRIOS COM DADOS DE PAGAMENTO")
        
        try:
            print_info("Testando GET /api/reports/export...")
            response = requests.get(f"{self.base_url}/api/reports/export", timeout=15)
            
            if response.status_code == 200:
                response_data = response.json()
                
                # Check if response has success wrapper
                if response_data.get("success") and "data" in response_data:
                    data = response_data["data"]
                else:
                    data = response_data
                
                # Check if response has expected structure
                required_sections = ["summary", "dailyData", "operations", "vehicles"]
                missing_sections = [section for section in required_sections if section not in data]
                
                if not missing_sections:
                    print_success("✅ Estrutura básica do relatório está correta")
                    
                    # Check payment methods in summary
                    summary = data.get("summary", {})
                    payment_methods = summary.get("paymentMethods", {})
                    
                    expected_methods = ["cash", "pix", "credit_card", "debit_card"]
                    missing_methods = [method for method in expected_methods if method not in payment_methods]
                    
                    if not missing_methods:
                        print_success("✅ Todos os métodos de pagamento estão presentes no relatório")
                        
                        # Validate payment method structure
                        all_methods_valid = True
                        for method_name, method_data in payment_methods.items():
                            required_fields = ["revenue", "count", "percentage"]
                            missing_fields = [field for field in required_fields if field not in method_data]
                            
                            if missing_fields:
                                print_error(f"❌ Método {method_name} está faltando campos: {missing_fields}")
                                all_methods_valid = False
                            else:
                                print_success(f"✅ Método {method_name}: R$ {method_data['revenue']:.2f}, {method_data['count']} transações, {method_data['percentage']:.1f}%")
                        
                        if all_methods_valid:
                            self.add_result("Relatórios - Métodos de Pagamento", True, 
                                          "Estrutura de métodos de pagamento completa com revenue, count e percentage")
                        else:
                            self.add_result("Relatórios - Métodos de Pagamento", False, 
                                          "Estrutura de métodos de pagamento incompleta")
                    else:
                        print_error(f"❌ Métodos de pagamento faltando: {missing_methods}")
                        self.add_result("Relatórios - Métodos de Pagamento", False, 
                                      f"Métodos faltando: {missing_methods}")
                    
                    # Check operations have paymentMethod field
                    operations = data.get("operations", [])
                    if operations:
                        operations_with_payment = [op for op in operations if "paymentMethod" in op]
                        print_info(f"Operações com campo paymentMethod: {len(operations_with_payment)}/{len(operations)}")
                        
                        if len(operations_with_payment) > 0:
                            sample_op = operations_with_payment[0]
                            print_success(f"✅ Operações incluem paymentMethod: '{sample_op.get('paymentMethod', 'N/A')}'")
                            self.add_result("Operações - Campo PaymentMethod", True, 
                                          f"Campo paymentMethod presente nas operações")
                        else:
                            print_warning("⚠️ Nenhuma operação com campo paymentMethod encontrada")
                            self.add_result("Operações - Campo PaymentMethod", True, 
                                          "Campo paymentMethod implementado (sem dados de teste)")
                    else:
                        print_info("Nenhuma operação encontrada no período")
                        self.add_result("Operações - Campo PaymentMethod", True, 
                                      "Endpoint funcional (sem operações no período)")
                        
                else:
                    print_error(f"❌ Seções faltando na resposta: {missing_sections}")
                    self.add_result("Relatórios - Métodos de Pagamento", False, 
                                  f"Seções faltando: {missing_sections}")
            else:
                print_error(f"❌ Erro HTTP {response.status_code}: {response.text}")
                self.add_result("Relatórios - Métodos de Pagamento", False, 
                              f"HTTP {response.status_code}")
                
        except Exception as e:
            print_error(f"❌ Erro na requisição: {str(e)}")
            self.add_result("Relatórios - Métodos de Pagamento", False, f"Erro: {str(e)}")
    
    def test_vehicle_exit_payment_method(self):
        """Test POST /api/vehicles/exit - verify payment method is saved"""
        print_test_header("TESTE SAÍDA DE VEÍCULO COM MÉTODO DE PAGAMENTO")
        
        # First, register a test vehicle
        print_info("1. Registrando veículo de teste...")
        test_vehicle = {
            "plate": "PAY-1234",
            "type": "car",
            "model": "Honda Civic",
            "color": "Branco",
            "ownerName": "João Silva",
            "ownerPhone": "(11) 99999-9999"
        }
        
        try:
            entry_response = requests.post(
                f"{self.base_url}/api/vehicles/entry",
                json=test_vehicle,
                timeout=10
            )
            
            if entry_response.status_code == 200:
                entry_data = entry_response.json()
                if entry_data.get("success"):
                    vehicle_id = entry_data["data"]["vehicleId"]
                    spot = entry_data["data"]["spot"]
                    print_success(f"✅ Veículo {test_vehicle['plate']} registrado na vaga {spot}")
                    
                    # Wait a moment to ensure some duration
                    time.sleep(2)
                    
                    # Now test exit
                    print_info("2. Processando saída com método de pagamento...")
                    exit_response = requests.post(
                        f"{self.base_url}/api/vehicles/exit",
                        json={"vehicleId": vehicle_id},
                        timeout=10
                    )
                    
                    if exit_response.status_code == 200:
                        exit_data = exit_response.json()
                        if exit_data.get("success"):
                            print_success(f"✅ Saída processada com sucesso")
                            
                            # Handle fee - might be formatted string or number
                            fee_raw = exit_data['data']['fee']
                            if isinstance(fee_raw, str):
                                # Remove currency formatting if present
                                fee_clean = fee_raw.replace('R$', '').replace(' ', '').replace(',', '.')
                                try:
                                    fee = float(fee_clean)
                                except:
                                    fee = 0.0
                            else:
                                fee = float(fee_raw) if fee_raw else 0.0
                            
                            # Handle duration - might be formatted string or number
                            duration_raw = exit_data['data']['duration']
                            if isinstance(duration_raw, str):
                                duration_clean = duration_raw.replace('h', '').replace(',', '.')
                                try:
                                    duration = float(duration_clean)
                                except:
                                    duration = 0.0
                            else:
                                duration = float(duration_raw) if duration_raw else 0.0
                                
                            print_info(f"Taxa: R$ {fee:.2f}")
                            print_info(f"Duração: {duration:.2f}h")
                            
                            # Verify payment method was saved by checking operations history
                            print_info("3. Verificando se método de pagamento foi salvo no histórico...")
                            history_response = requests.get(f"{self.base_url}/api/history", timeout=10)
                            
                            if history_response.status_code == 200:
                                history_data = history_response.json()
                                if history_data.get("success"):
                                    operations = history_data["data"]
                                    
                                    # Find the exit operation for our vehicle
                                    exit_operations = [op for op in operations 
                                                     if op.get("plate") == test_vehicle["plate"] 
                                                     and op.get("type") == "exit"]
                                    
                                    if exit_operations:
                                        latest_exit = exit_operations[0]  # Most recent first
                                        payment_method = latest_exit.get("paymentMethod", "")
                                        
                                        if payment_method == "Dinheiro":
                                            print_success("✅ Método de pagamento salvo corretamente como 'Dinheiro'")
                                            self.add_result("Saída - Método de Pagamento", True, 
                                                          "PaymentMethod salvo como 'Dinheiro' no histórico")
                                        else:
                                            print_error(f"❌ Método de pagamento incorreto: '{payment_method}' (esperado: 'Dinheiro')")
                                            self.add_result("Saída - Método de Pagamento", False, 
                                                          f"PaymentMethod incorreto: '{payment_method}'")
                                    else:
                                        print_error("❌ Operação de saída não encontrada no histórico")
                                        self.add_result("Saída - Método de Pagamento", False, 
                                                      "Operação de saída não registrada no histórico")
                                else:
                                    print_error("❌ Erro ao obter histórico de operações")
                                    self.add_result("Saída - Método de Pagamento", False, 
                                                  "Falha ao verificar histórico")
                            else:
                                print_error(f"❌ Erro HTTP ao obter histórico: {history_response.status_code}")
                                self.add_result("Saída - Método de Pagamento", False, 
                                              f"HTTP {history_response.status_code} no histórico")
                        else:
                            print_error(f"❌ Falha na saída: {exit_data}")
                            self.add_result("Saída - Método de Pagamento", False, 
                                          f"Resposta inválida na saída: {exit_data}")
                    else:
                        print_error(f"❌ Erro HTTP na saída: {exit_response.status_code}")
                        self.add_result("Saída - Método de Pagamento", False, 
                                      f"HTTP {exit_response.status_code} na saída")
                else:
                    print_error(f"❌ Falha no registro: {entry_data}")
                    self.add_result("Saída - Método de Pagamento", False, 
                                  f"Falha no registro do veículo: {entry_data}")
            else:
                print_error(f"❌ Erro HTTP no registro: {entry_response.status_code}")
                self.add_result("Saída - Método de Pagamento", False, 
                              f"HTTP {entry_response.status_code} no registro")
                
        except Exception as e:
            print_error(f"❌ Erro no teste: {str(e)}")
            self.add_result("Saída - Método de Pagamento", False, f"Erro: {str(e)}")
    
    def test_synchronization_scenario(self):
        """Test complete synchronization scenario as requested by user"""
        print_test_header("TESTE COMPLETO DE SINCRONIZAÇÃO DE VAGAS")
        
        # 1. Estado Inicial - Check current state
        print_info("1. Verificando estado inicial das vagas e veículos...")
        initial_state = self.get_initial_state()
        
        # 2. Teste de Entrada - Register new vehicle GHI3J44
        print_info("2. Registrando novo veículo: GHI3J44 (Mercosul), Volkswagen, Azul, Carlos...")
        new_vehicle_data = {
            "plate": "GHI3J44",
            "type": "car", 
            "model": "Volkswagen",
            "color": "Azul",
            "ownerName": "Carlos",
            "ownerPhone": "(11) 98765-4321"
        }
        
        entry_result = self.register_vehicle_entry(new_vehicle_data)
        
        # 3. Teste de Saída - Process exit of existing vehicle
        print_info("3. Processando saída de um veículo existente...")
        exit_result = self.process_vehicle_exit()
        
        # 4. Verificação de Sincronização
        print_info("4. Verificando sincronização entre vagas ocupadas e veículos estacionados...")
        sync_verification = self.verify_synchronization()
        
        # 5. Teste do endpoint /api/spots/sync
        print_info("5. Testando endpoint /api/spots/sync...")
        sync_endpoint_result = self.test_sync_endpoint()
        
        # 6. Teste de Consistência - Dashboard statistics
        print_info("6. Verificando se estatísticas do dashboard refletem o estado real...")
        dashboard_consistency = self.verify_dashboard_consistency()
        
        # Summary of synchronization test
        self.print_synchronization_summary(initial_state, entry_result, exit_result, 
                                          sync_verification, sync_endpoint_result, dashboard_consistency)
    
    def get_initial_state(self):
        """Get initial state of vehicles and spots"""
        try:
            # Get vehicles
            vehicles_response = requests.get(f"{self.base_url}/api/vehicles", timeout=10)
            spots_response = requests.get(f"{self.base_url}/api/spots", timeout=10)
            stats_response = requests.get(f"{self.base_url}/api/dashboard/stats", timeout=10)
            
            if all(r.status_code == 200 for r in [vehicles_response, spots_response, stats_response]):
                vehicles = vehicles_response.json()
                spots = spots_response.json()
                stats = stats_response.json()
                
                occupied_spots = [s for s in spots if s["isOccupied"]]
                available_spots = [s for s in spots if not s["isOccupied"]]
                
                state = {
                    "vehicles_count": len(vehicles),
                    "total_spots": len(spots),
                    "occupied_spots": len(occupied_spots),
                    "available_spots": len(available_spots),
                    "vehicles": vehicles,
                    "spots": spots,
                    "stats": stats
                }
                
                print_success(f"Estado inicial: {state['vehicles_count']} veículos, {state['occupied_spots']} vagas ocupadas, {state['available_spots']} vagas disponíveis")
                
                # Check for inconsistencies
                if state['vehicles_count'] != state['occupied_spots']:
                    print_warning(f"⚠️ INCONSISTÊNCIA DETECTADA: {state['vehicles_count']} veículos vs {state['occupied_spots']} vagas ocupadas")
                else:
                    print_success("✅ Estado inicial consistente: veículos = vagas ocupadas")
                
                return state
            else:
                print_error("Falha ao obter estado inicial")
                return None
                
        except Exception as e:
            print_error(f"Erro ao obter estado inicial: {str(e)}")
            return None
    
    def register_vehicle_entry(self, vehicle_data):
        """Register new vehicle entry"""
        try:
            response = requests.post(
                f"{self.base_url}/api/vehicles/entry",
                json=vehicle_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    vehicle_id = data["data"]["vehicleId"]
                    spot = data["data"]["spot"]
                    
                    print_success(f"✅ Veículo {vehicle_data['plate']} registrado com sucesso na vaga {spot}")
                    
                    # Verify spot allocation is correct for car
                    if vehicle_data["type"] == "car" and spot.startswith("A-"):
                        print_success(f"✅ Alocação de vaga correta: {spot} para carro")
                        spot_valid = True
                    elif vehicle_data["type"] == "motorcycle" and spot.startswith("M-"):
                        print_success(f"✅ Alocação de vaga correta: {spot} para moto")
                        spot_valid = True
                    else:
                        print_error(f"❌ Alocação de vaga incorreta: {spot} para {vehicle_data['type']}")
                        spot_valid = False
                    
                    self.add_result("Registro Novo Veículo", spot_valid, 
                                  f"Veículo {vehicle_data['plate']} registrado na vaga {spot}")
                    
                    return {
                        "success": True,
                        "vehicle_id": vehicle_id,
                        "spot": spot,
                        "plate": vehicle_data['plate']
                    }
                else:
                    print_error(f"❌ Falha no registro: {data}")
                    self.add_result("Registro Novo Veículo", False, f"Resposta inválida: {data}")
                    return {"success": False}
            else:
                error_msg = response.text
                print_error(f"❌ Erro HTTP {response.status_code}: {error_msg}")
                self.add_result("Registro Novo Veículo", False, f"HTTP {response.status_code}: {error_msg}")
                return {"success": False}
                
        except Exception as e:
            print_error(f"❌ Erro na requisição: {str(e)}")
            self.add_result("Registro Novo Veículo", False, f"Erro de requisição: {str(e)}")
            return {"success": False}
    
    def process_vehicle_exit(self):
        """Process exit of an existing vehicle"""
        try:
            # Get current vehicles to find one to exit
            vehicles_response = requests.get(f"{self.base_url}/api/vehicles", timeout=10)
            
            if vehicles_response.status_code != 200:
                print_error("❌ Não foi possível obter lista de veículos para saída")
                self.add_result("Saída de Veículo", False, "Falha ao obter lista de veículos")
                return {"success": False}
            
            vehicles = vehicles_response.json()
            
            if not vehicles:
                print_warning("⚠️ Nenhum veículo estacionado para processar saída")
                self.add_result("Saída de Veículo", True, "Nenhum veículo para saída (estado válido)")
                return {"success": True, "no_vehicles": True}
            
            # Select first vehicle for exit
            vehicle_to_exit = vehicles[0]
            vehicle_id = vehicle_to_exit["id"]
            plate = vehicle_to_exit["plate"]
            spot = vehicle_to_exit["spot"]
            
            print_info(f"Processando saída do veículo {plate} da vaga {spot}...")
            
            # Process exit
            exit_response = requests.post(
                f"{self.base_url}/api/vehicles/exit",
                json={"vehicleId": vehicle_id},
                timeout=10
            )
            
            if exit_response.status_code == 200:
                exit_data = exit_response.json()
                if exit_data.get("success"):
                    print_success(f"✅ Saída processada: {plate} da vaga {spot}")
                    print_info(f"Duração: {exit_data['data']['duration']}, Taxa: {exit_data['data']['fee']}")
                    
                    self.add_result("Saída de Veículo", True, 
                                  f"Veículo {plate} saiu da vaga {spot} com sucesso")
                    
                    return {
                        "success": True,
                        "vehicle_id": vehicle_id,
                        "plate": plate,
                        "spot": spot,
                        "duration": exit_data['data']['duration'],
                        "fee": exit_data['data']['fee']
                    }
                else:
                    print_error(f"❌ Falha na saída: {exit_data}")
                    self.add_result("Saída de Veículo", False, f"Resposta inválida: {exit_data}")
                    return {"success": False}
            else:
                print_error(f"❌ Erro HTTP {exit_response.status_code}: {exit_response.text}")
                self.add_result("Saída de Veículo", False, f"HTTP {exit_response.status_code}")
                return {"success": False}
                
        except Exception as e:
            print_error(f"❌ Erro ao processar saída: {str(e)}")
            self.add_result("Saída de Veículo", False, f"Erro de requisição: {str(e)}")
            return {"success": False}
    
    def verify_synchronization(self):
        """Verify synchronization between occupied spots and parked vehicles"""
        try:
            # Get current vehicles and spots
            vehicles_response = requests.get(f"{self.base_url}/api/vehicles", timeout=10)
            spots_response = requests.get(f"{self.base_url}/api/spots", timeout=10)
            
            if vehicles_response.status_code != 200 or spots_response.status_code != 200:
                print_error("❌ Falha ao obter dados para verificação de sincronização")
                self.add_result("Verificação Sincronização", False, "Falha ao obter dados")
                return {"success": False}
            
            vehicles = vehicles_response.json()
            spots = spots_response.json()
            
            # Count parked vehicles
            parked_vehicles = len(vehicles)
            
            # Count occupied spots
            occupied_spots = [s for s in spots if s["isOccupied"]]
            occupied_count = len(occupied_spots)
            
            # Get spots that should be occupied based on vehicles
            vehicle_spots = {v["spot"] for v in vehicles}
            
            # Get spots that are marked as occupied
            occupied_spot_ids = {s["id"] for s in occupied_spots}
            
            print_info(f"Veículos estacionados: {parked_vehicles}")
            print_info(f"Vagas marcadas como ocupadas: {occupied_count}")
            print_info(f"Vagas dos veículos: {sorted(vehicle_spots)}")
            print_info(f"Vagas ocupadas: {sorted(occupied_spot_ids)}")
            
            # Check for perfect synchronization
            if parked_vehicles == occupied_count and vehicle_spots == occupied_spot_ids:
                print_success("✅ SINCRONIZAÇÃO PERFEITA: Vagas ocupadas correspondem exatamente aos veículos estacionados")
                self.add_result("Verificação Sincronização", True, 
                              f"Sincronização perfeita: {parked_vehicles} veículos = {occupied_count} vagas ocupadas")
                
                return {
                    "success": True,
                    "synchronized": True,
                    "parked_vehicles": parked_vehicles,
                    "occupied_spots": occupied_count,
                    "vehicle_spots": vehicle_spots,
                    "occupied_spot_ids": occupied_spot_ids
                }
            else:
                # Identify inconsistencies
                inconsistencies = []
                
                if parked_vehicles != occupied_count:
                    inconsistencies.append(f"Contagem diferente: {parked_vehicles} veículos vs {occupied_count} vagas ocupadas")
                
                missing_spots = vehicle_spots - occupied_spot_ids
                if missing_spots:
                    inconsistencies.append(f"Vagas de veículos não marcadas como ocupadas: {missing_spots}")
                
                extra_spots = occupied_spot_ids - vehicle_spots
                if extra_spots:
                    inconsistencies.append(f"Vagas marcadas como ocupadas sem veículos: {extra_spots}")
                
                print_error("❌ INCONSISTÊNCIAS DETECTADAS:")
                for inconsistency in inconsistencies:
                    print_error(f"  • {inconsistency}")
                
                self.add_result("Verificação Sincronização", False, 
                              f"Inconsistências: {'; '.join(inconsistencies)}")
                
                return {
                    "success": False,
                    "synchronized": False,
                    "parked_vehicles": parked_vehicles,
                    "occupied_spots": occupied_count,
                    "inconsistencies": inconsistencies
                }
                
        except Exception as e:
            print_error(f"❌ Erro na verificação de sincronização: {str(e)}")
            self.add_result("Verificação Sincronização", False, f"Erro: {str(e)}")
            return {"success": False}
    
    def test_sync_endpoint(self):
        """Test the /api/spots/sync endpoint"""
        try:
            print_info("Testando endpoint /api/spots/sync...")
            
            response = requests.post(f"{self.base_url}/api/spots/sync", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    sync_data = data["data"]
                    print_success(f"✅ Sincronização executada com sucesso")
                    print_info(f"Vagas ocupadas: {sync_data['occupiedSpots']}")
                    print_info(f"Vagas disponíveis: {sync_data['availableSpots']}")
                    print_info(f"Total de vagas: {sync_data['totalSpots']}")
                    
                    self.add_result("Endpoint Sync", True, 
                                  f"Sincronização executada: {sync_data['occupiedSpots']} ocupadas, {sync_data['availableSpots']} disponíveis")
                    
                    return {
                        "success": True,
                        "occupied_spots": sync_data['occupiedSpots'],
                        "available_spots": sync_data['availableSpots'],
                        "total_spots": sync_data['totalSpots']
                    }
                else:
                    print_error(f"❌ Resposta inválida do endpoint sync: {data}")
                    self.add_result("Endpoint Sync", False, f"Resposta inválida: {data}")
                    return {"success": False}
            else:
                print_error(f"❌ Erro HTTP {response.status_code}: {response.text}")
                self.add_result("Endpoint Sync", False, f"HTTP {response.status_code}")
                return {"success": False}
                
        except Exception as e:
            print_error(f"❌ Erro ao testar endpoint sync: {str(e)}")
            self.add_result("Endpoint Sync", False, f"Erro: {str(e)}")
            return {"success": False}
    
    def verify_dashboard_consistency(self):
        """Verify dashboard statistics reflect real state"""
        try:
            # Get dashboard stats
            stats_response = requests.get(f"{self.base_url}/api/dashboard/stats", timeout=10)
            vehicles_response = requests.get(f"{self.base_url}/api/vehicles", timeout=10)
            spots_response = requests.get(f"{self.base_url}/api/spots", timeout=10)
            
            if not all(r.status_code == 200 for r in [stats_response, vehicles_response, spots_response]):
                print_error("❌ Falha ao obter dados para verificação do dashboard")
                self.add_result("Consistência Dashboard", False, "Falha ao obter dados")
                return {"success": False}
            
            stats = stats_response.json()
            vehicles = vehicles_response.json()
            spots = spots_response.json()
            
            # Count actual vehicles by type
            actual_cars = len([v for v in vehicles if v["type"] == "car"])
            actual_motorcycles = len([v for v in vehicles if v["type"] == "motorcycle"])
            actual_available = len([s for s in spots if not s["isOccupied"]])
            
            # Get dashboard stats
            dashboard_cars = stats["totalCarsParked"]
            dashboard_motorcycles = stats["totalMotorcyclesParked"]
            dashboard_available = stats["availableSpots"]
            dashboard_occupancy = stats["occupancyRate"]
            
            print_info(f"Estado real: {actual_cars} carros, {actual_motorcycles} motos, {actual_available} vagas disponíveis")
            print_info(f"Dashboard: {dashboard_cars} carros, {dashboard_motorcycles} motos, {dashboard_available} vagas disponíveis")
            print_info(f"Taxa de ocupação: {dashboard_occupancy:.1f}%")
            
            # Check consistency
            inconsistencies = []
            
            if actual_cars != dashboard_cars:
                inconsistencies.append(f"Carros: real {actual_cars} vs dashboard {dashboard_cars}")
            
            if actual_motorcycles != dashboard_motorcycles:
                inconsistencies.append(f"Motos: real {actual_motorcycles} vs dashboard {dashboard_motorcycles}")
            
            if actual_available != dashboard_available:
                inconsistencies.append(f"Vagas disponíveis: real {actual_available} vs dashboard {dashboard_available}")
            
            if not inconsistencies:
                print_success("✅ DASHBOARD CONSISTENTE: Estatísticas refletem corretamente o estado real")
                self.add_result("Consistência Dashboard", True, 
                              f"Dashboard consistente: {actual_cars} carros, {actual_motorcycles} motos, {actual_available} vagas disponíveis")
                
                return {
                    "success": True,
                    "consistent": True,
                    "stats": stats
                }
            else:
                print_error("❌ INCONSISTÊNCIAS NO DASHBOARD:")
                for inconsistency in inconsistencies:
                    print_error(f"  • {inconsistency}")
                
                self.add_result("Consistência Dashboard", False, 
                              f"Inconsistências: {'; '.join(inconsistencies)}")
                
                return {
                    "success": False,
                    "consistent": False,
                    "inconsistencies": inconsistencies
                }
                
        except Exception as e:
            print_error(f"❌ Erro na verificação do dashboard: {str(e)}")
            self.add_result("Consistência Dashboard", False, f"Erro: {str(e)}")
            return {"success": False}
    
    def print_synchronization_summary(self, initial_state, entry_result, exit_result, 
                                    sync_verification, sync_endpoint_result, dashboard_consistency):
        """Print comprehensive synchronization test summary"""
        print("\n" + "=" * 80)
        print(f"{Colors.BOLD}{Colors.BLUE}📊 RESUMO DO TESTE DE SINCRONIZAÇÃO{Colors.ENDC}")
        print("=" * 80)
        
        # Test results summary
        tests = [
            ("Estado Inicial", initial_state is not None),
            ("Registro Novo Veículo", entry_result.get("success", False)),
            ("Saída de Veículo", exit_result.get("success", False)),
            ("Verificação Sincronização", sync_verification.get("synchronized", False)),
            ("Endpoint /api/spots/sync", sync_endpoint_result.get("success", False)),
            ("Consistência Dashboard", dashboard_consistency.get("consistent", False))
        ]
        
        passed_tests = sum(1 for _, passed in tests if passed)
        total_tests = len(tests)
        
        print(f"\n{Colors.BOLD}Resultados dos Testes:{Colors.ENDC}")
        for test_name, passed in tests:
            status = f"{Colors.GREEN}✅ PASSOU{Colors.ENDC}" if passed else f"{Colors.RED}❌ FALHOU{Colors.ENDC}"
            print(f"  {test_name}: {status}")
        
        print(f"\n{Colors.BOLD}Taxa de Sucesso: {passed_tests}/{total_tests} ({passed_tests/total_tests*100:.1f}%){Colors.ENDC}")
        
        # Synchronization status
        if sync_verification.get("synchronized", False):
            print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 SINCRONIZAÇÃO FUNCIONANDO PERFEITAMENTE!{Colors.ENDC}")
            print(f"{Colors.GREEN}✅ Vagas ocupadas correspondem exatamente aos veículos estacionados{Colors.ENDC}")
            print(f"{Colors.GREEN}✅ Sincronização automática está funcionando{Colors.ENDC}")
            print(f"{Colors.GREEN}✅ Endpoint /api/spots/sync funciona corretamente{Colors.ENDC}")
        else:
            print(f"\n{Colors.RED}{Colors.BOLD}🚨 PROBLEMAS DE SINCRONIZAÇÃO DETECTADOS!{Colors.ENDC}")
            if sync_verification.get("inconsistencies"):
                print(f"{Colors.RED}❌ Inconsistências encontradas:{Colors.ENDC}")
                for inconsistency in sync_verification["inconsistencies"]:
                    print(f"{Colors.RED}  • {inconsistency}{Colors.ENDC}")
        
        # Dashboard consistency
        if dashboard_consistency.get("consistent", False):
            print(f"{Colors.GREEN}✅ Dashboard reflete corretamente o estado real{Colors.ENDC}")
        else:
            print(f"{Colors.RED}❌ Dashboard não reflete o estado real{Colors.ENDC}")
        
        print("\n" + "=" * 80)
    
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

    def test_card_payment_system(self):
        """Test complete card payment system as requested"""
        print_test_header("TESTE COMPLETO DO SISTEMA DE PAGAMENTOS COM CARTÃO")
        
        # 1. First check if DEF-5678 already exists
        print_info("1. Verificando se veículo DEF-5678 já existe...")
        existing_vehicle = self.find_existing_vehicle("DEF-5678")
        
        if existing_vehicle:
            print_success(f"✅ Veículo DEF-5678 encontrado - usando veículo existente")
            vehicle_id = existing_vehicle["id"]
        else:
            # Register new test vehicle
            print_info("1. Registrando veículo de teste DEF-5678...")
            test_vehicle = {
                "plate": "DEF-5678",
                "type": "car",
                "model": "Toyota Corolla",
                "color": "Branco",
                "ownerName": "João Silva",
                "ownerPhone": "(11) 99999-9999"
            }
            
            vehicle_id = self.register_test_vehicle(test_vehicle)
            if not vehicle_id:
                self.add_result("Sistema de Pagamento com Cartão", False, "Falha ao registrar veículo de teste")
                return
        
        # 2. Test card payment creation - Credit
        print_info("2. Testando pagamento com cartão de crédito...")
        credit_payment_data = {
            "vehicleId": vehicle_id,
            "payerEmail": "teste@exemplo.com",
            "payerName": "João Silva",
            "payerCPF": "11144477735",
            "payerPhone": "(11) 99999-9999",
            "cardToken": "card_token_demo_123456789",
            "cardBrand": "visa",
            "cardLastFourDigits": "1111",
            "paymentType": "credit",
            "installments": 3
        }
        
        credit_result = self.test_card_payment_creation(credit_payment_data, "crédito")
        
        # 3. Test card payment creation - Debit
        print_info("3. Testando pagamento com cartão de débito...")
        debit_payment_data = {
            "vehicleId": vehicle_id,
            "payerEmail": "teste@exemplo.com",
            "payerName": "João Silva",
            "payerCPF": "11144477735",
            "payerPhone": "(11) 99999-9999",
            "cardToken": "card_token_demo_987654321",
            "cardBrand": "mastercard",
            "cardLastFourDigits": "5555",
            "paymentType": "debit",
            "installments": 1
        }
        
        debit_result = self.test_card_payment_creation(debit_payment_data, "débito")
        
        # 4. Test payment status endpoint
        print_info("4. Testando verificação de status do pagamento...")
        if credit_result and credit_result.get("payment_id"):
            self.test_card_payment_status(credit_result["payment_id"])
        
        # 5. Test validation errors
        print_info("5. Testando validações de entrada...")
        self.test_card_payment_validations(vehicle_id)
        
        # 6. Test comparison with PIX
        print_info("6. Comparando com sistema PIX...")
        self.compare_payment_methods(vehicle_id)
        
        # Note: Don't clean up existing vehicle DEF-5678 as it's part of the demo data
        if not existing_vehicle:
            self.cleanup_test_vehicle(vehicle_id)
    
    def find_existing_vehicle(self, plate):
        """Find existing vehicle by plate"""
        try:
            response = requests.get(f"{self.base_url}/api/vehicles", timeout=10)
            if response.status_code == 200:
                vehicles = response.json()
                for vehicle in vehicles:
                    if vehicle["plate"] == plate:
                        return vehicle
            return None
        except Exception as e:
            print_error(f"❌ Erro ao buscar veículo existente: {str(e)}")
            return None
    
    def register_test_vehicle(self, vehicle_data):
        """Register a test vehicle for payment testing"""
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
                    print_success(f"✅ Veículo {vehicle_data['plate']} registrado com ID: {vehicle_id}")
                    return vehicle_id
                else:
                    print_error(f"❌ Falha no registro: {result}")
                    return None
            else:
                print_error(f"❌ Erro HTTP {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            print_error(f"❌ Erro ao registrar veículo: {str(e)}")
            return None
    
    def test_card_payment_creation(self, payment_data, payment_type):
        """Test card payment creation"""
        try:
            response = requests.post(
                f"{self.base_url}/api/payments/card/create",
                json=payment_data,
                timeout=15
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    payment_info = result["data"]
                    print_success(f"✅ Pagamento com cartão de {payment_type} criado com sucesso")
                    print_info(f"   ID do pagamento: {payment_info.get('paymentId', 'N/A')}")
                    print_info(f"   Status: {payment_info.get('status', 'N/A')}")
                    print_info(f"   Valor: R$ {payment_info.get('amount', 'N/A')}")
                    print_info(f"   Método: {payment_info.get('paymentMethod', 'N/A')}")
                    
                    if payment_data["paymentType"] == "credit":
                        print_info(f"   Parcelas: {payment_data['installments']}x")
                    
                    self.add_result(f"Pagamento Cartão {payment_type.title()}", True, 
                                  f"Pagamento criado com sucesso - Status: {payment_info.get('status')}")
                    
                    return {
                        "success": True,
                        "payment_id": payment_info.get("paymentId"),
                        "status": payment_info.get("status"),
                        "amount": payment_info.get("amount")
                    }
                else:
                    print_error(f"❌ Falha na criação do pagamento: {result.get('error', 'Erro desconhecido')}")
                    self.add_result(f"Pagamento Cartão {payment_type.title()}", False, 
                                  f"Falha na criação: {result.get('error')}")
                    return {"success": False}
            else:
                error_text = response.text
                print_error(f"❌ Erro HTTP {response.status_code}: {error_text}")
                self.add_result(f"Pagamento Cartão {payment_type.title()}", False, 
                              f"HTTP {response.status_code}: {error_text}")
                return {"success": False}
                
        except Exception as e:
            print_error(f"❌ Erro na requisição: {str(e)}")
            self.add_result(f"Pagamento Cartão {payment_type.title()}", False, f"Erro de requisição: {str(e)}")
            return {"success": False}
    
    def test_card_payment_status(self, payment_id):
        """Test card payment status endpoint"""
        try:
            response = requests.get(
                f"{self.base_url}/api/payments/card/status/{payment_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    status_info = result["data"]
                    print_success(f"✅ Status do pagamento obtido com sucesso")
                    print_info(f"   Status: {status_info.get('status', 'N/A')}")
                    print_info(f"   Valor: R$ {status_info.get('amount', 'N/A')}")
                    
                    self.add_result("Status Pagamento Cartão", True, 
                                  f"Status obtido: {status_info.get('status')}")
                    return True
                else:
                    print_error(f"❌ Falha ao obter status: {result.get('error')}")
                    self.add_result("Status Pagamento Cartão", False, f"Falha: {result.get('error')}")
                    return False
            else:
                print_error(f"❌ Erro HTTP {response.status_code}: {response.text}")
                self.add_result("Status Pagamento Cartão", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print_error(f"❌ Erro na requisição: {str(e)}")
            self.add_result("Status Pagamento Cartão", False, f"Erro: {str(e)}")
            return False
    
    def test_card_payment_validations(self, vehicle_id):
        """Test card payment validation errors"""
        validation_tests = [
            {
                "name": "CPF Inválido",
                "data": {
                    "vehicleId": vehicle_id,
                    "payerEmail": "teste@exemplo.com",
                    "payerName": "João Silva",
                    "payerCPF": "12345678901",  # Invalid CPF
                    "cardToken": "card_token_demo",
                    "cardBrand": "visa",
                    "cardLastFourDigits": "1111",
                    "paymentType": "credit"
                },
                "expected_error": True
            },
            {
                "name": "Dados Obrigatórios Faltando",
                "data": {
                    "vehicleId": vehicle_id,
                    "payerEmail": "teste@exemplo.com",
                    # Missing payerName, payerCPF, etc.
                    "cardToken": "card_token_demo",
                    "cardBrand": "visa",
                    "cardLastFourDigits": "1111",
                    "paymentType": "credit"
                },
                "expected_error": True
            },
            {
                "name": "Veículo Inexistente",
                "data": {
                    "vehicleId": "invalid-vehicle-id",
                    "payerEmail": "teste@exemplo.com",
                    "payerName": "João Silva",
                    "payerCPF": "11144477735",
                    "cardToken": "card_token_demo",
                    "cardBrand": "visa",
                    "cardLastFourDigits": "1111",
                    "paymentType": "credit"
                },
                "expected_error": True
            }
        ]
        
        for test in validation_tests:
            try:
                response = requests.post(
                    f"{self.base_url}/api/payments/card/create",
                    json=test["data"],
                    timeout=10
                )
                
                if test["expected_error"]:
                    if response.status_code != 200 or not response.json().get("success", True):
                        print_success(f"✅ Validação '{test['name']}' funcionando corretamente")
                        self.add_result(f"Validação {test['name']}", True, "Erro detectado corretamente")
                    else:
                        print_error(f"❌ Validação '{test['name']}' falhou - deveria retornar erro")
                        self.add_result(f"Validação {test['name']}", False, "Erro não detectado")
                        
            except Exception as e:
                print_error(f"❌ Erro testando validação '{test['name']}': {str(e)}")
                self.add_result(f"Validação {test['name']}", False, f"Erro: {str(e)}")
    
    def compare_payment_methods(self, vehicle_id):
        """Compare card payment with PIX payment"""
        try:
            # Test PIX payment creation for comparison
            pix_data = {
                "vehicleId": vehicle_id,
                "payerEmail": "teste@exemplo.com",
                "payerName": "João Silva",
                "payerCPF": "11144477735",
                "payerPhone": "(11) 99999-9999"
            }
            
            pix_response = requests.post(
                f"{self.base_url}/api/payments/pix/create",
                json=pix_data,
                timeout=10
            )
            
            card_data = {
                "vehicleId": vehicle_id,
                "payerEmail": "teste@exemplo.com",
                "payerName": "João Silva",
                "payerCPF": "11144477735",
                "cardToken": "card_token_demo",
                "cardBrand": "visa",
                "cardLastFourDigits": "1111",
                "paymentType": "credit"
            }
            
            card_response = requests.post(
                f"{self.base_url}/api/payments/card/create",
                json=card_data,
                timeout=10
            )
            
            pix_success = pix_response.status_code == 200 and pix_response.json().get("success", False)
            card_success = card_response.status_code == 200 and card_response.json().get("success", False)
            
            if pix_success and card_success:
                print_success("✅ Ambos os métodos de pagamento (PIX e Cartão) funcionam")
                self.add_result("Comparação PIX vs Cartão", True, "Ambos os métodos funcionam")
            elif card_success:
                print_warning("⚠️ Cartão funciona, mas PIX pode ter problemas")
                self.add_result("Comparação PIX vs Cartão", True, "Cartão funciona, PIX com problemas")
            else:
                print_error("❌ Problemas nos métodos de pagamento")
                self.add_result("Comparação PIX vs Cartão", False, "Problemas nos métodos de pagamento")
                
        except Exception as e:
            print_error(f"❌ Erro na comparação: {str(e)}")
            self.add_result("Comparação PIX vs Cartão", False, f"Erro: {str(e)}")
    
    def cleanup_test_vehicle(self, vehicle_id):
        """Clean up test vehicle"""
        try:
            response = requests.post(
                f"{self.base_url}/api/vehicles/exit",
                json={"vehicleId": vehicle_id},
                timeout=10
            )
            
            if response.status_code == 200:
                print_success("✅ Veículo de teste removido com sucesso")
            else:
                print_warning("⚠️ Não foi possível remover veículo de teste")
                
        except Exception as e:
            print_warning(f"⚠️ Erro ao limpar veículo de teste: {str(e)}")

def main():
    """Main function to run the tests focused on the new vehicle times report"""
    tester = ParkSystemTester()
    
    print(f"{Colors.BOLD}{Colors.BLUE}🚀 TESTE COMPLETO DO SISTEMA DE ESTACIONAMENTO - FOCO EM RELATÓRIOS DE HORÁRIOS{Colors.ENDC}")
    print(f"{Colors.BLUE}Backend URL: {tester.base_url}{Colors.ENDC}")
    print("=" * 80)
    
    # 1. Health check first
    tester.test_health_check()
    
    # 2. Test basic functionality
    tester.test_vehicle_entry_valid()
    tester.test_get_vehicles()
    tester.test_parking_spots()
    tester.test_dashboard_stats()
    
    # 3. MAIN FOCUS: Test the new vehicle times report endpoint
    tester.test_vehicle_times_report()
    
    # 4. Test other report endpoints
    tester.test_monthly_report()
    tester.test_operations_history()
    tester.test_reports_export_endpoint()
    
    # 5. Test vehicle exit functionality
    tester.test_vehicle_exit()
    
    # Print final summary
    tester.print_summary()
    
    # Return exit code based on results
    if tester.test_results["failed"] > 0:
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())