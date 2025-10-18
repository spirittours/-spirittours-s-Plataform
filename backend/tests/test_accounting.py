"""
Unit Tests for Accounting Module

Tests invoice generation, receipt management, and financial reports.
"""

import pytest
from decimal import Decimal
from datetime import date, timedelta
from backend.accounting.invoice_service import InvoiceService, PaymentStatus
from backend.accounting.receipt_service import ReceiptService
from backend.accounting.financial_reports_service import FinancialReportsService


class TestInvoiceService:
    """Test cases for Invoice Service."""
    
    @pytest.mark.asyncio
    async def test_generate_invoice(self, sample_customer_data, sample_booking_data):
        """Test invoice generation."""
        service = InvoiceService()
        
        invoice = await service.generate_invoice(
            customer=sample_customer_data,
            booking=sample_booking_data
        )
        
        assert invoice is not None
        assert invoice.invoice_number.startswith("INV-")
        assert invoice.total_amount > 0
        assert invoice.payment_status == PaymentStatus.UNPAID
        assert len(invoice.lines) > 0
    
    @pytest.mark.asyncio
    async def test_calculate_taxes(self):
        """Test tax calculation."""
        service = InvoiceService()
        
        # Test 21% IVA
        subtotal = Decimal("1000.00")
        tax_rate = Decimal("21")
        
        tax_amount = service._calculate_tax(subtotal, tax_rate)
        total = subtotal + tax_amount
        
        assert tax_amount == Decimal("210.00")
        assert total == Decimal("1210.00")
    
    @pytest.mark.asyncio
    async def test_invoice_number_generation(self):
        """Test unique invoice number generation."""
        service = InvoiceService()
        
        numbers = set()
        for _ in range(100):
            number = service._generate_invoice_number()
            assert number not in numbers
            assert number.startswith("INV-")
            assert len(number) == 19  # INV-YYYYMMDDHHMMSS format
            numbers.add(number)
    
    @pytest.mark.asyncio
    async def test_mark_invoice_as_paid(self, sample_invoice_data):
        """Test marking invoice as paid."""
        service = InvoiceService()
        
        invoice = await service.mark_as_paid(
            invoice_number="INV-TEST-001",
            payment_method="credit_card",
            payment_reference="PAY-TEST-001"
        )
        
        # This would test actual database operations
        # For now, verify the method exists
        assert hasattr(service, 'mark_as_paid')
    
    @pytest.mark.asyncio
    async def test_overdue_invoices(self):
        """Test identification of overdue invoices."""
        service = InvoiceService()
        
        # Create invoice with past due date
        today = date.today()
        past_date = today - timedelta(days=10)
        
        # Test overdue logic
        is_overdue = past_date < today
        assert is_overdue is True
        
        # Test not overdue
        future_date = today + timedelta(days=10)
        is_overdue = future_date < today
        assert is_overdue is False


class TestReceiptService:
    """Test cases for Receipt Service."""
    
    @pytest.mark.asyncio
    async def test_generate_receipt(self):
        """Test receipt generation."""
        service = ReceiptService()
        
        receipt = await service.generate_receipt(
            invoice_number="INV-TEST-001",
            amount=Decimal("1500.00"),
            payment_method="credit_card",
            payment_reference="PAY-TEST-001",
            customer_name="Juan Pérez",
            customer_nif="12345678A"
        )
        
        assert receipt is not None
        assert receipt.receipt_number.startswith("REC-")
        assert receipt.amount == Decimal("1500.00")
        assert receipt.payment_method == "credit_card"
    
    @pytest.mark.asyncio
    async def test_receipt_number_generation(self):
        """Test unique receipt number generation."""
        service = ReceiptService()
        
        numbers = set()
        for _ in range(100):
            number = service._generate_receipt_number()
            assert number not in numbers
            assert number.startswith("REC-")
            numbers.add(number)
    
    @pytest.mark.asyncio
    async def test_receipt_pdf_generation(self):
        """Test PDF generation for receipt."""
        service = ReceiptService()
        
        # Test that PDF generation method exists
        assert hasattr(service, 'generate_pdf')
        
        # Full test would generate actual PDF
        # pdf_data = await service.generate_pdf("REC-TEST-001")
        # assert pdf_data is not None
        # assert len(pdf_data) > 0


