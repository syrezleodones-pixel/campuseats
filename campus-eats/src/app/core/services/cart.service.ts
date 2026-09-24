import { MenuItem } from '../models/menu-item.model';
import { CartLine } from '../models/order.model';
import { Injectable, computed, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CartService {

  private lines = signal<CartLine[]>([]);

  readonly all = this.lines.asReadonly();

  readonly count = computed(() =>
    this.lines().reduce((n, l) => n + l.quantity, 0)
  );

  readonly total = computed(() =>
    this.lines().reduce((s, l) => s + l.item.price * l.quantity, 0)
  );

  add(item: MenuItem) {
    const found = this.lines().find(l => l.item.id === item.id);

    this.lines.update(ls =>
      found
        ? ls.map(l =>
            l.item.id === item.id
              ? { ...l, quantity: l.quantity + 1 }
              : l
          )
        : [...ls, { item, quantity: 1 }]
    );
  }

  /** Set an exact quantity, e.g. from the edit modal. */
  setQuantity(itemId: number, quantity: number) {
    this.lines.update(ls =>
      ls.map(l => l.item.id === itemId ? { ...l, quantity } : l)
    );
  }

  /** Removes the line and returns where it was, so it can be undone. */
  remove(line: CartLine): number {
    const index = this.lines().findIndex(l => l.item.id === line.item.id);
    this.lines.update(ls => ls.filter(l => l.item.id !== line.item.id));
    return index;
  }

  /** Puts a removed line back in its old spot (the Undo in the toast). */
  restore(line: CartLine, index: number) {
    this.lines.update(ls => {
      if (ls.some(l => l.item.id === line.item.id)) return ls;   // already re-added
      const next = [...ls];
      next.splice(Math.max(0, index), 0, line);
      return next;
    });
  }

  clear() {
    this.lines.set([]);
  }
}