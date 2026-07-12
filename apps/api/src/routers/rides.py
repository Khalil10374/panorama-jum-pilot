from datetime import date, datetime
from secrets import token_hex
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.core.security import get_current_user
from src.db.session import get_db
from src.models import Payment, Ride, RideTicket
from src.routers.crud import serialize


router = APIRouter(prefix="/rides", tags=["rides"])


def _local_date(column):
    return func.date(func.datetime(column, "+6 hours"))


@router.get("/summary")
def ride_summary(
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    today = date.today().isoformat()
    today_tickets = _local_date(RideTicket.created_at) == today
    tickets_sold = db.scalar(select(func.count(RideTicket.id)).where(today_tickets)) or 0
    revenue = db.scalar(
        select(func.coalesce(func.sum(RideTicket.total_amount), 0)).where(today_tickets)
    ) or 0
    validated = db.scalar(
        select(func.count(RideTicket.id)).where(today_tickets, RideTicket.is_used.is_(True))
    ) or 0
    active_rides = db.scalar(
        select(func.count(Ride.id)).where(func.lower(Ride.status).in_(["open", "active", "available"]))
    ) or 0
    return {
        "tickets_sold": tickets_sold,
        "revenue": revenue,
        "validated": validated,
        "unused": max(tickets_sold - validated, 0),
        "active_rides": active_rides,
        "date": today,
    }


class RideTicketSale(BaseModel):
    ride_id: int
    child_name: str | None = None
    quantity: int = Field(default=1, ge=1, le=100)
    pricing_option: Literal["one_time", "30_minutes", "1_hour"] = "one_time"
    payment_method: str = "Cash"


def _price_for(ride: Ride, pricing_option: str) -> tuple[float, str]:
    if pricing_option == "30_minutes":
        price = ride.price_30_minutes
        label = "30 Minutes"
    elif pricing_option == "1_hour":
        price = ride.price_1_hour
        label = "1 Hour"
    else:
        price = ride.price
        label = "One-time"
    if price is None or price <= 0:
        raise HTTPException(status_code=400, detail=f"No active price configured for {ride.name} ({label})")
    return float(price), label


@router.post("/tickets")
def sell_ride_ticket(
    payload: RideTicketSale,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ride = db.get(Ride, payload.ride_id)
    if not ride or ride.status.lower() not in {"open", "active", "available"}:
        raise HTTPException(status_code=404, detail="Selected ride/pass is not available")
    unit_price, pricing_label = _price_for(ride, payload.pricing_option)
    total = round(unit_price * payload.quantity, 2)
    ticket_code = f"PR-{datetime.now().strftime('%Y%m%d%H%M%S')}-{token_hex(2).upper()}"
    ticket = RideTicket(
        ticket_code=ticket_code,
        ride_id=ride.id,
        child_name=(payload.child_name or "").strip() or None,
        quantity=payload.quantity,
        total_amount=total,
        payment_status="Paid",
        is_used=False,
        qr_payload=ticket_code,
    )
    db.add(ticket)
    db.flush()
    db.add(
        Payment(
            reference_type="RideTicket",
            reference_id=ticket.id,
            method=payload.payment_method.strip() or "Cash",
            amount=total,
            status="Paid",
            transaction_reference=ticket_code,
        )
    )
    db.commit()
    db.refresh(ticket)
    response = serialize(ticket)
    response.update({"ride_name": ride.name, "category": ride.category, "unit_price": unit_price, "pricing_label": pricing_label, "operator": current_user.name})
    return response


@router.post("/tickets/{ticket_id}/use")
def use_ride_ticket(ticket_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    ticket = db.get(RideTicket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Pass & Ride ticket not found")
    if ticket.payment_status != "Paid":
        raise HTTPException(status_code=400, detail="This ticket has not been paid")
    if ticket.is_used:
        raise HTTPException(status_code=409, detail="This ticket has already been used")
    ticket.is_used = True
    db.commit()
    db.refresh(ticket)
    response = serialize(ticket)
    response["validated_by"] = current_user.name
    return response