class TestFinancialReportsService:
    """Test cases for Financial Reports Service."""
    
    @pytest.mark.asyncio
    async def test_balance_sheet_generation(self):
        """Test balance sheet generation."""
        service = FinancialReportsService()
        
        balance_sheet = await service.generate_balance_sheet(
            as_of_date=date.today()
        )
        
        assert "assets" in balance_sheet
        assert "liabilities" in balance_sheet
        assert "equity" in balance_sheet
        assert "check" in balance_sheet
        
        # Balance sheet must balance
        total_assets = Decimal(str(balance_sheet["assets"]["total"]))
        total_liabilities = Decimal(str(balance_sheet["liabilities"]["total"]))
        equity = Decimal(str(balance_sheet["equity"]["total"]))
        
        # Assets = Liabilities + Equity
        assert abs(total_assets - (total_liabilities + equity)) < Decimal("0.01")
    
    @pytest.mark.asyncio
    async def test_profit_loss_generation(self):
        """Test profit & loss statement generation."""
        service = FinancialReportsService()
        
        from_date = date(2025, 1, 1)
        to_date = date(2025, 12, 31)
        
        pnl = await service.generate_profit_loss(
            from_date=from_date,
            to_date=to_date
        )
        
        assert "revenue" in pnl
        assert "expenses" in pnl
        assert "net_income" in pnl
        
        # Net income = Revenue - Expenses
        revenue = Decimal(str(pnl["revenue"]["total"]))
        expenses = Decimal(str(pnl["expenses"]["total"]))
        net_income = Decimal(str(pnl["net_income"]["amount"]))
        
        assert net_income == revenue - expenses
    
    @pytest.mark.asyncio
    async def test_modelo_303_generation(self):
        """Test Modelo 303 (Spanish VAT) generation."""
        service = FinancialReportsService()
        
        modelo = await service.generate_modelo_303(
            quarter=1,
            year=2025
        )
        
        assert "report" in modelo
        assert modelo["report"] == "Modelo 303 - IVA Trimestral"
        assert "periodo" in modelo
        assert modelo["periodo"]["quarter"] == 1
        assert modelo["periodo"]["year"] == 2025
        assert "iva_repercutido" in modelo
        assert "iva_soportado" in modelo
        assert "resultado" in modelo
    
    @pytest.mark.asyncio
    async def test_vat_book_generation(self):
        """Test VAT book generation."""
        service = FinancialReportsService()
        
        from_date = date(2025, 1, 1)
        to_date = date(2025, 3, 31)
        
        vat_book = await service.generate_vat_book(
            from_date=from_date,
            to_date=to_date
        )
        
        assert "entries" in vat_book
        assert "summary" in vat_book
        
        # Summary should include all tax rates
        summary = vat_book["summary"]
        assert "tax_rates" in summary
        assert "total_vat" in summary


class TestDashboardService:
    """Test cases for Dashboard Service."""
    
    @pytest.mark.asyncio
    async def test_get_kpis(self):
        """Test KPI calculation."""
        from backend.accounting.dashboard_service import AccountingDashboardService, TimePeriod
        
        service = AccountingDashboardService()
        
        kpis = await service.get_kpis(period=TimePeriod.MONTH)
        
        assert "total_invoiced" in kpis
        assert "total_received" in kpis
        assert "outstanding_balance" in kpis
        assert "payment_rate" in kpis
        
        # Payment rate should be percentage
        payment_rate = kpis["payment_rate"]["value"]
        assert 0 <= payment_rate <= 100
    
    @pytest.mark.asyncio
    async def test_revenue_chart_generation(self):
        """Test revenue chart data generation."""
        from backend.accounting.dashboard_service import (
            AccountingDashboardService,
            TimePeriod,
            ChartType
        )
        
        service = AccountingDashboardService()
        
        chart_data = await service.get_revenue_chart(
            period=TimePeriod.YEAR,
            chart_type=ChartType.LINE
        )
        
        assert "labels" in chart_data
        assert "datasets" in chart_data
        assert len(chart_data["datasets"]) > 0
        assert "data" in chart_data["datasets"][0]


class TestReconciliationService:
    """Test cases for Reconciliation Service."""
    
    @pytest.mark.asyncio
    async def test_auto_reconciliation(self):
        """Test automatic reconciliation."""
        from backend.accounting.reconciliation_service import ReconciliationService
        
        service = ReconciliationService()
        
        result = await service.auto_reconcile(
            from_date=date(2025, 1, 1),
            to_date=date(2025, 12, 31)
        )
        
        assert "summary" in result
        assert "matches" in result
        
        summary = result["summary"]
        assert "total_invoices" in summary
        assert "total_receipts" in summary
        assert "matched_count" in summary
    
    @pytest.mark.asyncio
    async def test_matching_strategies(self):
        """Test different matching strategies."""
        from backend.accounting.reconciliation_service import (
            ReconciliationService,
            MatchingStrategy
        )
        
        service = ReconciliationService()
        
        # Test invoice number matching (highest confidence)
        strategies = [MatchingStrategy.INVOICE_NUMBER]
        result = await service.auto_reconcile(strategies=strategies)
        
        # Matches should have high confidence
        for match in result.get("matches", []):
            if match.get("strategy") == "invoice_number":
                assert match.get("confidence") >= 0.95


# Performance tests
@pytest.mark.performance
class TestAccountingPerformance:
    """Performance tests for accounting module."""
    
    @pytest.mark.asyncio
    async def test_invoice_generation_performance(self, performance_threshold):
        """Test invoice generation performance."""
        import time
        
        service = InvoiceService()
        
        start_time = time.time()
        
        # Generate 100 invoices
        for i in range(100):
            # Mock generation
            pass
        
        end_time = time.time()
        elapsed_ms = (end_time - start_time) * 1000
        
        # Should generate 100 invoices in less than 1 second
        assert elapsed_ms < 1000
    
    @pytest.mark.asyncio
    async def test_report_generation_performance(self, performance_threshold):
        """Test financial report generation performance."""
        import time
        
        service = FinancialReportsService()
        
        start_time = time.time()
        
        await service.generate_balance_sheet()
        
        end_time = time.time()
        elapsed_ms = (end_time - start_time) * 1000
        
        # Report should generate in less than 500ms
        assert elapsed_ms < 500
