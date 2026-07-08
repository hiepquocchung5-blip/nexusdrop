from decimal import Decimal, ROUND_CEILING
import hashlib
import hmac
import json
import re
from html import escape

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import CustomerProfile, Order, PointRedemption

try:
    import requests
except ModuleNotFoundError:
    requests = None


PAYMENT_METHODS = {
    "kbzpay": "KBZPay",
    "kpay": "KBZPay",
    "wavepay": "WavePay",
    "wave pay": "WavePay",
    "aya pay": "AYA Pay",
    "ayapay": "AYA Pay",
}

G2BULK_GAME_CODES = {
    "mobile-legends": ["mlbb"],
    "pubg-mobile": ["pubgm", "pubg_mobile"],
    "free-fire": ["freefire_br", "freefire_global"],
    "honor-of-kings": ["hok"],
    "magic-chess-gogo": ["magic_chess_gogo", "magic_chest_gogo", "mcgg_my", "mcgg_ph", "mcgg_ru"],
}


def clean(value):
    return "" if value is None else str(value).strip()


def normalize_payment_method(value):
    method = PAYMENT_METHODS.get(clean(value).lower())
    if not method:
        raise serializers.ValidationError("Please choose a valid payment method.")
    return method


def validate_game_identity(game_slug, player_id, zone_id=""):
    player_id = clean(player_id)
    zone_id = clean(zone_id)

    def numeric(value, min_length, max_length, label):
        if not re.fullmatch(rf"[0-9]{{{min_length},{max_length}}}", value):
            raise serializers.ValidationError({label: "Invalid game ID."})

    def account(value, min_length, max_length, label):
        if not re.fullmatch(r"[A-Za-z0-9_-]+", value) or not min_length <= len(value) <= max_length:
            raise serializers.ValidationError({label: "Invalid account ID."})

    if game_slug == "mobile-legends":
        numeric(player_id, 5, 20, "player_id")
        numeric(zone_id, 1, 10, "zone_id")
    elif game_slug == "magic-chess-gogo":
        numeric(player_id, 5, 20, "player_id")
        numeric(zone_id, 1, 10, "zone_id")
    elif game_slug == "pubg-mobile":
        numeric(player_id, 6, 20, "player_id")
    elif game_slug == "free-fire":
        numeric(player_id, 5, 20, "player_id")
    elif game_slug == "honor-of-kings":
        account(player_id, 5, 30, "player_id")
    elif game_slug == "roblox":
        account(player_id, 3, 20, "player_id")
    elif not re.fullmatch(r"[A-Za-z0-9_-]{4,64}", player_id):
        raise serializers.ValidationError({"player_id": "Player ID must be 4-64 letters, numbers, underscores, or dashes."})

    if zone_id and not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", zone_id):
        raise serializers.ValidationError({"zone_id": "Zone ID may only contain letters, numbers, underscores, or dashes."})
    return player_id, zone_id


