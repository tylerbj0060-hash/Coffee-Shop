
import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../services/db';
import { MenuItem, CATEGORIES } from '../types';
import { Trash2, Edit2, Plus, Image as ImageIcon, X, Loader2 } from 'lucide-react';

export const MenuManager: React.FC = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<MenuItem>>({ category: CATEGORIES[0] });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    const menu = await dbService.getMenu();
    setItems(menu);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4000000) { // Limit 4MB for Cloud DB
          alert("Image is too large. Please choose an image under 4MB.");
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
      }
      
      setIsImageProcessing(true);
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setFormData(prev => ({ ...prev, image: base64String }));
        setIsImageProcessing(false);
      };
      
      reader.onerror = () => {
        alert("Failed to read image file");
        setIsImageProcessing(false);
      };

      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return;
    if (isImageProcessing) return;

    try {
      const itemToSave = {
        name: formData.name,
        price: Number(formData.price),
        category: formData.category || CATEGORIES[0],
        image: formData.image, 
        description: formData.description || ''
      };

      if (formData.id) {
        await dbService.updateMenuItem({ ...itemToSave, id: formData.id });
      } else {
        await dbService.addMenuItem(itemToSave);
      }
      
      await loadItems();
      resetForm();
    } catch (error) {
      console.error("Failed to save item", error);
      alert("Error saving item to Cloud Database.");
    }
  };

  const handleEdit = (item: MenuItem) => {
    setFormData({ ...item });
    setImagePreview(item.image || null);
    setIsEditing(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Delete this item?")) {
      await dbService.deleteMenuItem(id);
      loadItems();
    }
  };

  const resetForm = () => {
    setFormData({ category: CATEGORIES[0], name: '', price: 0, description: '', image: undefined });
    setImagePreview(null);
    setIsEditing(false);
    setIsImageProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
           {isEditing ? <Edit2 size={20}/> : <Plus size={20}/>}
           {isEditing ? 'Edit Item' : 'Add New Item'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
              <input
                type="text"
                required
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                value={formData.name || ''}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (MMK)</label>
              <input
                type="number"
                step="100"
                required
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                value={formData.price || ''}
                onChange={e => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                value={formData.category}
                onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
               <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                value={formData.description || ''}
                placeholder="e.g. Contains nuts, spicy, etc."
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="md:col-span-2">
               <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
               <div className="flex items-center gap-3">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    accept="image/*" 
                    onChange={handleImageChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                  />
                  {isImageProcessing ? (
                    <div className="w-16 h-16 flex items-center justify-center bg-gray-50 border rounded text-amber-600">
                        <Loader2 className="animate-spin" size={20} />
                    </div>
                  ) : imagePreview ? (
                    <div className="relative w-16 h-16 rounded overflow-hidden border shrink-0 group">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => { 
                            setImagePreview(null); 
                            setFormData(prev => ({...prev, image: undefined}));
                            if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl shadow-sm"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : null}
               </div>
               <p className="text-xs text-gray-500 mt-1">Cloud DB Limit: 4MB. Supported formats: JPG, PNG.</p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button 
                type="submit" 
                disabled={isImageProcessing}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isImageProcessing && <Loader2 size={16} className="animate-spin" />}
              {isEditing ? 'Update Item' : 'Save Item'}
            </button>
            {isEditing && (
              <button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 border border-gray-100">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={24} className="text-gray-400" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">{item.name}</h3>
                <p className="text-amber-600 font-medium">{item.price.toLocaleString()} MMK</p>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{item.category}</span>
              </div>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleEdit(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full">
                <Edit2 size={18} />
              </button>
              <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-full">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="col-span-full text-center py-10 text-gray-500">
            No items in menu. Add one above!
          </div>
        )}
      </div>
    </div>
  );
};
