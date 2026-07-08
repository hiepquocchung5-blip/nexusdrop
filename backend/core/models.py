from decimal import Decimal
import uuid

from django.conf import settings
from django.db import models, transaction


class Game(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    region_hint = models.CharField(max_length=80, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Package(models.Model):
    game = models.ForeignKey(Game, related_name="packages", on_delete=models.CASCADE)
    title = models.CharField(max_length=120)
    sku = models.CharField(max_length=80, unique=True)
    amount_label = models.CharField(max_length=80)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2)
    sell_price = models.DecimalField(max_digits=12, decimal_places=2)
    reseller_price = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=80, default="Currency", help_text="e.g. Currency, Pass, Bundle")
    requires_zone = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)


    @property
    def margin(self):
        if self.sell_price == 0:
            return Decimal("0")
        return (self.sell_price - self.cost_price) / self.sell_price

    def __str__(self):
        return f"{self.game.name} - {self.title}"


class Wallet(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, related_name="wallet", on_delete=models.CASCADE)
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user} wallet"


class CustomerProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, related_name="customer_profile", on_delete=models.CASCADE)
    points = models.PositiveIntegerField(default=0)
    profile_picture = models.URLField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user} profile"


class LedgerEntry(models.Model):
    class Kind(models.TextChoices):
        CREDIT = "credit", "Credit"
        DEBIT = "debit", "Debit"
        REVERSAL = "reversal", "Reversal"

    wallet = models.ForeignKey(Wallet, related_name="ledger", on_delete=models.PROTECT)
    kind = models.CharField(max_length=20, choices=Kind.choices)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    reference = models.CharField(max_length=120, unique=True)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING_PAYMENT = "pending_payment", "Pending payment"
        VERIFYING = "verifying", "Verifying"
        SUBMITTING = "submitting", "Submitting"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"
        REFUNDED = "refunded", "Refunded"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="orders", on_delete=models.PROTECT, null=True, blank=True)
    package = models.ForeignKey(Package, related_name="orders", on_delete=models.PROTECT)
    player_id = models.CharField(max_length=64)
    zone_id = models.CharField(max_length=64, blank=True)
    player_name = models.CharField(max_length=120, blank=True)
    payment_method = models.CharField(max_length=30, default="KBZPay")
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PENDING_PAYMENT)
    quoted_price = models.DecimalField(max_digits=12, decimal_places=2)
    supplier_reference = models.CharField(max_length=120, blank=True)
    supplier_status = models.CharField(max_length=40, blank=True)
    supplier_game_code = models.CharField(max_length=80, blank=True)
    supplier_catalogue = models.CharField(max_length=255, blank=True)
    failure_reason = models.TextField(blank=True)
    points_awarded = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]


class PaymentProof(models.Model):
    order = models.OneToOneField(Order, related_name="payment_proof", on_delete=models.CASCADE)
    image = models.ImageField(upload_to="payment-proofs/")
    submitted_note = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="reviewed_payment_proofs", on_delete=models.SET_NULL, null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    is_approved = models.BooleanField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class PointReward(models.Model):
    code = models.SlugField(unique=True)
    game = models.ForeignKey(Game, related_name="point_rewards", on_delete=models.PROTECT)
    package = models.ForeignKey(Package, related_name="point_rewards", on_delete=models.PROTECT)
    provider_usd = models.DecimalField(max_digits=10, decimal_places=3)
    point_cost = models.PositiveIntegerField()
    requires_zone = models.BooleanField(default=False)
    image = models.CharField(max_length=120, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["game__name", "point_cost", "code"]

    def __str__(self):
        return self.code


class PointRedemption(models.Model):
    class Status(models.TextChoices):
        PROCESSING = "processing", "Processing"
        SUBMITTED = "submitted", "Submitted"
        COMPLETED = "completed", "Completed"
        REFUNDED = "refunded", "Refunded"

    order = models.OneToOneField(Order, related_name="point_redemption", on_delete=models.PROTECT)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="point_redemptions", on_delete=models.PROTECT)
    reward = models.ForeignKey(PointReward, related_name="redemptions", on_delete=models.PROTECT)
    points_used = models.PositiveIntegerField()
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PROCESSING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


def mutate_wallet(user, amount, kind, reference, note=""):
    with transaction.atomic():
        wallet, _ = Wallet.objects.select_for_update().get_or_create(user=user)
        if kind == LedgerEntry.Kind.DEBIT and wallet.balance < amount:
            raise ValueError("Insufficient wallet balance")
        wallet.balance = wallet.balance + amount if kind == LedgerEntry.Kind.CREDIT else wallet.balance - amount
        wallet.save(update_fields=["balance", "updated_at"])
        return LedgerEntry.objects.create(wallet=wallet, amount=amount, kind=kind, reference=reference, note=note)


def get_customer_profile(user):
    return CustomerProfile.objects.get_or_create(user=user)[0]


def award_points_for_order(order):
    from .services import earned_points

    if order.points_awarded or not order.user_id:
        return 0
    points = earned_points(order.quoted_price)
    if points <= 0:
        return 0
    with transaction.atomic():
        locked = Order.objects.select_for_update().get(id=order.id)
        if locked.points_awarded:
            return 0
        profile = CustomerProfile.objects.select_for_update().get_or_create(user=locked.user)[0]
        profile.points += points
        profile.save(update_fields=["points", "updated_at"])
        locked.points_awarded = True
        locked.save(update_fields=["points_awarded", "updated_at"])
    return points

