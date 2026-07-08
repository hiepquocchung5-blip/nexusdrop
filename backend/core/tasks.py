from celery import shared_task
from django.conf import settings
from django.db import transaction

from .models import Order, PointRedemption, award_points_for_order
from .services import G2BULK_GAME_CODES, refund_redemption

try:
    import requests
except ModuleNotFoundError:
    class _RequestsFallback:
        class RequestException(Exception):
            pass

        @staticmethod
        def post(*args, **kwargs):
            raise _RequestsFallback.RequestException("The requests package is not installed.")

    requests = _RequestsFallback()


@shared_task(bind=True, autoretry_for=(requests.RequestException, TimeoutError), retry_backoff=True, max_retries=3)
def dispatch_order_to_supplier(self, order_id):
    # 1. Quick pre-flight check of status without lock
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return None

    if order.status != Order.Status.PROCESSING:
        return order.status

    # 2. Check if we should fall back to mock execution
    base_url = settings.SUPPLIER_API_BASE_URL
    api_key = settings.SUPPLIER_API_KEY
    if not base_url or "example.test" in base_url:
        with transaction.atomic():
            order = Order.objects.select_for_update().get(id=order_id)
            if order.status != Order.Status.PROCESSING:
                return order.status
            order.supplier_reference = f"mock-{order.id}"
            order.supplier_status = "COMPLETED"
            order.status = Order.Status.COMPLETED
            order.save(update_fields=["supplier_reference", "supplier_status", "status", "updated_at"])
            award_points_for_order(order)
            if hasattr(order, "point_redemption"):
                redemption = order.point_redemption
                redemption.status = PointRedemption.Status.COMPLETED
                redemption.save(update_fields=["status"])
            return order.status

    # 3. Real HTTP API request outside of db transaction to prevent long locks
    if "g2bulk.com" in base_url:
        game_code = (G2BULK_GAME_CODES.get(order.package.game.slug) or [order.package.game.slug])[0]
        url = f"{base_url.rstrip('/')}/games/{game_code}/order"
        payload = {
            "catalogue_name": order.package.amount_label or order.package.title,
            "player_id": order.player_id,
            "remark": f"NexusDrop order {order.id}",
        }
        if order.zone_id:
            payload["server_id"] = order.zone_id
        headers = {
            "X-API-Key": api_key,
            "X-Idempotency-Key": str(order.id),
            "Content-Type": "application/json",
        }
    else:
        url = f"{base_url.rstrip('/')}/api/v1/orders"
        payload = {
            "order_id": str(order.id),
            "sku": order.package.sku,
            "player_id": order.player_id,
            "zone_id": order.zone_id,
        }
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
    if getattr(settings, "G2BULK_WEBHOOK_URL", "") and "g2bulk.com" in base_url:
        payload["callback_url"] = settings.G2BULK_WEBHOOK_URL

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15)
    except requests.RequestException:
        # Let Celery retry for network level issues or timeouts
        raise

    # 4. Save results inside a database transaction
    with transaction.atomic():
        order = Order.objects.select_for_update().get(id=order_id)
        if order.status != Order.Status.PROCESSING:
            return order.status

        if 200 <= response.status_code < 300:
            try:
                data = response.json()
                api_order = data.get("order", data)
                order.supplier_reference = str(
                    api_order.get("order_id")
                    or data.get("reference")
                    or data.get("supplier_reference")
                    or f"api-{order.id}"
                )
                order.supplier_status = api_order.get("status", data.get("status", "COMPLETED"))
                order.supplier_game_code = payload.get("game", "") or (url.split("/games/")[1].split("/")[0] if "/games/" in url else "")
                order.supplier_catalogue = payload.get("catalogue_name", "")
            except Exception:
                order.supplier_reference = f"api-{order.id}"
                order.supplier_status = "COMPLETED"
            if str(order.supplier_status).upper() == "COMPLETED":
                order.status = Order.Status.COMPLETED
            else:
                order.status = Order.Status.PROCESSING
        else:
            # 4xx client errors (bad SKU, wrong auth, etc.) mean the order fails.
            # 5xx / 429 means we should retry.
            if response.status_code in [400, 401, 403, 404]:
                order.status = Order.Status.FAILED
                try:
                    error_msg = response.json().get("detail") or response.text
                except Exception:
                    error_msg = response.text
                order.failure_reason = f"Supplier API Error: {error_msg}"
            else:
                # 429 / 5xx: raise HTTPError to trigger Celery retry
                response.raise_for_status()

        order.save(update_fields=["supplier_reference", "supplier_status", "supplier_game_code", "supplier_catalogue", "status", "failure_reason", "updated_at"])
        final_status = order.status
    if final_status == Order.Status.COMPLETED:
        award_points_for_order(order)
        if hasattr(order, "point_redemption"):
            redemption = order.point_redemption
            redemption.status = PointRedemption.Status.COMPLETED
            redemption.save(update_fields=["status"])
    elif final_status == Order.Status.FAILED:
        refund_redemption(order)
    return final_status


