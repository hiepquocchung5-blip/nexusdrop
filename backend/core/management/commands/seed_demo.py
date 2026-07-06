from django.core.management.base import BaseCommand

from core.models import Game, Package


class Command(BaseCommand):
    help = "Seed demo games and top-up packages."

    def handle(self, *args, **options):
        catalog = [
            ("Mobile Legends", "mobile-legends", "Server ID required", [("86 Diamonds", "MLBB-86", "86 + 8 bonus", 1.85, 2.49, 2.25), ("172 Diamonds", "MLBB-172", "172 + 16 bonus", 3.62, 4.79, 4.35)]),
            ("PUBG Mobile", "pubg-mobile", "Character ID only", [("60 UC", "PUBG-60", "60 UC", 0.78, 1.19, 1.05), ("325 UC", "PUBG-325", "300 + 25 UC", 3.85, 5.49, 4.95)]),
            ("Free Fire", "free-fire", "Player UID only", [("100 Diamonds", "FF-100", "100 diamonds", 0.92, 1.39, 1.20), ("310 Diamonds", "FF-310", "310 diamonds", 2.71, 3.99, 3.60)]),
        ]
        for name, slug, hint, packages in catalog:
            game, _ = Game.objects.update_or_create(slug=slug, defaults={"name": name, "region_hint": hint, "is_active": True})
            for title, sku, amount_label, cost, sell, reseller in packages:
                Package.objects.update_or_create(
                    sku=sku,
                    defaults={
                        "game": game,
                        "title": title,
                        "amount_label": amount_label,
                        "cost_price": cost,
                        "sell_price": sell,
                        "reseller_price": reseller,
                        "is_active": True,
                    },
                )
        self.stdout.write(self.style.SUCCESS("Seeded NexusDrop demo catalog."))

