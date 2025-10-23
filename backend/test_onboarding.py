#!/usr/bin/env python3
"""Test onboarding endpoints"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"


def print_response(title, response):
    """Print formatted response"""
    print(f"\n{title}")
    print(f"Status: {response.status_code}")
    try:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except:
        print(f"Response: {response.text}")
    print("-" * 80)


def test_onboarding_flow():
    """Test complete onboarding flow"""
    print("=" * 80)
    print("TESTING USER ONBOARDING FLOW")
    print("=" * 80)

    # Step 0: Register a new user
    print("\n[Step 0] Registering new user...")
    register_response = requests.post(
        f"{BASE_URL}/auth/register",
        json={
            "email": "onboarding_test@example.com",
            "password": "Test1234",
            "first_name": "",  # Empty to test onboarding
            "last_name": ""
        }
    )
    print_response("[Step 0] Registration", register_response)

    if not register_response.json().get("success"):
        # User might already exist, try login
        print("\n[Step 0] User exists, attempting login...")
        login_response = requests.post(
            f"{BASE_URL}/auth/login",
            json={
                "email": "onboarding_test@example.com",
                "password": "Test1234"
            }
        )
        print_response("[Step 0] Login", login_response)
        token = login_response.json()["data"]["tokens"]["access_token"]
    else:
        token = register_response.json()["data"]["tokens"]["access_token"]

    headers = {"Authorization": f"Bearer {token}"}

    # Check initial progress
    print("\n[Check] Getting initial onboarding progress...")
    progress_response = requests.get(
        f"{BASE_URL}/onboarding/progress",
        headers=headers
    )
    print_response("[Check] Initial Progress", progress_response)

    # Step 1: Update basic profile
    print("\n[Step 1] Updating basic profile...")
    profile_response = requests.put(
        f"{BASE_URL}/onboarding/profile",
        json={
            "first_name": "John",
            "last_name": "Doe",
            "phone": "+1234567890",
            "location": "New York, NY"
        },
        headers=headers
    )
    print_response("[Step 1] Basic Profile Update", profile_response)

    # Check progress after step 1
    progress_response = requests.get(
        f"{BASE_URL}/onboarding/progress",
        headers=headers
    )
    print_response("[Check] Progress after Step 1", progress_response)

    # Step 2: Update job preferences
    print("\n[Step 2] Updating job preferences...")
    preferences_response = requests.put(
        f"{BASE_URL}/onboarding/preferences",
        json={
            "target_titles": ["Software Engineer", "Full Stack Developer", "Backend Developer"],
            "salary_min": 100000,
            "salary_max": 180000,
            "industries": ["Technology", "Finance", "Healthcare"]
        },
        headers=headers
    )
    print_response("[Step 2] Job Preferences Update", preferences_response)

    # Check progress after step 2
    progress_response = requests.get(
        f"{BASE_URL}/onboarding/progress",
        headers=headers
    )
    print_response("[Check] Progress after Step 2", progress_response)

    # Step 3: Update skills
    print("\n[Step 3] Updating skills...")
    skills_response = requests.put(
        f"{BASE_URL}/onboarding/skills",
        json={
            "skills": [
                {"name": "Python", "proficiency": "expert"},
                {"name": "JavaScript", "proficiency": "advanced"},
                {"name": "React", "proficiency": "advanced"},
                {"name": "Node.js", "proficiency": "intermediate"},
                {"name": "PostgreSQL", "proficiency": "advanced"},
                {"name": "Docker", "proficiency": "intermediate"},
                {"name": "AWS", "proficiency": "intermediate"}
            ]
        },
        headers=headers
    )
    print_response("[Step 3] Skills Update", skills_response)

    # Check progress after step 3
    progress_response = requests.get(
        f"{BASE_URL}/onboarding/progress",
        headers=headers
    )
    print_response("[Check] Progress after Step 3", progress_response)

    # Step 4: Update work preferences
    print("\n[Step 4] Updating work preferences...")
    work_prefs_response = requests.put(
        f"{BASE_URL}/onboarding/work-preferences",
        json={
            "remote": True,
            "visa_friendly": False,
            "relocation": True,
            "contract": False,
            "part_time": False
        },
        headers=headers
    )
    print_response("[Step 4] Work Preferences Update", work_prefs_response)

    # Check final progress
    print("\n[Final Check] Getting final onboarding progress...")
    final_progress_response = requests.get(
        f"{BASE_URL}/onboarding/progress",
        headers=headers
    )
    print_response("[Final Check] Final Progress", final_progress_response)

    # Get complete profile
    print("\n[Final Check] Getting complete profile...")
    complete_profile_response = requests.get(
        f"{BASE_URL}/onboarding/profile",
        headers=headers
    )
    print_response("[Final Check] Complete Profile", complete_profile_response)

    # Verify onboarding is complete
    final_data = final_progress_response.json()
    if final_data.get("data", {}).get("onboarding_complete"):
        print("\n" + "=" * 80)
        print("✅ ONBOARDING FLOW COMPLETED SUCCESSFULLY!")
        print("=" * 80)
        return True
    else:
        print("\n" + "=" * 80)
        print("❌ ONBOARDING FLOW INCOMPLETE")
        print("=" * 80)
        return False


def test_validation_errors():
    """Test validation errors"""
    print("\n\n" + "=" * 80)
    print("TESTING VALIDATION ERRORS")
    print("=" * 80)

    # Register/login
    register_response = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            "email": "onboarding_test@example.com",
            "password": "Test1234"
        }
    )
    token = register_response.json()["data"]["tokens"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Test: Empty first name
    print("\n[Validation Test 1] Empty first name...")
    response = requests.put(
        f"{BASE_URL}/onboarding/profile",
        json={
            "first_name": "",
            "last_name": "Doe"
        },
        headers=headers
    )
    print_response("[Validation Test 1] Empty First Name", response)

    # Test: Invalid salary range
    print("\n[Validation Test 2] Invalid salary range (max < min)...")
    response = requests.put(
        f"{BASE_URL}/onboarding/preferences",
        json={
            "target_titles": ["Software Engineer"],
            "salary_min": 150000,
            "salary_max": 100000
        },
        headers=headers
    )
    print_response("[Validation Test 2] Invalid Salary Range", response)

    # Test: Empty skills list
    print("\n[Validation Test 3] Empty skills list...")
    response = requests.put(
        f"{BASE_URL}/onboarding/skills",
        json={"skills": []},
        headers=headers
    )
    print_response("[Validation Test 3] Empty Skills List", response)

    # Test: Duplicate skills
    print("\n[Validation Test 4] Duplicate skills...")
    response = requests.put(
        f"{BASE_URL}/onboarding/skills",
        json={
            "skills": [
                {"name": "Python", "proficiency": "expert"},
                {"name": "python", "proficiency": "advanced"}  # Duplicate (case-insensitive)
            ]
        },
        headers=headers
    )
    print_response("[Validation Test 4] Duplicate Skills", response)


if __name__ == "__main__":
    # Test complete onboarding flow
    success = test_onboarding_flow()

    # Test validation errors
    test_validation_errors()

    print("\n" + "=" * 80)
    if success:
        print("✅ ALL ONBOARDING TESTS COMPLETED!")
    else:
        print("⚠️  ONBOARDING TESTS COMPLETED WITH ISSUES")
    print("=" * 80)
