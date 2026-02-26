# backend/test_imports.py
print("Testing imports...")

try:
    from fastapi import FastAPI
    print("✅ fastapi - OK")
except ImportError as e:
    print(f"❌ fastapi - {e}")

try:
    import sqlalchemy
    print("✅ sqlalchemy - OK")
except ImportError as e:
    print(f"❌ sqlalchemy - {e}")

try:
    from pydantic import BaseModel
    print("✅ pydantic - OK")
except ImportError as e:
    print(f"❌ pydantic - {e}")

try:
    from jose import jwt
    print("✅ python-jose - OK")
except ImportError as e:
    print(f"❌ python-jose - {e}")

try:
    from passlib.context import CryptContext
    print("✅ passlib - OK")
except ImportError as e:
    print(f"❌ passlib - {e}")

print("\n🎯 Test complete!")