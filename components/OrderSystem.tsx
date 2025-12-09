import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../services/db';
import { MenuItem, CartItem, Order, CATEGORIES } from '../types';
import { ShoppingCart, Plus, Minus, Coffee, Trash2, CheckCircle } from 'lucide-react';

interface OrderSystemProps {
  onOrderComplete: (order: Order) => void;
}

export const OrderSystem: React.FC<OrderSystemProps> = ({ onOrderComplete }) => {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [tableNumber, setTableNumber] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    dbService.getMenu().then(setMenu);
  }, []);

  const filteredMenu = useMemo(() => {
    return menu.filter(item => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menu, selectedCategory, searchQuery]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!tableNumber) {
        alert("Please enter a table number");
        return;
    }

    const order: Order = {
      id: Date.now(),
      timestamp: Date.now(),
      tableNumber,
      customerName: customerName || 'Guest',
      items: [...cart],
      total: cartTotal,
      status: 'completed'
    };

    await dbService.saveOrder(order);
    onOrderComplete(order);
    setCart([]);
    setTableNumber('');
    setCustomerName('');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
      {/* Menu Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Filters */}
        <div className="mb-4 space-y-3">
          <input 
            type="text" 
            placeholder="Search menu..." 
            className="w-full p-3 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-amber-500 outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition ${
                selectedCategory === 'All' 
                  ? 'bg-amber-600 text-white shadow-md' 
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              All Items
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition ${
                  selectedCategory === cat 
                    ? 'bg-amber-600 text-white shadow-md' 
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto pr-2 pb-20 lg:pb-0">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMenu.map(item => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 hover:shadow-md transition text-left flex flex-col h-full group"
              >
                <div className="w-full aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <Coffee size={32} />
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-gray-800 line-clamp-1">{item.name}</h3>
                <p className="text-amber-600 font-bold mt-auto">${item.price.toFixed(2)}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Area */}
      <div className="lg:w-96 bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col h-full overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <ShoppingCart size={20} className="text-amber-600" />
            Current Order
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 mt-10">
              <Coffee size={48} className="mx-auto mb-2 opacity-20" />
              <p>Cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {item.image && <img src={item.image} className="w-10 h-10 rounded object-cover border" alt="" />}
                    <div>
                    <div className="font-medium text-gray-800">{item.name}</div>
                    <div className="text-sm text-gray-500">${(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 text-gray-600"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-4 text-center font-medium">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center hover:bg-amber-200 text-amber-700"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-4">
          <div className="flex justify-between items-center text-lg font-bold text-gray-800">
            <span>Total</span>
            <span>${cartTotal.toFixed(2)}</span>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Table Number</label>
              <input 
                type="number" 
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Enter table #"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Customer Name</label>
              <input 
                type="text" 
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer Name (Optional)"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"
              />
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full py-3 bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-bold hover:bg-amber-700 transition shadow-lg shadow-amber-200 flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            Confirm Order
          </button>
        </div>
      </div>
    </div>
  );
};
