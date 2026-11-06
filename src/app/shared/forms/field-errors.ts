import { signal } from '@angular/core';

/** Field errors supplied by the server, kept until the corresponding value changes. */
export class FieldErrors<K extends string = string> {
  readonly values = signal<Readonly<Partial<Record<K, string>>>>({} as Partial<Record<K, string>>);

  clear(...fields: K[]): void {
    const errors = this.values();
    if (fields.some((field) => field in errors)) {
      this.values.set(
        Object.fromEntries(
          Object.entries(errors).filter(([key]) => !fields.some((field) => field === key)),
        ) as Partial<Record<K, string>>,
      );
    }
  }

  /** Indexed errors no longer name the same rows after a row is removed. */
  clearPrefix(prefix: string): void {
    const fields = Object.keys(this.values()).filter((field) => field.startsWith(prefix)) as K[];
    this.clear(...fields);
  }
}
