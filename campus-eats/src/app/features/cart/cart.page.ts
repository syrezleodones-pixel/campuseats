import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import {
    IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonInput, IonIcon,
    LoadingController, ModalController, ToastController
} from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { createOutline, trashOutline } from 'ionicons/icons';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { CartLine, NewOrder } from '../../core/models/order.model';
import { simulateFrom } from '../../core/http/simulate';
import { EditLineModal } from './edit-line.modal';

@Component({
    selector: 'app-cart',
    standalone: true,
    imports: [
        FormsModule,
        IonContent,
        IonHeader,
        IonTitle,
        IonToolbar,
        IonButton,
        IonInput,
        IonIcon,
        RouterLink
    ],
    templateUrl: './cart.page.html',
    styleUrls: ['./cart.page.scss']
})
export class CartPage {

    constructor() {
        addIcons({ createOutline, trashOutline });
    }

    cart = inject(CartService);
    orders = inject(OrderService);
    private router = inject(Router);
    private auth = inject(AuthService);
    private route = inject(ActivatedRoute);
    private loadingCtrl = inject(LoadingController);
    private toastCtrl = inject(ToastController);
    private modalCtrl = inject(ModalController);

    customerName = '';
    roomOrStall = '';

    /** ion-modal: a focused sub-task that returns you to the cart. */
    async edit(line: CartLine) {
        const modal = await this.modalCtrl.create({
            component: EditLineModal,
            componentProps: { line },
            // Robust: a screen reader announces "Edit Halo-Halo, dialog", not just "dialog".
            htmlAttributes: { 'aria-label': `Edit ${line.item.name}` },
        });
        await modal.present();

        const { data, role } = await modal.onWillDismiss<number>();
        if (role === 'save' && data) {
            this.cart.setQuantity(line.item.id, data);
        }
    }

    /** Undo: reverse it instead of asking "Are you sure?" first. */
    async remove(line: CartLine) {
        const index = this.cart.remove(line);

        const toast = await this.toastCtrl.create({
            message: `Removed ${line.item.name}`,
            duration: 4000,
            position: 'top',
            buttons: [
                { text: 'Undo', handler: () => this.cart.restore(line, index) },
            ],
        });
        await toast.present();
    }

    async place() {
        if (!this.customerName.trim() || !this.roomOrStall.trim()) {
            await this.toast('Please enter your name and room or stall.', 'warning');
            return;
        }

        const draft: NewOrder = {
            customerName: this.customerName.trim(),
            roomOrStall: this.roomOrStall.trim(),
            lines: this.cart.all().map(l => ({
                itemId: l.item.id,
                quantity: l.quantity
            }))
        };

        // ion-loading: shows the app is working, so nobody taps Place Order five times.
        const loader = await this.loadingCtrl.create({ message: 'Placing the order…' });
        await loader.present();

        try {
            const order = await this.orders.place(draft, simulateFrom(this.route.snapshot.queryParamMap));
            this.cart.clear();
            this.customerName = '';
            this.roomOrStall = '';
            await this.buzz();
            // Success: confirm, then point at what is next.
            if (this.auth.isSignedIn()) {
                await this.toast(`Order ${order.reference} placed. Track it here in Orders.`, 'success');
                this.router.navigate(['/tabs/orders']);
            } else {
                // Ordering needs no account (three-tap rule, slide 22); only Orders is guarded.
                // So stay on the menu instead of bouncing into the sign-in page.
                await this.signInToTrack(order.reference);
                this.router.navigate(['/tabs/menu']);
            }
        } catch (err) {
            await this.toast(this.describe(err), 'danger');
        } finally {
            // Dismiss in finally, always -- or a failed request leaves the spinner up forever.
            await loader.dismiss();
        }
    }

    /**
     * Understandable: say what actually went wrong. The API explains 4xx errors
     * in plain words ("'Halo-Halo' is sold out."); anything else is the network.
     */
    private describe(err: unknown): string {
        if (err instanceof HttpErrorResponse && err.status >= 400 && err.status < 500
            && typeof err.error?.detail === 'string') {
            return err.error.detail;
        }
        return 'Could not reach the canteen. Check your connection and try again.';
    }

    /**
     * A light buzz confirms the order without using a single pixel.
     * On a phone it vibrates; browsers without the vibrate API throw, so we swallow that.
     */
    private async buzz() {
        try {
            await Haptics.impact({ style: ImpactStyle.Medium });
        } catch {
            // No haptics here -- the toast still confirms it.
        }
    }

    /** Signed-out success: confirm the order, and offer sign-in as the next step. */
    private async signInToTrack(reference: string) {
        const toast = await this.toastCtrl.create({
            message: `Order ${reference} placed. Sign in to track it in Orders.`,
            color: 'success',
            duration: 5000,
            position: 'top',
            buttons: [{ text: 'Sign in', handler: () => { this.router.navigate(['/login']); } }],
        });
        await toast.present();
    }

    /** ion-toast: ambient, auto-dismisses, never blocks. */
    private async toast(message: string, color: 'success' | 'warning' | 'danger') {
        const toast = await this.toastCtrl.create({
            message,
            color,
            duration: 2500,
            position: 'top',
        });
        await toast.present();
    }
}
