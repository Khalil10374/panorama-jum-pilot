from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import String, cast, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.core.security import get_current_user, hash_password
from src.db.session import get_db
from src import models


router = APIRouter(prefix="/records", tags=["records"])

RESOURCE_MODELS = {
    "users": models.User,
    "guests": models.Guest,
    "cottages": models.Cottage,
    "bookings": models.Booking,
    "vehicles": models.Vehicle,
    "parking-tickets": models.ParkingTicket,
    "parking-rates": models.ParkingRate,
    "rides": models.Ride,
    "ride-tickets": models.RideTicket,
    "categories": models.Category,
    "products": models.Product,
    "inventory-items": models.InventoryItem,
    "stock-movements": models.StockMovement,
    "suppliers": models.Supplier,
    "purchase-orders": models.PurchaseOrder,
    "sales": models.Sale,
    "sale-items": models.SaleItem,
    "payments": models.Payment,
    "income-expenses": models.IncomeExpense,
    "cash-closings": models.CashClosing,
    "employees": models.Employee,
    "attendance": models.Attendance,
    "leave-requests": models.LeaveRequest,
    "salaries": models.Salary,
    "recipes": models.Recipe,
    "recipe-ingredients": models.RecipeIngredient,
}

READ_ONLY_FIELDS = {"id", "created_at", "updated_at"}
HIDDEN_FIELDS = {"password_hash"}
USER_WRITE_ROLES = {"Super Admin"}


def _model_for(resource: str):
    model = RESOURCE_MODELS.get(resource)
    if not model:
        raise HTTPException(status_code=404, detail=f"Unknown resource: {resource}")
    return model


def serialize(row: Any) -> dict[str, Any]:
    payload = {}
    for column in row.__table__.columns:
        if column.name in HIDDEN_FIELDS:
            continue
        value = getattr(row, column.name)
        if isinstance(value, (datetime, date)):
            value = value.isoformat()
        payload[column.name] = value
    return payload


def _coerce_value(column, value):
    if value == "" or value is None:
        return None if column.nullable else value
    python_type = column.type.python_type
    if python_type is date and isinstance(value, str):
        return date.fromisoformat(value[:10])
    if python_type is datetime and isinstance(value, str):
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    if python_type is bool:
        return bool(value) if not isinstance(value, str) else value.lower() in {"1", "true", "yes", "paid", "active"}
    return python_type(value)


def _authorize_resource_write(resource: str, current_user):
    _authorize_resource_access(resource, current_user)
    if resource == "users" and current_user.role not in USER_WRITE_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Super Admin can manage user accounts")
    if resource == "ride-tickets":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Use the Pass & Ride counter to sell tickets")


def _authorize_resource_access(resource: str, current_user):
    if resource == "parking-rates" and current_user.role != "Super Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Super Admin can view parking prices")


def apply_payload(row, payload: dict[str, Any]):
    columns = {column.name: column for column in row.__table__.columns}
    for key, value in payload.items():
        if isinstance(row, models.User) and key == "password":
            if value:
                row.password_hash = hash_password(str(value))
            continue
        if key in READ_ONLY_FIELDS or key not in columns or key in HIDDEN_FIELDS:
            continue
        setattr(row, key, _coerce_value(columns[key], value))


def validate_row(row):
    non_negative_fields = {
        "price", "price_30_minutes", "price_1_hour", "nightly_rate", "amount", "total_amount",
        "paid_amount", "discount", "tax", "sale_price", "cost_price", "stock_qty", "reorder_level",
        "opening_stock", "current_stock", "unit_cost", "quantity", "salary", "gross_salary", "deductions",
        "net_salary", "cash_sales", "expenses", "opening_cash", "closing_cash", "food_cost", "profit_margin",
        "wastage_percent", "capacity", "adults", "children"
    }
    for column in row.__table__.columns:
        if column.name in non_negative_fields and getattr(row, column.name, None) is not None and getattr(row, column.name) < 0:
            raise HTTPException(status_code=400, detail=f"{column.name.replace('_', ' ').title()} cannot be negative")
    if isinstance(row, models.Booking) and row.check_in and row.check_out and row.check_out <= row.check_in:
        raise HTTPException(status_code=400, detail="Check-out date must be after check-in date")
    if isinstance(row, models.LeaveRequest) and row.start_date and row.end_date and row.end_date < row.start_date:
        raise HTTPException(status_code=400, detail="Leave end date cannot be before start date")
    if isinstance(row, models.Sale) and row.paid_amount is not None and row.total_amount is not None and row.paid_amount > row.total_amount:
        raise HTTPException(status_code=400, detail="Paid amount cannot exceed invoice total")


