import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonSkeletonText,
  ToastController
} from '@ionic/angular';

import { OrderService } from '../../core/services/order.service';
import { Order } from '../../core/models/order.model';
import { simulateFrom } from '../../core/http/simulate';
import { prefersReducedMotion } from '../../core/a11y/motion';

@Component({
  selector: 'app-order',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonSkeletonText
  ],
  templateUrl: './order.page.html',
  styleUrls: ['./order.page.scss']
})
export class OrderPage {

  orders = inject(OrderService);
  private route = inject(ActivatedRoute);
  private toastCtrl = inject(ToastController);

  /** Placeholder cards while orders load; no shimmer when less motion is asked for. */
  readonly skeletons = [1, 2, 3];
  readonly shimmer = !prefersReducedMotion();

  ionViewWillEnter() {
    this.orders.reload();
  }

  /**
   * Undo beats "Are you sure?". A confirm dialog interrupts everyone to
   * catch a rare mistake; undo interrupts nobody and still rescues it.
   */
  protected async cancel(order: Order): Promise<void> {
    this.orders.hide(order);

    const toast = await this.toastCtrl.create({
      message: `Order ${order.reference} cancelled`,
      duration: 4000,
      position: 'top',
      buttons: [
        { text: 'Undo', handler: () => this.orders.restore(order) },
      ],
    });
    await toast.present();
    await toast.onDidDismiss();

    // Only now, if nobody pressed Undo, does the server hear about it.
    if (this.orders.isHidden(order)) {
      try {
        await this.orders.confirmDelete(order, simulateFrom(this.route.snapshot.queryParamMap));
      } catch {
        await this.toast(`Could not cancel ${order.reference}. It's back in your list.`, 'danger');
      }
    }
  }

  private async toast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastCtrl.create({ message, color, duration: 2500, position: 'top' });
    await toast.present();
  }
}
