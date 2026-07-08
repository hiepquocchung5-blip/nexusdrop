import re

from django.core.files.images import get_image_dimensions
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import CustomerProfile, Game, LedgerEntry, Order, Package, PaymentProof, PointRedemption, PointReward, Wallet
from .services import normalize_payment_method, validate_game_identity

PLAYER_RE = re.compile(r"^[A-Za-z0-9_-]{4,64}$")
ZONE_RE = re.compile(r"^[A-Za-z0-9_-]{0,64}$")


class NexusTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["username"] = user.get_username()
        token["is_staff"] = user.is_staff
        return token


class PackageSerializer(serializers.ModelSerializer):
    margin = serializers.DecimalField(max_digits=5, decimal_places=4, read_only=True)

    class Meta:
        model = Package
        fields = ["id", "title", "sku", "amount_label", "sell_price", "reseller_price", "margin", "category", "requires_zone"]



class GameSerializer(serializers.ModelSerializer):
    packages = PackageSerializer(many=True, read_only=True)

    class Meta:
        model = Game
        fields = ["id", "name", "slug", "region_hint", "packages"]


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    name = serializers.SerializerMethodField()
    email = serializers.EmailField(source="user.email", read_only=True)
    target_points = serializers.SerializerMethodField()
    percentage = serializers.SerializerMethodField()
    needed_points = serializers.SerializerMethodField()

    class Meta:
        model = CustomerProfile
        fields = ["username", "name", "email", "profile_picture", "points", "target_points", "percentage", "needed_points", "updated_at"]

    def get_name(self, obj):
        return obj.user.get_full_name() or obj.user.get_username()

    def get_target_points(self, obj):
        return 800

    def get_percentage(self, obj):
        return min(100, (obj.points * 100) // 800)

    def get_needed_points(self, obj):
        return max(0, 800 - obj.points)


class OrderCreateSerializer(serializers.ModelSerializer):
    payment_method = serializers.CharField(required=False, allow_blank=True, default="KBZPay")
    player_name = serializers.CharField(required=False, allow_blank=True, max_length=120)

    class Meta:
        model = Order
        fields = ["id", "package", "player_id", "zone_id", "player_name", "payment_method", "quoted_price", "status", "created_at"]
        read_only_fields = ["id", "quoted_price", "status", "created_at"]

    def validate_player_id(self, value):
        if not PLAYER_RE.match(value):
            raise serializers.ValidationError("Player ID must be 4-64 letters, numbers, underscores, or dashes.")
        return value

    def validate_zone_id(self, value):
        if not ZONE_RE.match(value or ""):
            raise serializers.ValidationError("Zone ID may only contain letters, numbers, underscores, or dashes.")
        return value

    def validate_payment_method(self, value):
        return normalize_payment_method(value or "KBZPay")

    def validate(self, attrs):
        package = attrs.get("package")
        if package:
            player_id, zone_id = validate_game_identity(package.game.slug, attrs.get("player_id"), attrs.get("zone_id", ""))
            attrs["player_id"] = player_id
            attrs["zone_id"] = zone_id
            if package.requires_zone and not zone_id:
                raise serializers.ValidationError({"zone_id": "This game requires a Server / Zone ID."})
        return attrs

    def create(self, validated_data):
        package = validated_data["package"]
        user = self.context["request"].user if self.context["request"].user.is_authenticated else None
        return Order.objects.create(user=user, quoted_price=package.sell_price, **validated_data)


class OrderSerializer(serializers.ModelSerializer):
    package = PackageSerializer(read_only=True)
    game = serializers.CharField(source="package.game.name", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "game",
            "package",
            "player_id",
            "zone_id",
            "player_name",
            "payment_method",
            "status",
            "quoted_price",
            "supplier_reference",
            "supplier_status",
            "supplier_game_code",
            "supplier_catalogue",
            "failure_reason",
            "points_awarded",
            "created_at",
            "updated_at",
        ]


class PaymentProofSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentProof
        fields = ["id", "order", "image", "submitted_note", "is_approved", "created_at"]
        read_only_fields = ["id", "is_approved", "created_at"]

    def validate_order(self, order):
        if order.status not in {Order.Status.PENDING_PAYMENT, Order.Status.VERIFYING}:
            raise serializers.ValidationError("Payment proof can only be submitted while payment is pending.")
        return order

    def validate_image(self, image):
        max_bytes = 5 * 1024 * 1024
        if image.size <= 0 or image.size > max_bytes:
            raise serializers.ValidationError("Receipt image must be smaller than 5 MB.")
        try:
            width, height = get_image_dimensions(image)
        except Exception as exc:
            raise serializers.ValidationError("Receipt image is invalid.") from exc
        if not width or not height or width * height > 40_000_000:
            raise serializers.ValidationError("Receipt image dimensions are too large.")
        content_type = getattr(image, "content_type", "")
        if content_type not in {"image/jpeg", "image/png"}:
            raise serializers.ValidationError("Only genuine JPEG and PNG receipt images are accepted.")
        image.seek(0)
        return image


class WalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wallet
        fields = ["balance", "updated_at"]


class LedgerEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = LedgerEntry
        fields = ["kind", "amount", "reference", "note", "created_at"]


class PointRewardSerializer(serializers.ModelSerializer):
    game = serializers.CharField(source="game.name", read_only=True)
    game_slug = serializers.CharField(source="game.slug", read_only=True)
    package_title = serializers.CharField(source="package.title", read_only=True)

    class Meta:
        model = PointReward
        fields = ["id", "code", "game", "game_slug", "package", "package_title", "point_cost", "requires_zone", "image"]


class PointRedemptionCreateSerializer(serializers.Serializer):
    reward_code = serializers.SlugField()
    player_id = serializers.CharField()
    zone_id = serializers.CharField(required=False, allow_blank=True)


class PointRedemptionSerializer(serializers.ModelSerializer):
    reward = PointRewardSerializer(read_only=True)
    order = OrderSerializer(read_only=True)

    class Meta:
        model = PointRedemption
        fields = ["id", "reward", "order", "points_used", "status", "created_at"]

