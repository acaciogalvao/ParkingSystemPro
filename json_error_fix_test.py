#!/usr/bin/env python3
"""
Focused test for JSON parsing error fix verification
Tests specific scenarios mentioned in the review request
"""

import requests
import json
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

def print_info(message):
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.ENDC}")

def test_json_response_format():
    """Test that responses are valid JSON and not HTML"""
    print_test_header("JSON Response Format Verification")
    
    endpoints_to_test = [
        "/api/health",
        "/api/vehicles",
        "/api/dashboard/stats"
    ]
    
    all_passed = True
    
    for endpoint in endpoints_to_test:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
            
            # Check if response is JSON
            try:
                data = response.json()
                
                # Check if response starts with HTML (common sign of JSON parsing error)
                response_text = response.text.strip()
                if response_text.startswith('<!DOCTYPE') or response_text.startswith('<html'):
                    print_error(f"{endpoint}: Response is HTML, not JSON")
                    print_info(f"Response preview: {response_text[:100]}...")
                    all_passed = False
                else:
                    print_success(f"{endpoint}: Valid JSON response")
                    print_info(f"Response type: {type(data)}")
                    
            except json.JSONDecodeError as e:
                print_error(f"{endpoint}: Invalid JSON response - {str(e)}")
                print_info(f"Response preview: {response.text[:200]}...")
                all_passed = False
                
        except Exception as e:
            print_error(f"{endpoint}: Request failed - {str(e)}")
            all_passed = False
    
    return all_passed

def test_vehicle_entry_specific_case():
    """Test the specific vehicle entry case mentioned in review request"""
    print_test_header("Vehicle Entry - Specific Test Case")
    
    # Test data from review request
    test_data = {
        "plate": "ABC1G55",
        "type": "car", 
        "model": "Mercedes",
        "color": "Branco",
        "ownerName": "Acacio",
        "ownerPhone": "(99)98425-2028"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/vehicles/entry",
            json=test_data,
            timeout=10
        )
        
        print_info(f"Status Code: {response.status_code}")
        print_info(f"Content-Type: {response.headers.get('content-type', 'Not specified')}")
        
        # Check if response is JSON
        try:
            data = response.json()
            
            # Check if response starts with HTML
            response_text = response.text.strip()
            if response_text.startswith('<!DOCTYPE') or response_text.startswith('<html'):
                print_error("Response is HTML, not JSON - JSON parsing error NOT fixed")
                print_info(f"Response preview: {response_text[:200]}...")
                return False
            
            if response.status_code == 200:
                if data.get("success") and "data" in data:
                    print_success(f"Vehicle {test_data['plate']} registered successfully")
                    print_info(f"Assigned spot: {data['data']['spot']}")
                    print_success("JSON parsing error appears to be FIXED")
                    return True
                else:
                    print_error(f"Unexpected response format: {data}")
                    return False
            else:
                print_error(f"HTTP {response.status_code}: {data.get('detail', 'Unknown error')}")
                return False
                
        except json.JSONDecodeError as e:
            print_error(f"JSON parsing failed: {str(e)}")
            print_error("JSON parsing error NOT fixed")
            print_info(f"Response preview: {response.text[:200]}...")
            return False
            
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False

def test_invalid_plate_rejection():
    """Test that invalid plate formats are properly rejected"""
    print_test_header("Invalid Plate Format Rejection")
    
    # Test invalid plate from review request
    invalid_test_data = {
        "plate": "SM03F33",  # Invalid format
        "type": "car",
        "model": "Test Car", 
        "color": "Branco",
        "ownerName": "Test User"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/vehicles/entry",
            json=invalid_test_data,
            timeout=10
        )
        
        print_info(f"Status Code: {response.status_code}")
        
        # Check if response is JSON
        try:
            data = response.json()
            
            # Check if response starts with HTML
            response_text = response.text.strip()
            if response_text.startswith('<!DOCTYPE') or response_text.startswith('<html'):
                print_error("Response is HTML, not JSON - JSON parsing error NOT fixed")
                return False
            
            if response.status_code == 400:
                error_message = data.get('detail', '')
                if 'Formato inválido' in error_message:
                    print_success(f"Invalid plate correctly rejected: {error_message}")
                    print_success("JSON error handling working properly")
                    return True
                else:
                    print_error(f"Wrong error message: {error_message}")
                    return False
            else:
                print_error(f"Expected 400 error, got {response.status_code}")
                return False
                
        except json.JSONDecodeError as e:
            print_error(f"JSON parsing failed: {str(e)}")
            print_error("JSON parsing error NOT fixed")
            return False
            
    except Exception as e:
        print_error(f"Request failed: {str(e)}")
        return False

def main():
    """Main test execution"""
    print(f"{Colors.BOLD}{Colors.BLUE}🔍 JSON Error Fix Verification Tests{Colors.ENDC}")
    print(f"{Colors.BLUE}Backend URL: {BASE_URL}{Colors.ENDC}")
    print("=" * 60)
    
    tests_passed = 0
    total_tests = 3
    
    # Run focused tests
    if test_json_response_format():
        tests_passed += 1
        
    if test_vehicle_entry_specific_case():
        tests_passed += 1
        
    if test_invalid_plate_rejection():
        tests_passed += 1
    
    # Print summary
    print("\n" + "=" * 60)
    print(f"{Colors.BOLD}{Colors.BLUE}📊 JSON ERROR FIX TEST SUMMARY{Colors.ENDC}")
    print("=" * 60)
    
    success_rate = (tests_passed / total_tests * 100) if total_tests > 0 else 0
    
    print(f"Total Tests: {total_tests}")
    print(f"{Colors.GREEN}Passed: {tests_passed}{Colors.ENDC}")
    print(f"{Colors.RED}Failed: {total_tests - tests_passed}{Colors.ENDC}")
    print(f"Success Rate: {success_rate:.1f}%")
    
    if tests_passed == total_tests:
        print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 JSON PARSING ERROR SUCCESSFULLY FIXED!{Colors.ENDC}")
        print(f"{Colors.GREEN}✅ All endpoints return valid JSON responses{Colors.ENDC}")
        print(f"{Colors.GREEN}✅ Vehicle entry works with valid Mercosul plates{Colors.ENDC}")
        print(f"{Colors.GREEN}✅ Invalid plates are properly rejected with JSON errors{Colors.ENDC}")
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}🚨 JSON PARSING ERROR NOT FULLY FIXED{Colors.ENDC}")
        print(f"{Colors.RED}Some endpoints may still be returning HTML instead of JSON{Colors.ENDC}")
    
    print("\n" + "=" * 60)
    
    return tests_passed == total_tests

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)