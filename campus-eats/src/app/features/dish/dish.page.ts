import { Component, OnInit, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent,
  IonChip, IonButton, IonIcon, IonSkeletonText, ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, timeOutline, star } from 'ionicons/icons';
import { MenuService } from '../../core/services/menu.service';
import { CartService } from '../../core/services/cart.service';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { prefersReducedMotion } from '../../core/a11y/motion';

/**
 * One dish, full size. Reached by tapping a photo on the menu.
 * A route, not a modal: it has its own URL, so Back and deep links work.
 */
@Component({
  selector: 'app-dish',
  standalone: true,
  imports: [
    RouterLink,
    IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent,
    IonChip, IonButton, IonIcon, IonSkeletonText, ErrorStateComponent
  ],
  templateUrl: './dish.page.html',
  styleUrls: ['./dish.page.scss'],
})
export class DishPage implements OnInit {
  /** From the URL, /tabs/menu/:id (withComponentInputBinding). */
  readonly id = input.required<string>();

  menu = inject(MenuService);
  private cart = inject(CartService);
  private toastCtrl = inject(ToastController);
  private router = inject(Router);

  readonly shimmer = !prefersReducedMotion();

  /** Looked up from the list the menu already loaded -- no new endpoint. */
  dish = computed(() => this.menu.all().find(i => i.id === Number(this.id())));

  constructor() {
    addIcons({ add, timeOutline, star });
  }

  ngOnInit() {
    // Opened straight from a link or after a refresh: the list is not there yet.
    if (this.menu.all().length === 0) {
      this.menu.load();
    }
  }

  async addToCart() {
    const dish = this.dish();
    if (!dish) return;
    this.cart.add(dish);

    const toast = await this.toastCtrl.create({
      message: `${dish.name} added to cart`,
      duration: 2500,
      position: 'top',
      buttons: [{ text: 'View cart', handler: () => { this.router.navigate(['/tabs/cart']); } }],
    });
    await toast.present();
  }
}
