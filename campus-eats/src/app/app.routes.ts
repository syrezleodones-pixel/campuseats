import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'tabs',
    loadComponent: () =>
      import('./features/tabs/tabs.page').then(m => m.TabsPage),
    children: [
      {
        path: 'menu',
        loadComponent: () =>
          import('./features/menu/menu.page').then(m => m.MenuPage),
      },
      {
        // Tap a dish photo on the menu. Under "menu", so the Menu tab stays lit.
        path: 'menu/:id',
        loadComponent: () =>
          import('./features/dish/dish.page').then(m => m.DishPage),
      },
      {
        path: 'cart',
        loadComponent: () =>
          import('./features/cart/cart.page').then(m => m.CartPage),
      },
      {
        path: 'orders',
        // Signed-in users only; the guard redirects others to /login.
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/orders/order.page').then(m => m.OrderPage),
      },
      { path: '', redirectTo: 'menu', pathMatch: 'full' },
    ],
  },

  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.page').then(m => m.LoginPage),
  },

  {
    path: 'home',
    loadComponent: () =>
      import('./home/home.page').then(m => m.HomePage),
  },

  // Root goes into the shell; old /menu, /cart, /orders links still work.
  { path: '', redirectTo: 'tabs', pathMatch: 'full' },
  { path: '**', redirectTo: 'tabs' },
];
