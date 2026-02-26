from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, shifts, employees, leave, report
from app.core.database import engine, Base
import os
from pathlib import Path

# Create reports directory
Path("generated_reports").mkdir(exist_ok=True)

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title="Workforce Management API",
    description="Enterprise workforce management system",
    version="1.0.0"
)

# CORS middleware - FIXED with more permissive settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(shifts.router, prefix="/api")
app.include_router(employees.router, prefix="/api")
app.include_router(leave.router, prefix="/api")
app.include_router(report.router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Welcome to Workforce Management API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Add OPTIONS handler for preflight requests
@app.options("/{path:path}")
async def options_handler():
    return {}

print("✅ Server started on http://localhost:8000")
print("✅ CORS enabled for frontend on http://localhost:3000")