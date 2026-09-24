import { Component, input, output } from '@angular/core';
import { IonButton } from '@ionic/angular';

@Component({
    selector: 'app-error-state',
    standalone: true,
    imports: [IonButton],
    templateUrl: './error-state.html',
})
export class ErrorStateComponent {
    /** Optional overrides; the defaults suit most list pages. */
    readonly title = input('Unable to load');
    readonly message = input("We couldn't reach the canteen right now. Please try again.");

    /** The parent decides what "try again" means. */
    readonly retry = output<void>();
}
