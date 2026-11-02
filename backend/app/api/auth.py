from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.models import User
from app.schemas import DemoLoginRequest, LoginRequest, RefreshTokenRequest, TokenResponse, UserCreate, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token(data={"sub": str(user.id), "role": user.role})
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )

@router.post("/demo-login", response_model=TokenResponse)
async def demo_login(req: DemoLoginRequest, db: Annotated[AsyncSession, Depends(get_db)]):
    target_role = req.role.upper()
    result = await db.execute(select(User).where(User.role == target_role))
    user = result.scalars().first()
    
    # If no seeded user exists for that role, auto-provision demo account
    if not user:
        email = f"{target_role.lower()}@taskpulse.io"
        user = User(
            email=email,
            full_name=f"Demo {target_role.capitalize()}",
            hashed_password=hash_password("password123"),
            role=target_role,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token(data={"sub": str(user.id), "role": user.role})
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(req: RefreshTokenRequest, db: Annotated[AsyncSession, Depends(get_db)]):
    payload = decode_token(req.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=400, detail="Invalid token type")
    
    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    new_access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    new_refresh_token = create_refresh_token(data={"sub": str(user.id), "role": user.role})
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: Annotated[User, Depends(get_current_user)]):
    return UserResponse.model_validate(current_user)

@router.get("/users", response_model=list[UserResponse])
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    result = await db.execute(select(User).order_by(User.id.asc()))
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]

