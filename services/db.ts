
import { MenuItem, Order, Customer } from '../types';

/**
 * DBService - Data Access Layer
 * 
 * CURRENT IMPLEMENTATION: LocalStorage + BroadcastChannel (Simulation)
 * This allows the app to work in a browser demo without a real backend.
 * 
 * FOR PRODUCTION (Cloud SQL / Separate Devices):
 * 1. Set up a backend API (Node.js, Python, etc.) connected to Cloud SQL.
 * 2. Replace the methods below to call your API endpoints using fetch().
 * 3. Use WebSockets or Server-Sent Events (SSE) for real-time notifications instead of BroadcastChannel.
 * 
 * Example Replacement:
 * async getOrders(): Promise<Order[]> {
 *   const response = await fetch('https://api.your-backend.com/orders');
 *   return response.json();
 * }
 */

// STORAGE KEYS
const STORAGE_KEY_MENU = 'hm_pos_menu';
const STORAGE_KEY_ORDERS = 'hm_pos_orders';
const STORAGE_KEY_CUSTOMERS = 'hm_pos_customers';

export type DBEventType = 'NEW_ORDER' | 'STATUS_UPDATE' | 'MENU_UPDATE' | 'GENERIC_UPDATE';

export interface DBEvent {
  type: DBEventType;
  data?: any;
}

// MOCK INITIAL DATA
const INITIAL_MENU: MenuItem[] = [
  { 
    id: 1, 
    name: 'Signature Espresso', 
    price: 3500, 
    category: 'Coffee', 
    description: 'Rich, full-bodied espresso shot.',
    image: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?auto=format&fit=crop&w=400&q=80' 
  },
  { 
    id: 2, 
    name: 'Oat Milk Latte', 
    price: 5500, 
    category: 'Coffee', 
    description: 'Smooth espresso with steamed oat milk.',
    image: 'https://images.unsplash.com/photo-1534687553325-699a223e85e9?auto=format&fit=crop&w=400&q=80' 
  },
  { 
    id: 3, 
    name: 'Blueberry Muffin', 
    price: 4000, 
    category: 'Pastry', 
    description: 'Freshly baked with real blueberries.',
    image: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&w=400&q=80' 
  }
];

class DBService {
  private channel: BroadcastChannel;
  private listeners: ((event: DBEvent) => void)[] = [];

  constructor() {
    // Initialize BroadcastChannel for cross-tab communication
    this.channel = new BroadcastChannel('hein_min_pos_sync');
    
    this.channel.onmessage = (messageEvent) => {
      // When we receive a message from another tab, notify local listeners
      const event: DBEvent = messageEvent.data && messageEvent.data.type 
        ? messageEvent.data 
        : { type: 'GENERIC_UPDATE' };
        
      this.notifyListeners(event);
    };
  }

  // Allow components to subscribe to DB updates
  subscribe(listener: (event: DBEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(event: DBEvent) {
    this.listeners.forEach(l => l(event));
  }

  private broadcastUpdate(event: DBEvent) {
    this.channel.postMessage(event);
    this.notifyListeners(event); // Notify current tab as well
  }

  // Simulate network delay for "Realistic" feel
  private async simulateNetwork(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 150));
  }

