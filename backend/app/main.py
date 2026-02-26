from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, shifts, employees
from app.core.database import engine, Base

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title="Workforce Management API",
    description="Enterprise workforce management system",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(shifts.router, prefix="/api")
app.include_router(employees.router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Welcome to Workforce Management API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Run with: uvicorn app.main:app --reload
print("✅ Server started on http://localhost:8000")