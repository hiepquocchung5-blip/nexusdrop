from django.contrib import admin

from .models import Game, LedgerEntry, Order, Package, PaymentProof, Wallet


class PackageInline(admin.TabularInline):
    model = Package
    extra = 0


@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active")
    prepopulated_fields = {"slug": ("name",)}
    inlines = [PackageInline]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "package", "player_id", "status", "quoted_price", "created_at")
    list_filter = ("status", "package__game")
    search_fields = ("id", "player_id", "zone_id", "supplier_reference")


@admin.register(PaymentProof)
class PaymentProofAdmin(admin.ModelAdmin):
    list_display = ("order", "is_approved", "reviewed_by", "created_at", "reviewed_at")
    list_filter = ("is_approved",)


admin.site.register(Wallet)
admin.site.register(LedgerEntry)

