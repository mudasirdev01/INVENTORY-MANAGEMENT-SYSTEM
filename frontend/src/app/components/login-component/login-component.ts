import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth-service';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Password } from 'primeng/password';

@Component({
  selector: 'app-login-component',
  standalone: true,
  imports: [FormsModule, InputText, Password, Button, Message],
  templateUrl: './login-component.html',
  styleUrl: './login-component.css',
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';

  loading = signal(false);
  errorMessage = signal('');

  onLogin(): void {
    if (!this.email.trim() || !this.password) {
      this.errorMessage.set('Email and password are required.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.authService.login(this.email.trim(), this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.loading.set(false);

        if (error.status === 401) {
          this.errorMessage.set('Invalid email or password.');
        } else {
          this.errorMessage.set('Unable to connect to the server.');
        }
      },
    });
  }
}
