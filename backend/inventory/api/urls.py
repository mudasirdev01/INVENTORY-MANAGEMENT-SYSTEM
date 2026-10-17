from django.urls import path

from inventory.api.views import (
    StockDetailView,
    StockInView,
    LowStockView,
    StockOutView,
    StockOverviewView,
    StockTransactionListView,
)


urlpatterns = [
    path("stock/", StockOverviewView.as_view(), name="stock-overview"),
    path("low-stock/", LowStockView.as_view(), name="low-stock"),
    path("stock/<int:product_id>/", StockDetailView.as_view(), name="stock-detail"),
    path("stock/in/", StockInView.as_view(), name="stock-in"),
    path("stock/out/", StockOutView.as_view(), name="stock-out"),
    path("transactions/", StockTransactionListView.as_view(), name="stock-transactions"),
]
