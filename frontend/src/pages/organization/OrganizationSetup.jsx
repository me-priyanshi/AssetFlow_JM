import React, { useState } from 'react';
import DepartmentsTab from './DepartmentsTab';
import AssetCategoriesTab from './AssetCategoriesTab';
import EmployeeDirectoryTab from './EmployeeDirectoryTab';

const OrganizationSetup = () => {
  const [activeTab, setActiveTab] = useState('departments');

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-6">Organization Setup</h1>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200">
            {['departments', 'categories', 'employees'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          <div className="p-6">
            {activeTab === 'departments' && <DepartmentsTab />}
            {activeTab === 'categories' && <AssetCategoriesTab />}
            {activeTab === 'employees' && <EmployeeDirectoryTab />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSetup;
