"""
POS Card Reader Gateway for Pardakht Novin (Direct Protocol).

This package implements direct communication protocol with POS card readers
without using DLL. It uses TCP/IP socket connection.

Based on the DLL analysis, the protocol uses tag-based format:
PR{type}AM{amount}TE{terminal}ME{merchant}SO{order}CU{customer}PD{payment_id}BI{bill_id}
"""

from .gateway import POSPaymentGateway

__all__ = ['POSPaymentGateway']