def earned_points(amount):
    amount = Decimal(amount)
    if amount <= 0:
        return 0
    return int(((amount - Decimal("0.01")) // Decimal("5000") + 1) * 10)


def point_cost(provider_usd):
    raw = Decimal(str(provider_usd)) * Decimal("4300.0") * Decimal("1.10")
    return int((raw / Decimal("100")).to_integral_value(rounding=ROUND_CEILING) * 100)


def mock_player_name(game_slug, player_id, zone_id=""):
    seed = int(hashlib.md5(f"{game_slug}-{player_id}-{zone_id}".encode()).hexdigest(), 16)
    names = {
        "mobile-legends": ["AlucardPro", "LaylaGod", "FannyGod", "TigrealKing", "GusionMain"],
        "pubg-mobile": ["SniperGhost", "PochinkiKing", "AWM_Slayer", "WinnerDinner"],
        "free-fire": ["AlokBooyah", "ChronoGod", "HeadshotOP", "RushKing"],
        "honor-of-kings": ["ZilongPrime", "HOKLegend", "TokenKing"],
        "magic-chess-gogo": ["MagicAce", "GoGoMage", "ChessHero"],
        "roblox": ["RobuxRunner", "BlockMaster", "NexusBuilder"],
    }.get(game_slug, ["GamerPro", "NexusWarrior", "AlphaZero"])
    return f"{names[seed % len(names)]}_{player_id[:4]}"


def lookup_player(game_slug, player_id, zone_id=""):
    player_id, zone_id = validate_game_identity(game_slug, player_id, zone_id)
    api_key = getattr(settings, "G2BULK_API_KEY", "") or getattr(settings, "SUPPLIER_API_KEY", "")
    base_url = getattr(settings, "SUPPLIER_API_BASE_URL", "")
    if (
        not api_key
        or api_key in {"replace-me", "mock", "mock-api-key"}
        or not base_url
        or "example.test" in base_url
        or requests is None
    ):
        return {"status": "accepted", "valid": "valid", "player_name": mock_player_name(game_slug, player_id, zone_id)}

    payload = {"game": (G2BULK_GAME_CODES.get(game_slug) or [game_slug])[0], "user_id": player_id}
    if zone_id:
        payload["server_id"] = zone_id
    response = requests.post(
        "https://api.g2bulk.com/v1/games/checkPlayerId",
        json=payload,
        headers={"X-API-Key": api_key, "Accept": "application/json"},
        timeout=15,
    )
    data = response.json() if response.content else {}
    if response.status_code < 200 or response.status_code >= 300:
        raise serializers.ValidationError(data.get("message") or data.get("detail") or "Player verification failed.")
    valid = str(data.get("valid", "")).lower()
    name = data.get("name") or data.get("username") or data.get("player_name") or ""
    return {
        "status": "accepted" if valid == "valid" else "invalid",
        "valid": valid or ("valid" if name else "invalid"),
        "player_name": name,
        "name": name,
        "message": data.get("message", ""),
    }


def redeem_points(user, reward, player_id, zone_id=""):
    validate_game_identity(reward.game.slug, player_id, zone_id)
    with transaction.atomic():
        profile = CustomerProfile.objects.select_for_update().get_or_create(user=user)[0]
        if profile.points < reward.point_cost:
            raise serializers.ValidationError("You do not have enough points.")
        profile.points -= reward.point_cost
        profile.save(update_fields=["points", "updated_at"])
        order = Order.objects.create(
            user=user,
            package=reward.package,
            player_id=clean(player_id),
            zone_id=clean(zone_id),
            payment_method="POINTS",
            quoted_price=Decimal("0.00"),
            status=Order.Status.PROCESSING,
        )
        redemption = PointRedemption.objects.create(
            order=order,
            user=user,
            reward=reward,
            points_used=reward.point_cost,
            status=PointRedemption.Status.SUBMITTED,
        )
    return redemption


def refund_redemption(order):
    try:
        redemption = order.point_redemption
    except PointRedemption.DoesNotExist:
        return False
    with transaction.atomic():
        redemption = PointRedemption.objects.select_for_update().get(pk=redemption.pk)
        if redemption.status not in {PointRedemption.Status.PROCESSING, PointRedemption.Status.SUBMITTED}:
            return False
        profile = CustomerProfile.objects.select_for_update().get_or_create(user=redemption.user)[0]
        profile.points += redemption.points_used
        profile.save(update_fields=["points", "updated_at"])
        redemption.status = PointRedemption.Status.REFUNDED
        redemption.save(update_fields=["status"])
    return True


def secret_matches(expected, supplied):
    if not supplied:
        return False
    return hmac.compare_digest(str(expected), str(supplied))


def telegram_order_caption(order):
    local_time = timezone.localtime(order.created_at).strftime("%d-%m-%Y %I:%M %p")
    package = order.package
    lines = [
        f"<b>{escape(package.game.name)} Order (#{order.id})</b>",
        "",
        f"Time : {escape(local_time)}",
        f"Package : {escape(package.title)}",
        f"Units : {escape(package.amount_label)}",
        f"Amount : {order.quoted_price} Ks",
        f"Payment : {escape(order.payment_method)}",
        f"Game ID : <code>{escape(order.player_id)}</code>",
    ]
    if order.zone_id:
        lines.append(f"Server ID : <code>{escape(order.zone_id)}</code>")
    if order.player_name:
        lines.append(f"Player Name : {escape(order.player_name)}")
    return "\n".join(lines)


def send_telegram_order_notification(order):
    token = getattr(settings, "TELEGRAM_BOT_TOKEN", "")
    chat_id = getattr(settings, "TELEGRAM_CHAT_ID", "")
    if not token or not chat_id or requests is None:
        return False

    markup = {
        "inline_keyboard": [[
            {"text": "Confirm", "callback_data": f"CONFIRM_{order.id}"},
            {"text": "Cancel", "callback_data": f"CANCEL_{order.id}"},
        ]]
    }
    base = f"https://api.telegram.org/bot{token}"
    caption = telegram_order_caption(order)
    proof = getattr(order, "payment_proof", None)
    try:
        if proof and proof.image:
            proof.image.open("rb")
            try:
                response = requests.post(
                    f"{base}/sendPhoto",
                    data={"chat_id": chat_id, "caption": caption, "parse_mode": "HTML", "reply_markup": json.dumps(markup)},
                    files={"photo": proof.image.file},
                    timeout=15,
                )
            finally:
                proof.image.close()
            if 200 <= response.status_code < 300:
                return True
        response = requests.post(
            f"{base}/sendMessage",
            json={"chat_id": chat_id, "text": caption, "parse_mode": "HTML", "reply_markup": markup},
            timeout=15,
        )
        return 200 <= response.status_code < 300
    except requests.RequestException:
        return False


def answer_telegram_callback(callback_id, text):
    token = getattr(settings, "TELEGRAM_BOT_TOKEN", "")
    if not token or not callback_id or requests is None:
        return
    try:
        requests.post(
            f"https://api.telegram.org/bot{token}/answerCallbackQuery",
            json={"callback_query_id": callback_id, "text": (text or "")[:180]},
            timeout=10,
        )
    except requests.RequestException:
        return
