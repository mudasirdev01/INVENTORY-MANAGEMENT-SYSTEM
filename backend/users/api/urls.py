from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from users.api.views import LogoutView, UserProfileView, UserViewSet


router = DefaultRouter()
router.register("users", UserViewSet, basename="user")

urlpatterns = [
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(), name="refresh"),
    path("profile/", UserProfileView.as_view(), name="profile"),

    path("", include(router.urls)),

    path("logout/", LogoutView.as_view(), name="logout"),

]
