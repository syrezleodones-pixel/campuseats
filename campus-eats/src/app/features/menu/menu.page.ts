import { Component, computed, inject, OnInit, signal } from '@angular/core';

import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonCard, IonCardContent, IonIcon, IonSearchbar, IonChip, IonLabel, IonGrid, IonRow, IonCol, IonSkeletonText, IonRefresher, IonRefresherContent, RefresherCustomEvent, IonPopover, PopoverController, ToastController } from '@ionic/angular';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MenuService } from '../../core/services/menu.service';
import { FoodCardComponent } from '../../shared/components/food-card/food-card.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { simulateFrom } from '../../core/http/simulate';
import { prefersReducedMotion } from '../../core/a11y/motion';
import { addIcons } from 'ionicons';
import { logOutOutline, personCircleOutline } from 'ionicons/icons';
import { Category, MenuItem } from '../../core/models/menu-item.model';

export type MenuFilter = Category | 'all';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonButton,
    IonCard,
    IonCardContent,
    IonIcon,
    IonSearchbar,
    IonLabel,
    IonGrid,
    IonRow,
    IonCol,
    IonSkeletonText,
    IonRefresher,
    IonRefresherContent,
    IonChip,
    IonPopover,
    FoodCardComponent,
    ErrorStateComponent,
    RouterLink
  ],
  templateUrl: './menu.page.html',
  styleUrls: ['./menu.page.scss']
})
export class MenuPage implements OnInit {

  menu = inject(MenuService);
  items = this.menu.all;
  cart = inject(CartService);
  auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private popoverCtrl = inject(PopoverController);
  private toastCtrl = inject(ToastController);

  constructor() {
    addIcons({ logOutOutline, personCircleOutline });
  }

  /** "Ana Cruz" -> "AC", for the avatar in the header. */
  initials = computed(() =>
    (this.auth.user()?.name ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('')
  );

  /** Low stakes -- signing back in is easy -- so no "Are you sure?". */
  async signOut() {
    await this.popoverCtrl.dismiss();
    this.auth.signOut();
    const toast = await this.toastCtrl.create({
      message: 'Signed out. Sign in again to see your orders.',
      duration: 2500,
      position: 'top',
    });
    await toast.present();
  }

  /** Placeholder rows shown while the menu loads. */
  readonly skeletons = [1, 2, 3, 4, 5, 6];

  /** The shimmer is decoration; drop it when the user asked for less motion. */
  readonly shimmer = !prefersReducedMotion();

  /** Pull-to-refresh: re-run the request, then tell Ionic we are done. */
  protected async refresh(event: RefresherCustomEvent): Promise<void> {
    await this.menu.reload();
    await event.target.complete();
  }

  readonly filters: MenuFilter[] = ['all', 'rice', 'noodles', 'snacks', 'drinks', 'desserts'];

  searchQuery = signal('');
  activeFilter = signal<MenuFilter>('all');

  filteredItems = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const filter = this.activeFilter();

    return this.items().filter(item => {
      const matchesCategory = filter === 'all' || item.category === filter;
      const matchesSearch = !query
        || item.name.toLowerCase().includes(query)
        || item.description.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  });

  /** Why the list is empty, in words: "zzz" in Rice. */
  emptyReason = computed(() => {
    const query = this.searchQuery().trim();
    const filter = this.activeFilter();
    const where = filter === 'all' ? '' : ` in ${this.label(filter)}`;
    return query ? `"${query}"${where}` : `anything${where}`;
  });

  clearFilters() {
    this.searchQuery.set('');
    this.activeFilter.set('all');
  }

  label(filter: MenuFilter): string {
    return filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1);
  }

  setFilter(filter: MenuFilter) {
    this.activeFilter.set(filter);
  }

  /** Filter chips act as buttons — make them operable by keyboard too. */
  onChipKeydown(event: KeyboardEvent, filter: MenuFilter) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.setFilter(filter);
    }
  }

  onSearchInput(event: Event) {
    const value = (event.target as HTMLIonSearchbarElement).value ?? '';
    this.searchQuery.set(value);
  }

  addToCart(item: MenuItem) {
    this.cart.add(item);
  }

  ngOnInit() {
    // Forward ?delay= and ?fail= from the page URL, so states can be tested on demand.
    this.menu.load(simulateFrom(this.route.snapshot.queryParamMap));
  }
}