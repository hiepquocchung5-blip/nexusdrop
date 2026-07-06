from django.utils import timezone
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Game, LedgerEntry, Order, PaymentProof, Wallet
from .serializers import (
    GameSerializer,
    LedgerEntrySerializer,
    OrderCreateSerializer,
    OrderSerializer,
    PaymentProofSerializer,
    WalletSerializer,
)
from .tasks import dispatch_order_to_supplier


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS or request.user.is_staff


class GameViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = GameSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return Game.objects.filter(is_active=True).prefetch_related("packages")


class OrderViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = Order.objects.select_related("package", "package__game")
        if self.request.user.is_staff:
            return queryset
        if self.request.user.is_authenticated:
            return queryset.filter(user=self.request.user)
        return queryset.none()

    def get_serializer_class(self):
        return OrderCreateSerializer if self.action == "create" else OrderSerializer


class PaymentProofViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = PaymentProofSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = PaymentProof.objects.select_related("order", "reviewed_by")
        if self.request.user.is_staff:
            return queryset
        if self.request.user.is_authenticated:
            return queryset.filter(order__user=self.request.user)
        return queryset.none()

    def perform_create(self, serializer):
        proof = serializer.save()
        proof.order.status = Order.Status.VERIFYING
        proof.order.save(update_fields=["status", "updated_at"])

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def approve(self, request, pk=None):
        proof = self.get_object()
        proof.is_approved = True
        proof.reviewed_by = request.user
        proof.reviewed_at = timezone.now()
        proof.save(update_fields=["is_approved", "reviewed_by", "reviewed_at"])
        proof.order.status = Order.Status.PROCESSING
        proof.order.save(update_fields=["status", "updated_at"])
        dispatch_order_to_supplier.delay(str(proof.order_id))
        return Response({"status": proof.order.status})

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def reject(self, request, pk=None):
        proof = self.get_object()
        proof.is_approved = False
        proof.reviewed_by = request.user
        proof.reviewed_at = timezone.now()
        proof.save(update_fields=["is_approved", "reviewed_by", "reviewed_at"])
        proof.order.status = Order.Status.FAILED
        proof.order.failure_reason = request.data.get("reason", "Payment proof rejected.")
        proof.order.save(update_fields=["status", "failure_reason", "updated_at"])
        return Response({"status": proof.order.status})


class WalletViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=["get"])
    def me(self, request):
        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        return Response(WalletSerializer(wallet).data)

    @action(detail=False, methods=["get"])
    def ledger(self, request):
        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        serializer = LedgerEntrySerializer(LedgerEntry.objects.filter(wallet=wallet), many=True)
        return Response(serializer.data)

