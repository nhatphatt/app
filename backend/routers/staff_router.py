"""Staff Management API Router (Employees, Shifts, Attendance)."""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid

from models.inventory_models import (
    EmployeeCreate,
    EmployeeUpdate,
    Employee,
    ShiftCreate,
    ShiftUpdate,
    Shift,
    BulkShiftCreate,
    AttendanceCheckIn,
    AttendanceCheckOut,
    AttendanceLog,
    AttendanceStats,
    BulkEmployeeImport
)

# Router will be initialized with db and get_current_user dependencies
employee_router = APIRouter(prefix="/employees", tags=["Staff Management"])
shift_router = APIRouter(prefix="/shifts", tags=["Staff Management"])
attendance_router = APIRouter(prefix="/attendance", tags=["Staff Management"])


def create_staff_routers(db, get_current_user):
    """Factory function to create staff routers with dependencies."""
    
    # ============ EMPLOYEE ROUTES ============
    
    @employee_router.get("", response_model=List[Employee])
    async def get_all_employees(
        status: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """Get all employees for current store"""
        query = {"store_id": current_user["store_id"]}
        
        if status:
            query["status"] = status
        
        employees = await db.employees.find(query, {"_id": 0}).sort("full_name", 1).to_list(1000)
        
        return employees
    
    @employee_router.get("/{employee_id}", response_model=Employee)
    async def get_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
        """Get specific employee"""
        employee = await db.employees.find_one(
            {"id": employee_id, "store_id": current_user["store_id"]},
            {"_id": 0}
        )
        
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        return employee
    
    @employee_router.post("", response_model=Employee)
    async def create_employee(
        input_data: EmployeeCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Create new employee"""
        # Check if phone number already exists
        existing = await db.employees.find_one({
            "store_id": current_user["store_id"],
            "phone_number": input_data.phone_number
        })
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Số điện thoại đã được sử dụng bởi nhân viên khác"
            )
        
        employee_id = str(uuid.uuid4())
        
        employee_doc = {
            "id": employee_id,
            "store_id": current_user["store_id"],
            "full_name": input_data.full_name,
            "position": input_data.position,
            "phone_number": input_data.phone_number,
            "email": input_data.email,
            "hire_date": input_data.hire_date,
            "salary": input_data.salary or 0,
            "status": "active",
            "notes": input_data.notes or "",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": None
        }
        
        await db.employees.insert_one(employee_doc)
        
        return Employee(**employee_doc)
    
    @employee_router.put("/{employee_id}", response_model=Employee)
    async def update_employee(
        employee_id: str,
        input_data: EmployeeUpdate,
        current_user: dict = Depends(get_current_user)
    ):
        """Update employee details"""
        # Get existing employee
        existing = await db.employees.find_one({
            "id": employee_id,
            "store_id": current_user["store_id"]
        })
        
        if not existing:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Build update data
        update_data = {k: v for k, v in input_data.model_dump().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No data to update")
        
        # Check if phone number is being changed and already exists
        if "phone_number" in update_data and update_data["phone_number"] != existing["phone_number"]:
            phone_exists = await db.employees.find_one({
                "store_id": current_user["store_id"],
                "phone_number": update_data["phone_number"],
                "id": {"$ne": employee_id}
            })
            
            if phone_exists:
                raise HTTPException(
                    status_code=400,
                    detail="Số điện thoại đã được sử dụng bởi nhân viên khác"
                )
        
        # Update timestamp
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.employees.update_one(
            {"id": employee_id},
            {"$set": update_data}
        )
        
        # Get updated employee
        updated_employee = await db.employees.find_one({"id": employee_id}, {"_id": 0})
        
        return Employee(**updated_employee)
    
    @employee_router.delete("/{employee_id}")
    async def delete_employee(
        employee_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Delete employee"""
        result = await db.employees.delete_one({
            "id": employee_id,
            "store_id": current_user["store_id"]
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        return {"message": "Employee deleted successfully"}
    
    @employee_router.post("/bulk-import")
    async def bulk_import_employees(
        input_data: BulkEmployeeImport,
        current_user: dict = Depends(get_current_user)
    ):
        """Bulk import employees"""
        created_employees = []
        errors = []
        
        for idx, emp_data in enumerate(input_data.employees):
            # Check if phone already exists
            existing = await db.employees.find_one({
                "store_id": current_user["store_id"],
                "phone_number": emp_data.phone_number
            })
            
            if existing:
                errors.append({
                    "index": idx,
                    "full_name": emp_data.full_name,
                    "error": "Số điện thoại đã tồn tại"
                })
                continue
            
            employee_id = str(uuid.uuid4())
            
            employee_doc = {
                "id": employee_id,
                "store_id": current_user["store_id"],
                "full_name": emp_data.full_name,
                "position": emp_data.position,
                "phone_number": emp_data.phone_number,
                "email": emp_data.email,
                "hire_date": emp_data.hire_date,
                "salary": emp_data.salary or 0,
                "status": "active",
                "notes": emp_data.notes or "",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": None
            }
            
            try:
                await db.employees.insert_one(employee_doc)
                created_employees.append(Employee(**employee_doc))
            except Exception as e:
                errors.append({
                    "index": idx,
                    "full_name": emp_data.full_name,
                    "error": str(e)
                })
        
        return {
            "employees_success": len(created_employees),
            "employees_failed": len(errors),
            "created_employees": created_employees,
            "errors": errors
        }
    
    # ============ SHIFT ROUTES ============
    
    @shift_router.get("", response_model=List[Shift])
    async def get_all_shifts(
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        employee_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """Get all shifts for current store with optional filters"""
        query = {"store_id": current_user["store_id"]}
        
        if start_date:
            query["shift_date"] = {"$gte": start_date}
        
        if end_date:
            if "shift_date" in query:
                query["shift_date"]["$lte"] = end_date
            else:
                query["shift_date"] = {"$lte": end_date}
        
        if employee_id:
            query["employee_id"] = employee_id
        
        shifts = await db.shifts.find(query, {"_id": 0}).sort("shift_date", -1).to_list(1000)
        
        return shifts
    
    @shift_router.get("/{shift_id}", response_model=Shift)
    async def get_shift(shift_id: str, current_user: dict = Depends(get_current_user)):
        """Get specific shift"""
        shift = await db.shifts.find_one(
            {"id": shift_id, "store_id": current_user["store_id"]},
            {"_id": 0}
        )
        
        if not shift:
            raise HTTPException(status_code=404, detail="Shift not found")
        
        return shift
    
    @shift_router.post("", response_model=Shift)
    async def create_shift(
        input_data: ShiftCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Create new shift"""
        # Verify employee exists and belongs to this store
        employee = await db.employees.find_one({
            "id": input_data.employee_id,
            "store_id": current_user["store_id"]
        })
        
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Calculate hours worked
        try:
            start_time = datetime.strptime(input_data.shift_start, "%H:%M")
            end_time = datetime.strptime(input_data.shift_end, "%H:%M")
            
            hours_worked = (end_time - start_time).total_seconds() / 3600
            
            # Handle overnight shifts
            if hours_worked < 0:
                hours_worked += 24
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid time format. Use HH:MM (e.g., 09:00, 17:30)"
            )
        
        shift_id = str(uuid.uuid4())
        
        shift_doc = {
            "id": shift_id,
            "store_id": current_user["store_id"],
            "employee_id": input_data.employee_id,
            "employee_name": employee["full_name"],
            "shift_date": input_data.shift_date,
            "shift_start": input_data.shift_start,
            "shift_end": input_data.shift_end,
            "hours_worked": round(hours_worked, 2),
            "notes": input_data.notes or "",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": None
        }
        
        await db.shifts.insert_one(shift_doc)
        
        return Shift(**shift_doc)
    
    @shift_router.post("/bulk-create")
    async def bulk_create_shifts(
        input_data: BulkShiftCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Create shifts for multiple employees on the same date/time"""
        created_shifts = []
        errors = []
        
        # Calculate hours worked
        try:
            start_time = datetime.strptime(input_data.shift_start, "%H:%M")
            end_time = datetime.strptime(input_data.shift_end, "%H:%M")
            
            hours_worked = (end_time - start_time).total_seconds() / 3600
            
            if hours_worked < 0:
                hours_worked += 24
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid time format. Use HH:MM"
            )
        
        for idx, employee_id in enumerate(input_data.employee_ids):
            # Verify employee
            employee = await db.employees.find_one({
                "id": employee_id,
                "store_id": current_user["store_id"]
            })
            
            if not employee:
                errors.append({
                    "index": idx,
                    "employee_id": employee_id,
                    "error": "Employee not found"
                })
                continue
            
            shift_id = str(uuid.uuid4())
            
            shift_doc = {
                "id": shift_id,
                "store_id": current_user["store_id"],
                "employee_id": employee_id,
                "employee_name": employee["full_name"],
                "shift_date": input_data.shift_date,
                "shift_start": input_data.shift_start,
                "shift_end": input_data.shift_end,
                "hours_worked": round(hours_worked, 2),
                "notes": input_data.notes or "",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": None
            }
            
            try:
                await db.shifts.insert_one(shift_doc)
                created_shifts.append(Shift(**shift_doc))
            except Exception as e:
                errors.append({
                    "index": idx,
                    "employee_id": employee_id,
                    "error": str(e)
                })
        
        return {
            "shifts_created": len(created_shifts),
            "shifts_failed": len(errors),
            "created_shifts": created_shifts,
            "errors": errors
        }
    
    @shift_router.put("/{shift_id}", response_model=Shift)
    async def update_shift(
        shift_id: str,
        input_data: ShiftUpdate,
        current_user: dict = Depends(get_current_user)
    ):
        """Update shift details"""
        # Get existing shift
        existing = await db.shifts.find_one({
            "id": shift_id,
            "store_id": current_user["store_id"]
        })
        
        if not existing:
            raise HTTPException(status_code=404, detail="Shift not found")
        
        # Build update data
        update_data = {k: v for k, v in input_data.model_dump().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No data to update")
        
        # Recalculate hours if time changed
        if "shift_start" in update_data or "shift_end" in update_data:
            start = update_data.get("shift_start", existing["shift_start"])
            end = update_data.get("shift_end", existing["shift_end"])
            
            try:
                start_time = datetime.strptime(start, "%H:%M")
                end_time = datetime.strptime(end, "%H:%M")
                
                hours_worked = (end_time - start_time).total_seconds() / 3600
                
                if hours_worked < 0:
                    hours_worked += 24
                
                update_data["hours_worked"] = round(hours_worked, 2)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid time format"
                )
        
        # Update timestamp
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.shifts.update_one(
            {"id": shift_id},
            {"$set": update_data}
        )
        
        # Get updated shift
        updated_shift = await db.shifts.find_one({"id": shift_id}, {"_id": 0})
        
        return Shift(**updated_shift)
    
    @shift_router.delete("/{shift_id}")
    async def delete_shift(
        shift_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Delete shift"""
        result = await db.shifts.delete_one({
            "id": shift_id,
            "store_id": current_user["store_id"]
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Shift not found")
        
        return {"message": "Shift deleted successfully"}
    
    # ============ ATTENDANCE ROUTES ============
    
    @attendance_router.post("/checkin", response_model=AttendanceLog)
    async def check_in(
        input_data: AttendanceCheckIn,
        current_user: dict = Depends(get_current_user)
    ):
        """Employee check-in"""
        # Verify employee exists
        employee = await db.employees.find_one({
            "id": input_data.employee_id,
            "store_id": current_user["store_id"]
        })
        
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Check if already checked in today
        today = datetime.now(timezone.utc).date().isoformat()
        existing_checkin = await db.attendance_logs.find_one({
            "employee_id": input_data.employee_id,
            "check_in_time": {"$regex": f"^{today}"},
            "check_out_time": None
        })
        
        if existing_checkin:
            raise HTTPException(
                status_code=400,
                detail="Nhân viên đã check-in. Vui lòng check-out trước khi check-in lại."
            )
        
        attendance_id = str(uuid.uuid4())
        check_in_time = datetime.now(timezone.utc).isoformat()
        
        attendance_doc = {
            "id": attendance_id,
            "store_id": current_user["store_id"],
            "employee_id": input_data.employee_id,
            "employee_name": employee["full_name"],
            "shift_id": input_data.shift_id,
            "check_in_time": check_in_time,
            "check_out_time": None,
            "hours_worked": None,
            "status": "checked_in",
            "notes": input_data.notes or "",
            "created_at": check_in_time
        }
        
        await db.attendance_logs.insert_one(attendance_doc)
        
        return AttendanceLog(**attendance_doc)
    
    @attendance_router.post("/checkout/{attendance_id}", response_model=AttendanceLog)
    async def check_out(
        attendance_id: str,
        input_data: AttendanceCheckOut,
        current_user: dict = Depends(get_current_user)
    ):
        """Employee check-out"""
        # Get attendance record
        attendance = await db.attendance_logs.find_one({
            "id": attendance_id,
            "store_id": current_user["store_id"]
        })
        
        if not attendance:
            raise HTTPException(status_code=404, detail="Attendance record not found")
        
        if attendance.get("check_out_time"):
            raise HTTPException(status_code=400, detail="Already checked out")
        
        check_out_time = datetime.now(timezone.utc).isoformat()
        
        # Calculate hours worked
        check_in_dt = datetime.fromisoformat(attendance["check_in_time"])
        check_out_dt = datetime.fromisoformat(check_out_time)
        
        hours_worked = (check_out_dt - check_in_dt).total_seconds() / 3600
        
        # Update attendance record
        update_data = {
            "check_out_time": check_out_time,
            "hours_worked": round(hours_worked, 2),
            "status": "checked_out"
        }
        
        if input_data.notes:
            update_data["notes"] = attendance.get("notes", "") + " | " + input_data.notes
        
        await db.attendance_logs.update_one(
            {"id": attendance_id},
            {"$set": update_data}
        )
        
        # Get updated record
        updated_attendance = await db.attendance_logs.find_one({"id": attendance_id}, {"_id": 0})
        
        return AttendanceLog(**updated_attendance)
    
    @attendance_router.get("", response_model=List[AttendanceLog])
    async def get_attendance_logs(
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        employee_id: Optional[str] = None,
        status: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """Get attendance logs with optional filters"""
        query = {"store_id": current_user["store_id"]}
        
        if start_date:
            query["check_in_time"] = {"$gte": start_date}
        
        if end_date:
            if "check_in_time" in query:
                query["check_in_time"]["$lte"] = end_date
            else:
                query["check_in_time"] = {"$lte": end_date}
        
        if employee_id:
            query["employee_id"] = employee_id
        
        if status:
            query["status"] = status
        
        logs = await db.attendance_logs.find(query, {"_id": 0}).sort("check_in_time", -1).to_list(1000)
        
        return logs
    
    @attendance_router.get("/employee/{employee_id}/stats", response_model=AttendanceStats)
    async def get_employee_attendance_stats(
        employee_id: str,
        start_date: str,
        end_date: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get attendance statistics for an employee"""
        # Verify employee exists
        employee = await db.employees.find_one({
            "id": employee_id,
            "store_id": current_user["store_id"]
        })
        
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Get all attendance logs for period
        logs = await db.attendance_logs.find({
            "store_id": current_user["store_id"],
            "employee_id": employee_id,
            "check_in_time": {"$gte": start_date, "$lte": end_date}
        }).to_list(1000)
        
        total_days = len(logs)
        total_hours = sum(log.get("hours_worked", 0) for log in logs if log.get("hours_worked"))
        avg_hours = total_hours / total_days if total_days > 0 else 0
        
        # Count late arrivals (simplified - assume shift starts at 8:00)
        late_count = 0
        for log in logs:
            check_in_time = datetime.fromisoformat(log["check_in_time"])
            if check_in_time.hour > 8 or (check_in_time.hour == 8 and check_in_time.minute > 15):
                late_count += 1
        
        return AttendanceStats(
            employee_id=employee_id,
            employee_name=employee["full_name"],
            total_days_worked=total_days,
            total_hours_worked=round(total_hours, 2),
            average_hours_per_day=round(avg_hours, 2),
            late_count=late_count,
            absent_count=0,  # Would need shift data to calculate
            period_start=start_date,
            period_end=end_date
        )
    
    @attendance_router.get("/active")
    async def get_active_attendance(current_user: dict = Depends(get_current_user)):
        """Get currently checked-in employees"""
        logs = await db.attendance_logs.find({
            "store_id": current_user["store_id"],
            "status": "checked_in",
            "check_out_time": None
        }, {"_id": 0}).sort("check_in_time", -1).to_list(100)
        
        return logs
    
    return employee_router, shift_router, attendance_router
