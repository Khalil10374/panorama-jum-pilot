from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.core.security import hash_password
from src.models import (
    Attendance,
    Booking,
    CashClosing,
    Category,
    Cottage,
    Employee,
    Guest,
    IncomeExpense,
    InventoryItem,
    ParkingRate,
    ParkingTicket,
    Product,
    PurchaseOrder,
    Recipe,
    RecipeIngredient,
    Ride,
    RideTicket,
    StockMovement,
    Supplier,
    User,
    Vehicle,
)


DEMO_USERS = [
    ("Super Admin", "admin@panoramajum.test"),
    ("Manager", "manager@panoramajum.test"),
    ("Accountant", "accountant@panoramajum.test"),
    ("Receptionist", "reception@panoramajum.test"),
    ("POS Operator", "pos@panoramajum.test"),
    ("Store Manager", "store@panoramajum.test"),
    ("HR Officer", "hr@panoramajum.test"),
]

PARKING_RATE_SEED = [
    ("Bus", 500),
    ("Minibus / Small Bus", 300),
    ("Private Car / Sedan", 100),
    ("HiAce / Microbus", 200),
]

RIDE_CATALOG_SEED = [
    {"name": "Fiber Boat", "price_30_minutes": 800, "price_1_hour": 1500, "pricing_type": "Timed", "category": "Ride"},
    {"name": "Bojrashai Boat", "price_30_minutes": 700, "price_1_hour": 1300, "pricing_type": "Timed", "category": "Ride"},
    {"name": "Karnafuli Boat", "price_30_minutes": 700, "price_1_hour": 1300, "pricing_type": "Timed", "category": "Ride"},
    {"name": "Naftari Boat", "price_30_minutes": 700, "price_1_hour": 1300, "pricing_type": "Timed", "category": "Ride"},
    {"name": "Kayaking", "price_30_minutes": 150, "price_1_hour": 200, "pricing_type": "Timed", "category": "Ride"},
    {"name": "Train", "price": 50, "pricing_type": "One-time", "category": "Ride"},
    {"name": "Ferris Wheel (চড়কি)", "price": 20, "pricing_type": "One-time", "category": "Ride"},
    {"name": "Trampoline", "price": 20, "pricing_type": "One-time", "category": "Ride"},
    {"name": "Jum Pass", "price": 50, "pricing_type": "One-time", "category": "Entrance Pass"},
    {"name": "Children's Park", "price": 20, "pricing_type": "One-time", "category": "Entrance Pass"},
    {"name": "VIP Corner", "price": 200, "pricing_type": "One-time", "category": "Entrance Pass"},
]


def seed_price_catalogs(db: Session):
    # ParkingTicket rows are operational history and must never be reset here.
    if not db.scalar(select(ParkingRate).limit(1)):
        db.add_all([ParkingRate(vehicle_type=vehicle_type, price=price, status="Active") for vehicle_type, price in PARKING_RATE_SEED])

    legacy_ride = db.scalar(select(Ride).where(Ride.name == "Mini Train"))
    if legacy_ride or not db.scalar(select(Ride).limit(1)):
        for ticket in db.scalars(select(RideTicket)).all():
            db.delete(ticket)
        for ride in db.scalars(select(Ride)).all():
            db.delete(ride)
        db.flush()
        db.add_all(
            [
                Ride(
                    name=item["name"],
                    price=item.get("price", 0),
                    price_30_minutes=item.get("price_30_minutes"),
                    price_1_hour=item.get("price_1_hour"),
                    category=item["category"],
                    pricing_type=item["pricing_type"],
                    capacity=1,
                    status="Open",
                )
                for item in RIDE_CATALOG_SEED
            ]
        )
    db.flush()


