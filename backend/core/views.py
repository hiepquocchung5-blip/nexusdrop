import secrets
from urllib.parse import urlencode

import requests

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from django.db import transaction
from django.db.models import Prefetch
from django.shortcuts import redirect
from django.utils import timezone
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Game, LedgerEntry, Order, Package, PaymentProof, PointRedemption, PointReward, Wallet, award_points_for_order, get_customer_profile
from .serializers import (
    GameSerializer,
    LedgerEntrySerializer,
    OrderCreateSerializer,
    OrderSerializer,
    PaymentProofSerializer,
    PointRedemptionCreateSerializer,
    PointRedemptionSerializer,
    PointRewardSerializer,
    ProfileSerializer,
    WalletSerializer,
    NexusTokenObtainPairSerializer,
)
from .services import answer_telegram_callback, lookup_player, redeem_points, refund_redemption, secret_matches, send_telegram_order_notification
from .tasks import dispatch_order_to_supplier


User = get_user_model()


def _google_redirect_uri(request):
    explicit = getattr(settings, "GOOGLE_REDIRECT_URI", "").strip()
    if explicit:
        return explicit
    base = getattr(settings, "FRONTEND_URL", "").strip().rstrip("/")
    if not base:
        base = request.build_absolute_uri("/").rstrip("/")
    return f"{base}/login/oauth2/code/google"


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS or request.user.is_staff


class NexusTokenObtainPairView(TokenObtainPairView):
    serializer_class = NexusTokenObtainPairSerializer


class GameViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = GameSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return Game.objects.filter(is_active=True).prefetch_related(
            Prefetch("packages", queryset=Package.objects.filter(is_active=True))
        )

    @action(detail=True, methods=["get"], permission_classes=[permissions.AllowAny])
    def lookup(self, request, slug=None):
        game = self.get_object()
        player_id = request.query_params.get("player_id", "").strip()
        zone_id = request.query_params.get("zone_id", "").strip()

        if not player_id:
            return Response({"detail": "player_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            return Response(lookup_player(game.slug, player_id, zone_id))
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)



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

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def complete(self, request, pk=None):
        with transaction.atomic():
            order = Order.objects.select_for_update().get(pk=self.get_object().pk)
            if order.status not in {Order.Status.PENDING_PAYMENT, Order.Status.VERIFYING, Order.Status.PROCESSING, Order.Status.SUBMITTING}:
                return Response({"detail": "Order already processed."}, status=status.HTTP_409_CONFLICT)
            order.status = Order.Status.COMPLETED
            order.supplier_status = request.data.get("supplier_status", "MANUAL")
            order.failure_reason = ""
            order.save(update_fields=["status", "supplier_status", "failure_reason", "updated_at"])
        award_points_for_order(order)
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def cancel(self, request, pk=None):
        with transaction.atomic():
            order = Order.objects.select_for_update().get(pk=self.get_object().pk)
            if order.status not in {Order.Status.PENDING_PAYMENT, Order.Status.VERIFYING, Order.Status.PROCESSING, Order.Status.SUBMITTING}:
                return Response({"detail": "Order already processed."}, status=status.HTTP_409_CONFLICT)
            order.status = Order.Status.CANCELLED
            order.failure_reason = request.data.get("reason", "Order cancelled.")
            order.save(update_fields=["status", "failure_reason", "updated_at"])
        refund_redemption(order)
        return Response(OrderSerializer(order).data)


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
        send_telegram_order_notification(proof.order)

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


class ProfileViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=["get"])
    def me(self, request):
        return Response(ProfileSerializer(get_customer_profile(request.user)).data)


class PointRewardViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = PointRewardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PointReward.objects.filter(is_active=True).select_related("game", "package")

    @action(detail=False, methods=["post"])
    def redeem(self, request):
        serializer = PointRedemptionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reward = PointReward.objects.select_related("game", "package").filter(
            code=serializer.validated_data["reward_code"], is_active=True
        ).first()
        if reward is None:
            return Response({"detail": "Reward item not found."}, status=status.HTTP_404_NOT_FOUND)
        redemption = redeem_points(
            request.user,
            reward,
            serializer.validated_data["player_id"],
            serializer.validated_data.get("zone_id", ""),
        )
        dispatch_order_to_supplier.delay(str(redemption.order_id))
        return Response(PointRedemptionSerializer(redemption).data, status=status.HTTP_201_CREATED)


class PointRedemptionViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = PointRedemptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = PointRedemption.objects.select_related("reward", "reward__game", "reward__package", "order", "order__package", "order__package__game")
        if self.request.user.is_staff:
            return queryset
        return queryset.filter(user=self.request.user)


