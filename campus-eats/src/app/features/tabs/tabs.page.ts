import { Component, inject } from '@angular/core';
import {
    IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge, IonRouterOutlet
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { restaurantOutline, cartOutline, receiptOutline } from 'ionicons/icons';
import { CartService } from '../../core/services/cart.service';

@Component({
    selector: 'app-tabs',
    standalone: true,
    imports: [
        IonTabs,
        IonTabBar,
        IonTabButton,
        IonIcon,
        IonLabel,
        IonBadge,
        IonRouterOutlet
    ],
    templateUrl: './tabs.page.html',
    styleUrls: ['./tabs.page.scss'],
})
export class TabsPage {
    cart = inject(CartService);

    constructor() {
        // Register the tab icons locally (no CDN needed).
        addIcons({ restaurantOutline, cartOutline, receiptOutline });
    }
}