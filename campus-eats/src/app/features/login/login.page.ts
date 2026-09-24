import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton,
  IonInput, IonIcon
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBack } from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton,
    IonInput, IonIcon
  ],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss']
})
export class LoginPage {

  constructor() {
    addIcons({ arrowBack });
  }

  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  error = signal('');
  busy = signal(false);

  submit() {
    this.busy.set(true);
    this.error.set('');

    this.auth.signIn(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/tabs/orders'], { replaceUrl: true }),
      error: () => {
        this.error.set('Wrong email or password.');
        this.busy.set(false);
      }
    });
  }
}
