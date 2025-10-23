#!/usr/bin/env python3
"""Test authentication endpoints"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_register():
    """Test user registration"""
    print("Testing user registration...")
    response = requests.post(
        f"{BASE_URL}/auth/register",
        json={
            "email": "test@example.com",
            "password": "Test1234",
            "first_name": "Test",
            "last_name": "User"
        }
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.json()

def test_login(email, password):
    """Test user login"""
    print("\nTesting user login...")
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            "email": email,
            "password": password
        }
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.json()

def test_get_me(token):
    """Test get current user"""
    print("\nTesting get current user...")
    response = requests.get(
        f"{BASE_URL}/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.json()

if __name__ == "__main__":
    # Test registration
    register_result = test_register()

    if register_result.get("success"):
        access_token = register_result["data"]["tokens"]["access_token"]
        print(f"\nAccess Token: {access_token[:50]}...")

        # Test get me
        test_get_me(access_token)

        # Test login
        login_result = test_login("test@example.com", "Test1234")

        if login_result.get("success"):
            new_token = login_result["data"]["tokens"]["access_token"]
            print(f"\nNew Token: {new_token[:50]}...")

    print("\n✅ Authentication tests completed!")
