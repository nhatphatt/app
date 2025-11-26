"""
Test script for Inventory and Staff Management APIs
Run this after starting the backend server
"""
import requests
import json
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:8000/api"
# Replace with your actual token after login
AUTH_TOKEN = "YOUR_AUTH_TOKEN_HERE"

headers = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json"
}

def print_response(title, response):
    """Pretty print API response"""
    print(f"\n{'='*60}")
    print(f"TEST: {title}")
    print(f"{'='*60}")
    print(f"Status Code: {response.status_code}")
    if response.status_code < 400:
        try:
            print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        except:
            print(f"Response: {response.text}")
    else:
        print(f"Error: {response.text}")
    print()

def test_inventory_apis():
    """Test Inventory Management APIs"""
    print("\n" + "🍽"*30)
    print("TESTING INVENTORY MANAGEMENT APIs")
    print("🍽"*30)
    
    # 1. Create inventory item
    print("\n1️⃣ Creating inventory items...")
    inventory_items = [
        {
            "dish_name": "Phở Bò",
            "category_name": "Món Chính",
            "quantity_in_stock": 50,
            "reorder_threshold": 10,
            "unit": "phần"
        },
        {
            "dish_name": "Cơm Gà",
            "category_name": "Món Chính",
            "quantity_in_stock": 30,
            "reorder_threshold": 8,
            "unit": "phần"
        },
        {
            "dish_name": "Trà Đá",
            "category_name": "Đồ Uống",
            "quantity_in_stock": 100,
            "reorder_threshold": 20,
            "unit": "ly"
        },
        {
            "dish_name": "Cà Phê Sữa",
            "category_name": "Đồ Uống",
            "quantity_in_stock": 5,  # Low stock
            "reorder_threshold": 15,
            "unit": "ly"
        },
        {
            "dish_name": "Bánh Flan",
            "category_name": "Tráng Miệng",
            "quantity_in_stock": 0,  # Out of stock
            "reorder_threshold": 10,
            "unit": "phần"
        }
    ]
    
    created_items = []
    for item in inventory_items:
        response = requests.post(f"{BASE_URL}/inventory-dishes", 
                               headers=headers, 
                               json=item)
        print_response(f"Create: {item['dish_name']}", response)
        if response.status_code == 200:
            created_items.append(response.json())
    
    # 2. Get all inventory
    print("\n2️⃣ Getting all inventory items...")
    response = requests.get(f"{BASE_URL}/inventory-dishes", headers=headers)
    print_response("Get All Inventory", response)
    
    # 3. Get low stock items
    print("\n3️⃣ Getting low stock items...")
    response = requests.get(f"{BASE_URL}/inventory-dishes/low-stock", headers=headers)
    print_response("Get Low Stock Items", response)
    
    # 4. Get inventory stats
    print("\n4️⃣ Getting inventory statistics...")
    response = requests.get(f"{BASE_URL}/inventory-dishes/stats/summary", headers=headers)
    print_response("Get Inventory Stats", response)
    
    # 5. Adjust inventory quantity
    if created_items:
        item_id = created_items[0]['id']
        print(f"\n5️⃣ Adjusting inventory quantity for {created_items[0]['dish_name']}...")
        
        # Add stock
        adjustment = {
            "adjustment_type": "add",
            "quantity": 20,
            "reason": "Nhập hàng mới"
        }
        response = requests.post(f"{BASE_URL}/inventory-dishes/{item_id}/adjust",
                               headers=headers,
                               json=adjustment)
        print_response("Add Stock", response)
        
        # Subtract stock
        adjustment = {
            "adjustment_type": "subtract",
            "quantity": 5,
            "reason": "Test giảm kho"
        }
        response = requests.post(f"{BASE_URL}/inventory-dishes/{item_id}/adjust",
                               headers=headers,
                               json=adjustment)
        print_response("Subtract Stock", response)
        
        # Get history
        print(f"\n6️⃣ Getting adjustment history...")
        response = requests.get(f"{BASE_URL}/inventory-dishes/{item_id}/history",
                              headers=headers)
        print_response("Get Adjustment History", response)
    
    return created_items

