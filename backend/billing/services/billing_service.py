from django.db import IntegrityError, transaction
from django.db.models import Sum
from rest_framework.exceptions import ValidationError

from billing.models import Invoice, InvoiceItem, Payment
from orders.models import SalesOrder


def create_invoice_for_order(order_id):
    with transaction.atomic():
        order = SalesOrder.objects.select_for_update().prefetch_related(
            "items__product"
        ).get(pk=order_id)

        if order.status != SalesOrder.Status.DISPATCHED:
            raise ValidationError({
                "order": "Invoices can only be created for dispatched orders."
            })
        if Invoice.objects.filter(order=order).exists():
            raise ValidationError({"order": "An invoice already exists for this order."})

        try:
            invoice = Invoice.objects.create(
                order=order,
                total_amount=order.total_amount,
            )
        except IntegrityError as error:
            raise ValidationError(
                {"order": "An invoice already exists for this order."}
            ) from error

        InvoiceItem.objects.bulk_create([
            InvoiceItem(
                invoice=invoice,
                product_code=item.product.code,
                product_name=item.product.name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                line_total=item.line_total,
            )
            for item in order.items.all()
        ])

    return invoice


def record_payment(invoice_id, payment_data, user):
    with transaction.atomic():
        invoice = Invoice.objects.select_for_update().get(pk=invoice_id)
        amount = payment_data["amount"]
        paid = invoice.payments.aggregate(total=Sum("amount"))["total"] or 0
        outstanding = invoice.total_amount - paid

        if amount > outstanding:
            raise ValidationError({
                "amount": f"Payment cannot exceed outstanding balance ({outstanding})."
            })

        payment = Payment.objects.create(
            invoice=invoice,
            created_by=user,
            **payment_data,
        )

    return payment
