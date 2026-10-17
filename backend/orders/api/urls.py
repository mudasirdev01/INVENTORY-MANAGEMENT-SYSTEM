from django.urls import include, path
from rest_framework.routers import DefaultRouter

from orders.api.views import SalesOrderViewSet


router = DefaultRouter()
router.register("", SalesOrderViewSet, basename="order")

urlpatterns = [
    path("", include(router.urls)),
]
