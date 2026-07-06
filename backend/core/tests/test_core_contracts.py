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


from unittest.mock import patch
from core.models import Order
from core.tasks import dispatch_order_to_supplier
from django.conf import settings

@pytest.mark.django_db
def test_dispatch_order_mock_fallback(package):
    order = Order.objects.create(
        package=package,
        player_id="Player_123",
        zone_id="1234",
        status=Order.Status.PROCESSING,
        quoted_price=Decimal("2.49")
    )
    
    with patch.object(settings, "SUPPLIER_API_BASE_URL", "https://supplier.example.test"):
        status = dispatch_order_to_supplier(str(order.id))
        order.refresh_from_db()
        assert status == Order.Status.COMPLETED
        assert order.status == Order.Status.COMPLETED
        assert order.supplier_reference.startswith("mock-")


@pytest.mark.django_db
@patch("core.tasks.requests.post")
def test_dispatch_order_real_api_success(mock_post, package):
    order = Order.objects.create(
        package=package,
        player_id="Player_123",
        zone_id="1234",
        status=Order.Status.PROCESSING,
        quoted_price=Decimal("2.49")
    )
    
    mock_post.return_value.status_code = 201
    mock_post.return_value.json.return_value = {"reference": "real-ref-999"}
    
    with patch.object(settings, "SUPPLIER_API_BASE_URL", "https://real-api.supplier.com"), \
         patch.object(settings, "SUPPLIER_API_KEY", "secret-key-123"):
        status = dispatch_order_to_supplier(str(order.id))
        
        mock_post.assert_called_once_with(
            "https://real-api.supplier.com/api/v1/orders",
            json={
                "order_id": str(order.id),
                "sku": package.sku,
                "player_id": "Player_123",
                "zone_id": "1234"
            },
            headers={
                "Authorization": "Bearer secret-key-123",
                "Content-Type": "application/json"
            },
            timeout=15
        )
        
        order.refresh_from_db()
        assert status == Order.Status.COMPLETED
        assert order.status == Order.Status.COMPLETED
        assert order.supplier_reference == "real-ref-999"


from rest_framework.test import APIClient

@pytest.mark.django_db
def test_lookup_player_mock(package):
    client = APIClient()
    response = client.get(f"/api/games/{package.game.slug}/lookup/", {"player_id": "Player_999", "zone_id": "1234"})
    assert response.status_code == 200
    assert "player_name" in response.data
    assert isinstance(response.data["player_name"], str)
    assert len(response.data["player_name"]) > 0


@pytest.mark.django_db
def test_lookup_player_missing_params(package):
    client = APIClient()
    response = client.get(f"/api/games/{package.game.slug}/lookup/")
    assert response.status_code == 400