def test_employee_apis():
    """Test Employee Management APIs"""
    print("\n" + "👥"*30)
    print("TESTING EMPLOYEE MANAGEMENT APIs")
    print("👥"*30)
    
    # 1. Create employees
    print("\n1️⃣ Creating employees...")
    employees = [
        {
            "full_name": "Nguyễn Văn A",
            "position": "phục vụ",
            "phone_number": "0901234567",
            "email": "nguyenvana@example.com",
            "hire_date": "2024-01-15",
            "salary": 5000000,
            "notes": "Nhân viên chính thức"
        },
        {
            "full_name": "Trần Thị B",
            "position": "pha chế",
            "phone_number": "0902234567",
            "email": "tranthib@example.com",
            "hire_date": "2024-02-01",
            "salary": 6000000,
            "notes": "Chuyên gia pha chế"
        },
        {
            "full_name": "Lê Văn C",
            "position": "quản lý",
            "phone_number": "0903234567",
            "email": "levanc@example.com",
            "hire_date": "2023-12-01",
            "salary": 10000000,
            "notes": "Quản lý ca"
        }
    ]
    
    created_employees = []
    for emp in employees:
        response = requests.post(f"{BASE_URL}/employees",
                               headers=headers,
                               json=emp)
        print_response(f"Create Employee: {emp['full_name']}", response)
        if response.status_code == 200:
            created_employees.append(response.json())
    
    # 2. Get all employees
    print("\n2️⃣ Getting all employees...")
    response = requests.get(f"{BASE_URL}/employees", headers=headers)
    print_response("Get All Employees", response)
    
    # 3. Filter by status
    print("\n3️⃣ Getting active employees...")
    response = requests.get(f"{BASE_URL}/employees?status=active", headers=headers)
    print_response("Get Active Employees", response)
    
    # 4. Update employee
    if created_employees:
        emp_id = created_employees[0]['id']
        print(f"\n4️⃣ Updating employee {created_employees[0]['full_name']}...")
        update_data = {
            "salary": 5500000,
            "notes": "Tăng lương sau 3 tháng"
        }
        response = requests.put(f"{BASE_URL}/employees/{emp_id}",
                              headers=headers,
                              json=update_data)
        print_response("Update Employee", response)
    
    return created_employees

def test_shift_apis(employees):
    """Test Shift Management APIs"""
    print("\n" + "📅"*30)
    print("TESTING SHIFT MANAGEMENT APIs")
    print("📅"*30)
    
    if not employees:
        print("❌ No employees available for shift testing")
        return []
    
    # 1. Create shifts
    print("\n1️⃣ Creating shifts...")
    today = datetime.now().date()
    
    shifts_data = [
        {
            "employee_id": employees[0]['id'],
            "shift_date": str(today),
            "shift_start": "08:00",
            "shift_end": "17:00",
            "notes": "Ca sáng - chiều"
        },
        {
            "employee_id": employees[1]['id'] if len(employees) > 1 else employees[0]['id'],
            "shift_date": str(today),
            "shift_start": "14:00",
            "shift_end": "22:00",
            "notes": "Ca chiều - tối"
        }
    ]
    
    created_shifts = []
    for shift in shifts_data:
        response = requests.post(f"{BASE_URL}/shifts",
                               headers=headers,
                               json=shift)
        print_response(f"Create Shift for {shift['shift_date']}", response)
        if response.status_code == 200:
            created_shifts.append(response.json())
    
    # 2. Bulk create shifts
    print("\n2️⃣ Creating bulk shifts...")
    tomorrow = today + timedelta(days=1)
    bulk_shift = {
        "employee_ids": [emp['id'] for emp in employees[:2]],
        "shift_date": str(tomorrow),
        "shift_start": "09:00",
        "shift_end": "18:00",
        "notes": "Ca làm việc hàng loạt"
    }
    response = requests.post(f"{BASE_URL}/shifts/bulk-create",
                           headers=headers,
                           json=bulk_shift)
    print_response("Create Bulk Shifts", response)
    
    # 3. Get all shifts
    print("\n3️⃣ Getting all shifts...")
    response = requests.get(f"{BASE_URL}/shifts", headers=headers)
    print_response("Get All Shifts", response)
    
    # 4. Filter by date
    print(f"\n4️⃣ Getting shifts for today ({today})...")
    response = requests.get(f"{BASE_URL}/shifts?start_date={today}&end_date={today}",
                          headers=headers)
    print_response("Get Today's Shifts", response)
    
    return created_shifts

