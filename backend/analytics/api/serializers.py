from rest_framework import serializers


class DashboardSummarySerializer(serializers.Serializer):
    products_count = serializers.IntegerField()
    customers_count = serializers.IntegerField()
    orders_count = serializers.IntegerField()
    stock_items_count = serializers.IntegerField()
    low_stock_count = serializers.IntegerField()
    dispatched_sales_total = serializers.DecimalField(max_digits=18, decimal_places=2)
    payments_received_total = serializers.DecimalField(max_digits=18, decimal_places=2)
    outstanding_balance = serializers.DecimalField(max_digits=18, decimal_places=2)


class MonthlySalesSerializer(serializers.Serializer):
    month = serializers.CharField()
    sales_total = serializers.DecimalField(max_digits=18, decimal_places=2)
    order_count = serializers.IntegerField()


class TopProductSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    code = serializers.CharField()
    name = serializers.CharField()
    quantity_sold = serializers.IntegerField()
    sales_total = serializers.DecimalField(max_digits=18, decimal_places=2)


class RecentOrderSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    order_number = serializers.CharField()
    customer_name = serializers.CharField()
    status = serializers.CharField()
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    created_at = serializers.DateTimeField()


class LowStockSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    code = serializers.CharField()
    name = serializers.CharField()
    physical_quantity = serializers.IntegerField()
    reserved_quantity = serializers.IntegerField()
    available_quantity = serializers.IntegerField()
    reorder_level = serializers.IntegerField()
