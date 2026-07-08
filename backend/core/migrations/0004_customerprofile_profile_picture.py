from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0003_gameshop_port"),
    ]

    operations = [
        migrations.AddField(
            model_name="customerprofile",
            name="profile_picture",
            field=models.URLField(blank=True),
        ),
    ]
