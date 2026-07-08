from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0002_package_category"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="package",
            name="requires_zone",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="order",
            name="payment_method",
            field=models.CharField(default="KBZPay", max_length=30),
        ),
        migrations.AddField(
            model_name="order",
            name="player_name",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="order",
            name="points_awarded",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="order",
            name="supplier_catalogue",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="order",
            name="supplier_game_code",
            field=models.CharField(blank=True, max_length=80),
        ),
        migrations.AddField(
            model_name="order",
            name="supplier_status",
            field=models.CharField(blank=True, max_length=40),
        ),
        migrations.AlterField(
            model_name="order",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending_payment", "Pending payment"),
                    ("verifying", "Verifying"),
                    ("submitting", "Submitting"),
                    ("processing", "Processing"),
                    ("completed", "Completed"),
                    ("failed", "Failed"),
                    ("cancelled", "Cancelled"),
                    ("refunded", "Refunded"),
                ],
                default="pending_payment",
                max_length=32,
            ),
        ),
        migrations.CreateModel(
            name="CustomerProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("points", models.PositiveIntegerField(default=0)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="customer_profile", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name="PointReward",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.SlugField(unique=True)),
                ("provider_usd", models.DecimalField(decimal_places=3, max_digits=10)),
                ("point_cost", models.PositiveIntegerField()),
                ("requires_zone", models.BooleanField(default=False)),
                ("image", models.CharField(blank=True, max_length=120)),
                ("is_active", models.BooleanField(default=True)),
                ("game", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="point_rewards", to="core.game")),
                ("package", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="point_rewards", to="core.package")),
            ],
            options={"ordering": ["game__name", "point_cost", "code"]},
        ),
        migrations.CreateModel(
            name="PointRedemption",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("points_used", models.PositiveIntegerField()),
                ("status", models.CharField(choices=[("processing", "Processing"), ("submitted", "Submitted"), ("completed", "Completed"), ("refunded", "Refunded")], default="processing", max_length=30)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("order", models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, related_name="point_redemption", to="core.order")),
                ("reward", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="redemptions", to="core.pointreward")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="point_redemptions", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
