import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'staff';
}

interface LoginResponse {
  token: string;
  user: User;
}

const TOKEN_KEY = 'campuseats.token';
const USER_KEY = 'campuseats.user';

@Injectable({ providedIn: 'root' }) // one singleton
export class AuthService {

  private http = inject(HttpClient);
  private api = environment.apiUrl;

  private token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private currentUser = signal<User | null>(
    JSON.parse(localStorage.getItem(USER_KEY) ?? 'null')
  );

  readonly user = this.currentUser.asReadonly();

  /** True when a stored token was restored or one was just issued. */
  isSignedIn(): boolean {
    return this.token() !== null;
  }

  signIn(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.api}/auth/login`, { email, password })
      .pipe(
        tap(res => {
          this.token.set(res.token);
          this.currentUser.set(res.user);
          localStorage.setItem(TOKEN_KEY, res.token);
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        })
      );
  }

  signOut() {
    this.token.set(null);
    this.currentUser.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}
