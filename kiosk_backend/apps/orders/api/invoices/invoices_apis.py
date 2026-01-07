from rest_framework import generics
from rest_framework.response import Response
from django.http import FileResponse
from apps.orders.models import Invoice
from apps.orders.api.invoices.invoices_serializers import InvoiceSerializer, InvoiceJSONResponseSerializer
from apps.orders.selectors.invoice_selector import InvoiceSelector
from apps.orders.services.invoice_service import InvoiceService
from apps.core.api.schema import custom_extend_schema
from apps.core.api.schema import ResponseStatusCodes


class InvoiceRetrieveAPIView(generics.RetrieveAPIView):
    """
    API endpoint for retrieving a single invoice by ID.
    
    Returns detailed information about a specific invoice.
    """
    serializer_class = InvoiceSerializer
    lookup_field = 'pk'
    
    @custom_extend_schema(
        resource_name="InvoiceRetrieve",
        parameters=[],
        response_serializer=InvoiceSerializer,
        status_codes=[
            ResponseStatusCodes.OK,
            ResponseStatusCodes.NOT_FOUND,
        ],
        summary="Get Invoice Details",
        description="Retrieve detailed information about a specific invoice.",
        tags=["Invoices"],
        operation_id="invoices_retrieve",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    def get_queryset(self):
        """
        Get queryset of invoices with orders.
        
        Returns:
            QuerySet: QuerySet of invoices
        """
        return InvoiceSelector.get_invoices_with_orders()


class InvoiceDownloadPDFAPIView(generics.GenericAPIView):
    """
    API endpoint for downloading invoice PDF.
    
    Returns the PDF file of the invoice.
    """
    @custom_extend_schema(
        resource_name="InvoiceDownloadPDF",
        parameters=[],
        status_codes=[
            ResponseStatusCodes.OK,
            ResponseStatusCodes.NOT_FOUND,
        ],
        summary="Download Invoice PDF",
        description="Download the PDF file of an invoice.",
        tags=["Invoices"],
        operation_id="invoices_download_pdf",
    )
    def get(self, request, pk):
        """
        Download invoice PDF file.
        
        Args:
            request: HTTP request object
            pk: Invoice ID
            
        Returns:
            FileResponse: PDF file response
            
        Raises:
            404: If invoice or PDF file not found
        """
        invoice = InvoiceSelector.get_invoice_by_id(pk)
        if not invoice or not invoice.pdf_file:
            return Response({'error': 'Invoice PDF not found'}, status=404)
        
        return FileResponse(
            invoice.pdf_file.open('rb'),
            content_type='application/pdf',
            filename=f"{invoice.invoice_number}.pdf"
        )


class InvoiceDownloadJSONAPIView(generics.GenericAPIView):
    """
    API endpoint for downloading invoice JSON data.
    
    Returns the JSON representation of the invoice.
    """
    @custom_extend_schema(
        resource_name="InvoiceDownloadJSON",
        parameters=[],
        response_serializer=InvoiceJSONResponseSerializer,
        status_codes=[
            ResponseStatusCodes.OK,
            ResponseStatusCodes.NOT_FOUND,
        ],
        summary="Download Invoice JSON",
        description="Get the JSON representation of an invoice.",
        tags=["Invoices"],
        operation_id="invoices_download_json",
    )
    def get(self, request, pk):
        """
        Get invoice JSON data.
        
        Args:
            request: HTTP request object
            pk: Invoice ID
            
        Returns:
            Response: JSON invoice data
            
        Raises:
            404: If invoice not found
        """
        invoice = InvoiceSelector.get_invoice_by_id(pk)
        if not invoice:
            return Response({'error': 'Invoice not found'}, status=404)
        
        json_data = invoice.json_data or InvoiceService.get_invoice_data(invoice.order_id)
        
        return Response(json_data)


class InvoiceCreateAPIView(generics.GenericAPIView):
    """
    API endpoint for creating invoice for an order.
    
    Generates both PDF and JSON formats of the invoice.
    """
    serializer_class = InvoiceSerializer
    
    @custom_extend_schema(
        resource_name="InvoiceCreate",
        parameters=[],
        response_serializer=InvoiceSerializer,
        status_codes=[
            ResponseStatusCodes.CREATED,
            ResponseStatusCodes.BAD_REQUEST,
        ],
        summary="Create Invoice",
        description="Create an invoice for an order. Generates both PDF and JSON formats.",
        tags=["Invoices"],
        operation_id="invoices_create",
    )
    def post(self, request, order_id):
        """
        Create invoice for an order.
        
        Args:
            request: HTTP request object
            order_id: Order ID
            
        Returns:
            Response: Created invoice data
            
        Raises:
            ValueError: If order not found
        """
        invoice = InvoiceService.create_invoice(order_id)
        
        return Response(
            InvoiceSerializer(invoice).data,
            status=201
        )

