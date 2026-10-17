from django.db import transaction
from django.db.models import F
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError

from inventory.models import Stock, StockTransaction
from orders.models import SalesOrder
from products.models import Product


def _locked_items_and_stock(order):
    items = list(order.items.select_related("product").order_by("product_id"))
    product_ids = [item.product_id for item in items]

    list(Product.objects.select_for_update().filter(id__in=product_ids).order_by("id"))
    stocks = {
        stock.product_id: stock
        for stock in Stock.objects.select_for_update().filter(product_id__in=product_ids)
    }

    for item in items:
        stock = stocks.get(item.product_id)
        if stock is None:
            stock = Stock.objects.create(product_id=item.product_id)
            stocks[item.product_id] = stock

    return items, stocks


def _confirm_order(order):
    if order.status != SalesOrder.Status.PENDING:
        raise ValidationError("Only pending orders can be confirmed.")

    items, stocks = _locked_items_and_stock(order)
    for item in items:
        stock = stocks[item.product_id]
        if item.quantity > stock.available_quantity:
            raise ValidationError({
                "stock": (
                    f"Insufficient available stock for {item.product.code}. "
                    f"Available: {stock.available_quantity}."
                )
            })

    for item in items:
        stock = stocks[item.product_id]
        stock.reserved_quantity = F("reserved_quantity") + item.quantity
        stock.save(update_fields=["reserved_quantity", "updated_at"])

    order.status = SalesOrder.Status.CONFIRMED
    order.save(update_fields=["status", "updated_at"])


def _dispatch_order(order, user):
    if order.status != SalesOrder.Status.CONFIRMED:
        raise ValidationError("Only confirmed orders can be dispatched.")

    items, stocks = _locked_items_and_stock(order)
    for item in items:
        stock = stocks[item.product_id]
        if item.quantity > stock.physical_quantity or item.quantity > stock.reserved_quantity:
            raise ValidationError({
                "stock": f"Reserved stock is no longer available for {item.product.code}."
            })

    for item in items:
        stock = stocks[item.product_id]
        stock.physical_quantity = F("physical_quantity") - item.quantity
        stock.reserved_quantity = F("reserved_quantity") - item.quantity
        stock.save(update_fields=["physical_quantity", "reserved_quantity", "updated_at"])
        StockTransaction.objects.create(
            stock=stock,
            transaction_type=StockTransaction.TransactionType.OUT,
            quantity=item.quantity,
            reason=f"Dispatch order {order.order_number}",
            reference=order.order_number,
            created_by=user,
        )

    order.status = SalesOrder.Status.DISPATCHED
    order.save(update_fields=["status", "updated_at"])


def _cancel_order(order):
    if order.status not in (SalesOrder.Status.PENDING, SalesOrder.Status.CONFIRMED):
        raise ValidationError("Only pending or confirmed orders can be cancelled.")

    if order.status == SalesOrder.Status.CONFIRMED:
        items, stocks = _locked_items_and_stock(order)
        for item in items:
            stock = stocks[item.product_id]
            if item.quantity > stock.reserved_quantity:
                raise ValidationError({
                    "stock": f"Reservation is no longer available for {item.product.code}."
                })

        for item in items:
            stock = stocks[item.product_id]
            stock.reserved_quantity = F("reserved_quantity") - item.quantity
            stock.save(update_fields=["reserved_quantity", "updated_at"])

    order.status = SalesOrder.Status.CANCELLED
    order.save(update_fields=["status", "updated_at"])


def change_order_status(order_id, target_status, user):
    with transaction.atomic():
        order = get_object_or_404(
            SalesOrder.objects.select_for_update().select_related("customer"),
            pk=order_id,
        )

        if target_status == SalesOrder.Status.CONFIRMED:
            _confirm_order(order)
        elif target_status == SalesOrder.Status.DISPATCHED:
            _dispatch_order(order, user)
        elif target_status == SalesOrder.Status.CANCELLED:
            _cancel_order(order)

        order.refresh_from_db()

    return order
