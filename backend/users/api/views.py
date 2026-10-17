from rest_framework import viewsets
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from users.api.permissions import IsAdminRole
from users.api.serializers import (
    UserCreateSerializer,
    UserListSerializer,
    UserProfileSerializer,
    UserUpdateSerializer,
)
from users.models import User


class UserProfileView(RetrieveAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "put", "patch", "head", "options"]
    queryset = User.objects.all().order_by("-date_joined")
    permission_classes = [IsAdminRole]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        if self.action in ("update", "partial_update"):
            return UserUpdateSerializer
        return UserListSerializer


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")

        if not refresh_token:
            return Response({"error": "Refresh token is required."}, status=400)

        try:
            token = RefreshToken(refresh_token)

            if str(token.payload.get("user_id")) != str(request.user.pk):
                return Response(
                    {"error": "Token does not belong to this user."},
                    status=400,
                )

            token.blacklist()
        except TokenError:
            return Response(
                {"error": "Invalid or expired refresh token."},
                status=400,
            )

        return Response({"message": "Logged out successfully."}, status=200)
