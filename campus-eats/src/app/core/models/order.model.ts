import { MenuItem } from './menu-item.model';

export interface CartLine {
  item: MenuItem;
  quantity: number;
}

export interface NewOrderLine {
  itemId: number;
  quantity: number;
}

export interface NewOrder {
  customerName: string;
  roomOrStall: string;
  lines: NewOrderLine[];
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

/** One line of a placed order, priced by the server. */
export interface OrderLine {
  itemId: number;
  quantity: number;
  name: string;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  id: string;             // a UUID from the API
  reference: string;      // e.g. CE-1042, safe to show people
  status: OrderStatus;
  customerName: string;
  roomOrStall: string;
  notes: string;
  lines: OrderLine[];
  total: number;
  placedAt: string;       // ISO-8601 UTC
}
