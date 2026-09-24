
export type Category =
  | 'rice' | 'noodles' | 'snacks'
  | 'drinks' | 'desserts';
 
export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: Category;   // a union, not string
  available: boolean;
  prepMinutes: number;
  rating: number;
  emoji: string;
  image: string;
}