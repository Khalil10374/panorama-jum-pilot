from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.core.security import create_token, get_current_user, hash_password, verify_password
from src.db.session import get_db
from src.models import User
from src.routers.crud import serialize


router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    role: str = "Receptionist"
    password: str


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    token = create_token({"sub": str(user.id), "role": user.role, "name": user.name})
    return {"access_token": token, "token_type": "bearer", "user": serialize(user)}


@router.get("/me")
def me(current_user=Depends(get_current_user)):
    return serialize(current_user)


@router.post("/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role != "Super Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Super Admin can create users")
    email = payload.email.strip().lower()
    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status_code=409, detail="Email already exists")
    user = User(
        name=payload.name,
        email=email,
        role=payload.role,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return serialize(user)
