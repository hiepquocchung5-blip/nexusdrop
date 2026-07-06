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
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="orders", on_delete=models.PROTECT, null=True, blank=True)
    package = models.ForeignKey(Package, related_name="orders", on_delete=models.PROTECT)
    player_id = models.CharField(max_length=64)
    zone_id = models.CharField(max_length=64, blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PENDING_PAYMENT)
    quoted_price = models.DecimalField(max_digits=12, decimal_places=2)
    supplier_reference = models.CharField(max_length=120, blank=True)
    failure_reason = models.TextField(blank=True)
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


def mutate_wallet(user, amount, kind, reference, note=""):
    with transaction.atomic():
        wallet, _ = Wallet.objects.select_for_update().get_or_create(user=user)
        if kind == LedgerEntry.Kind.DEBIT and wallet.balance < amount:
            raise ValueError("Insufficient wallet balance")
        wallet.balance = wallet.balance + amount if kind == LedgerEntry.Kind.CREDIT else wallet.balance - amount
        wallet.save(update_fields=["balance", "updated_at"])
        return LedgerEntry.objects.create(wallet=wallet, amount=amount, kind=kind, reference=reference, note=note)

