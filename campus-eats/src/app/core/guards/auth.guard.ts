import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * A guard is a plain function now -- no class, no interface to implement.
 * Returning a UrlTree redirects, instead of a blank screen.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isSignedIn() || router.createUrlTree(['/login']);
};
