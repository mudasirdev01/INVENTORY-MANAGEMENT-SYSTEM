from django.urls import include, path
from rest_framework.routers import DefaultRouter

from billing.api.views import InvoiceViewSet


router = DefaultRouter()
router.register("invoices", InvoiceViewSet, basename="invoice")

urlpatterns = [
    path("", include(router.urls)),
]
