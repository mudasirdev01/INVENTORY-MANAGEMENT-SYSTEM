import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { Category, CategoryPayload } from '../../../core/interfaces/category.interface';
import { CategoryService } from '../../../core/services/category-service';

interface CategoryForm {
  name: string;
  description: string;
  is_active: boolean;
}

@Component({
  selector: 'app-category-add-edit-component',
  standalone: true,
  imports: [Button, Dialog, FormsModule, InputText, Select, Textarea],
  templateUrl: './category-add-edit-component.html',
  styleUrl: './category-add-edit-component.css',
})
export class CategoryAddEditComponent implements OnChanges {
  private categoryService = inject(CategoryService);
  @Input() visible = false;
  @Input() category: Category | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<string>();
  saving = signal(false);
  formError = signal('');
  form: CategoryForm = this.emptyForm();
  readonly statusOptions = [
    { label: 'Active', value: true },
    { label: 'Inactive', value: false },
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['category'])
      this.form = this.category
        ? {
            name: this.category.name,
            description: this.category.description,
            is_active: this.category.is_active,
          }
        : this.emptyForm();
    if (changes['visible']?.currentValue) this.formError.set('');
  }
  close(): void {
    if (!this.saving()) this.visibleChange.emit(false);
  }
  save(): void {
    if (!this.form.name.trim()) {
      this.formError.set('Category name is required.');
      return;
    }
    const payload: CategoryPayload = {
      name: this.form.name.trim(),
      description: this.form.description.trim(),
      is_active: this.form.is_active,
    };
    const request = this.category
      ? this.categoryService.updateCategory(this.category.id, payload)
      : this.categoryService.createCategory(payload);
    this.saving.set(true);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => this.saved.emit(this.category ? 'Category updated.' : 'Category created.'),
      error: (error) => this.formError.set(this.apiError(error)),
    });
  }
  private emptyForm(): CategoryForm {
    return { name: '', description: '', is_active: true };
  }
  private apiError(error: HttpErrorResponse): string {
    const body = error.error as Record<string, string | string[]> | undefined;
    const first = body ? Object.values(body)[0] : null;
    return first ? (Array.isArray(first) ? first[0] : first) : 'Unable to save category.';
  }
}