class G2BulkWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.query_params.get("token", "")
        if not secret_matches(getattr(settings, "G2BULK_WEBHOOK_SECRET", ""), token):
            return Response("Unauthorized", status=status.HTTP_401_UNAUTHORIZED)
        provider_order_id = str(request.data.get("order_id", ""))
        provider_status = str(request.data.get("status", "")).upper()
        message = request.data.get("message", "")
        order = Order.objects.filter(supplier_reference=provider_order_id).first()
        if not order:
            return Response("OK")
        with transaction.atomic():
            order = Order.objects.select_for_update().get(pk=order.pk)
            order.supplier_status = provider_status
            if provider_status == "COMPLETED":
                order.status = Order.Status.COMPLETED
                order.failure_reason = ""
            elif provider_status in {"FAILED", "CANCELLED", "REFUNDED"}:
                order.status = Order.Status.FAILED
                order.failure_reason = message[:500]
            order.save(update_fields=["status", "supplier_status", "failure_reason", "updated_at"])
        if provider_status == "COMPLETED":
            award_points_for_order(order)
            if hasattr(order, "point_redemption"):
                redemption = order.point_redemption
                redemption.status = PointRedemption.Status.COMPLETED
                redemption.save(update_fields=["status"])
        elif provider_status in {"FAILED", "CANCELLED", "REFUNDED"}:
            refund_redemption(order)
        return Response("OK")


class GoogleLoginStartView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not settings.GOOGLE_CLIENT_ID:
            return Response({"detail": "Google Login is not configured."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        redirect_uri = _google_redirect_uri(request)
        state = signing.dumps({"nonce": secrets.token_urlsafe(24)}, salt="google-oauth")
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
        }
        return redirect(f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}")


class GoogleLoginCallbackView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        code = request.query_params.get("code", "")
        state = request.query_params.get("state", "")
        frontend = settings.FRONTEND_URL.rstrip("/")
        try:
            signing.loads(state, salt="google-oauth", max_age=600)
            if not code:
                return redirect(f"{frontend}/?error=google_login_failed")
            redirect_uri = _google_redirect_uri(request)
            token_response = requests.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
                timeout=15,
            )
            token_response.raise_for_status()
            access_token = token_response.json().get("access_token")
            if not access_token:
                raise ValueError("Google token exchange did not return an access token.")
            profile_response = requests.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=15,
            )
            profile_response.raise_for_status()
            profile = profile_response.json()
            email = str(profile.get("email", "")).strip().lower()
            if not email:
                return redirect(f"{frontend}/?error=google_email_missing")
            name = str(profile.get("name", "")).strip()
            picture = str(profile.get("picture", "")).strip()
            first, _, last = name.partition(" ")
            user, created = User.objects.get_or_create(
                username=email,
                defaults={"email": email, "first_name": first[:150], "last_name": last[:150]},
            )
            if not created:
                changed = []
                if not user.email:
                    user.email = email
                    changed.append("email")
                if first and user.first_name != first[:150]:
                    user.first_name = first[:150]
                    changed.append("first_name")
                if last and user.last_name != last[:150]:
                    user.last_name = last[:150]
                    changed.append("last_name")
                if changed:
                    user.save(update_fields=changed)
            customer_profile = get_customer_profile(user)
            if picture and customer_profile.profile_picture != picture:
                customer_profile.profile_picture = picture
                customer_profile.save(update_fields=["profile_picture", "updated_at"])
            refresh = RefreshToken.for_user(user)
            fragment = urlencode({"access": str(refresh.access_token), "refresh": str(refresh)})
            return redirect(f"{frontend}/#{fragment}")
        except signing.BadSignature:
            return redirect(f"{frontend}/?error=invalid_oauth_state")
        except Exception:
            error_query = urlencode({"error": "google_login_failed"})
            return redirect(f"{frontend}/?{error_query}")


class TelegramWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        supplied = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
        if not secret_matches(settings.TELEGRAM_WEBHOOK_SECRET, supplied):
            return Response("Unauthorized", status=status.HTTP_401_UNAUTHORIZED)
        callback = request.data.get("callback_query") or {}
        data = str(callback.get("data", ""))
        callback_id = str(callback.get("id", ""))
        chat_id = str(((callback.get("message") or {}).get("chat") or {}).get("id", ""))
        if settings.TELEGRAM_CHAT_ID and not secret_matches(settings.TELEGRAM_CHAT_ID, chat_id):
            return Response("Forbidden", status=status.HTTP_403_FORBIDDEN)

        notice = "Order already processed"
        if data.startswith("CONFIRM_"):
            order_id = data.removeprefix("CONFIRM_")
            with transaction.atomic():
                order = Order.objects.select_for_update().filter(pk=order_id).first()
                if order and order.status in {Order.Status.PENDING_PAYMENT, Order.Status.VERIFYING}:
                    order.status = Order.Status.PROCESSING
                    order.save(update_fields=["status", "updated_at"])
                    notice = "Order accepted. Top-up is processing."
                    dispatch_order_to_supplier.delay(str(order.id))
        elif data.startswith("CANCEL_"):
            order_id = data.removeprefix("CANCEL_")
            with transaction.atomic():
                order = Order.objects.select_for_update().filter(pk=order_id).first()
                if order and order.status in {Order.Status.PENDING_PAYMENT, Order.Status.VERIFYING, Order.Status.PROCESSING}:
                    order.status = Order.Status.CANCELLED
                    order.failure_reason = "Cancelled from Telegram."
                    order.save(update_fields=["status", "failure_reason", "updated_at"])
                    refund_redemption(order)
                    notice = "Order cancelled"
        answer_telegram_callback(callback_id, notice)
        return Response("OK")

