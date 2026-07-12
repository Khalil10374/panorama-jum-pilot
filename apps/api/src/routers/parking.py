from datetime import date, datetime, timezone
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from src.core.security import get_current_user
from src.db.session import get_db
from src.models import ParkingRate, ParkingTicket, Vehicle
from src.routers.crud import serialize


router = APIRouter(prefix="/parking", tags=["parking"])

DEFAULT_PARKING_RATES = {
    "Bus": 500,
    "Minibus / Small Bus": 300,
    "Private Car / Sedan": 100,
    "HiAce / Microbus": 200,
}

PARKING_TYPE_ALIASES = {
    "bus": "Bus",
    "minibus": "Minibus / Small Bus",
    "small bus": "Minibus / Small Bus",
    "minibus / small bus": "Minibus / Small Bus",
    "car": "Private Car / Sedan",
    "private car": "Private Car / Sedan",
    "sedan": "Private Car / Sedan",
    "private car / sedan": "Private Car / Sedan",
    "hiace": "HiAce / Microbus",
    "microbus": "HiAce / Microbus",
    "hiace / microbus": "HiAce / Microbus",
}


def canonical_vehicle_type(value: str | None) -> str:
    normalized = " ".join((value or "").strip().lower().split())
    return PARKING_TYPE_ALIASES.get(normalized, value.strip() if value else "")


def _normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def calculate_parking_bill(entry_time: datetime, exit_time: datetime, vehicle_type: str, rate: float | None = None) -> dict:
    started_at = _normalize_datetime(entry_time)
    ended_at = _normalize_datetime(exit_time)
    total_minutes = max(1, ceil((ended_at - started_at).total_seconds() / 60))
    billable_hours = max(1, ceil(total_minutes / 60))
    canonical_type = canonical_vehicle_type(vehicle_type)
    rate = DEFAULT_PARKING_RATES.get(canonical_type) if rate is None else rate
    if rate is None:
        raise ValueError(f"No parking rate configured for vehicle type: {vehicle_type}")
    return {
        "rate": rate,
        "minutes": total_minutes,
        "hours": billable_hours,
        "amount": rate,
        "pricing_type": "One-time",
        "vehicle_type": canonical_type,
    }


def _serialize_parking_row(ticket: ParkingTicket, vehicle: Vehicle, parking_rate: float | None = None) -> dict:
    payload = serialize(ticket)
    payload.update(
        {
            "plate_number": vehicle.plate_number,
            "vehicle_type": vehicle.vehicle_type,
            "owner_name": vehicle.owner_name,
            "phone": vehicle.phone,
        }
    )
    if ticket.exit_time is None and parking_rate is not None and not ticket.amount:
        payload["amount"] = parking_rate
        payload["charge_type"] = "Fixed Parking"
    return payload


def _serialize_vehicle_row(vehicle: Vehicle, ticket: ParkingTicket | None) -> dict:
    payload = serialize(vehicle)
    if ticket:
        payload["parking_ticket_id"] = ticket.id
        payload["parking_ticket_code"] = ticket.ticket_code
    return payload


def _local_date(column):
    return func.date(func.datetime(column, "+6 hours"))


