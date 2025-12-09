
import React, { useState, useEffect } from 'react';
import { MenuManager } from './components/MenuManager';
import { Reports } from './components/Reports';
import { CustomerKiosk } from './components/CustomerKiosk';
import { AdminDashboard } from './components/AdminDashboard';
import { CustomerList } from './components/CustomerList';
import { Tab, Order } from './types';
import { dbService } from './services/db';
import { Coffee, ClipboardList, BarChart2, ChefHat, LogOut, User, Lock, ArrowRight, Users } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.LANDING);
  const [isAdmin, setIsAdmin] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    // Initialize DB on load
    dbService.init().catch(console.error);
  }, []);

  const handleOrderComplete = (order: Order) => {
    // For kiosk, we stay in kiosk mode.
    // The CustomerKiosk component handles its own "Success" screen.
  };

  const handleAdminLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (emailInput.trim().toLowerCase() === 'zanjo3717@gmail.com') {
          setIsAdmin(true);
          setActiveTab(Tab.ADMIN_DASHBOARD);
          setLoginError('');
      } else {
          setLoginError('Invalid email address');
      }
  };

  const handleLogout = () => {
      setIsAdmin(false);
      setActiveTab(Tab.LANDING);
      setEmailInput('');
  };

  // --- Landing Page ---
  if (activeTab === Tab.LANDING) {
      return (
          <div className="min-h-screen bg-gradient-to-br from-amber-50 to-gray-100 flex items-center justify-center p-4">
              <div className="bg-white p-8 rounded-2xl shadow-xl max-w-4xl w-full">
                  <div className="mb-10 text-center">
                      <div className="inline-flex items-center justify-center w-24 h-24 bg-amber-600 rounded-full text-white mb-6 shadow-lg">
                          <Coffee size={48} />
                      </div>
                      <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight">Hein Min</h1>
                      <p className="text-gray-500 mt-2 text-lg">Coffee Shop System</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Customer Side */}
                      <button 
                          onClick={() => setActiveTab(Tab.CUSTOMER_KIOSK)}
                          className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-transparent bg-amber-50 hover:bg-amber-100 hover:border-amber-200 transition group h-full"
                      >
                          <User size={56} className="text-amber-600 mb-4 group-hover:scale-110 transition" />
                          <h2 className="text-2xl font-bold text-gray-800">Customer Mode</h2>
                          <p className="text-gray-500 mt-2">Self-service ordering kiosk</p>
                      </button>

                      {/* Admin Side Login */}
                      <div className="flex flex-col p-8 rounded-xl border border-gray-100 bg-gray-50 h-full">
                          <div className="text-center mb-6">
                            <Lock size={40} className="text-gray-600 mx-auto mb-3" />
                            <h2 className="text-2xl font-bold text-gray-800">Admin Access</h2>
                          </div>
                          
                          <form onSubmit={handleAdminLogin} className="space-y-4 flex-1 flex flex-col justify-center">
                              <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                                <input 
                                    type="email" 
                                    value={emailInput}
                                    onChange={(e) => setEmailInput(e.target.value)}
                                    placeholder="Enter admin email"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                                    required
                                />
                              </div>
                              {loginError && (
                                  <p className="text-red-500 text-sm text-center">{loginError}</p>
                              )}
                              <button 
                                type="submit"
                                className="w-full py-3 bg-gray-800 text-white rounded-lg font-bold hover:bg-gray-900 transition flex items-center justify-center gap-2"
                              >
                                  Login <ArrowRight size={18} />
                              </button>
                          </form>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // --- Customer Kiosk ---
  if (activeTab === Tab.CUSTOMER_KIOSK) {
      return <CustomerKiosk onOrderComplete={handleOrderComplete} onExit={() => setActiveTab(Tab.LANDING)} />;
  }

  // --- Admin Layout ---
  const NavButton = ({ tab, icon: Icon, label }: { tab: Tab, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex flex-col items-center justify-center w-full py-3 px-1 transition-colors duration-200 ${
        activeTab === tab 
          ? 'text-amber-600 bg-amber-50 border-t-2 border-amber-600 lg:border-t-0 lg:border-r-2' 
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      }`}
    >
      <Icon size={24} className="mb-1" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      <nav className="fixed bottom-0 left-0 w-full bg-white shadow-lg border-t border-gray-200 z-50 lg:relative lg:w-24 lg:h-screen lg:flex-col lg:border-t-0 lg:border-r lg:justify-start lg:pt-8 flex justify-between no-print">
            <div className="hidden lg:flex justify-center mb-8 w-full">
            <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Coffee size={28} />
            </div>
            </div>
            
            <div className="flex w-full lg:flex-col lg:gap-2">
            <NavButton tab={Tab.ADMIN_DASHBOARD} icon={ChefHat} label="Orders" />
            <NavButton tab={Tab.ADMIN_MENU} icon={ClipboardList} label="Menu" />
            <NavButton tab={Tab.ADMIN_CUSTOMERS} icon={Users} label="Customers" />
            <NavButton tab={Tab.ADMIN_REPORTS} icon={BarChart2} label="Daily" />
            
            <div className="lg:mt-auto lg:mb-4 lg:w-full flex justify-center">
                <button onClick={handleLogout} className="text-red-500 hover:bg-red-50 p-2 rounded-lg" title="Logout">
                    <LogOut size={24} />
                </button>
            </div>
            </div>
      </nav>

      <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8 overflow-y-auto h-screen">
        <header className="mb-6 flex justify-between items-center no-print">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">
                    {activeTab === Tab.ADMIN_DASHBOARD && 'Order Management'}
                    {activeTab === Tab.ADMIN_MENU && 'Menu Management'}
                    {activeTab === Tab.ADMIN_CUSTOMERS && 'Registered Customers'}
                    {activeTab === Tab.ADMIN_REPORTS && 'Daily Reports'}
                </h1>
                <p className="text-sm text-gray-500">Hein Min Admin</p>
            </div>
            <div className="hidden lg:block text-sm text-gray-500">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
        </header>

        <div className="max-w-7xl mx-auto h-full">
            {activeTab === Tab.ADMIN_DASHBOARD && <AdminDashboard />}
            {activeTab === Tab.ADMIN_MENU && <MenuManager />}
            {activeTab === Tab.ADMIN_CUSTOMERS && <CustomerList />}
            {activeTab === Tab.ADMIN_REPORTS && <Reports />}
        </div>
      </main>
    </div>
  );
};

export default App;
