/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState } from 'react';
import { Upload } from 'lucide-react';
import { ReceiptData } from './types';

export default function App() {
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState<string[]>([]);
  const [newPerson, setNewPerson] = useState('');

  const addPerson = () => {
    if (newPerson && !people.includes(newPerson)) {
      setPeople([...people, newPerson]);
      setNewPerson('');
    }
  };

  const toggleAssignment = (itemId: string, person: string) => {
    if (!receiptData) return;
    setReceiptData({
      ...receiptData,
      items: receiptData.items.map(item => {
        if (item.id === itemId) {
          const assignedTo = item.assignedTo.includes(person)
            ? item.assignedTo.filter(p => p !== person)
            : [...item.assignedTo, person];
          return { ...item, assignedTo };
        }
        return item;
      })
    });
  };

  const calculateSplits = () => {
    if (!receiptData) return {};
    const { items, serviceCharge, gst } = receiptData;
    const itemsTotal = items.reduce((sum, item) => sum + item.price, 0);
    const totalAdditional = serviceCharge + gst;
    const splits: Record<string, number> = {};

    items.forEach(item => {
      if (item.assignedTo.length === 0) return;
      const totalItemCost = item.price + (item.price * totalAdditional / (itemsTotal || 1));
      const share = totalItemCost / item.assignedTo.length;
      item.assignedTo.forEach(person => {
        splits[person] = (splits[person] || 0) + share;
      });
    });
    return splits;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('receipt', file);

    try {
      const response = await fetch('/api/parse-receipt', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.items && Array.isArray(data.items)) {
        setReceiptData({
          ...data,
          items: data.items.map((item: any) => ({ ...item, id: crypto.randomUUID(), assignedTo: [] }))
        });
      }
    } catch (error) {
      console.error('Error uploading receipt:', error);
    } finally {
      setLoading(false);
    }
  };

  const splits = calculateSplits();

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 tracking-tight">Meal Expense Splitter</h1>
      
      {!receiptData && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center bg-white">
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <input type="file" onChange={handleFileUpload} className="hidden" id="file-upload" />
          <label htmlFor="file-upload" className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            {loading ? 'Processing...' : 'Upload Receipt'}
          </label>
        </div>
      )}

      {receiptData && (
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">People</h2>
            <div className="flex gap-2 mb-4">
              <input 
                value={newPerson} 
                onChange={e => setNewPerson(e.target.value)} 
                placeholder="Person's name"
                className="border p-2 rounded flex-grow"
              />
              <button onClick={addPerson} className="bg-green-600 text-white px-4 py-2 rounded">Add</button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {people.map(p => <span key={p} className="bg-gray-200 px-3 py-1 rounded-full">{p}</span>)}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Assign Items</h2>
            {receiptData.items.map((item) => (
              <div key={item.id} className="py-4 border-b">
                <div className="flex justify-between mb-2">
                  <span className="font-medium">{item.name}</span>
                  <span className="font-mono">${item.price.toFixed(2)}</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {people.map(person => (
                    <button 
                      key={person}
                      onClick={() => toggleAssignment(item.id, person)}
                      className={`px-3 py-1 rounded-full text-sm ${item.assignedTo.includes(person) ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                    >
                      {person}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Final Breakdown</h2>
            {Object.entries(splits).map(([person, amount]) => (
              <div key={person} className="flex justify-between py-2 border-b">
                <span>{person}</span>
                <span className="font-mono font-bold">${amount.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between py-4 font-bold text-lg">
              <span>Total</span>
              <span className="font-mono">${receiptData.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
