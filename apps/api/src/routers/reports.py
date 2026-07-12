from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.core.security import get_current_user
from src.db.session import get_db
from src.models import Booking, IncomeExpense, ParkingTicket, RideTicket, Sale


router = APIRouter(prefix="/reports", tags=["reports"])


def local_date(column):
    return func.date(func.datetime(column, "+6 hours"))


@router.get("/summary")
def report_summary(
    period: str = Query("daily", pattern="^(daily|monthly|yearly|custom)$"),
    from_date: date | None = None,
    to_date: date | None = None,
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    today = date.today()
    end = to_date or today
    if period == "custom" and from_date:
        start = from_date
    elif period == "daily":
        start = today
    elif period == "monthly":
        start = today.replace(day=1)
    else:
        start = today.replace(month=1, day=1)

    sales = float(
        db.scalar(
            select(func.sum(Sale.total_amount)).where(
                func.date(Sale.created_at) >= start.isoformat(),
                func.date(Sale.created_at) <= end.isoformat(),
            )
        )
        or 0
    )
    parking = float(
        db.scalar(
            select(func.sum(ParkingTicket.amount)).where(
                ParkingTicket.payment_status == "Paid",
                local_date(func.coalesce(ParkingTicket.exit_time, ParkingTicket.created_at)) >= start.isoformat(),
                local_date(func.coalesce(ParkingTicket.exit_time, ParkingTicket.created_at)) <= end.isoformat(),
            )
        )
        or 0
    )
    rides = float(
        db.scalar(
            select(func.sum(RideTicket.total_amount)).where(
                func.date(RideTicket.created_at) >= start.isoformat(),
                func.date(RideTicket.created_at) <= end.isoformat(),
            )
        )
        or 0
    )
    cottage_collections = float(
        db.scalar(
            select(func.sum(Booking.paid_amount)).where(
                func.date(Booking.created_at) >= start.isoformat(),
                func.date(Booking.created_at) <= end.isoformat(),
            )
        )
        or 0
    )
    other_income = float(
        db.scalar(
            select(func.sum(IncomeExpense.amount)).where(
                IncomeExpense.type == "Income",
                IncomeExpense.transaction_date >= start,
                IncomeExpense.transaction_date <= end,
            )
        )
        or 0
    )
    expenses = float(
        db.scalar(
            select(func.sum(IncomeExpense.amount)).where(
                IncomeExpense.type == "Expense",
                IncomeExpense.transaction_date >= start,
                IncomeExpense.transaction_date <= end,
            )
        )
        or 0
    )
    bookings = db.scalar(select(func.count(Booking.id)).where(Booking.check_in >= start, Booking.check_in <= end)) or 0
    total_income = sales + parking + rides + cottage_collections + other_income
    rows = [
        {"label": "Total Income", "amount": total_income},
        {"label": "POS Sales", "amount": sales},
        {"label": "Cottage Collections", "amount": cottage_collections},
        {"label": "Parking", "amount": parking},
        {"label": "Pass & Ride", "amount": rides},
        {"label": "Other Income", "amount": other_income},
        {"label": "Expenses", "amount": expenses},
        {"label": "Net Profit", "amount": total_income - expenses},
    ]
    return {"period": period, "from": start.isoformat(), "to": end.isoformat(), "bookings": bookings, "rows": rows}
