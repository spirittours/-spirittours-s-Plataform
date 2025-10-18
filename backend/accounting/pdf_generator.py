"""
Generador de PDF Profesional - Spirit Tours

Genera PDFs de alta calidad para:
- Facturas
- Recibos
- Notas de crédito/débito
- Facturas con IVA

Con diseño profesional y cumplimiento de requisitos fiscales españoles.
"""
from typing import Optional
from decimal import Decimal
from datetime import date
import base64
import io

# Para producción, usar ReportLab
try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
    from reportlab.pdfgen import canvas
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

from .models import Invoice, Receipt, CreditNote, DebitNote, DigitalSignature


class PDFGenerator:
    """
    Generador de PDF para documentos contables.
    
    Genera PDFs profesionales con diseño corporativo y cumplimiento fiscal.
    """
    
    def __init__(self, language: str = "es"):
        """
        Inicializar generador de PDF.
        
        Args:
            language: Idioma (es=Español, en=English)
        """
        self.language = language
        self.page_width = A4[0] if REPORTLAB_AVAILABLE else 595.27
        self.page_height = A4[1] if REPORTLAB_AVAILABLE else 841.89
    
    async def generate_invoice_pdf(self, invoice: Invoice) -> bytes:
        """
        Generar PDF de factura.
        
        Args:
            invoice: Factura a generar
        
        Returns:
            Bytes del PDF generado
        """
        if not REPORTLAB_AVAILABLE:
            return self._generate_mock_pdf(invoice, "INVOICE")
        
        # Crear buffer
        buffer = io.BytesIO()
        
        # Crear documento
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        elements = []
        styles = getSampleStyleSheet()
        
        # Título
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=30
        )
        
        title_text = "FACTURA" if self.language == "es" else "INVOICE"
        elements.append(Paragraph(title_text, title_style))
        elements.append(Spacer(1, 12))
        
        # Información de empresa y cliente en tabla
        info_data = [
            [
                Paragraph(f"<b>Empresa Emisora:</b><br/>{invoice.company.name}<br/>"
                         f"{invoice.company.tax_id}<br/>"
                         f"{invoice.company.address.format()}<br/>"
                         f"{invoice.company.phone}<br/>"
                         f"{invoice.company.email}", styles['Normal']),
                Paragraph(f"<b>Cliente:</b><br/>{invoice.customer.name}<br/>"
                         f"{invoice.customer.tax_id or 'N/A'}<br/>"
                         f"{invoice.customer.email}", styles['Normal'])
            ]
        ]
        
        info_table = Table(info_data, colWidths=[250, 250])
        info_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8f9fa'))
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 20))
        
        # Información de factura
        invoice_info = [
            ["Número de Factura:", invoice.invoice_number],
            ["Fecha de Emisión:", invoice.issue_date.strftime("%d/%m/%Y")],
            ["Fecha de Vencimiento:", invoice.due_date.strftime("%d/%m/%Y") if invoice.due_date else "N/A"],
            ["Condiciones de Pago:", invoice.payment_terms]
        ]
        
        invoice_info_table = Table(invoice_info, colWidths=[150, 150])
        invoice_info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e9ecef')),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey)
        ]))
        elements.append(invoice_info_table)
        elements.append(Spacer(1, 20))
        
        # Líneas de factura
        lines_data = [["Descripción", "Cantidad", "Precio Unit.", "Descuento", "IVA %", "Total"]]
        
        for line in invoice.lines:
            lines_data.append([
                line.description,
                str(line.quantity),
                f"{line.unit_price:.2f} €",
                f"{line.discount_percent}%" if line.discount_percent > 0 else "-",
                f"{line.tax_rate}%" if line.tax_rate > 0 else "-",
                f"{line.total:.2f} €"
            ])
        
        lines_table = Table(lines_data, colWidths=[200, 50, 70, 60, 50, 70])
        lines_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#343a40')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(lines_table)
        elements.append(Spacer(1, 20))
        
        # Totales
        totals_data = [
            ["Subtotal:", f"{invoice.subtotal:.2f} €"],
            ["Descuento Total:", f"{invoice.total_discount:.2f} €"],
            ["Base Imponible:", f"{invoice.taxable_amount:.2f} €"]
        ]
        
        # Desglose de IVA
        for tax_breakdown in invoice.tax_breakdown:
            totals_data.append([
                f"{tax_breakdown.tax_name}:",
                f"{tax_breakdown.tax_amount:.2f} €"
            ])
        
        totals_data.append(["", ""])  # Separador
        totals_data.append([
            Paragraph("<b>TOTAL:</b>", styles['Normal']),
            Paragraph(f"<b>{invoice.total_amount:.2f} €</b>", styles['Normal'])
        ])
        
        totals_table = Table(totals_data, colWidths=[350, 150])
        totals_table.setStyle(TableStyle([
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('BACKGROUND', (-2, -1), (-1, -1), colors.HexColor('#28a745')),
            ('TEXTCOLOR', (-2, -1), (-1, -1), colors.whitesmoke),
            ('FONTSIZE', (-2, -1), (-1, -1), 14),
            ('GRID', (0, 0), (-1, -2), 1, colors.grey)
        ]))
        elements.append(totals_table)
        elements.append(Spacer(1, 30))
        
        # Notas
        if invoice.notes:
            elements.append(Paragraph(f"<b>Notas:</b>", styles['Heading3']))
            elements.append(Paragraph(invoice.notes, styles['Normal']))
            elements.append(Spacer(1, 10))
        
        # Texto legal
        legal_text = invoice.legal_text or self._get_default_legal_text()
        elements.append(Paragraph(f"<i>{legal_text}</i>", styles['Normal']))
        
        # Firma digital (si existe)
        if invoice.digital_signature:
            elements.append(Spacer(1, 20))
            elements.append(Paragraph("<b>Documento firmado digitalmente</b>", styles['Heading3']))
            elements.append(Paragraph(
                f"Firma ID: {invoice.digital_signature.signature_id}<br/>"
                f"Firmante: {invoice.digital_signature.signer_name}<br/>"
                f"Fecha: {invoice.digital_signature.signature_timestamp.strftime('%d/%m/%Y %H:%M:%S')}<br/>"
                f"Algoritmo: {invoice.digital_signature.algorithm}",
                styles['Normal']
            ))
        
        # Construir PDF
        doc.build(elements)
        
        # Obtener bytes
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        return pdf_bytes
    
    async def generate_receipt_pdf(self, receipt: Receipt) -> bytes:
        """
        Generar PDF de recibo.
        
        Args:
            receipt: Recibo a generar
        
        Returns:
            Bytes del PDF generado
        """
        if not REPORTLAB_AVAILABLE:
            return self._generate_mock_pdf(receipt, "RECEIPT")
        
        # Crear buffer
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        elements = []
        styles = getSampleStyleSheet()
        
        # Título
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=30
        )
        
        title_text = "RECIBO DE PAGO" if self.language == "es" else "PAYMENT RECEIPT"
        elements.append(Paragraph(title_text, title_style))
        elements.append(Spacer(1, 20))
        
        # Información básica
        info_data = [
            ["Número de Recibo:", receipt.receipt_number],
            ["Fecha de Emisión:", receipt.issue_date.strftime("%d/%m/%Y")],
            ["Fecha de Pago:", receipt.payment_date.strftime("%d/%m/%Y %H:%M")],
            ["Método de Pago:", receipt.payment_method],
        ]
        
        if receipt.payment_reference:
            info_data.append(["Referencia de Pago:", receipt.payment_reference])
        
        if receipt.related_invoice_number:
            info_data.append(["Factura Relacionada:", receipt.related_invoice_number])
        
        info_table = Table(info_data, colWidths=[150, 300])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e9ecef')),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey)
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 30))
        
        # Partes
        parties_data = [
            [
                Paragraph(f"<b>Recibido de:</b><br/>{receipt.customer.name}<br/>"
                         f"{receipt.customer.email}", styles['Normal']),
                Paragraph(f"<b>Recibido por:</b><br/>{receipt.company.name}<br/>"
                         f"{receipt.company.tax_id}", styles['Normal'])
            ]
        ]
        
        parties_table = Table(parties_data, colWidths=[250, 250])
        parties_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8f9fa'))
        ]))
        elements.append(parties_table)
        elements.append(Spacer(1, 30))
        
        # Monto
        amount_data = [
            [
                Paragraph("<b>Concepto:</b>", styles['Normal']),
                Paragraph(receipt.concept, styles['Normal'])
            ],
            [
                Paragraph("<b>IMPORTE RECIBIDO:</b>", styles['Normal']),
                Paragraph(f"<b>{receipt.amount:.2f} {receipt.currency}</b>", styles['Normal'])
            ]
        ]
        
        amount_table = Table(amount_data, colWidths=[150, 350])
        amount_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#28a745')),
            ('TEXTCOLOR', (0, 1), (-1, 1), colors.whitesmoke),
            ('FONTSIZE', (0, 1), (-1, 1), 16),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')
        ]))
        elements.append(amount_table)
        
        # Firma digital
        if receipt.digital_signature:
            elements.append(Spacer(1, 40))
            elements.append(Paragraph("<b>Documento firmado digitalmente</b>", styles['Heading3']))
            elements.append(Paragraph(
                f"Firma ID: {receipt.digital_signature.signature_id}<br/>"
                f"Firmante: {receipt.digital_signature.signer_name}<br/>"
                f"Fecha: {receipt.digital_signature.signature_timestamp.strftime('%d/%m/%Y %H:%M:%S')}",
                styles['Normal']
            ))
        
        # Construir PDF
        doc.build(elements)
        
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        return pdf_bytes
    
    def _get_default_legal_text(self) -> str:
        """Obtener texto legal por defecto."""
        if self.language == "es":
            return ("Esta factura se emite de acuerdo con la normativa fiscal vigente. "
                   "Los datos de pago se encuentran en las condiciones de pago indicadas. "
                   "Para cualquier consulta, contacte con nosotros.")
        else:
            return ("This invoice is issued in accordance with current tax regulations. "
                   "Payment details are included in the payment terms. "
                   "For any queries, please contact us.")
    
    def _generate_mock_pdf(self, document, doc_type: str) -> bytes:
        """
        Generar PDF mock para desarrollo (sin ReportLab).
        
        Args:
            document: Documento a generar
            doc_type: Tipo de documento
        
        Returns:
            Bytes simulados
        """
        # Crear contenido simple en texto
        content = f"""
        {doc_type} - MOCK PDF (Install ReportLab for production)
        ============================================
        
        Document Number: {getattr(document, 'invoice_number', getattr(document, 'receipt_number', 'N/A'))}
        Issue Date: {document.issue_date}
        
        Company: {document.company.name}
        Customer: {document.customer.name}
        
        [This is a mock PDF for development purposes]
        [Install reportlab package for production PDF generation]
        
        pip install reportlab
        """
        
        return content.encode('utf-8')


# Singleton global
_pdf_generator: Optional[PDFGenerator] = None


def get_pdf_generator(language: str = "es") -> PDFGenerator:
    """
    Obtener instancia global del generador de PDF.
    
    Args:
        language: Idioma (es/en)
    
    Returns:
        PDFGenerator
    """
    global _pdf_generator
    if _pdf_generator is None:
        _pdf_generator = PDFGenerator(language=language)
    return _pdf_generator