@router.get("/summary")
def parking_summary(
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    today = date.today().isoformat()
    open_count = db.scalar(
        select(func.count(ParkingTicket.id)).where(
            ParkingTicket.exit_time.is_(None),
            ParkingTicket.payment_status.in_(["Open", "Unpaid", "Due"]),
            _local_date(ParkingTicket.entry_time) == today,
        )
    ) or 0
    billed_total = db.scalar(
        select(func.coalesce(func.sum(ParkingTicket.amount), 0)).where(
            ParkingTicket.payment_status == "Paid",
            _local_date(func.coalesce(ParkingTicket.exit_time, ParkingTicket.created_at)) == today,
        )
    ) or 0
    unbilled_count = db.scalar(
        select(func.count(ParkingTicket.id)).where(
            ParkingTicket.exit_time.is_(None),
            ParkingTicket.payment_status.in_(["Open", "Unpaid", "Due"]),
            _local_date(ParkingTicket.entry_time) == today,
        )
    ) or 0
    closed_count = db.scalar(
        select(func.count(ParkingTicket.id)).where(
            ParkingTicket.exit_time.is_not(None),
            _local_date(func.coalesce(ParkingTicket.exit_time, ParkingTicket.created_at)) == today,
        )
    ) or 0
    return {
        "vehicles_in_garage": open_count,
        "billed_total": billed_total,
        "unbilled_count": unbilled_count,
        "closed_count": closed_count,
        "date": today,
    }


@router.get("/vehicles")
def list_today_parking_vehicles(
    search: str = "",
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    today = date.today().isoformat()
    stmt = select(Vehicle).where(_local_date(Vehicle.created_at) == today).order_by(Vehicle.id.desc())
    if search:
        term = f"%{search}%"
        stmt = stmt.where(
            or_(
                Vehicle.plate_number.ilike(term),
                Vehicle.vehicle_type.ilike(term),
                Vehicle.owner_name.ilike(term),
                Vehicle.phone.ilike(term),
            )
        )
    vehicles = db.scalars(stmt.limit(limit)).all()
    items = []
    for vehicle in vehicles:
        ticket = db.scalar(select(ParkingTicket).where(ParkingTicket.vehicle_id == vehicle.id).order_by(ParkingTicket.id.desc()))
        items.append(_serialize_vehicle_row(vehicle, ticket))
    return {"items": items, "date": today}


@router.get("/tickets")
def list_parking_tickets(
    status: str = Query("all", pattern="^(all|open|history)$"),
    search: str = "",
    from_date: str = "",
    to_date: str = "",
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    stmt = (
        select(ParkingTicket, Vehicle)
        .join(Vehicle, ParkingTicket.vehicle_id == Vehicle.id)
        .order_by(ParkingTicket.id.desc())
        .limit(limit)
    )
    if status == "open":
        stmt = stmt.where(
            ParkingTicket.exit_time.is_(None),
            ParkingTicket.payment_status.in_(["Open", "Unpaid", "Due"]),
            _local_date(ParkingTicket.entry_time) == date.today().isoformat(),
        )
    elif status == "history":
        stmt = stmt.where(or_(ParkingTicket.exit_time.is_not(None), ParkingTicket.payment_status == "Paid"))
    date_column = ParkingTicket.exit_time if status == "history" else ParkingTicket.entry_time
    if from_date:
        stmt = stmt.where(_local_date(date_column) >= from_date)
    if to_date:
        stmt = stmt.where(_local_date(date_column) <= to_date)
    if search:
        term = f"%{search}%"
        stmt = stmt.where(
            or_(
                ParkingTicket.ticket_code.ilike(term),
                ParkingTicket.payment_status.ilike(term),
                Vehicle.plate_number.ilike(term),
                Vehicle.owner_name.ilike(term),
                Vehicle.phone.ilike(term),
                Vehicle.vehicle_type.ilike(term),
            )
        )
    rows = db.execute(stmt).all()
    rates = {
        row.vehicle_type: row.price
        for row in db.scalars(select(ParkingRate).where(ParkingRate.status == "Active")).all()
    }
    return {
        "items": [
            _serialize_parking_row(ticket, vehicle, rates.get(canonical_vehicle_type(vehicle.vehicle_type)))
            for ticket, vehicle in rows
        ]
    }


@router.post("/tickets/{ticket_id}/checkout")
def checkout_parking_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ticket = db.get(ParkingTicket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Parking ticket not found")

    vehicle = db.get(Vehicle, ticket.vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found for this ticket")

    exit_time = ticket.exit_time or datetime.utcnow()
    canonical_type = canonical_vehicle_type(vehicle.vehicle_type)
    finalized_ticket = ticket.exit_time is not None or ticket.payment_status == "Paid"
    stored_amount = float(ticket.amount or 0) if finalized_ticket else 0
    if stored_amount > 0:
        rate = stored_amount
    else:
        rate_row = db.scalar(
            select(ParkingRate).where(
                ParkingRate.vehicle_type == canonical_type,
                ParkingRate.status == "Active",
            )
        )
        if not rate_row:
            raise HTTPException(status_code=400, detail=f"No active parking price found for {vehicle.vehicle_type}")
        rate = rate_row.price

    bill = calculate_parking_bill(ticket.entry_time, exit_time, vehicle.vehicle_type, rate)

    if not ticket.exit_time:
        ticket.exit_time = exit_time
        ticket.amount = bill["amount"]
        ticket.charge_type = f"Fixed Parking - {bill['rate']}"
        ticket.payment_status = "Paid"
        db.commit()
        db.refresh(ticket)

    bill.update(
        {
            "entry_time": ticket.entry_time.isoformat() if ticket.entry_time else None,
            "exit_time": ticket.exit_time.isoformat() if ticket.exit_time else None,
            "operator": current_user.name,
        }
    )
    return {"ticket": serialize(ticket), "vehicle": serialize(vehicle), "bill": bill}
