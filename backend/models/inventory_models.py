"""Database models for Inventory and Staff Management."""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ============ INVENTORY MODELS ============

class DishInventoryCreate(BaseModel):
    """Create new dish inventory item"""
    dish_name: str
    category_name: str  # Món Chính / Đồ Uống / Tráng Miệng
    quantity_in_stock: int = Field(ge=0)
    reorder_threshold: int = Field(ge=0, default=10)
    unit: Optional[str] = "phần"  # phần, ly, chai, etc.


class DishInventoryUpdate(BaseModel):
    """Update dish inventory item"""
    dish_name: Optional[str] = None
    category_name: Optional[str] = None
    quantity_in_stock: Optional[int] = Field(None, ge=0)
    reorder_threshold: Optional[int] = Field(None, ge=0)
    unit: Optional[str] = None


class DishInventory(BaseModel):
    """Dish inventory item response"""
    id: str
    store_id: str
    dish_name: str
    category_name: str
    quantity_in_stock: int
    reorder_threshold: int
    unit: str
    is_low_stock: bool
    last_updated: str
    created_at: str


class InventoryAdjustment(BaseModel):
    """Adjust inventory quantity"""
    adjustment_type: str  # add, subtract, set
    quantity: int
    reason: Optional[str] = ""
    reference_order_id: Optional[str] = None


class InventoryHistory(BaseModel):
    """Inventory history record"""
    id: str
    inventory_id: str
    adjustment_type: str
    quantity_before: int
    quantity_after: int
    quantity_changed: int
    reason: str
    reference_order_id: Optional[str] = None
    adjusted_by: str
    adjusted_at: str


# ============ EMPLOYEE MODELS ============

class EmployeeCreate(BaseModel):
    """Create new employee"""
    full_name: str
    position: str  # phục vụ, pha chế, quản lý, thu ngân
    phone_number: str
    email: Optional[str] = None
    hire_date: str
    salary: Optional[float] = 0
    notes: Optional[str] = ""


class EmployeeUpdate(BaseModel):
    """Update employee"""
    full_name: Optional[str] = None
    position: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    salary: Optional[float] = None
    status: Optional[str] = None  # active, inactive, on_leave
    notes: Optional[str] = None


class Employee(BaseModel):
    """Employee response"""
    id: str
    store_id: str
    full_name: str
    position: str
    phone_number: str
    email: Optional[str] = None
    hire_date: str
    salary: float
    status: str  # active, inactive, on_leave
    notes: str
    created_at: str
    updated_at: Optional[str] = None


# ============ SHIFT MODELS ============

class ShiftCreate(BaseModel):
    """Create new shift"""
    employee_id: str
    shift_date: str  # YYYY-MM-DD
    shift_start: str  # HH:MM
    shift_end: str  # HH:MM
    notes: Optional[str] = ""


class ShiftUpdate(BaseModel):
    """Update shift"""
    shift_date: Optional[str] = None
    shift_start: Optional[str] = None
    shift_end: Optional[str] = None
    notes: Optional[str] = None


class Shift(BaseModel):
    """Shift response"""
    id: str
    store_id: str
    employee_id: str
    employee_name: str
    shift_date: str
    shift_start: str
    shift_end: str
    hours_worked: float
    notes: str
    created_at: str
    updated_at: Optional[str] = None


class BulkShiftCreate(BaseModel):
    """Create multiple shifts at once"""
    employee_ids: List[str]
    shift_date: str
    shift_start: str
    shift_end: str
    notes: Optional[str] = ""


# ============ ATTENDANCE MODELS ============

class AttendanceCheckIn(BaseModel):
    """Check-in request"""
    employee_id: str
    shift_id: Optional[str] = None
    notes: Optional[str] = ""


class AttendanceCheckOut(BaseModel):
    """Check-out request"""
    notes: Optional[str] = ""


class AttendanceLog(BaseModel):
    """Attendance log response"""
    id: str
    store_id: str
    employee_id: str
    employee_name: str
    shift_id: Optional[str] = None
    check_in_time: str
    check_out_time: Optional[str] = None
    hours_worked: Optional[float] = None
    status: str  # checked_in, checked_out, late, absent
    notes: str
    created_at: str


class AttendanceStats(BaseModel):
    """Attendance statistics for employee"""
    employee_id: str
    employee_name: str
    total_days_worked: int
    total_hours_worked: float
    average_hours_per_day: float
    late_count: int
    absent_count: int
    period_start: str
    period_end: str


# ============ BULK IMPORT MODELS ============

class BulkInventoryImport(BaseModel):
    """Bulk import inventory items"""
    items: List[DishInventoryCreate]


class BulkEmployeeImport(BaseModel):
    """Bulk import employees"""
    employees: List[EmployeeCreate]
