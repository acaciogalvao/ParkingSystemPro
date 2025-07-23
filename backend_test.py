#!/usr/bin/env python3
"""
Backend API Testing Script
Tests all backend endpoints for the parking system application
"""

import requests
import json
import sys
from datetime import datetime
import uuid

# Base URL from frontend .env
BASE_URL = "https://963738d8-5bd7-4c20-8940-e2d4ac31fb42.preview.emergentagent.com/api"

def test_hello_world():
    """Test GET /api/ endpoint"""
    print("🔍 Testing GET /api/ endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("message") == "Hello World":
                print("✅ GET /api/ endpoint working correctly")
                return True
            else:
                print(f"❌ GET /api/ endpoint returned wrong message: {data}")
                return False
        else:
            print(f"❌ GET /api/ endpoint failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ GET /api/ endpoint failed with error: {str(e)}")
        return False

def test_create_status_check():
    """Test POST /api/status endpoint"""
    print("\n🔍 Testing POST /api/status endpoint...")
    try:
        test_data = {"client_name": "Teste"}
        response = requests.post(f"{BASE_URL}/status", json=test_data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("client_name") == "Teste" and "id" in data and "timestamp" in data:
                print("✅ POST /api/status endpoint working correctly")
                return True, data
            else:
                print(f"❌ POST /api/status endpoint returned incomplete data: {data}")
                return False, None
        else:
            print(f"❌ POST /api/status endpoint failed with status {response.status_code}")
            return False, None
    except Exception as e:
        print(f"❌ POST /api/status endpoint failed with error: {str(e)}")
        return False, None

def test_get_status_checks():
    """Test GET /api/status endpoint"""
    print("\n🔍 Testing GET /api/status endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/status")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print(f"✅ GET /api/status endpoint working correctly - returned {len(data)} records")
                return True, data
            else:
                print(f"❌ GET /api/status endpoint should return a list, got: {type(data)}")
                return False, None
        else:
            print(f"❌ GET /api/status endpoint failed with status {response.status_code}")
            return False, None
    except Exception as e:
        print(f"❌ GET /api/status endpoint failed with error: {str(e)}")
        return False, None

def test_data_persistence():
    """Test if data is being persisted correctly"""
    print("\n🔍 Testing data persistence...")
    
    # Create a unique test record
    unique_name = f"PersistenceTest_{uuid.uuid4().hex[:8]}"
    test_data = {"client_name": unique_name}
    
    try:
        # Create a new record
        create_response = requests.post(f"{BASE_URL}/status", json=test_data)
        if create_response.status_code != 200:
            print(f"❌ Failed to create test record: {create_response.status_code}")
            return False
        
        created_record = create_response.json()
        created_id = created_record.get("id")
        
        # Retrieve all records and check if our record exists
        get_response = requests.get(f"{BASE_URL}/status")
        if get_response.status_code != 200:
            print(f"❌ Failed to retrieve records: {get_response.status_code}")
            return False
        
        all_records = get_response.json()
        found_record = None
        for record in all_records:
            if record.get("id") == created_id:
                found_record = record
                break
        
        if found_record:
            print(f"✅ Data persistence working - record found with ID: {created_id}")
            return True
        else:
            print(f"❌ Data persistence failed - record with ID {created_id} not found")
            return False
            
    except Exception as e:
        print(f"❌ Data persistence test failed with error: {str(e)}")
        return False

def test_mongodb_connection():
    """Test MongoDB connection by attempting to create and retrieve data"""
    print("\n🔍 Testing MongoDB Atlas connection...")
    
    # We'll test this indirectly by creating a record and retrieving it
    test_name = f"MongoTest_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    try:
        # Try to create a record (this tests MongoDB write)
        create_response = requests.post(f"{BASE_URL}/status", json={"client_name": test_name})
        if create_response.status_code != 200:
            print("❌ MongoDB connection failed - cannot create records")
            return False
        
        # Try to retrieve records (this tests MongoDB read)
        get_response = requests.get(f"{BASE_URL}/status")
        if get_response.status_code != 200:
            print("❌ MongoDB connection failed - cannot retrieve records")
            return False
        
        records = get_response.json()
        if isinstance(records, list):
            print(f"✅ MongoDB Atlas connection working - can read/write data ({len(records)} total records)")
            return True
        else:
            print("❌ MongoDB connection issue - unexpected response format")
            return False
            
    except Exception as e:
        print(f"❌ MongoDB connection test failed with error: {str(e)}")
        return False

def run_all_tests():
    """Run all backend tests"""
    print("🚀 Starting Backend API Tests")
    print("=" * 50)
    
    results = {}
    
    # Test 1: Hello World endpoint
    results['hello_world'] = test_hello_world()
    
    # Test 2: Create status check
    results['create_status'], created_data = test_create_status_check()
    
    # Test 3: Get status checks
    results['get_status'], status_data = test_get_status_checks()
    
    # Test 4: MongoDB connection
    results['mongodb_connection'] = test_mongodb_connection()
    
    # Test 5: Data persistence
    results['data_persistence'] = test_data_persistence()
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All backend tests passed!")
        return True
    else:
        print("⚠️  Some backend tests failed!")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)