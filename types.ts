
export interface MenuItem {
  id: number;
  name: string;
  price: number; // In MMK
  category: string;
  image?: string; // Base64 string
  description?: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
  instructions?: string; // Special instructions for the kitchen
  cartId?: string; // Unique ID for cart handling
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  password?: string; // In a real app, this should be hashed
}

export interface Order {
  id: number;
  timestamp: number;
  tableNumber: string;
  customerName: string; 
  customerId?: string; // Link order to registered customer
  items: CartItem[];
  total: number;
  status: OrderStatus;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  type: 'info' | 'success' | 'warning';
}

export enum Tab {
  LANDING = 'LANDING',
  // Admin Tabs
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  ADMIN_MENU = 'ADMIN_MENU',
  ADMIN_REPORTS = 'ADMIN_REPORTS',
  ADMIN_CUSTOMERS = 'ADMIN_CUSTOMERS',
  // Customer Tabs
  CUSTOMER_KIOSK = 'CUSTOMER_KIOSK',
  CUSTOMER_ORDER_SUCCESS = 'CUSTOMER_ORDER_SUCCESS'
}

export const CATEGORIES = ['Coffee', 'Tea', 'Pastry', 'Sandwich', 'Dessert', 'Other'];
