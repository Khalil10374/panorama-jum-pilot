from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.core.security import get_current_user
from src.db.session import get_db
from src.models import (
    Attendance,
    Booking,
    Cottage,
    IncomeExpense,
    InventoryItem,
    ParkingTicket,
    Product,
    RideTicket,
    Sale,
    Supplier,
)
from src.routers.crud import serialize


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def scalar_sum(db: Session, stmt) -> float:
    return float(db.scalar(stmt) or 0)


def local_date(column):
    return func.date(func.datetime(column, "+6 hours"))


@router.get("")
def dashboard(db: Session = Depends(get_db), _current_user=Depends(get_current_user)):
    today = date.today()
    month_start = today.replace(day=1)
    sales_income = scalar_sum(
        db,
        select(func.sum(Sale.total_amount)).where(func.date(Sale.created_at) >= month_start.isoformat()),
    )
    parking_income = scalar_sum(
        db,
        select(func.sum(ParkingTicket.amount)).where(
            ParkingTicket.payment_status == "Paid",
            local_date(func.coalesce(ParkingTicket.exit_time, ParkingTicket.created_at)) >= month_start.isoformat(),
        ),
    )
    ride_income = scalar_sum(
        db,
        select(func.sum(RideTicket.total_amount)).where(func.date(RideTicket.created_at) >= month_start.isoformat()),
    )
    coffee_sales = scalar_sum(
        db,
        select(func.sum(Sale.total_amount)).where(Sale.module == "Coffee", func.date(Sale.created_at) >= month_start.isoformat()),
    )
    store_sales = scalar_sum(
        db,
        select(func.sum(Sale.total_amount)).where(Sale.module == "Store", func.date(Sale.created_at) >= month_start.isoformat()),
    )
    cottage_collections = scalar_sum(
        db,
        select(func.sum(Booking.paid_amount)).where(func.date(Booking.created_at) >= month_start.isoformat()),
    )
    other_income = scalar_sum(
        db,
        select(func.sum(IncomeExpense.amount)).where(
            IncomeExpense.type == "Income",
            IncomeExpense.transaction_date >= month_start,
        ),
    )
    expense = scalar_sum(
        db,
        select(func.sum(IncomeExpense.amount)).where(
            IncomeExpense.type == "Expense",
            IncomeExpense.transaction_date >= month_start,
        ),
    )
    total_income = sales_income + parking_income + ride_income + cottage_collections + other_income
    total_cottages = db.scalar(select(func.count(Cottage.id))) or 0
    occupied = db.scalar(select(func.count(Booking.id)).where(Booking.status.in_(["Confirmed", "Checked In"]))) or 0
    low_inventory = db.scalars(
        select(InventoryItem).where(InventoryItem.current_stock <= InventoryItem.reorder_level).limit(8)
    ).all()
    low_products = db.scalars(select(Product).where(Product.stock_qty <= Product.reorder_level).limit(8)).all()
    pending_dues = scalar_sum(db, select(func.sum(Booking.total_amount - Booking.paid_amount)).where(Booking.status != "Cancelled"))
    supplier_dues = scalar_sum(db, select(func.sum(Supplier.balance_due)))
    attendance_present = db.scalar(select(func.count(Attendance.id)).where(Attendance.attendance_date == today, Attendance.status == "Present")) or 0
    attendance_absent = db.scalar(select(func.count(Attendance.id)).where(Attendance.attendance_date == today, Attendance.status == "Absent")) or 0

    stats = [
        {"label": "This Month's Total Income", "value": total_income, "type": "money"},
        {"label": "Cottage Occupancy", "value": f"{occupied}/{total_cottages}", "type": "text"},
        {"label": "Parking Income", "value": parking_income, "type": "money"},
        {"label": "Ride Income", "value": ride_income, "type": "money"},
        {"label": "Restaurant/Coffee Sales", "value": coffee_sales, "type": "money"},
        {"label": "Store Sales", "value": store_sales, "type": "money"},
        {"label": "Cottage Collections", "value": cottage_collections, "type": "money"},
        {"label": "Other Income", "value": other_income, "type": "money"},
        {"label": "Total Expense", "value": expense, "type": "money"},
        {"label": "Net Profit", "value": total_income - expense, "type": "money"},
        {"label": "Pending Dues", "value": pending_dues + supplier_dues, "type": "money"},
        {"label": "Staff Present", "value": attendance_present, "type": "number"},
        {"label": "Staff Absent", "value": attendance_absent, "type": "number"},
    ]
    return {
        "stats": stats,
        "low_stock": [serialize(item) for item in low_inventory] + [serialize(product) for product in low_products],
    }
