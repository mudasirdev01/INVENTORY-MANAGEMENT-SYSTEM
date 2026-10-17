from django.urls import path

from analytics.api.views import (
    DashboardSummaryView,
    LowStockReportView,
    MonthlySalesTrendView,
    RecentOrdersView,
    SalesTotalsView,
    TopSellingProductsView,
)


urlpatterns = [
    path("dashboard/", DashboardSummaryView.as_view(), name="analytics-dashboard"),
    path("sales/", SalesTotalsView.as_view(), name="analytics-sales"),
    path("monthly-sales/", MonthlySalesTrendView.as_view(), name="analytics-monthly-sales"),
    path("top-products/", TopSellingProductsView.as_view(), name="analytics-top-products"),
    path("recent-orders/", RecentOrdersView.as_view(), name="analytics-recent-orders"),
    path("low-stock/", LowStockReportView.as_view(), name="analytics-low-stock"),
]
