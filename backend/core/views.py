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

    @action(detail=True, methods=["get"], permission_classes=[permissions.AllowAny])
    def lookup(self, request, slug=None):
        from django.conf import settings
        import requests
        import hashlib

        game = self.get_object()
        player_id = request.query_params.get("player_id", "").strip()
        zone_id = request.query_params.get("zone_id", "").strip()

        if not player_id:
            return Response({"detail": "player_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Basic format validation using the patterns from the serializers
        from .serializers import PLAYER_RE, ZONE_RE
        if not PLAYER_RE.match(player_id):
            return Response({"detail": "Invalid Player ID format."}, status=status.HTTP_400_BAD_REQUEST)
        if zone_id and not ZONE_RE.match(zone_id):
            return Response({"detail": "Invalid Zone/Server ID format."}, status=status.HTTP_400_BAD_REQUEST)

        base_url = settings.SUPPLIER_API_BASE_URL
        api_key = settings.SUPPLIER_API_KEY

        # If dummy or empty, fallback to generated mock player verification
        if not base_url or "example.test" in base_url:
            h = int(hashlib.md5(f"{game.slug}-{player_id}-{zone_id}".encode()).hexdigest(), 16)
            nicknames = {
                "mobile-legends": ["AlucardPro", "LaylaGod", "FannyGod", "TigrealKing", "GusionMain", "MiyaQueen"],
                "pubg-mobile": ["SniperGhost", "ShroudClon", "PochinkiKing", "AWM_Slayer", "WinnerDinner"],
                "free-fire": ["AlokBooyah", "ChronoGod", "HeadshotOP", "FF_Master", "RushKing"]
            }
            game_nicks = nicknames.get(game.slug, ["GamerPro", "NexusWarrior", "AlphaZero"])
            nickname = game_nicks[h % len(game_nicks)] + f"_{player_id[:4]}"
            return Response({"player_name": nickname})

        # Real Live API lookup
        url = f"{base_url.rstrip('/')}/api/v1/lookup"
        params = {
            "game": game.slug,
            "player_id": player_id,
            "zone_id": zone_id
        }
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        try:
            response = requests.get(url, params=params, headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                return Response({"player_name": data.get("player_name") or data.get("username") or "Unknown Player"})
            else:
                return Response({"detail": f"Player verification failed: {response.text}"}, status=response.status_code)
        except requests.RequestException as e:
            return Response({"detail": f"Supplier API connection error: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)



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

