from products.api.pagination import CatalogPagination


class InventoryPagination(CatalogPagination):
    page_size = 20
