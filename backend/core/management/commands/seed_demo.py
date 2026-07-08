from django.core.management.base import BaseCommand

from core.catalog import GAMES, POINT_REWARDS, PRODUCTS, category_for, cost_price, reseller_price, reward_point_cost, sku_for
from core.models import Game, Package, PointReward


class Command(BaseCommand):
    help = "Seed the catalog converted from the Java Game Shop backend."

    def handle(self, *args, **options):
        games = {}
        for name, slug, hint in GAMES:
            games[slug], _ = Game.objects.update_or_create(
                slug=slug,
                defaults={"name": name, "region_hint": hint, "is_active": True},
            )

        packages = {}
        active_skus = set()
        for slug, title, amount_label, amount in PRODUCTS:
            sku = sku_for(slug, title)
            active_skus.add(sku)
            package, _ = Package.objects.update_or_create(
                sku=sku,
                defaults={
                    "game": games[slug],
                    "title": title,
                    "amount_label": amount_label,
                    "cost_price": cost_price(amount),
                    "sell_price": amount,
                    "reseller_price": reseller_price(amount),
                    "category": category_for(title),
                    "requires_zone": slug in {"mobile-legends", "magic-chess-gogo"},
                    "is_active": True,
                },
            )
            packages[(slug, title)] = package

        Package.objects.filter(game__slug__in=games.keys()).exclude(sku__in=active_skus).update(is_active=False)

        for code, slug, package_title, provider_usd, requires_zone, image in POINT_REWARDS:
            package = packages.get((slug, package_title))
            if not package:
                self.stderr.write(f"Skipping reward {code}: package not found")
                continue
            PointReward.objects.update_or_create(
                code=code,
                defaults={
                    "game": games[slug],
                    "package": package,
                    "provider_usd": provider_usd,
                    "point_cost": reward_point_cost(provider_usd),
                    "requires_zone": requires_zone,
                    "image": image,
                    "is_active": True,
                },
            )

        self.stdout.write(self.style.SUCCESS(f"Seeded {len(games)} games, {len(packages)} packages, and {len(POINT_REWARDS)} point rewards."))
