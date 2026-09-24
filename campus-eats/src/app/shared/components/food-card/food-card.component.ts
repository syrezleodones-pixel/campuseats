import { MenuItem } from '../../../core/models/menu-item.model';
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonCard, IonChip, IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add } from 'ionicons/icons';

@Component({
    selector: 'app-food-card',
    standalone: true,
    imports: [
        IonCard,
        IonChip,
        IonButton,
        IonIcon,
        RouterLink
    ],
    templateUrl: './food-card.html',
    styleUrls: ['./food-card.scss'],
})
export class FoodCardComponent {
    constructor() {
        addIcons({ add });
    }

    /**
     * input() and output() replace the @Input and @Output
     * decorators. input.required() means the compiler
     * rejects <app-food-card /> with no item passed.
     */
    readonly item = input.required<MenuItem>(); // signal input — data down (read as item())

    /** A typed emitter, with no EventEmitter import. */
    readonly added = output<MenuItem>(); // events up
}
    // menu.page.html — the parent decides what happens