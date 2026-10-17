import { Pipe, PipeTransform } from '@angular/core';
import { DateValue, formatDisplayDate } from './date-utils';

@Pipe({ name: 'displayDate', standalone: true })
export class DisplayDatePipe implements PipeTransform {
  transform(value: DateValue): string {
    return formatDisplayDate(value);
  }
}
