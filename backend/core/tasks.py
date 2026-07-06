from celery import shared_task
from django.db import transaction

from .models import Order


@shared_task(bind=True, autoretry_for=(TimeoutError,), retry_backoff=True, max_retries=3)
def dispatch_order_to_supplier(self, order_id):
    with transaction.atomic():
        order = Order.objects.select_for_update().get(id=order_id)
        if order.status != Order.Status.PROCESSING:
            return order.status

        # Replace this stub with the selected supplier client after credentials and rate limits are known.
        order.supplier_reference = f"mock-{order.id}"
        order.status = Order.Status.COMPLETED
        order.save(update_fields=["supplier_reference", "status", "updated_at"])
        return order.status

