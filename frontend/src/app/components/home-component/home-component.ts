import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { Avatar } from 'primeng/avatar';
import { Button } from 'primeng/button';
import { Divider } from 'primeng/divider';
import { Menu } from 'primeng/menu';
import { AuthService } from '../../core/services/auth-service';
import { MenuListComponent } from '../menu-list-component/menu-list-component';
import { FooterComponent } from '../footer-component/footer-component';

@Component({
  selector: 'app-home-component',
  standalone: true,
  imports: [Avatar, Button, Divider, Menu, FooterComponent, RouterOutlet, MenuListComponent],
  templateUrl: './home-component.html',
  styleUrl: './home-component.css',
})
export class HomeComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);

  sidebarCollapsed = false;
  loggingOut = false;

  ngOnInit(): void {
    this.authService.getProfile().subscribe();
  }

  displayName(): string {
    const profile = this.authService.profile();
    const fullName = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim();
    return fullName || profile?.email?.split('@')[0] || 'User';
  }

  workspaceLabel(): string {
    const labels: Record<string, string> = {
      admin: 'Admin',
      inventory_manager: 'Inventory Manager',
      sales_executive: 'Sales Executive',
      accountant: 'Accountant',
    };
    return labels[this.authService.profile()?.role ?? ''] ?? 'User';
  }

  avatarLabel(): string {
    return this.displayName().charAt(0).toUpperCase();
  }

  userMenuItems: MenuItem[] = [
    {
      label: 'Sign out',
      icon: 'pi pi-sign-out',
      command: () => this.confirmLogout(),
    },
  ];

  confirmLogout(): void {
    this.confirmationService.confirm({
      header: 'Sign out?',
      message: 'Your current session will be closed.',
      icon: 'pi pi-info-circle',
      rejectLabel: 'Stay signed in',
      acceptLabel: 'Sign out',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.logout(),
    });
  }

  logout(): void {
    if (this.loggingOut) return;

    this.loggingOut = true;
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