def seed_database(db: Session):
    seed_price_catalogs(db)
    had_users = bool(db.scalar(select(User).limit(1)))
    for role, email in DEMO_USERS:
        if not db.scalar(select(User).where(User.email == email)):
            db.add(
                User(
                    name=role,
                    email=email,
                    role=role,
                    password_hash=hash_password("password123"),
                    department="Administration" if role in {"Super Admin", "Manager"} else None,
                    designation=role,
                )
            )
    if had_users:
        db.commit()
        return

    guest = Guest(name="Rahim Uddin", phone="+8801711000001", email="rahim@example.com", address="Rangamati")
    cottage_a = Cottage(name="Lake View Cottage 1", type="Premium", capacity=4, nightly_rate=8500, status="Occupied")
    cottage_b = Cottage(name="Hill Side Cottage 2", type="Family", capacity=6, nightly_rate=10500, status="Available")
    db.add_all([guest, cottage_a, cottage_b])
    db.flush()

    db.add(
        Booking(
            code="BK-1001",
            guest_id=guest.id,
            cottage_id=cottage_a.id,
            check_in=date.today(),
            check_out=date.today() + timedelta(days=2),
            adults=2,
            children=1,
            total_amount=17000,
            paid_amount=12000,
            status="Checked In",
        )
    )

    vehicle = Vehicle(plate_number="DHA-1234", vehicle_type="Private Car / Sedan", owner_name="Hasan Ali", phone="+8801711000002")
    db.add(vehicle)
    db.flush()
    db.add(ParkingTicket(ticket_code="PK-1001", vehicle_id=vehicle.id, charge_type="Fixed Parking - 100", amount=100, payment_status="Paid", qr_payload="PK-1001"))

    coffee = Category(name="Coffee & Juices", module="Coffee")
    store = Category(name="Departmental Store", module="Store")
    db.add_all([coffee, store])
    db.flush()

    db.add_all(
        [
            Product(name="Cappuccino", sku="COF-001", barcode="8801001", category_id=coffee.id, module="Coffee", sale_price=220, cost_price=120, stock_qty=80, reorder_level=10, unit="cup"),
            Product(name="Fresh Mango Juice", sku="JUI-001", barcode="8801002", category_id=coffee.id, module="Coffee", sale_price=180, cost_price=90, stock_qty=60, reorder_level=8, unit="glass"),
            Product(name="Mineral Water 1L", sku="STR-001", barcode="8802001", category_id=store.id, module="Store", sale_price=30, cost_price=20, stock_qty=140, reorder_level=30, unit="bottle"),
            Product(name="Resort Souvenir Mug", sku="STR-002", barcode="8802002", category_id=store.id, module="Store", sale_price=350, cost_price=180, stock_qty=12, reorder_level=15, unit="pcs"),
        ]
    )

    rice = InventoryItem(name="Rice", sku="INV-001", unit="kg", opening_stock=100, current_stock=88, unit_cost=72, reorder_level=20, location="Main Store")
    milk = InventoryItem(name="Milk", sku="INV-002", unit="liter", opening_stock=50, current_stock=9, unit_cost=95, reorder_level=12, location="Kitchen")
    db.add_all([rice, milk])
    db.flush()
    db.add(StockMovement(item_id=milk.id, movement_type="Wastage", quantity=2, reference="Kitchen", notes="Expired stock"))

    supplier = Supplier(name="Chittagong Fresh Supplies", contact_person="Mr. Karim", phone="+8801811000003", balance_due=5400)
    db.add(supplier)
    db.flush()
    db.add(PurchaseOrder(po_number="PO-1001", supplier_id=supplier.id, order_date=date.today(), expected_date=date.today() + timedelta(days=3), status="Ordered", total_amount=25000, paid_amount=10000))

    db.add_all(
        [
            IncomeExpense(transaction_date=date.today(), type="Income", category="Cottage", description="Guest advance", amount=12000, account="Cash"),
            IncomeExpense(transaction_date=date.today(), type="Expense", category="Salary", description="Part-time staff payment", amount=1800, account="Cash"),
            CashClosing(closing_date=date.today(), opening_cash=15000, cash_sales=9000, expenses=1800, closing_cash=22200, notes="Demo closing"),
        ]
    )

    employee = Employee(employee_code="EMP-001", name="Nusrat Jahan", department="Front Office", designation="Receptionist", phone="+8801911000004", salary=22000)
    db.add(employee)
    db.flush()
    db.add(Attendance(employee_id=employee.id, attendance_date=date.today(), status="Present", check_in="09:00", check_out="18:00"))

    recipe = Recipe(menu_item_name="Chicken Fried Rice", sale_price=380, food_cost=170, profit_margin=55.26, notes="Chef approved")
    db.add(recipe)
    db.flush()
    db.add(RecipeIngredient(recipe_id=recipe.id, inventory_item_id=rice.id, quantity=0.25, wastage_percent=3))

    db.commit()
