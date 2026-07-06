from rest_framework.routers import DefaultRouter

from .views import GameViewSet, OrderViewSet, PaymentProofViewSet, WalletViewSet

router = DefaultRouter()
router.register("games", GameViewSet, basename="game")
router.register("orders", OrderViewSet, basename="order")
router.register("payment-proofs", PaymentProofViewSet, basename="payment-proof")
router.register("wallet", WalletViewSet, basename="wallet")

urlpatterns = router.urls

