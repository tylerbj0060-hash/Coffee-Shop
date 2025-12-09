
import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../services/db';
import { MenuItem, CartItem, Order, CATEGORIES, Customer, Notification } from '../types';
import { ShoppingBag, X, ChevronRight, Minus, Plus, ArrowLeft, Coffee, Edit3, Loader2, Bell, ChefHat, User, LogOut, MapPin, Phone, MessageSquare } from 'lucide-react';

interface CustomerKioskProps {
  onOrderComplete: (order: Order) => void;
  onExit: () => void;
}

// Variation Configurations (MMK)
const VARIATIONS = {
    Size: [
        { label: 'Regular', price: 0 },
        { label: 'Large', price: 500 }
    ],
    Milk: [
        { label: 'Whole', price: 0 },
        { label: 'Skim', price: 0 },
        { label: 'Oat', price: 500 },
        { label: 'Almond', price: 500 }
    ],
    Sweetness: [
        { label: '100%', price: 0 },
        { label: '50%', price: 0 },
        { label: '0%', price: 0 }
    ],
    Ice: [
        { label: 'Normal', price: 0 },
        { label: 'Less', price: 0 },
        { label: 'None', price: 0 }
    ]
};

export const CustomerKiosk: React.FC<CustomerKioskProps> = ({ onOrderComplete, onExit }) => {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showCart, setShowCart] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<Customer | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Auth Form State
  const [authForm, setAuthForm] = useState({
      name: '',
      phone: '',
      address: '',
      password: ''
  });
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Tracking State
  const [activeOrderId, setActiveOrderId] = useState<number | null>(() => {
    // Restore active order from local storage if page refreshed
    const saved = localStorage.getItem('hm_pos_active_order');
    return saved ? parseInt(saved) : null;
  });
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isTrackingMinimized, setIsTrackingMinimized] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Modal State (Item Details)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemInstructions, setItemInstructions] = useState('');
  const [selectedVariations, setSelectedVariations] = useState<Record<string, any>>({});

  useEffect(() => {
    dbService.getMenu().then(setMenu);
    
    // Check for persisted user session (Optional for Kiosk, but good for UX)
    const savedUser = localStorage.getItem('hm_pos_current_user');
    if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
    }

    // Subscribe to menu updates in case Admin changes price/availability
    const unsubscribe = dbService.subscribe((event) => {
        if (event.type === 'MENU_UPDATE') {
            dbService.getMenu().then(setMenu);
        }
    });
    return unsubscribe;
  }, []);

  const addNotification = (title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
      const newNoti: Notification = {
          id: Date.now().toString(),
          title,
          message,
          timestamp: Date.now(),
          read: false,
          type
      };
      setNotifications(prev => [newNoti, ...prev]);
  };

  const playNotificationSound = (type: 'preparing' | 'ready') => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'ready') {
        // Major chime (Success)
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    } else {
        // Soft double beep (Preparing)
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.3);
    }
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.6);
  };

  // Real-time Polling for Order Status
  useEffect(() => {
    if (!activeOrderId) return;

    const checkStatus = async () => {
        const orders = await dbService.getOrders();
        const freshOrder = orders.find(o => o.id === activeOrderId);
        
        if (freshOrder) {
            // Check for status changes to trigger notifications
            if (activeOrder) {
                // Noti for Preparing
                if (activeOrder.status === 'pending' && freshOrder.status === 'preparing') {
                    playNotificationSound('preparing');
                    addNotification("Order Update", `Your order is being prepared!`, "info");
                }
                // Noti for Ready
                if (activeOrder.status !== 'ready' && freshOrder.status === 'ready') {
                    playNotificationSound('ready');
                    addNotification("Order Ready!", `Order #${freshOrder.id.toString().slice(-4)} is ready for pickup.`, "success");
                    setIsTrackingMinimized(false); // Maximize if ready
                }
            }
            setActiveOrder(freshOrder);
        }
    };

    // Check immediately
    checkStatus();

    // Listen for updates from Admin side
    const unsubscribe = dbService.subscribe((event) => {
        if (event.type === 'STATUS_UPDATE' && event.data?.orderId === activeOrderId) {
            checkStatus();
        }
    });
    
    return () => {
        unsubscribe();
    };
  }, [activeOrderId, activeOrder]); // Depend on activeOrder to compare previous state

  const filteredMenu = useMemo(() => {
    return selectedCategory === 'All' 
      ? menu 
      : menu.filter(item => item.category === selectedCategory);
  }, [menu, selectedCategory]);

  // --- Item Modal Logic ---
  const openItemModal = (item: MenuItem) => {
      setSelectedItem(item);
      setItemQuantity(1);
      setItemInstructions('');
      // Set defaults for coffee/tea categories, else empty
      const isDrink = ['Coffee', 'Tea'].includes(item.category);
      if (isDrink) {
          setSelectedVariations({
              Size: VARIATIONS.Size[0],
              Milk: VARIATIONS.Milk[0],
              Sweetness: VARIATIONS.Sweetness[0],
              Ice: VARIATIONS.Ice[0]
          });
      } else {
          setSelectedVariations({});
      }
  };

  const closeItemModal = () => {
      setSelectedItem(null);
  };

  const getAdjustedPrice = () => {
      if (!selectedItem) return 0;
      let price = selectedItem.price;
      Object.values(selectedVariations).forEach((opt: any) => {
          if (opt && opt.price) price += opt.price;
      });
      return price;
  };

  const addToCartFromModal = () => {
    if (!selectedItem) return;

    const adjustedPrice = getAdjustedPrice();
    
    // Construct variations string
    const variationParts = Object.entries(selectedVariations)
        .filter(([_, opt]: [string, any]) => opt && opt.label !== 'Regular' && opt.label !== 'Normal' && opt.label !== 'Whole' && opt.label !== '100%') // Filter defaults to keep clean
        .map(([key, opt]: [string, any]) => `${key}: ${opt.label}`);
    
    let fullInstructions = variationParts.join(', ');
    if (itemInstructions.trim()) {
        fullInstructions = fullInstructions ? `${fullInstructions} | ${itemInstructions.trim()}` : itemInstructions.trim();
    }

    setCart(prev => {
      const newItem: CartItem = {
          ...selectedItem,
          price: adjustedPrice, // Save adjusted price
          quantity: itemQuantity,
          instructions: fullInstructions,
          cartId: `${selectedItem.id}-${Date.now()}`
      };

      // Check if identical item exists
      const existingIndex = prev.findIndex(
          i => i.id === selectedItem.id && i.instructions === fullInstructions && i.price === adjustedPrice
      );

      if (existingIndex > -1) {
          const newCart = [...prev];
          newCart[existingIndex].quantity += itemQuantity;
          return newCart;
      }

      return [...prev, newItem];
    });
    
    closeItemModal();
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.cartId === cartId) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const unreadCount = notifications.filter(n => !n.read).length;

  // --- Auth Logic ---
  const handleAuthSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthError('');
      setIsAuthLoading(true);

      try {
          if (authMode === 'register') {
              if (!authForm.name || !authForm.phone || !authForm.address || !authForm.password) {
                  throw new Error("All fields are required");
              }
              const newUser = await dbService.registerCustomer({
                  name: authForm.name,
                  phone: authForm.phone,
                  address: authForm.address,
                  password: authForm.password
              });
              setCurrentUser(newUser);
              localStorage.setItem('hm_pos_current_user', JSON.stringify(newUser));
              setShowAuthModal(false);
          } else {
              if (!authForm.phone || !authForm.password) {
                  throw new Error("Phone and password are required");
              }
              const user = await dbService.loginCustomer(authForm.phone, authForm.password);
              if (user) {
                  setCurrentUser(user);
                  localStorage.setItem('hm_pos_current_user', JSON.stringify(user));
                  setShowAuthModal(false);
              } else {
                  throw new Error("Invalid phone or password");
              }
          }
      } catch (err: any) {
          setAuthError(err.message || "Authentication failed");
      } finally {
          setIsAuthLoading(false);
      }
  };

  const handleLogout = () => {
      setCurrentUser(null);
      localStorage.removeItem('hm_pos_current_user');
  };

  // --- Checkout Logic ---
  const handleCheckout = async () => {
    // 1. Guest View -> Check Auth
    if (!currentUser) {
        setShowAuthModal(true);
        return;
    }

    // 2. Auth Success -> Proceed to Order
    if (cart.length === 0 || !tableNumber) return;

    const order: Order = {
      id: Date.now(),
      timestamp: Date.now(),
      tableNumber,
      customerName: currentUser.name,
      customerId: currentUser.id,
      items: [...cart],
      total: cartTotal,
      status: 'pending' // Initial status for Admin to pick up
    };

    await dbService.saveOrder(order);
    
    // Save active order tracking
    setActiveOrderId(order.id);
    localStorage.setItem('hm_pos_active_order', order.id.toString());
    
    // Add initial notification
    addNotification("Order Placed", `Order #${order.id.toString().slice(-4)} has been sent to the kitchen.`, "success");

    setActiveOrder(order);
    setIsTrackingMinimized(false);
    setCart([]);
    setShowCart(false);
  };

  const handleNewOrder = () => {
    setActiveOrderId(null);
    localStorage.removeItem('hm_pos_active_order');
    setActiveOrder(null);
    setIsTrackingMinimized(false);
    setTableNumber('');
  };

  const handleExit = () => {
    onExit();
  };

  const toggleNotifications = () => {
      setShowNotifications(!showNotifications);
      if (!showNotifications) {
          // Mark all as read when opening
          setNotifications(prev => prev.map(n => ({...n, read: true})));
      }
  };

  // --- Order Tracking Screen (Modal) ---
  const TrackingModal = () => {
    if (!activeOrder) return null;
    
    const isPending = activeOrder.status === 'pending';
    const isPreparing = activeOrder.status === 'preparing';
    const isReady = activeOrder.status === 'ready';
    const isCompleted = activeOrder.status === 'completed';
    const isCancelled = activeOrder.status === 'cancelled';

    return (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
            <div className={`w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center border-4 relative transition-all duration-500 ${isReady ? 'border-green-400 scale-105' : isPreparing ? 'border-amber-400' : 'border-white'}`}>
                
                {/* Minimize Button */}
                <button 
                    onClick={() => setIsTrackingMinimized(true)}
                    className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition"
                    title="Minimize & Browse Menu"
                >
                    <Minus size={20} />
                </button>

                {/* Dynamic Status Icons/Header */}
                {isReady ? (
                    <div className="mb-6 animate-in zoom-in duration-300">
                        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                            <Bell size={48} fill="currentColor" />
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Order Ready!</h1>
                        <p className="text-gray-500">Please pick up your order at the counter.</p>
                    </div>
                ) : isPreparing ? (
                    <div className="mb-6 animate-in fade-in duration-500">
                        <div className="w-24 h-24 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <ChefHat size={48} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">Cooking Now...</h1>
                        <p className="text-gray-500">The kitchen is preparing your delicious order.</p>
                    </div>
                ) : isCompleted ? (
                    <div className="mb-6">
                         <div className="w-24 h-24 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShoppingBag size={48} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">Order Completed</h1>
                        <p className="text-gray-500">Thank you for visiting Hein Min!</p>
                    </div>
                ) : isCancelled ? (
                     <div className="mb-6">
                        <div className="w-24 h-24 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                           <X size={48} />
                       </div>
                       <h1 className="text-2xl font-bold text-gray-800 mb-2">Order Cancelled</h1>
                       <p className="text-gray-500">Please contact staff for assistance.</p>
                   </div>
                ) : (
                    <div className="mb-6">
                        <div className="w-24 h-24 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Loader2 size={48} className="animate-spin" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">Order Sent</h1>
                        <p className="text-gray-500">Waiting for confirmation...</p>
                    </div>
                )}

                <div className="bg-gray-50 rounded-xl p-4 mb-8 text-left">
                    <div className="flex justify-between text-sm text-gray-500 mb-2">
                        <span>Order ID</span>
                        <span className="font-mono">#{activeOrder.id.toString().slice(-4)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500 mb-2">
                        <span>Customer</span>
                        <span className="font-semibold text-gray-700">{activeOrder.customerName}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500 mb-4">
                        <span>Status</span>
                        <span className={`font-bold capitalize 
                            ${isReady ? 'text-green-600' : isPreparing ? 'text-amber-600' : 'text-gray-600'}
                        `}>{activeOrder.status}</span>
                    </div>
                    
                    {/* Status Steps */}
                    <div className="flex justify-between items-center relative">
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-0"></div>
                        
                        {/* Step 1: Pending */}
                        <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-500 
                            ${['pending', 'preparing', 'ready', 'completed'].includes(activeOrder.status) ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-400'}`}>1</div>
                        
                        {/* Step 2: Preparing */}
                        <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-500 
                            ${['preparing', 'ready', 'completed'].includes(activeOrder.status) ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-400'}`}>2</div>
                        
                        {/* Step 3: Ready */}
                        <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-500 
                            ${['ready', 'completed'].includes(activeOrder.status) ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-400'}`}>3</div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                        <span>Pending</span>
                        <span>Preparing</span>
                        <span>Ready</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <button 
                        onClick={() => setIsTrackingMinimized(true)}
                        className="w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
                    >
                        Minimize & Browse Menu
                    </button>
                    {(isCompleted || isCancelled) && (
                        <button 
                            onClick={handleNewOrder}
                            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition shadow-lg"
                        >
                            Start New Order
                        </button>
                    )}
                </div>
            </div>
            
            <div className="mt-8 text-white/50 text-sm">
                Hein Min Coffee Shop
            </div>
        </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-40 flex flex-col overflow-hidden font-sans">
      {/* Active Tracking Modal (Full Screen) */}
      {activeOrder && !isTrackingMinimized && <TrackingModal />}

      {/* Header */}
      <header className="bg-white px-6 py-4 shadow-sm flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
            <button onClick={handleExit} className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                <ArrowLeft size={20} />
            </button>
            <div>
                <h1 className="text-xl font-bold text-gray-800">Hein Min</h1>
                <p className="text-xs text-gray-500">Self-Service Kiosk</p>
            </div>
        </div>
        <div className="flex items-center gap-3">
             {currentUser ? (
                 <div className="hidden sm:flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
                     <User size={16} className="text-amber-600" />
                     <span className="text-sm font-bold text-amber-800">{currentUser.name}</span>
                     <button onClick={handleLogout} className="ml-2 p-1 hover:bg-amber-200 rounded-full text-amber-600">
                         <LogOut size={14} />
                     </button>
                 </div>
             ) : (
                <button 
                    onClick={() => setShowAuthModal(true)}
                    className="hidden sm:block text-sm font-bold text-gray-600 hover:text-amber-600"
                >
                    Login / Register
                </button>
             )}

            {/* Notification Bell */}
            <button 
                onClick={toggleNotifications}
                className={`relative p-3 rounded-xl transition ${showNotifications ? 'bg-gray-100 text-amber-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
                )}
            </button>

            <button 
                onClick={() => setShowCart(true)}
                className="relative bg-amber-600 text-white p-3 rounded-xl shadow-lg shadow-amber-200 active:scale-95 transition"
            >
                <ShoppingBag size={24} />
                {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                        {cartCount}
                    </span>
                )}
            </button>
        </div>
      </header>

      {/* Minimized Status Pill */}
      {activeOrder && isTrackingMinimized && (
          <div className="bg-amber-50 border-b border-amber-100 px-6 py-2 flex justify-between items-center text-sm text-amber-900 animate-in slide-in-from-top">
              <span className="font-medium flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-amber-600" />
                  Order #{activeOrder.id.toString().slice(-4)}: <span className="uppercase font-bold">{activeOrder.status}</span>
              </span>
              <button 
                onClick={() => setIsTrackingMinimized(false)}
                className="text-amber-700 underline font-semibold text-xs"
              >
                  Track Order
              </button>
          </div>
      )}

      {/* Category Tabs */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex gap-3 overflow-x-auto no-scrollbar">
        <button
            onClick={() => setSelectedCategory('All')}
            className={`px-5 py-2 rounded-full whitespace-nowrap text-sm font-semibold transition ${
                selectedCategory === 'All' 
                ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-500 ring-offset-1' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
        >
            All Menu
        </button>
        {CATEGORIES.map(cat => (
            <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-2 rounded-full whitespace-nowrap text-sm font-semibold transition ${
                selectedCategory === cat 
                ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-500 ring-offset-1' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            >
            {cat}
            </button>
        ))}
      </div>

      {/* Main Grid */}
      <main className="flex-1 overflow-y-auto p-6 relative">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-24">
            {filteredMenu.map(item => (
                <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition cursor-pointer" onClick={() => openItemModal(item)}>
                    <div className="w-full aspect-[4/3] bg-gray-100 rounded-xl mb-4 overflow-hidden relative group">
                        {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <Coffee size={40} />
                            </div>
                        )}
                        <button 
                            className="absolute bottom-3 right-3 bg-white text-amber-600 p-2 rounded-full shadow-lg opacity-90 hover:opacity-100 hover:scale-105 active:scale-95 transition"
                        >
                            <Plus size={24} />
                        </button>
                    </div>
                    <div className="flex-1 flex flex-col">
                        <h3 className="text-lg font-bold text-gray-800 leading-tight mb-1">{item.name}</h3>
                        <p className="text-gray-500 text-sm line-clamp-2 mb-3 flex-1">{item.description || "Delicious and fresh."}</p>
                        <div className="flex items-center justify-between mt-auto">
                            <span className="text-xl font-bold text-amber-600">{item.price.toLocaleString()} MMK</span>
                            <span className="text-sm font-semibold text-gray-400">Customize</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
        
        {/* Notifications Sidebar */}
        {showNotifications && (
            <div className="absolute top-0 right-0 h-full w-full max-w-sm bg-white shadow-xl border-l border-gray-100 z-30 animate-in slide-in-from-right duration-200 flex flex-col">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Bell size={18} className="text-amber-600" /> Notifications
                    </h3>
                    <button onClick={() => setShowNotifications(false)} className="p-1 hover:bg-gray-200 rounded-full">
                        <X size={18} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {notifications.length === 0 ? (
                        <div className="text-center text-gray-400 mt-10 space-y-2">
                            <MessageSquare size={32} className="mx-auto opacity-30" />
                            <p className="text-sm">No new notifications</p>
                        </div>
                    ) : (
                        notifications.map(n => (
                            <div key={n.id} className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-bold text-gray-800 text-sm">{n.title}</h4>
                                    <span className="text-[10px] text-gray-400">{new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                                <p className="text-gray-600 text-xs">{n.message}</p>
                            </div>
                        ))
                    )}
                </div>
                {activeOrder && (
                     <div className="p-4 border-t border-gray-100 bg-gray-50">
                        <button 
                            onClick={() => { setIsTrackingMinimized(false); setShowNotifications(false); }}
                            className="w-full py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100"
                        >
                            View Active Order
                        </button>
                    </div>
                )}
            </div>
        )}
      </main>

      {/* Item Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-300">
                <div className="relative h-48 sm:h-56 bg-gray-100 shrink-0">
                    {selectedItem.image ? (
                        <img src={selectedItem.image} alt={selectedItem.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Coffee size={64} />
                        </div>
                    )}
                    <button 
                        onClick={closeItemModal}
                        className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-md transition"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 flex-1 overflow-y-auto">
                    <div className="flex justify-between items-start mb-2">
                        <h2 className="text-2xl font-bold text-gray-900">{selectedItem.name}</h2>
                        <span className="text-2xl font-bold text-amber-600">{getAdjustedPrice().toLocaleString()} MMK</span>
                    </div>
                    <p className="text-gray-500 mb-6">{selectedItem.description || "No description available."}</p>

                    {/* Variations */}
                    {['Coffee', 'Tea'].includes(selectedItem.category) && (
                        <div className="space-y-6 mb-8">
                            {/* Size */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">Size</h3>
                                <div className="flex gap-3">
                                    {VARIATIONS.Size.map(opt => (
                                        <button
                                            key={opt.label}
                                            onClick={() => setSelectedVariations(prev => ({ ...prev, Size: opt }))}
                                            className={`flex-1 py-3 px-4 rounded-xl border text-sm font-medium transition flex justify-between items-center ${
                                                selectedVariations.Size?.label === opt.label
                                                ? 'border-amber-600 bg-amber-50 text-amber-800 ring-1 ring-amber-600'
                                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                            }`}
                                        >
                                            <span>{opt.label}</span>
                                            {opt.price > 0 && <span className="text-xs text-amber-600">+{opt.price.toLocaleString()}</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Milk */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">Milk</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {VARIATIONS.Milk.map(opt => (
                                        <button
                                            key={opt.label}
                                            onClick={() => setSelectedVariations(prev => ({ ...prev, Milk: opt }))}
                                            className={`py-2 px-3 rounded-lg border text-sm font-medium transition flex justify-between items-center ${
                                                selectedVariations.Milk?.label === opt.label
                                                ? 'border-amber-600 bg-amber-50 text-amber-800 ring-1 ring-amber-600'
                                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                            }`}
                                        >
                                            <span>{opt.label}</span>
                                            {opt.price > 0 && <span className="text-xs text-amber-600">+{opt.price.toLocaleString()}</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                {/* Sweetness */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">Sweetness</h3>
                                    <div className="flex flex-col gap-2">
                                        {VARIATIONS.Sweetness.map(opt => (
                                            <button
                                                key={opt.label}
                                                onClick={() => setSelectedVariations(prev => ({ ...prev, Sweetness: opt }))}
                                                className={`py-2 px-3 rounded-lg border text-sm font-medium transition text-left ${
                                                    selectedVariations.Sweetness?.label === opt.label
                                                    ? 'border-amber-600 bg-amber-50 text-amber-800'
                                                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {/* Ice */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">Ice</h3>
                                    <div className="flex flex-col gap-2">
                                        {VARIATIONS.Ice.map(opt => (
                                            <button
                                                key={opt.label}
                                                onClick={() => setSelectedVariations(prev => ({ ...prev, Ice: opt }))}
                                                className={`py-2 px-3 rounded-lg border text-sm font-medium transition text-left ${
                                                    selectedVariations.Ice?.label === opt.label
                                                    ? 'border-amber-600 bg-amber-50 text-amber-800'
                                                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <Edit3 size={16} /> Special Instructions
                        </label>
                        <textarea 
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none resize-none text-sm"
                            rows={3}
                            placeholder="e.g. Extra hot, no lid..."
                            value={itemInstructions}
                            onChange={(e) => setItemInstructions(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl">
                        <span className="font-bold text-gray-700">Quantity</span>
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition ${itemQuantity === 1 ? 'bg-gray-200 text-gray-400' : 'bg-white shadow text-gray-800 hover:bg-gray-100'}`}
                                disabled={itemQuantity === 1}
                            >
                                <Minus size={18} />
                            </button>
                            <span className="text-xl font-bold w-8 text-center">{itemQuantity}</span>
                            <button 
                                onClick={() => setItemQuantity(itemQuantity + 1)}
                                className="w-10 h-10 rounded-full bg-amber-600 text-white shadow flex items-center justify-center hover:bg-amber-700 transition"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-white">
                    <button 
                        onClick={addToCartFromModal}
                        className="w-full py-3.5 bg-amber-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-amber-200 hover:bg-amber-700 transition flex items-center justify-center gap-2"
                    >
                        <span>Add to Order</span>
                        <span>•</span>
                        <span>{(getAdjustedPrice() * itemQuantity).toLocaleString()} MMK</span>
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Cart Sidebar/Modal */}
      {showCart && (
        <div className="absolute inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm transition-opacity">
            <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <ShoppingBag className="text-amber-600"/> Your Order
                    </h2>
                    <button onClick={() => setShowCart(false)} className="p-2 hover:bg-gray-200 rounded-full transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                            <ShoppingBag size={48} className="opacity-20" />
                            <p>Your cart is empty.</p>
                            <button onClick={() => setShowCart(false)} className="text-amber-600 font-medium hover:underline">
                                Browse Menu
                            </button>
                        </div>
                    ) : (
                        cart.map((item, index) => (
                            <div key={item.cartId || index} className="flex flex-col bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                                        {item.image ? (
                                            <img src={item.image} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300"><Coffee size={16}/></div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-800">{item.name}</h4>
                                        <p className="text-amber-600 font-medium">{(item.price * item.quantity).toLocaleString()} MMK</p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                                        <button onClick={() => updateQuantity(item.cartId!, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm hover:text-amber-600">
                                            <Minus size={14} />
                                        </button>
                                        <span className="font-bold w-4 text-center">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.cartId!, 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm hover:text-amber-600">
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>
                                {item.instructions && (
                                    <div className="mt-2 pt-2 border-t border-gray-50 text-xs text-gray-600 flex items-start gap-1">
                                        <Edit3 size={12} className="mt-0.5 opacity-50 shrink-0"/>
                                        <span className="italic">{item.instructions}</span>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-200 space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-gray-600">
                            <span>Subtotal</span>
                            <span>{cartTotal.toLocaleString()} MMK</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-200">
                            <span>Total</span>
                            <span>{cartTotal.toLocaleString()} MMK</span>
                        </div>
                    </div>

                    {currentUser ? (
                         <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 mb-3">
                            <div className="flex justify-between items-center mb-1">
                                <div className="text-xs text-amber-600 font-bold uppercase">Customer</div>
                                <div className="text-xs text-amber-600 font-medium cursor-pointer hover:underline" onClick={handleLogout}>Logout</div>
                            </div>
                            <div className="font-bold text-gray-800">{currentUser.name}</div>
                            <div className="text-xs text-gray-500">{currentUser.phone}</div>
                        </div>
                    ) : (
                        <div className="p-3 bg-gray-100 rounded-xl border border-gray-200 mb-3 text-center text-sm text-gray-500">
                            <p>You are ordering as Guest.</p>
                            <p className="text-xs mt-1">Please log in to finalize your order.</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Table No.</label>
                        <input 
                            type="text"
                            value={tableNumber}
                            onChange={(e) => setTableNumber(e.target.value)}
                            placeholder="e.g. 5"
                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                    </div>

                    <button 
                        onClick={handleCheckout}
                        disabled={cart.length === 0 || !tableNumber}
                        className="w-full py-4 bg-amber-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-amber-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-700 transition flex items-center justify-center gap-2"
                    >
                        <span>{currentUser ? 'Place Order' : 'Login to Order'}</span>
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                  <div className="bg-amber-600 p-6 text-white text-center">
                      <h2 className="text-2xl font-bold">{authMode === 'login' ? 'Welcome Back!' : 'Create Account'}</h2>
                      <p className="text-amber-100 text-sm mt-1">{authMode === 'login' ? 'Login to place your order' : 'Join Hein Min for quick ordering'}</p>
                  </div>
                  
                  <div className="p-6">
                      {authError && (
                          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 text-center border border-red-100">
                              {authError}
                          </div>
                      )}
                      
                      <form onSubmit={handleAuthSubmit} className="space-y-4">
                          {authMode === 'register' && (
                              <div className="relative">
                                  <User className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                  <input 
                                    type="text" 
                                    placeholder="Full Name"
                                    className="w-full pl-10 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                                    value={authForm.name}
                                    onChange={e => setAuthForm({...authForm, name: e.target.value})}
                                    required
                                  />
                              </div>
                          )}
                          
                          <div className="relative">
                              <Phone className="absolute left-3 top-3.5 text-gray-400" size={18} />
                              <input 
                                type="tel" 
                                placeholder="Phone Number"
                                className="w-full pl-10 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                                value={authForm.phone}
                                onChange={e => setAuthForm({...authForm, phone: e.target.value})}
                                required
                              />
                          </div>
                          
                          {authMode === 'register' && (
                              <div className="relative">
                                  <MapPin className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                  <input 
                                    type="text" 
                                    placeholder="Address"
                                    className="w-full pl-10 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                                    value={authForm.address}
                                    onChange={e => setAuthForm({...authForm, address: e.target.value})}
                                    required
                                  />
                              </div>
                          )}

                          <div className="relative">
                              <input 
                                type="password" 
                                placeholder="Password"
                                className="w-full pl-4 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                                value={authForm.password}
                                onChange={e => setAuthForm({...authForm, password: e.target.value})}
                                required
                              />
                          </div>

                          <button 
                            type="submit"
                            disabled={isAuthLoading}
                            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition flex items-center justify-center gap-2"
                          >
                              {isAuthLoading && <Loader2 className="animate-spin" size={18} />}
                              {authMode === 'login' ? 'Login' : 'Register'}
                          </button>
                      </form>

                      <div className="mt-6 text-center text-sm text-gray-500">
                          {authMode === 'login' ? (
                              <>
                                New here? <button onClick={() => { setAuthMode('register'); setAuthError(''); }} className="text-amber-600 font-bold hover:underline">Create an account</button>
                              </>
                          ) : (
                              <>
                                Already have an account? <button onClick={() => { setAuthMode('login'); setAuthError(''); }} className="text-amber-600 font-bold hover:underline">Login here</button>
                              </>
                          )}
                      </div>
                  </div>
                  <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-white/80 hover:text-white">
                      <X size={24} />
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};
