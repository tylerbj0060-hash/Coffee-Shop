
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Customer } from '../types';
import { User, Phone, MapPin, Search } from 'lucide-react';

export const CustomerList: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const data = await dbService.getCustomers();
    setCustomers(data);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <User className="text-amber-600" /> Registered Customers
          </h2>
          <p className="text-sm text-gray-500">Total: {customers.length} customers</p>
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search name or phone..." 
            className="w-full pl-10 p-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {searchTerm ? "No customers found matching search." : "No registered customers yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold">
                <tr>
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">Phone Number</th>
                  <th className="p-4">Address</th>
                  <th className="p-4">ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-amber-50/50 transition">
                    <td className="p-4 font-medium text-gray-800 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      {customer.name}
                    </td>
                    <td className="p-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-gray-400" /> {customer.phone}
                      </div>
                    </td>
                    <td className="p-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-gray-400" /> {customer.address}
                      </div>
                    </td>
                    <td className="p-4 text-xs text-gray-400 font-mono">
                      {customer.id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
