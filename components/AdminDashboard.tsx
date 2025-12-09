
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Order, OrderStatus } from '../types';
import { CheckCircle, ArrowRight, User, Bell } from 'lucide-react';
import { Voucher } from './Voucher';

export const AdminDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [lastNotification, setLastNotification] = useState<number>(0);

  const loadOrders = async () => {
    const allOrders = await dbService.getOrders();
    setOrders(allOrders);
  };

  const playNotificationSound = () => {
    // Simple beep sound for new orders (High pitch ping)
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime); 
    oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.4);
  };

  useEffect(() => {
    loadOrders();
    
    // Subscribe to real-time updates from other tabs (Customer Device)
    const unsubscribe = dbService.subscribe((event) => {
        if (event.type === 'NEW_ORDER') {
            // Play sound only if enough time has passed to avoid spam
            if (Date.now() - lastNotification > 2000) {
                playNotificationSound();
                setLastNotification(Date.now());
            }
        }
        loadOrders();
    });
    
    // Keep polling as backup for resilience
    const interval = setInterval(loadOrders, 10000); 

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [lastNotification]);

  // Update local state immediately for better UI response, then sync with DB
  const updateStatus = async (orderId: number, status: OrderStatus) => {
    // Optimistic update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? {...prev, status} : null);
    }
    
    await dbService.updateOrderStatus(orderId, status);
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
  };

  const getTimeElapsed = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 60000);
    return diff < 1 ? 'Just now' : `${diff}m ago`;
  };

  // Kanban Columns Data
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');

  const KanbanCard: React.FC<{ order: Order; colorClass: string; nextAction?: () => void; nextLabel?: string }> = ({ order, colorClass, nextAction, nextLabel }) => (
      <div 
        onClick={() => handleViewOrder(order)}
        className={`bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col gap-3 group relative overflow-hidden ${order.status === 'pending' ? 'animate-in zoom-in duration-300' : ''}`}
      >
        {order.status === 'pending' && <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full m-2"></div>}
        <div className="flex justify-between items-start">
            <div>
                <span className="font-bold text-gray-800 text-lg">Table {order.tableNumber}</span>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <User size={12} /> {order.customerName || 'Guest'}
                </div>
            </div>
            <div className={`px-2 py-1 rounded text-xs font-bold ${colorClass}`}>
                {getTimeElapsed(order.timestamp)}
            </div>
        </div>

        <div className="border-t border-gray-100 pt-3">
             <div className="text-sm text-gray-600 line-clamp-3 space-y-1">
                {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between">
                        <span>{item.quantity}x {item.name}</span>
                    </div>
                ))}
             </div>
             {order.items.length > 3 && <div className="text-xs text-gray-400 mt-1">+ {order.items.length - 3} more</div>}
        </div>

        <div className="flex items-center justify-between mt-auto pt-2">
             <span className="font-bold text-gray-900">{order.total.toLocaleString()}</span>
             {nextAction && (
                 <button 
                    onClick={(e) => { e.stopPropagation(); nextAction(); }}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition"
                    title={nextLabel}
                 >
                     <ArrowRight size={18} />
                 </button>
             )}
        </div>
      </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-160px)]">
      
      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
         <div className="flex gap-4 min-w-[800px] h-full">
            
            {/* Column 1: Requests */}
            <div className="flex-1 flex flex-col bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center sticky top-0">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <Bell size={18} className="text-yellow-600" /> Requests
                    </h3>
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-bold">{pendingOrders.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50/50">
                    {pendingOrders.map(order => (
                        <KanbanCard 
                            key={order.id} 
                            order={order} 
                            colorClass="bg-yellow-100 text-yellow-700" 
                            nextAction={() => updateStatus(order.id, 'preparing')}
                            nextLabel="Start Preparing"
                        />
                    ))}
                    {pendingOrders.length === 0 && <div className="text-center text-gray-400 text-sm mt-10">No pending orders</div>}
                </div>
            </div>

            {/* Column 2: Preparing */}
            <div className="flex-1 flex flex-col bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center sticky top-0">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div> Preparing
                    </h3>
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-bold">{preparingOrders.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50/50">
                    {preparingOrders.map(order => (
                        <KanbanCard 
                            key={order.id} 
                            order={order} 
                            colorClass="bg-blue-100 text-blue-700"
                            nextAction={() => updateStatus(order.id, 'ready')}
                            nextLabel="Mark Ready"
                        />
                    ))}
                    {preparingOrders.length === 0 && <div className="text-center text-gray-400 text-sm mt-10">Kitchen clear</div>}
                </div>
            </div>

            {/* Column 3: Ready */}
            <div className="flex-1 flex flex-col bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center sticky top-0">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <CheckCircle size={18} className="text-green-600" /> Ready
                    </h3>
                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-bold">{readyOrders.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50/50">
                    {readyOrders.map(order => (
                        <KanbanCard 
                            key={order.id} 
                            order={order} 
                            colorClass="bg-green-100 text-green-700"
                            nextAction={() => updateStatus(order.id, 'completed')}
                            nextLabel="Complete Order"
                        />
                    ))}
                     {readyOrders.length === 0 && <div className="text-center text-gray-400 text-sm mt-10">No ready orders</div>}
                </div>
            </div>

         </div>
      </div>

      {/* Details Panel */}
      {selectedOrder && (
        <div className="w-full lg:w-96 bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col z-20 absolute lg:static inset-0 lg:inset-auto animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-gray-800">Order #{selectedOrder.id.toString().slice(-6)}</h3>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span>Table {selectedOrder.tableNumber}</span> • <span>{selectedOrder.customerName}</span>
                    </div>
                </div>
                <button 
                    onClick={() => setSelectedOrder(null)}
                    className="p-2 hover:bg-gray-200 rounded-full"
                >
                    <CheckCircle size={20} className="text-gray-400" />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5">
                <div className="space-y-4">
                    {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm border-b border-gray-50 pb-3 last:border-0">
                            <div>
                                <div className="font-medium text-gray-900">{item.name}</div>
                                <div className="text-gray-500 text-xs">Qty: {item.quantity}</div>
                                {item.instructions && (
                                    <div className="text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded mt-1 border border-amber-100">
                                        {item.instructions}
                                    </div>
                                )}
                            </div>
                            <div className="font-bold text-gray-700">
                                {(item.price * item.quantity).toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-200 flex justify-between font-bold text-xl text-gray-900">
                    <span>Total</span>
                    <span>{selectedOrder.total.toLocaleString()} MMK</span>
                </div>

                <div className="mt-8 space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase">Change Status</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => updateStatus(selectedOrder.id, 'pending')} className={`py-2 text-sm border rounded ${selectedOrder.status === 'pending' ? 'bg-amber-100 border-amber-300' : 'hover:bg-gray-50'}`}>Pending</button>
                        <button onClick={() => updateStatus(selectedOrder.id, 'preparing')} className={`py-2 text-sm border rounded ${selectedOrder.status === 'preparing' ? 'bg-blue-100 border-blue-300' : 'hover:bg-gray-50'}`}>Preparing</button>
                        <button onClick={() => updateStatus(selectedOrder.id, 'ready')} className={`py-2 text-sm border rounded ${selectedOrder.status === 'ready' ? 'bg-green-100 border-green-300' : 'hover:bg-gray-50'}`}>Ready</button>
                        <button onClick={() => updateStatus(selectedOrder.id, 'completed')} className={`py-2 text-sm border rounded ${selectedOrder.status === 'completed' ? 'bg-gray-100 border-gray-300' : 'hover:bg-gray-50'}`}>Done</button>
                    </div>
                </div>
            </div>

            <div className="p-4 border-t bg-gray-50">
                <Voucher order={selectedOrder} />
            </div>
        </div>
      )}
    </div>
  );
};
