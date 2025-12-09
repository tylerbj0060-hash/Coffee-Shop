
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Order } from '../types';
import { analyzeDailyReport } from '../services/geminiService';
import { Calendar, Trash2, TrendingUp, Sparkles, DollarSign, ShoppingBag } from 'lucide-react';

export const Reports: React.FC = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  useEffect(() => {
    loadReport();
  }, [date]);

  const loadReport = async () => {
    const data = await dbService.getOrdersByDate(new Date(date));
    setOrders(data);
    setAiAnalysis(''); 
  };

  const handleClearHistory = async () => {
    if (window.confirm("Are you sure? This will delete all orders for this date permanently.")) {
      await dbService.clearOrdersByDate(new Date(date));
      loadReport();
    }
  };

  const handleGenerateAI = async () => {
    if (orders.length === 0) return;
    setIsLoadingAI(true);
    const analysis = await analyzeDailyReport(date, orders);
    setAiAnalysis(analysis);
    setIsLoadingAI(false);
  };

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="bg-amber-100 p-2 rounded-lg text-amber-700">
            <Calendar size={20} />
          </div>
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            className="p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="flex gap-3">
          <button 
            onClick={loadReport}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            Refresh
          </button>
          <button 
            onClick={handleClearHistory}
            className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition flex items-center gap-2"
          >
            <Trash2 size={16} /> Clear History
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <span className="text-xl font-bold">Ks</span>
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900">{totalRevenue.toLocaleString()} MMK</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <ShoppingBag size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Orders</p>
            <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
          </div>
        </div>
      </div>

      {/* AI Analysis */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
            <Sparkles className="text-indigo-500" size={20} />
            Gemini AI Insights
          </h3>
          <button 
            onClick={handleGenerateAI}
            disabled={isLoadingAI || orders.length === 0}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingAI ? 'Analyzing...' : 'Generate Analysis'}
          </button>
        </div>
        
        {aiAnalysis ? (
          <div className="prose prose-indigo max-w-none text-gray-700 bg-white/50 p-4 rounded-lg">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{aiAnalysis}</pre>
          </div>
        ) : (
          <p className="text-indigo-400 text-sm italic">
            {orders.length > 0 ? "Click 'Generate Analysis' to get insights on today's sales." : "No data to analyze."}
          </p>
        )}
      </div>

      {/* Order List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-bold text-gray-700">Detailed Transaction Log</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No transactions for this date.</div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="p-4 hover:bg-gray-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs bg-gray-200 px-2 py-1 rounded text-gray-600">#{order.id.toString().slice(-4)}</span>
                    <span className="text-sm text-gray-500">{new Date(order.timestamp).toLocaleTimeString()}</span>
                    <span className="text-sm font-medium text-gray-800">Table {order.tableNumber}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${order.status === 'completed' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-yellow-50 border-yellow-200 text-yellow-700'}`}>
                        {order.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                  </div>
                </div>
                <div className="font-bold text-gray-900 text-right">
                  {order.total.toLocaleString()} MMK
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