  async init(): Promise<void> {
    // Initialize LocalStorage if empty
    if (!localStorage.getItem(STORAGE_KEY_MENU)) {
      localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(INITIAL_MENU));
    }
    if (!localStorage.getItem(STORAGE_KEY_ORDERS)) {
      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEY_CUSTOMERS)) {
      localStorage.setItem(STORAGE_KEY_CUSTOMERS, JSON.stringify([]));
    }
    console.log("Connected to Local Persistence DB (Simulated Cloud)");
  }

  // --- Auth / Customer Operations ---

  async registerCustomer(customerData: Omit<Customer, 'id'>): Promise<Customer> {
    await this.simulateNetwork();
    const customersJson = localStorage.getItem(STORAGE_KEY_CUSTOMERS);
    const customers: Customer[] = customersJson ? JSON.parse(customersJson) : [];

    // Check if phone exists
    if (customers.find(c => c.phone === customerData.phone)) {
      throw new Error("Phone number already registered.");
    }

    const newCustomer: Customer = {
      ...customerData,
      id: `CUST-${Date.now()}`
    };

    customers.push(newCustomer);
    localStorage.setItem(STORAGE_KEY_CUSTOMERS, JSON.stringify(customers));
    return newCustomer;
  }

  async loginCustomer(phone: string, password: string): Promise<Customer | null> {
    await this.simulateNetwork();
    const customersJson = localStorage.getItem(STORAGE_KEY_CUSTOMERS);
    const customers: Customer[] = customersJson ? JSON.parse(customersJson) : [];

    const customer = customers.find(c => c.phone === phone && c.password === password);
    return customer || null;
  }

  async getCustomers(): Promise<Customer[]> {
    await this.simulateNetwork();
    const data = localStorage.getItem(STORAGE_KEY_CUSTOMERS);
    return data ? JSON.parse(data) : [];
  }

  // --- Menu Operations ---

  async getMenu(): Promise<MenuItem[]> {
    await this.simulateNetwork();
    const data = localStorage.getItem(STORAGE_KEY_MENU);
    return data ? JSON.parse(data) : [];
  }

  async addMenuItem(item: Omit<MenuItem, 'id'>): Promise<number> {
    await this.simulateNetwork();
    const menu = await this.getMenu();
    const newId = Date.now();
    const newItem = { ...item, id: newId };
    
    menu.push(newItem);
    localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(menu));
    this.broadcastUpdate({ type: 'MENU_UPDATE' });
    return newId;
  }

  async updateMenuItem(item: MenuItem): Promise<void> {
    await this.simulateNetwork();
    let menu = await this.getMenu();
    const index = menu.findIndex(i => i.id === item.id);
    if (index !== -1) {
      menu[index] = item;
      localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(menu));
      this.broadcastUpdate({ type: 'MENU_UPDATE' });
    }
  }

  async deleteMenuItem(id: number): Promise<void> {
    await this.simulateNetwork();
    let menu = await this.getMenu();
    menu = menu.filter(i => i.id !== id);
    localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(menu));
    this.broadcastUpdate({ type: 'MENU_UPDATE' });
  }

  // --- Order Operations ---

  async saveOrder(order: Order): Promise<void> {
    await this.simulateNetwork();
    const orders = await this.getOrders();
    orders.push(order);
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
    // Broadcast NEW_ORDER event so Admin can play sound/notify
    this.broadcastUpdate({ type: 'NEW_ORDER', data: order });
  }

  async updateOrderStatus(orderId: number, status: Order['status']): Promise<void> {
    await this.simulateNetwork();
    const orders = await this.getOrders();
    const order = orders.find(o => o.id === orderId);
    if (order) {
      order.status = status;
      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
      // Broadcast STATUS_UPDATE so Customer Kiosk can notify user
      this.broadcastUpdate({ type: 'STATUS_UPDATE', data: { orderId, status } });
    }
  }

  async getOrders(): Promise<Order[]> {
    await this.simulateNetwork();
    const data = localStorage.getItem(STORAGE_KEY_ORDERS);
    const orders: Order[] = data ? JSON.parse(data) : [];
    return orders.sort((a, b) => b.timestamp - a.timestamp);
  }

  async getOrdersByDate(date: Date): Promise<Order[]> {
    await this.simulateNetwork();
    const orders = await this.getOrders();
    
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return orders.filter(order => 
      order.timestamp >= start.getTime() && order.timestamp <= end.getTime()
    );
  }

  async deleteOrder(id: number): Promise<void> {
    await this.simulateNetwork();
    let orders = await this.getOrders();
    orders = orders.filter(o => o.id !== id);
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
    this.broadcastUpdate({ type: 'GENERIC_UPDATE' });
  }

  async clearOrdersByDate(date: Date): Promise<number> {
    await this.simulateNetwork();
    let orders = await this.getOrders();
    const initialCount = orders.length;
    
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    orders = orders.filter(order => 
      order.timestamp < start.getTime() || order.timestamp > end.getTime()
    );

    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
    this.broadcastUpdate({ type: 'GENERIC_UPDATE' });
    return initialCount - orders.length;
  }
}

export const dbService = new DBService();
