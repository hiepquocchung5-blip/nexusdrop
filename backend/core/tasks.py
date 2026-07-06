import requests
from celery import shared_task
from django.conf import settings
from django.db import transaction

from .models import Order


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
            order.status = Order.Status.COMPLETED
            order.save(update_fields=["supplier_reference", "status", "updated_at"])
            return order.status

    # 3. Real HTTP API request outside of db transaction to prevent long locks
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
                order.supplier_reference = data.get("reference") or data.get("supplier_reference") or f"api-{order.id}"
            except Exception:
                order.supplier_reference = f"api-{order.id}"
            order.status = Order.Status.COMPLETED
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

        order.save(update_fields=["supplier_reference", "status", "failure_reason", "updated_at"])
        return order.status


