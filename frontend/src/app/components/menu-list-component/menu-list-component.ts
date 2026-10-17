import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth-service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-menu-list',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './menu-list-component.html',
  styleUrl: './menu-list-component.scss',
})
export class MenuListComponent implements OnInit {
  private authService = inject(AuthService);
  @Input() collapsed = false;
  @Output() itemSelected = new EventEmitter<void>();
  readonly isAdmin = signal(false);

  readonly menuItems: MenuItem[] = [
    { label: 'Dashboard', icon: 'pi pi-home', route: '/dashboard' },
    { label: 'Products', icon: 'pi pi-box', route: '/dashboard/products' },
    { label: 'Categories', icon: 'pi pi-tags', route: '/dashboard/categories' },
    { label: 'Inventory', icon: 'pi pi-chart-bar', route: '/dashboard/inventory' },
    { label: 'Customers', icon: 'pi pi-users', route: '/dashboard/customers' },
    { label: 'Sales Orders', icon: 'pi pi-shopping-cart', route: '/dashboard/orders' },
    { label: 'Billing', icon: 'pi pi-wallet', route: '/dashboard/billing' },
  ];

  ngOnInit(): void {
    this.authService.getProfile().subscribe({
      next: (profile) => this.isAdmin.set(profile.role === 'admin'),
    });
  }
}
