from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model

from core.models import Game, LedgerEntry, Package, mutate_wallet
from core.serializers import OrderCreateSerializer


@pytest.mark.django_db
def test_mutate_wallet_rejects_overdraft():
    user = get_user_model().objects.create_user(username="reseller", password="secret")
    mutate_wallet(user, Decimal("10.00"), LedgerEntry.Kind.CREDIT, "topup-1")

    with pytest.raises(ValueError, match="Insufficient wallet balance"):
        mutate_wallet(user, Decimal("11.00"), LedgerEntry.Kind.DEBIT, "order-1")

    user.wallet.refresh_from_db()
    assert user.wallet.balance == Decimal("10.00")


@pytest.fixture
def package():
    game = Game.objects.create(name="Mobile Legends", slug="mobile-legends")
    return Package.objects.create(
        game=game,
        title="86 Diamonds",
        sku="MLBB-86",
        amount_label="86 + 8 bonus",
        cost_price=Decimal("1.85"),
        sell_price=Decimal("2.49"),
        reseller_price=Decimal("2.25"),
    )


@pytest.mark.django_db
def test_order_identity_validation_rejects_invalid_player_id(package):
    serializer = OrderCreateSerializer(
        data={"package": package.id, "player_id": "bad id!", "zone_id": "2214"}
    )

    assert not serializer.is_valid()
    assert "player_id" in serializer.errors


@pytest.mark.django_db
def test_order_identity_validation_accepts_empty_zone_id(package):
    serializer = OrderCreateSerializer(
        data={"package": package.id, "player_id": "Player_1234", "zone_id": ""}
    )

    serializer.is_valid()
    assert "zone_id" not in serializer.errors
