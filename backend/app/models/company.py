# backend/app/models/company.py
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import random
import string

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    company_code = Column(String(10), unique=True, index=True, nullable=False)
    industry = Column(String(100), nullable=True)
    size = Column(String(50), nullable=True)  # 1-10, 11-50, 50+
    timezone = Column(String(50), default="UTC")
    currency = Column(String(3), default="USD")
    logo_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Founder relationship
    founder_id = Column(Integer, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    employees = relationship("User", back_populates="company")
    
    @staticmethod
    def generate_code():
        """Generate unique company code"""
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))