import { Component, OnInit, inject, signal } from '@angular/core';
import {
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonIcon, ModalController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, removeOutline } from 'ionicons/icons';
import { CartLine } from '../../core/models/order.model';

/**
 * A focused sub-task: change one line, then return to the cart.
 * Dismisses with role 'save' and the new quantity, or role 'cancel'.
 */
@Component({
    selector: 'app-edit-line-modal',
    standalone: true,
    imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonIcon],
    templateUrl: './edit-line.modal.html',
    styleUrls: ['./edit-line.modal.scss'],
})
export class EditLineModal implements OnInit {
    private modal = inject(ModalController);

    /** Set through componentProps, so a plain property, not input(). */
    line!: CartLine;

    quantity = signal(1);

    constructor() {
        addIcons({ addOutline, removeOutline });
    }

    ngOnInit() {
        this.quantity.set(this.line.quantity);
    }

    change(by: number) {
        this.quantity.update(q => Math.min(50, Math.max(1, q + by)));
    }

    cancel() {
        this.modal.dismiss(null, 'cancel');
    }

    save() {
        this.modal.dismiss(this.quantity(), 'save');
    }
}
