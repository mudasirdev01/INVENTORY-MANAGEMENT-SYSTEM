from rest_framework.permissions import IsAuthenticated


class CanReadAnalytics(IsAuthenticated):
    """All active authenticated roles may read reporting data."""
