from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.token import TokenData

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def authenticate_user(db: Session, email: str, password: str):
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

# ============================================
# 🔑 ADD THIS MISSING FUNCTION
# ============================================
def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token - Returns payload if valid, None if invalid"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        print("❌ Token expired")
        return None
    except jwt.JWTError as e:
        print(f"❌ JWT Error: {e}")
        return None
    except Exception as e:
        print(f"❌ Unexpected error decoding token: {e}")
        return None

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        # FIXED: Only check for user_id (email/sub is optional)
        user_id: int = payload.get("user_id")
        role: str = payload.get("role")
        
        if user_id is None:
            print("❌ No user_id in token")
            raise credentials_exception
            
        token_data = TokenData(user_id=user_id, role=role)
    except JWTError as e:
        print(f"❌ JWT Error: {e}")
        raise credentials_exception
        
    user = db.query(User).filter(User.id == token_data.user_id).first()
    if user is None:
        print(f"❌ User not found for id: {token_data.user_id}")
        raise credentials_exception
        
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# FIXED: Role-based access control using enum
# FIXED: Role-based access control that accepts both admin and founder for admin actions
def require_role(required_role: UserRole):
    def role_checker(current_user: User = Depends(get_current_active_user)):
        # Allow founders to access admin endpoints
        if required_role == UserRole.ADMIN and current_user.role == UserRole.FOUNDER:
            return current_user
            
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Not enough permissions. Required role: {required_role.value}"
            )
        return current_user
    return role_checker

# Optional: Add a function to get user from token without DB lookup
def get_user_id_from_token(token: str) -> Optional[int]:
    """Extract user_id from token without DB lookup"""
    payload = decode_token(token)
    if payload:
        return payload.get("user_id")
    return None