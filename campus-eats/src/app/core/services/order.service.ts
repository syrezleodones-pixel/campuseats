import { Injectable, computed, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { NewOrder, Order } from '../models/order.model';
import { SimulateOptions, simulateParams } from '../http/simulate';

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  private http = inject(HttpClient);

  private apiUrl = `${environment.apiUrl}/orders`;

  private list = signal<Order[]>([]);
  private busy = signal(false);
  /** Orders waiting out their undo window: gone from the UI, not yet from the server. */
  private hidden = signal<ReadonlySet<string>>(new Set());

  readonly loading = this.busy.asReadonly();

  /** What the page shows: every order except the ones being cancelled. */
  readonly visible = computed(() =>
    this.list().filter(o => !this.hidden().has(o.id))
  );

  /** A Promise, so the page can await it inside try / catch / finally. */
  place(order: NewOrder, options: SimulateOptions = {}): Promise<Order> {
    return firstValueFrom(
      this.http.post<Order>(this.apiUrl, order, { params: simulateParams(options) })
    );
  }

  reload() {
    this.busy.set(true);
    this.http.get<Order[]>(this.apiUrl).subscribe({
      next: orders => { this.list.set(orders); this.busy.set(false); },
      error: () => { this.list.set([]); this.busy.set(false); },
    });
  }

  /** Optimistic: drop it from the UI at once, so the app feels instant. */
  hide(order: Order) {
    this.hidden.update(ids => new Set(ids).add(order.id));
  }

  /** The Undo button -- or cleanup once the server has answered. */
  restore(order: Order) {
    this.hidden.update(ids => {
      const next = new Set(ids);
      next.delete(order.id);
      return next;
    });
  }

  isHidden(order: Order): boolean {
    return this.hidden().has(order.id);
  }

  /** Called only after the undo window closes without an undo. */
  async confirmDelete(order: Order, options: SimulateOptions = {}): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete<void>(`${this.apiUrl}/${order.id}`, { params: simulateParams(options) })
      );
    } finally {
      // Success: the reload no longer has it. Failure: it comes back into view.
      this.restore(order);
      this.reload();
    }
  }
}