def validate_references(db: Session, row, record_id: int | None = None):
    references = {
        models.Booking: [("guest_id", models.Guest), ("cottage_id", models.Cottage)],
        models.ParkingTicket: [("vehicle_id", models.Vehicle)],
        models.RideTicket: [("ride_id", models.Ride)],
        models.PurchaseOrder: [("supplier_id", models.Supplier)],
        models.StockMovement: [("item_id", models.InventoryItem)],
        models.Attendance: [("employee_id", models.Employee)],
        models.LeaveRequest: [("employee_id", models.Employee)],
        models.Salary: [("employee_id", models.Employee)],
        models.RecipeIngredient: [("recipe_id", models.Recipe), ("inventory_item_id", models.InventoryItem)],
        models.SaleItem: [("sale_id", models.Sale), ("product_id", models.Product)],
    }
    for field, target_model in references.get(type(row), []):
        value = getattr(row, field, None)
        if value is not None and not db.get(target_model, value):
            raise HTTPException(status_code=400, detail=f"Referenced {field.replace('_', ' ')} does not exist")
    if isinstance(row, models.Booking) and row.check_in and row.check_out and str(row.status or "").lower() != "cancelled":
        query = select(models.Booking).where(
            models.Booking.cottage_id == row.cottage_id,
            models.Booking.status != "Cancelled",
            models.Booking.check_in < row.check_out,
            models.Booking.check_out > row.check_in,
        )
        if record_id is not None:
            query = query.where(models.Booking.id != record_id)
        if db.scalar(query):
            raise HTTPException(status_code=409, detail="This cottage is already booked for the selected dates")


def _new_parking_ticket_code(vehicle_id: int) -> str:
    return f"PK-{datetime.now().strftime('%Y%m%d%H%M%S')}-{vehicle_id}"


@router.get("/{resource}")
def list_records(
    resource: str,
    search: str = "",
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _authorize_resource_access(resource, current_user)
    model = _model_for(resource)
    stmt = select(model).order_by(model.id.desc()).offset(offset).limit(limit)
    if search:
        string_filters = []
        for column in model.__table__.columns:
            if isinstance(column.type, String):
                string_filters.append(cast(getattr(model, column.name), String).ilike(f"%{search}%"))
        if string_filters:
            stmt = stmt.where(or_(*string_filters))
    rows = db.scalars(stmt).all()
    return {"items": [serialize(row) for row in rows], "resource": resource}


@router.get("/{resource}/{record_id}")
def get_record(
    resource: str,
    record_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _authorize_resource_access(resource, current_user)
    model = _model_for(resource)
    row = db.get(model, record_id)
    if not row:
        raise HTTPException(status_code=404, detail="Record not found")
    return serialize(row)


@router.post("/{resource}")
def create_record(
    resource: str,
    payload: dict[str, Any],
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _authorize_resource_write(resource, current_user)
    model = _model_for(resource)
    row = model()
    created_ticket = None
    if model is models.User and not payload.get("password"):
        raise HTTPException(status_code=400, detail="Password is required for new user accounts")
    try:
        apply_payload(row, payload)
        validate_row(row)
        validate_references(db, row)
        db.add(row)
        db.flush()
        if model is models.Vehicle:
            ticket_code = _new_parking_ticket_code(row.id)
            created_ticket = models.ParkingTicket(
                ticket_code=ticket_code,
                vehicle_id=row.id,
                entry_time=datetime.utcnow(),
                charge_type="Fixed Parking",
                amount=0,
                payment_status="Open",
                qr_payload=ticket_code,
            )
            db.add(created_ticket)
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except (ValueError, TypeError) as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Invalid value in record: {exc}") from exc
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="This record conflicts with an existing record or linked data") from exc
    db.refresh(row)
    payload = serialize(row)
    if created_ticket:
        db.refresh(created_ticket)
        payload["parking_ticket_id"] = created_ticket.id
        payload["parking_ticket_code"] = created_ticket.ticket_code
    return payload


@router.put("/{resource}/{record_id}")
def update_record(
    resource: str,
    record_id: int,
    payload: dict[str, Any],
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _authorize_resource_write(resource, current_user)
    model = _model_for(resource)
    row = db.get(model, record_id)
    if not row:
        raise HTTPException(status_code=404, detail="Record not found")
    if model is models.ParkingTicket and (row.exit_time is not None or row.payment_status == "Paid"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Parking History records cannot be edited")
    try:
        apply_payload(row, payload)
        validate_row(row)
        validate_references(db, row, record_id)
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except (ValueError, TypeError) as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Invalid value in record: {exc}") from exc
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="This record conflicts with an existing record or linked data") from exc
    db.refresh(row)
    return serialize(row)


@router.delete("/{resource}/{record_id}")
def delete_record(
    resource: str,
    record_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _authorize_resource_write(resource, current_user)
    model = _model_for(resource)
    row = db.get(model, record_id)
    if not row:
        raise HTTPException(status_code=404, detail="Record not found")
    if model is models.ParkingTicket and (row.exit_time is not None or row.payment_status == "Paid"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Parking History records cannot be deleted")
    try:
        db.delete(row)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="This record is linked to other operational data and cannot be deleted") from exc
    return {"deleted": True, "id": record_id}
