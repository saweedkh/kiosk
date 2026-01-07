from typing import Dict, Any
import json
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_CENTER
from django.conf import settings
from django.utils import timezone


class InvoiceGenerator:
    """
    Invoice generation utility.
    
    This class provides methods for generating invoices in JSON and PDF formats.
    """
    
    @staticmethod
    def generate_json(invoice_data: Dict[str, Any]) -> str:
        """
        Generate invoice in JSON format.
        
        Args:
            invoice_data: Dictionary containing invoice data
                - invoice_number: Invoice number
                - order_number: Order number
                - created_at: Creation date (ISO format)
                - total_amount: Total amount
                - status: Order status
                - payment_status: Payment status
                - items: List of order items
                    - product_name: Product name
                    - quantity: Quantity
                    - unit_price: Unit price
                    - subtotal: Subtotal
                    
        Returns:
            str: JSON string representation of invoice
        """
        return json.dumps(invoice_data, ensure_ascii=False, indent=2)
    
    @staticmethod
    def generate_pdf(invoice_data: Dict[str, Any]) -> BytesIO:
        """
        Generate invoice in PDF format.
        
        Args:
            invoice_data: Dictionary containing invoice data
                - invoice_number: Invoice number
                - order_number: Order number
                - created_at: Creation date (ISO format)
                - total_amount: Total amount
                - status: Order status
                - payment_status: Payment status
                - items: List of order items
                    - product_name: Product name
                    - quantity: Quantity
                    - unit_price: Unit price
                    - subtotal: Subtotal
                    
        Returns:
            BytesIO: PDF file buffer
        """
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=20*mm, bottomMargin=20*mm)
        
        story = []
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        header_style = ParagraphStyle(
            'CustomHeader',
            parent=styles['Normal'],
            fontSize=12,
            textColor=colors.HexColor('#333333'),
            alignment=TA_RIGHT
        )
        
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#000000'),
            alignment=TA_RIGHT
        )
        
        title = Paragraph("Invoice / فاکتور", title_style)
        story.append(title)
        story.append(Spacer(1, 20))
        
        header_data = [
            [Paragraph(f"Invoice Number: {invoice_data['invoice_number']}", header_style)],
            [Paragraph(f"Order Number: {invoice_data['order_number']}", header_style)],
            [Paragraph(f"Date: {invoice_data['created_at']}", header_style)],
            [Paragraph(f"Status: {invoice_data['status']}", header_style)],
        ]
        
        header_table = Table(header_data, colWidths=[150*mm])
        header_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 20))
        
        items_data = [['Product', 'Quantity', 'Unit Price', 'Subtotal']]
        
        for item in invoice_data['items']:
            items_data.append([
                Paragraph(item['product_name'], normal_style),
                Paragraph(str(item['quantity']), normal_style),
                Paragraph(f"{item['unit_price']:,} Rial", normal_style),
                Paragraph(f"{item['subtotal']:,} Rial", normal_style),
            ])
        
        items_table = Table(items_data, colWidths=[80*mm, 20*mm, 25*mm, 25*mm])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e0e0e0')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#000000')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(items_table)
        story.append(Spacer(1, 20))
        
        total_data = [
            [Paragraph(f"Total Amount: {invoice_data['total_amount']:,} Rial", header_style)],
        ]
        
        total_table = Table(total_data, colWidths=[150*mm])
        total_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 14),
        ]))
        story.append(total_table)
        
        doc.build(story)
        buffer.seek(0)
        return buffer

