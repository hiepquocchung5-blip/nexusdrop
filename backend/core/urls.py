from rest_framework.routers import DefaultRouter

from django.urls import path

from .views import (
    G2BulkWebhookView,
    GameViewSet,
    GoogleLoginCallbackView,
    GoogleLoginStartView,
    OrderViewSet,
    PaymentProofViewSet,
    PointRedemptionViewSet,
    PointRewardViewSet,
    ProfileViewSet,
    TelegramWebhookView,
    WalletViewSet,
)

router = DefaultRouter()
router.register("games", GameViewSet, basename="game")
router.register("orders", OrderViewSet, basename="order")
router.register("payment-proofs", PaymentProofViewSet, basename="payment-proof")
router.register("wallet", WalletViewSet, basename="wallet")
router.register("profile", ProfileViewSet, basename="profile")
router.register("point-rewards", PointRewardViewSet, basename="point-reward")
router.register("point-redemptions", PointRedemptionViewSet, basename="point-redemption")

urlpatterns = [
    path("webhooks/g2bulk/", G2BulkWebhookView.as_view(), name="g2bulk-webhook"),
    path("webhooks/telegram/", TelegramWebhookView.as_view(), name="telegram-webhook"),
    path("login/google", GoogleLoginStartView.as_view(), name="google-login-start"),
    path("login/google/", GoogleLoginStartView.as_view(), name="google-login-start-slash"),
    path("login/oauth2/code/google", GoogleLoginCallbackView.as_view(), name="google-login-callback"),
    path("login/oauth2/code/google/", GoogleLoginCallbackView.as_view(), name="google-login-callback-slash"),
] + router.urls
