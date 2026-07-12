from datetime import datetime
from secrets import token_hex
from typing import Any
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.core.security import get_current_user
from src.db.session import get_db
from src.models import Payment, Product, Sale, SaleItem
from src.routers.crud import serialize


router = APIRouter(prefix="/pos", tags=["pos"])


class POSItem(BaseModel):
    product_id: int
    quantity: float


class POSCheckout(BaseModel):
    module: str = "Coffee"
    customer_name: str | None = None
    customer_phone: str | None = None
    discount: float = 0
    tax: float = 0
    paid_amount: float | None = None
    payment_method: str = "Cash"
    items: list[POSItem]


@router.post("/checkout")
def checkout(payload: POSCheckout, db: Session = Depends(get_db), _current_user=Depends(get_current_user)):
    if not payload.items:
        raise HTTPException(status_code=400, detail="At least one item is required")
    if payload.discount < 0 or payload.tax < 0:
        raise HTTPException(status_code=400, detail="Discount and tax cannot be negative")
    if payload.paid_amount is not None and payload.paid_amount < 0:
        raise HTTPException(status_code=400, detail="Paid amount cannot be negative")

    requested_quantities: dict[int, float] = defaultdict(float)
    for item in payload.items:
        if item.quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be greater than zero")
        requested_quantities[item.product_id] += item.quantity

    subtotal = 0.0
    sale_items: list[tuple[Product, float, float]] = []
    for product_id, quantity in requested_quantities.items():
        product = db.get(Product, product_id)
        if not product or not product.is_active:
            raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
        if product.stock_qty < quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.name}")
        line_total = product.sale_price * quantity
        subtotal += line_total
        sale_items.append((product, quantity, line_total))

    total = max(subtotal - payload.discount + payload.tax, 0)
    paid_amount = payload.paid_amount if payload.paid_amount is not None else total
    if paid_amount > total:
        raise HTTPException(status_code=400, detail="Paid amount cannot exceed invoice total")
    sale = Sale(
        invoice_number=f"INV-{datetime.now().strftime('%Y%m%d%H%M%S')}-{token_hex(2).upper()}",
        module=payload.module,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        subtotal=subtotal,
        discount=payload.discount,
        tax=payload.tax,
        total_amount=total,
        paid_amount=paid_amount,
        payment_status="Paid" if paid_amount >= total else "Due",
    )
    db.add(sale)
    db.flush()

    for product, quantity, line_total in sale_items:
        product.stock_qty -= quantity
        db.add(
            SaleItem(
                sale_id=sale.id,
                product_id=product.id,
                quantity=quantity,
                unit_price=product.sale_price,
                total_price=line_total,
            )
        )

    db.add(
        Payment(
            reference_type="Sale",
            reference_id=sale.id,
            method=payload.payment_method,
            amount=paid_amount,
            status="Paid" if paid_amount else "Pending",
        )
    )
    db.commit()
    db.refresh(sale)
    return {"sale": serialize(sale), "items": [{"product": serialize(p), "quantity": q, "total": t} for p, q, t in sale_items]}
