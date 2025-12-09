
import React from 'react';
import { Order } from '../types';
import { Printer } from 'lucide-react';

interface VoucherProps {
  order: Order | null;
}

export const Voucher: React.FC<VoucherProps> = ({ order }) => {
  if (!order) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>No order selected</p>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className="mb-4 w-full flex justify-end no-print">
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow transition w-full justify-center"
        >
          <Printer size={18} /> Print Receipt
        </button>
      </div>

      <div id="printable-area" className="bg-white p-6 w-full max-w-sm shadow-sm border border-gray-100 rounded-lg relative">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Hein Min</h1>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Coffee Shop</p>
          <p className="text-xs text-gray-500 mt-1">Thank you for your business</p>
        </div>

        <div className="border-b-2 border-dashed border-gray-300 my-4"></div>

        <div className="flex justify-between text-xs text-gray-600 mb-4 font-mono">
          <div className="flex flex-col gap-1">
            <span>{new Date(order.timestamp).toLocaleDateString()}</span>
            <span>{new Date(order.timestamp).toLocaleTimeString()}</span>
            {order.customerName && <span className="font-bold text-gray-800 mt-1">Cust: {order.customerName}</span>}
          </div>
          <div className="flex flex-col text-right gap-1">
            <span>Order #{order.id.toString().slice(-6)}</span>
            <span className="font-bold text-gray-900 text-sm">Table: {order.tableNumber}</span>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex flex-col border-b border-gray-100 pb-2 last:border-0">
                <div className="flex justify-between text-sm">
                    <div className="flex-1">
                        <span className="font-bold text-gray-800">{item.name}</span>
                        <div className="text-xs text-gray-500">Qty: {item.quantity} x {item.price.toLocaleString()}</div>
                    </div>
                    <span className="font-medium text-gray-900">{(item.price * item.quantity).toLocaleString()}</span>
                </div>
                {item.instructions && (
                    <div className="text-[10px] text-gray-500 mt-1 ml-2 italic">
                        * {item.instructions}
                    </div>
                )}
            </div>
          ))}
        </div>

        <div className="border-t-2 border-dashed border-gray-300 my-4 pt-4">
          <div className="flex justify-between text-xl font-bold text-gray-900">
            <span>Total</span>
            <span>{order.total.toLocaleString()}</span>
          </div>
          <div className="text-right text-xs text-gray-500 mt-1">MMK</div>
        </div>

        <div className="text-center mt-8 text-[10px] text-gray-400">
          <p>Hein Min Coffee</p>
          <p>Please come again!</p>
        </div>
      </div>
    </div>
  );
};
