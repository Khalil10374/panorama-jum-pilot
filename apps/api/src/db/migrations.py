from sqlalchemy import inspect, text

from src.db.session import engine


USER_COLUMNS = {
    "phone": "VARCHAR(30)",
    "department": "VARCHAR(100)",
    "designation": "VARCHAR(100)",
    "address": "TEXT",
    "photo_url": "TEXT",
    "notes": "TEXT",
}

RIDE_COLUMNS = {
    "price_30_minutes": "FLOAT",
    "price_1_hour": "FLOAT",
    "category": "VARCHAR(40) DEFAULT 'Ride'",
    "pricing_type": "VARCHAR(40) DEFAULT 'One-time'",
}


def ensure_runtime_columns():
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    with engine.begin() as connection:
        if "users" in tables:
            existing = {column["name"] for column in inspector.get_columns("users")}
            for name, definition in USER_COLUMNS.items():
                if name not in existing:
                    connection.execute(text(f"ALTER TABLE users ADD COLUMN {name} {definition}"))
        if "rides" in tables:
            existing = {column["name"] for column in inspector.get_columns("rides")}
            for name, definition in RIDE_COLUMNS.items():
                if name not in existing:
                    connection.execute(text(f"ALTER TABLE rides ADD COLUMN {name} {definition}"))
