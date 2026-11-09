import { signal } from '@angular/core';

/**
 * The rows of a list that are open (P-24 Fila desplegable): their ids, and the one thing a screen
 * does with them, to open or close one. The table of the screen keeps one and gives `ids()` to
 * `app-data-table` (`openRows`) and to its cards, so the table and the cards agree.
 */
export class OpenRows {
  readonly ids = signal<readonly string[]>([]);

  isOpen(id: string): boolean {
    return this.ids().includes(id);
  }

  toggle(id: string): void {
    this.ids.update((open) =>
      open.includes(id) ? open.filter((item) => item !== id) : [...open, id],
    );
  }
}
