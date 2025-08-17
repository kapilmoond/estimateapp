
import React from 'react';
import { HsrItem } from '../types';

interface HsrItemsDisplayProps {
  items: HsrItem[];
}

export const HsrItemsDisplay: React.FC<HsrItemsDisplayProps> = ({ items }) => {
  return (
    <div className="space-y-4 max-h-96 overflow-y-auto bg-gray-50 p-4 rounded-lg border border-gray-200">
      {items.map((item, index) => (
        <div key={index} className="p-4 border border-gray-200 rounded-md bg-white shadow-sm">
          <p className="font-bold text-gray-800">HSR No.: <span className="font-normal text-gray-600">{item['HSR No.']}</span></p>
          <p className="font-bold text-gray-800 mt-1">Description:</p>
          <p className="text-gray-600">{item.Description}</p>
          <div className="flex justify-between mt-2 text-sm">
            <p className="font-bold text-gray-800">Unit: <span className="font-normal text-gray-600">{item.Unit}</span></p>
            <p className="font-bold text-gray-800">Rate: <span className="font-normal text-gray-600">₹{item['Current Rate']}</span></p>
          </div>
        </div>
      ))}
    </div>
  );
};