def test_attendance_apis(employees):
    """Test Attendance Management APIs"""
    print("\n" + "⏰"*30)
    print("TESTING ATTENDANCE MANAGEMENT APIs")
    print("⏰"*30)
    
    if not employees:
        print("❌ No employees available for attendance testing")
        return []
    
    # 1. Check-in
    print("\n1️⃣ Checking in employees...")
    attendance_logs = []
    for emp in employees[:2]:  # Check-in first 2 employees
        checkin_data = {
            "employee_id": emp['id'],
            "notes": f"Check-in test for {emp['full_name']}"
        }
        response = requests.post(f"{BASE_URL}/attendance/checkin",
                               headers=headers,
                               json=checkin_data)
        print_response(f"Check-in: {emp['full_name']}", response)
        if response.status_code == 200:
            attendance_logs.append(response.json())
    
    # 2. Get active attendance
    print("\n2️⃣ Getting active attendance...")
    response = requests.get(f"{BASE_URL}/attendance/active", headers=headers)
    print_response("Get Active Attendance", response)
    
    # 3. Check-out
    if attendance_logs:
        print(f"\n3️⃣ Checking out first employee...")
        attendance_id = attendance_logs[0]['id']
        checkout_data = {
            "notes": "Hoàn thành ca làm việc"
        }
        response = requests.post(f"{BASE_URL}/attendance/checkout/{attendance_id}",
                               headers=headers,
                               json=checkout_data)
        print_response("Check-out", response)
    
    # 4. Get all attendance logs
    print("\n4️⃣ Getting all attendance logs...")
    response = requests.get(f"{BASE_URL}/attendance", headers=headers)
    print_response("Get All Attendance Logs", response)
    
    # 5. Get employee stats
    if employees:
        emp_id = employees[0]['id']
        print(f"\n5️⃣ Getting attendance stats for {employees[0]['full_name']}...")
        start_date = (datetime.now() - timedelta(days=30)).date()
        end_date = datetime.now().date()
        response = requests.get(
            f"{BASE_URL}/attendance/employee/{emp_id}/stats?start_date={start_date}&end_date={end_date}",
            headers=headers
        )
        print_response("Get Employee Stats", response)
    
    return attendance_logs

def run_all_tests():
    """Run all API tests"""
    print("\n" + "🚀"*30)
    print("STARTING COMPREHENSIVE API TESTS")
    print("🚀"*30)
    print("\nMake sure:")
    print("1. Backend server is running on http://localhost:8000")
    print("2. You have updated AUTH_TOKEN with a valid token")
    print("3. You are logged in as admin")
    print()
    
    try:
        # Test Inventory APIs
        inventory_items = test_inventory_apis()
        
        # Test Employee APIs
        employees = test_employee_apis()
        
        # Test Shift APIs
        shifts = test_shift_apis(employees)
        
        # Test Attendance APIs
        attendance = test_attendance_apis(employees)
        
        print("\n" + "✅"*30)
        print("ALL TESTS COMPLETED!")
        print("✅"*30)
        print(f"\nSummary:")
        print(f"  - Inventory items created: {len(inventory_items)}")
        print(f"  - Employees created: {len(employees)}")
        print(f"  - Shifts created: {len(shifts)}")
        print(f"  - Attendance logs created: {len(attendance)}")
        
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Cannot connect to backend server!")
        print("Make sure the server is running on http://localhost:8000")
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("""
╔══════════════════════════════════════════════════════════════╗
║  INVENTORY & STAFF MANAGEMENT API TEST SUITE                ║
║  Minitake F&B System                                         ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    # Check if token is set
    if AUTH_TOKEN == "YOUR_AUTH_TOKEN_HERE":
        print("⚠️  WARNING: AUTH_TOKEN not set!")
        print("\nTo get your auth token:")
        print("1. Login to admin panel")
        print("2. Open browser DevTools (F12)")
        print("3. Go to Application/Storage > Local Storage")
        print("4. Copy the 'token' value")
        print("5. Replace AUTH_TOKEN in this script\n")
        
        response = input("Do you want to continue anyway? (y/n): ")
        if response.lower() != 'y':
            print("Exiting...")
            exit()
    
    run_all_tests()
