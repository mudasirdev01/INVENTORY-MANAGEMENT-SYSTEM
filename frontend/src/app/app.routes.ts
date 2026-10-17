import { Routes } from '@angular/router';
import { LoginComponent } from './components/login-component/login-component';
import { authGuard } from './core/auth-guard-guard';
import { adminGuard } from './core/admin-guard';


export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/home-component/home-component')
      .then(component => component.HomeComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./components/dashboard-component/dashboard-component')
          .then(component => component.DashboardComponent)
      },
      {
        path: 'products',
        loadComponent: () => import('./components/products/product-list-component/product-list-component')
          .then(component => component.ProductListComponent)
      },
      {
        path: 'categories',
        loadComponent: () => import('./components/categories/category-list-component/category-list-component')
          .then(component => component.CategoryListComponent)
      },
      {
        path: 'inventory',
        loadComponent: () => import('./components/inventory/inventory-list-component/inventory-list-component')
          .then(component => component.InventoryListComponent)
      },
      {
        path: 'customers',
        loadComponent: () => import('./components/customers/customer-list-component/customer-list-component')
          .then(component => component.CustomerListComponent)
      },
      {
        path: 'orders',
        loadComponent: () => import('./components/orders/order-list-component/order-list-component')
          .then(component => component.OrderListComponent)
      },
      {
        path: 'billing',
        loadComponent: () => import('./components/billing/invoice-list-component/invoice-list-component')
          .then(component => component.InvoiceListComponent)
      },
      {
        path: 'employees',
        loadComponent: () => import('./components/employees/employee-list-component/employee-list-component')
          .then(component => component.EmployeeListComponent),
        canActivate: [adminGuard]
      }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
