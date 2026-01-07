from rest_framework import generics, status
from rest_framework.response import Response
from apps.payment.models import Transaction
from apps.payment.api.transactions.transactions_serializers import (
    TransactionQuerySerializer,
    TransactionSerializer,
    TransactionListSerializer
)
from apps.payment.api.transactions.transactions_filters import TransactionFilter
from apps.payment.selectors.transaction_selector import TransactionSelector
from apps.core.api.schema import custom_extend_schema
from apps.core.api.schema import ResponseStatusCodes


class TransactionListAPIView(generics.ListAPIView):
    """
    API endpoint for listing payment transactions.
    
    Returns transactions filtered by order_id if provided, otherwise all transactions.
    Supports filtering by status, gateway, and date range.
    """
    serializer_class = TransactionListSerializer
    filterset_class = TransactionFilter
    
    @custom_extend_schema(
        resource_name="TransactionList",
        parameters=[TransactionQuerySerializer],
        response_serializer=TransactionListSerializer,
        status_codes=[ResponseStatusCodes.OK_PAGINATED],
        summary="List Transactions",
        description="Get a list of payment transactions. Supports filtering by order_id, status, and gateway.",
        tags=["Transactions"],
        operation_id="transactions_list",
    )
    def get(self, request, *args, **kwargs):
        """
        Get list of transactions.
        
        Args:
            request: HTTP request object
            
        Returns:
            Response: Paginated list of transactions
        """
        params_serializer = TransactionQuerySerializer(data=request.query_params)
        params_serializer.is_valid(raise_exception=True)
        params = params_serializer.validated_data
        
        session_key = request.session.session_key
        if not session_key:
            queryset = Transaction.objects.none()
        else:
            order_id = params.get('order_id')
            if order_id:
                queryset = TransactionSelector.get_transactions_by_order(order_id)
            else:
                queryset = Transaction.objects.all()
        
        # Apply filterset if provided
        if self.filterset_class:
            queryset = self.filterset_class(request.query_params, queryset=queryset).qs
        
        # Paginate results
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(
            data=serializer.data,
            status=status.HTTP_200_OK
        )


class TransactionRetrieveAPIView(generics.RetrieveAPIView):
    """
    API endpoint for retrieving a single transaction by ID.
    
    Returns detailed information about a specific payment transaction.
    """
    serializer_class = TransactionSerializer
    lookup_field = 'pk'
    
    @custom_extend_schema(
        resource_name="TransactionRetrieve",
        parameters=[],
        response_serializer=TransactionSerializer,
        status_codes=[
            ResponseStatusCodes.OK,
            ResponseStatusCodes.NOT_FOUND,
        ],
        summary="Get Transaction Details",
        description="Retrieve detailed information about a specific payment transaction.",
        tags=["Transactions"],
        operation_id="transactions_retrieve",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    def get_queryset(self):
        """
        Get queryset of all transactions.
        
        Returns:
            QuerySet: QuerySet of all transactions
        """
        return Transaction.objects.all()

