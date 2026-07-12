from datetime import datetime,timedelta,timezone
from jose import jwt,JWTError
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET_KEY ="habit-tracker-secret-key"
ALGORITHM= "HS256"
security = HTTPBearer()

def create_access_token(data:dict):
    to_encode= data.copy()

    expire =datetime.now(timezone.utc) + timedelta(hours=24)
    to_encode.update({"exp": expire})
    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )
def get_current_user(
        credentials: HTTPAuthorizationCredentials = Depends(security)

):
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        return payload
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )