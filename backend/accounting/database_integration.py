"""
Database Integration for Accounting Module
Completes the database connections for invoice and receipt services
"""

from typing import Optional, List, Dict, Any
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import create_engine, Column, String, DateTime, Numeric, Integer, ForeignKey, Text, Boolean, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
from sqlalchemy.dialects.postgresql import UUID
import uuid
import os
from dotenv import load_dotenv

load_dotenv()

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/spirittours")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class DBInvoice(Base):
    """Database model for invoices"""
    __tablename__ = "invoices"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)
    issue_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, default="draft")
    
    # Customer information
    customer_name = Column(String(200), nullable=False)
    customer_email = Column(String(200), nullable=False, index=True)
    customer_nif = Column(String(20))
    customer_address = Column(Text)
    customer_city = Column(String(100))
    customer_postal_code = Column(String(10))
    customer_country = Column(String(100))
    
    # Company information
    company_name = Column(String(200), nullable=False)
    company_nif = Column(String(20), nullable=False)
    company_address = Column(Text)
    company_city = Column(String(100))
    company_postal_code = Column(String(10))
    company_country = Column(String(100))
    
    # Amounts
    subtotal = Column(Numeric(12, 2), nullable=False)
    tax_rate = Column(Numeric(5, 2), nullable=False, default=21)
    tax_amount = Column(Numeric(12, 2), nullable=False)
    total = Column(Numeric(12, 2), nullable=False)
    
    # Payment information
    payment_method = Column(String(50))
    payment_date = Column(Date)
    payment_reference = Column(String(100))
    
    # Metadata
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    items = relationship("DBInvoiceItem", back_populates="invoice", cascade="all, delete-orphan")


class DBInvoiceItem(Base):
    """Database model for invoice items"""
    __tablename__ = "invoice_items"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False)
    
    description = Column(Text, nullable=False)
    quantity = Column(Numeric(10, 2), nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    discount = Column(Numeric(5, 2), default=0)
    tax_rate = Column(Numeric(5, 2), nullable=False, default=21)
    total = Column(Numeric(12, 2), nullable=False)
    
    # Relationships
    invoice = relationship("DBInvoice", back_populates="items")


class DBReceipt(Base):
    """Database model for receipts"""
    __tablename__ = "receipts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    receipt_number = Column(String(50), unique=True, nullable=False, index=True)
    issue_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, default="issued")
    
    # Customer information
    customer_name = Column(String(200), nullable=False)
    customer_email = Column(String(200), nullable=False, index=True)
    customer_nif = Column(String(20))
    
    # Company information
    company_name = Column(String(200), nullable=False)
    company_nif = Column(String(20), nullable=False)
    
    # Amounts
    amount = Column(Numeric(12, 2), nullable=False)
    tax_included = Column(Boolean, default=True)
    
    # Payment information
    payment_method = Column(String(50))
    payment_reference = Column(String(100))
    
    # Related invoice
    invoice_number = Column(String(50))
    
    # Metadata
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DatabaseIntegration:
    """Integration service for accounting database operations"""
    
    def __init__(self):
        """Initialize database integration"""
        self.engine = engine
        self.SessionLocal = SessionLocal
        # Create tables if they don't exist
        Base.metadata.create_all(bind=engine)
    
    def get_db(self) -> Session:
        """Get database session"""
        db = self.SessionLocal()
        try:
            return db
        finally:
            db.close()
    
    async def save_invoice(self, invoice_data: Dict[str, Any]) -> str:
        """
        Save invoice to database
        
        Args:
            invoice_data: Invoice data dictionary
        
        Returns:
            Invoice ID
        """
        db = self.SessionLocal()
        try:
            # Create invoice record
            db_invoice = DBInvoice(
                invoice_number=invoice_data["invoice_number"],
                issue_date=invoice_data["issue_date"],
                due_date=invoice_data["due_date"],
                status=invoice_data["status"],
                customer_name=invoice_data["customer"]["name"],
                customer_email=invoice_data["customer"]["email"],
                customer_nif=invoice_data["customer"].get("nif"),
                customer_address=invoice_data["customer"].get("address"),
                customer_city=invoice_data["customer"].get("city"),
                customer_postal_code=invoice_data["customer"].get("postal_code"),
                customer_country=invoice_data["customer"].get("country"),
                company_name=invoice_data["company"]["name"],
                company_nif=invoice_data["company"]["nif"],
                company_address=invoice_data["company"].get("address"),
                company_city=invoice_data["company"].get("city"),
                company_postal_code=invoice_data["company"].get("postal_code"),
                company_country=invoice_data["company"].get("country"),
                subtotal=Decimal(str(invoice_data["subtotal"])),
                tax_rate=Decimal(str(invoice_data["tax_rate"])),
                tax_amount=Decimal(str(invoice_data["tax_amount"])),
                total=Decimal(str(invoice_data["total"])),
                payment_method=invoice_data.get("payment_method"),
                notes=invoice_data.get("notes")
            )
            
            # Add items
            for item in invoice_data.get("items", []):
                db_item = DBInvoiceItem(
                    description=item["description"],
                    quantity=Decimal(str(item["quantity"])),
                    unit_price=Decimal(str(item["unit_price"])),
                    discount=Decimal(str(item.get("discount", 0))),
                    tax_rate=Decimal(str(item.get("tax_rate", 21))),
                    total=Decimal(str(item["total"]))
                )
                db_invoice.items.append(db_item)
            
            db.add(db_invoice)
            db.commit()
            db.refresh(db_invoice)
            
            return str(db_invoice.id)
        
        finally:
            db.close()
    
    async def get_invoice(self, invoice_number: str) -> Optional[Dict[str, Any]]:
        """
        Get invoice from database
        
        Args:
            invoice_number: Invoice number
        
        Returns:
            Invoice data or None
        """
        db = self.SessionLocal()
        try:
            db_invoice = db.query(DBInvoice).filter(
                DBInvoice.invoice_number == invoice_number
            ).first()
            
            if not db_invoice:
                return None
            
            # Convert to dictionary
            invoice_data = {
                "id": str(db_invoice.id),
                "invoice_number": db_invoice.invoice_number,
                "issue_date": db_invoice.issue_date,
                "due_date": db_invoice.due_date,
                "status": db_invoice.status,
                "customer": {
                    "name": db_invoice.customer_name,
                    "email": db_invoice.customer_email,
                    "nif": db_invoice.customer_nif,
                    "address": db_invoice.customer_address,
                    "city": db_invoice.customer_city,
                    "postal_code": db_invoice.customer_postal_code,
                    "country": db_invoice.customer_country
                },
                "company": {
                    "name": db_invoice.company_name,
                    "nif": db_invoice.company_nif,
                    "address": db_invoice.company_address,
                    "city": db_invoice.company_city,
                    "postal_code": db_invoice.company_postal_code,
                    "country": db_invoice.company_country
                },
                "subtotal": float(db_invoice.subtotal),
                "tax_rate": float(db_invoice.tax_rate),
                "tax_amount": float(db_invoice.tax_amount),
                "total": float(db_invoice.total),
                "payment_method": db_invoice.payment_method,
                "payment_date": db_invoice.payment_date,
                "payment_reference": db_invoice.payment_reference,
                "notes": db_invoice.notes,
                "items": []
            }
            
            # Add items
            for item in db_invoice.items:
                invoice_data["items"].append({
                    "id": str(item.id),
                    "description": item.description,
                    "quantity": float(item.quantity),
                    "unit_price": float(item.unit_price),
                    "discount": float(item.discount),
                    "tax_rate": float(item.tax_rate),
                    "total": float(item.total)
                })
            
            return invoice_data
        
        finally:
            db.close()
    
    async def list_invoices(
        self,
        status: Optional[str] = None,
        customer_email: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        List invoices with filters
        
        Args:
            status: Filter by status
            customer_email: Filter by customer email
            from_date: From date
            to_date: To date
            limit: Result limit
            offset: Offset for pagination
        
        Returns:
            List of invoices
        """
        db = self.SessionLocal()
        try:
            query = db.query(DBInvoice)
            
            # Apply filters
            if status:
                query = query.filter(DBInvoice.status == status)
            if customer_email:
                query = query.filter(DBInvoice.customer_email == customer_email)
            if from_date:
                query = query.filter(DBInvoice.issue_date >= from_date)
            if to_date:
                query = query.filter(DBInvoice.issue_date <= to_date)
            
            # Order by date (most recent first)
            query = query.order_by(DBInvoice.issue_date.desc())
            
            # Paginate
            invoices = query.offset(offset).limit(limit).all()
            
            # Convert to dictionaries
            result = []
            for invoice in invoices:
                result.append({
                    "id": str(invoice.id),
                    "invoice_number": invoice.invoice_number,
                    "issue_date": invoice.issue_date,
                    "due_date": invoice.due_date,
                    "status": invoice.status,
                    "customer_name": invoice.customer_name,
                    "customer_email": invoice.customer_email,
                    "total": float(invoice.total),
                    "created_at": invoice.created_at
                })
            
            return result
        
        finally:
            db.close()
    
    async def get_last_invoice_number(self) -> str:
        """
        Get last invoice number from database
        
        Returns:
            Last invoice number or "INV-2024-0000"
        """
        db = self.SessionLocal()
        try:
            last_invoice = db.query(DBInvoice).order_by(
                DBInvoice.invoice_number.desc()
            ).first()
            
            if last_invoice:
                return last_invoice.invoice_number
            else:
                return "INV-2024-0000"
        
        finally:
            db.close()
    
    async def save_receipt(self, receipt_data: Dict[str, Any]) -> str:
        """
        Save receipt to database
        
        Args:
            receipt_data: Receipt data dictionary
        
        Returns:
            Receipt ID
        """
        db = self.SessionLocal()
        try:
            # Create receipt record
            db_receipt = DBReceipt(
                receipt_number=receipt_data["receipt_number"],
                issue_date=receipt_data["issue_date"],
                status=receipt_data["status"],
                customer_name=receipt_data["customer"]["name"],
                customer_email=receipt_data["customer"]["email"],
                customer_nif=receipt_data["customer"].get("nif"),
                company_name=receipt_data["company"]["name"],
                company_nif=receipt_data["company"]["nif"],
                amount=Decimal(str(receipt_data["amount"])),
                tax_included=receipt_data.get("tax_included", True),
                payment_method=receipt_data.get("payment_method"),
                payment_reference=receipt_data.get("payment_reference"),
                invoice_number=receipt_data.get("invoice_number"),
                notes=receipt_data.get("notes")
            )
            
            db.add(db_receipt)
            db.commit()
            db.refresh(db_receipt)
            
            return str(db_receipt.id)
        
        finally:
            db.close()
    
    async def get_receipt(self, receipt_number: str) -> Optional[Dict[str, Any]]:
        """
        Get receipt from database
        
        Args:
            receipt_number: Receipt number
        
        Returns:
            Receipt data or None
        """
        db = self.SessionLocal()
        try:
            db_receipt = db.query(DBReceipt).filter(
                DBReceipt.receipt_number == receipt_number
            ).first()
            
            if not db_receipt:
                return None
            
            # Convert to dictionary
            receipt_data = {
                "id": str(db_receipt.id),
                "receipt_number": db_receipt.receipt_number,
                "issue_date": db_receipt.issue_date,
                "status": db_receipt.status,
                "customer": {
                    "name": db_receipt.customer_name,
                    "email": db_receipt.customer_email,
                    "nif": db_receipt.customer_nif
                },
                "company": {
                    "name": db_receipt.company_name,
                    "nif": db_receipt.company_nif
                },
                "amount": float(db_receipt.amount),
                "tax_included": db_receipt.tax_included,
                "payment_method": db_receipt.payment_method,
                "payment_reference": db_receipt.payment_reference,
                "invoice_number": db_receipt.invoice_number,
                "notes": db_receipt.notes,
                "created_at": db_receipt.created_at
            }
            
            return receipt_data
        
        finally:
            db.close()
    
    async def get_last_receipt_number(self) -> str:
        """
        Get last receipt number from database
        
        Returns:
            Last receipt number or "REC-2024-0000"
        """
        db = self.SessionLocal()
        try:
            last_receipt = db.query(DBReceipt).order_by(
                DBReceipt.receipt_number.desc()
            ).first()
            
            if last_receipt:
                return last_receipt.receipt_number
            else:
                return "REC-2024-0000"
        
        finally:
            db.close()


# Singleton instance
db_integration = DatabaseIntegration()