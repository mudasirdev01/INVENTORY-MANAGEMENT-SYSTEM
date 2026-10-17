import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { finalize } from 'rxjs';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { Category } from '../../../core/interfaces/category.interface';
import { Product, ProductPayload } from '../../../core/interfaces/product.interface';
import { CategoryService } from '../../../core/services/category-service';
import { ProductService } from '../../../core/services/product-service';

interface ProductForm {
  code: string;
  name: string;
  description: string;
  category: number | null;
  unit_price: number | null;
  is_active: boolean;
}

@Component({
  selector: 'app-product-add-edit-component',
  standalone: true,
  imports: [Button, Dialog, FormsModule, InputNumber, InputText, Select, Textarea],
  templateUrl: './product-add-edit-component.html',
  styleUrl: './product-add-edit-component.css',
})
export class ProductAddEditComponent implements OnInit, OnChanges {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  @Input() visible = false;
  @Input() product: Product | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<string>();

  categories = signal<Category[]>([]);
  saving = signal(false);
  formError = signal('');
  form: ProductForm = this.emptyForm();
  readonly statusOptions = [
    { label: 'Active', value: true },
    { label: 'Inactive', value: false },
  ];

  ngOnInit(): void {
    const params = new HttpParams()
      .set('page_size', '100')
      .set('is_active', 'true')
      .set('ordering', 'name');
    this.categoryService
      .getCategories(params)
      .subscribe({ next: (response) => this.categories.set(response.results) });
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['product'])
      this.form = this.product
        ? {
            code: this.product.code,
            name: this.product.name,
            description: this.product.description,
            category: this.product.category,
            unit_price: Number(this.product.unit_price),
            is_active: this.product.is_active,
          }
        : this.emptyForm();
    if (changes['visible']?.currentValue) this.formError.set('');
  }
  close(): void {
    if (!this.saving()) this.visibleChange.emit(false);
  }
  save(): void {
    if (!this.isValid()) return;
    const payload: ProductPayload = {
      code: this.form.code.trim(),
      name: this.form.name.trim(),
      description: this.form.description.trim(),
      category: this.form.category as number,
      unit_price: this.form.unit_price as number,
      is_active: this.form.is_active,
    };
    const request = this.product
      ? this.productService.updateProduct(this.product.id, payload)
      : this.productService.createProduct(payload);
    this.saving.set(true);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => this.saved.emit(this.product ? 'Product updated.' : 'Product created.'),
      error: (error) => this.formError.set(this.apiError(error)),
    });
  }
  private isValid(): boolean {
    if (
      !this.form.code.trim() ||
      !this.form.name.trim() ||
      !this.form.category ||
      this.form.unit_price === null ||
      this.form.unit_price < 0.01
    ) {
      this.formError.set('Code, name, category, and a price of at least 0.01 are required.');
      return false;
    }
    this.formError.set('');
    return true;
  }
  private emptyForm(): ProductForm {
    return {
      code: '',
      name: '',
      description: '',
      category: null,
      unit_price: null,
      is_active: true,
    };
  }
  private apiError(error: HttpErrorResponse): string {
    const body = error.error as Record<string, string | string[]> | undefined;
    const first = body ? Object.values(body)[0] : null;
    return first ? (Array.isArray(first) ? first[0] : first) : 'Unable to save product.';
  }
}
