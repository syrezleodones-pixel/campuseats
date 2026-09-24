import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MenuItem } from '../models/menu-item.model';
import { SimulateOptions, simulateParams } from '../http/simulate';

@Injectable({ providedIn: 'root' })   // one singleton
export class MenuService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  private items = signal<MenuItem[]>([]);
  private busy = signal(false);
  private failed = signal(false);
  private lastOptions: SimulateOptions = {};

  readonly all = this.items.asReadonly();
  readonly loading = this.busy.asReadonly();
  readonly error = this.failed.asReadonly();

  /** Resolves when the request settles (success or failure), never rejects. */
  async load(options: SimulateOptions = {}): Promise<void> {
    this.lastOptions = options;
    this.busy.set(true);
    this.failed.set(false);

    try {
      this.items.set(await firstValueFrom(
        this.http.get<MenuItem[]>(`${this.api}/menu`, { params: simulateParams(options) })
      ));
    } catch {
      this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }

  /** Same options as the last load. One method behind retry, "Check again" and pull-to-refresh. */
  reload(): Promise<void> {
    return this.load(this.lastOptions);
  }
}
