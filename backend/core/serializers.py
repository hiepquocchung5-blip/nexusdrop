import re

from rest_framework import serializers

from .models import Game, LedgerEntry, Order, Package, PaymentProof, Wallet

PLAYER_RE = re.compile(r"^[A-Za-z0-9_-]{4,64}$")
ZONE_RE = re.compile(r"^[A-Za-z0-9_-]{0,64}$")


class PackageSerializer(serializers.ModelSerializer):
    margin = serializers.DecimalField(max_digits=5, decimal_places=4, read_only=True)

    class Meta:
        model = Package
        fields = ["id", "title", "sku", "amount_label", "sell_price", "reseller_price", "margin"]


class GameSerializer(serializers.ModelSerializer):
    packages = PackageSerializer(many=True, read_only=True)

    class Meta:
        model = Game
        fields = ["id", "name", "slug", "region_hint", "packages"]


class OrderCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ["id", "package", "player_id", "zone_id", "quoted_price", "status", "created_at"]
        read_only_fields = ["id", "quoted_price", "status", "created_at"]

    def validate_player_id(self, value):
        if not PLAYER_RE.match(value):
            raise serializers.ValidationError("Player ID must be 4-64 letters, numbers, underscores, or dashes.")
        return value

    def validate_zone_id(self, value):
        if not ZONE_RE.match(value or ""):
            raise serializers.ValidationError("Zone ID may only contain letters, numbers, underscores, or dashes.")
        return value

    def create(self, validated_data):
        package = validated_data["package"]
        user = self.context["request"].user if self.context["request"].user.is_authenticated else None
        return Order.objects.create(user=user, quoted_price=package.sell_price, **validated_data)


class OrderSerializer(serializers.ModelSerializer):
    package = PackageSerializer(read_only=True)
    game = serializers.CharField(source="package.game.name", read_only=True)

    class Meta:
        model = Order
        fields = ["id", "game", "package", "player_id", "zone_id", "status", "quoted_price", "supplier_reference", "failure_reason", "created_at", "updated_at"]


class PaymentProofSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentProof
        fields = ["id", "order", "image", "submitted_note", "is_approved", "created_at"]
        read_only_fields = ["id", "is_approved", "created_at"]

    def validate_order(self, order):
        if order.status not in {Order.Status.PENDING_PAYMENT, Order.Status.VERIFYING}:
            raise serializers.ValidationError("Payment proof can only be submitted while payment is pending.")
        return order


class WalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wallet
        fields = ["balance", "updated_at"]


class LedgerEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = LedgerEntry
        fields = ["kind", "amount", "reference", "note", "created_at"]

