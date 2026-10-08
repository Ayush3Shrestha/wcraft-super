import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  BarChart3,
  DollarSign,
} from 'lucide-react';
import ApiService from '../services/apiService';

const PriceHistory = () => {
  const [silverHistory, setSilverHistory] = useState([]);
  const [goldHistory, setGoldHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('silver'); // 'silver' or 'gold'
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    period: '30', // 30, 60, 90, 365 days
    sortOrder: 'desc' // desc, asc
  });
  
  const itemsPerPage = 10;

  // Fetch price history
  const fetchPriceHistory = async (metal = activeTab, page = currentPage) => {
    try {
      setLoading(page === 1);
      setError(null);

      const response = metal === 'silver' 
        ? await ApiService.getSilverPriceHistory({ page, limit: itemsPerPage })
        : await ApiService.getGoldPriceHistory({ page, limit: itemsPerPage });

      if (metal === 'silver') {
        setSilverHistory(response.history || []);
      } else {
        setGoldHistory(response.history || []);
      }

      setTotalPages(response.pagination?.totalPages || 1);
      setCurrentPage(response.pagination?.currentPage || 1);

    } catch (err) {
      console.error(`Failed to fetch ${metal} price history:`, err);
      setError(`Failed to fetch ${metal} price history. Please try again.`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPriceHistory(activeTab, 1);
    setCurrentPage(1);
  };

  // Tab change handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    fetchPriceHistory(tab, 1);
  };

  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchPriceHistory(activeTab, page);
  };

  // Calculate price change
  const calculatePriceChange = (current, previous) => {
    if (!previous) return { change: 0, percentage: 0, direction: 'stable' };
    
    const change = current - previous;
    const percentage = (change / previous) * 100;
    const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';
    
    return { change: Math.abs(change), percentage: Math.abs(percentage), direction };
  };

  // Get current history data
  const currentHistory = activeTab === 'silver' ? silverHistory : goldHistory;
  const metalName = activeTab === 'silver' ? 'Silver' : 'Gold';
  const metalColor = activeTab === 'silver' ? '#C0C0C0' : '#FFD700';

  useEffect(() => {
    fetchPriceHistory();
  }, []);

  if (loading && currentHistory.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <div className="spinner mb-4"></div>
          <p style={{ color: 'var(--stone-gray)' }}>Loading price history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-display font-bold" style={{ color: 'var(--dark-gray)' }}>
            Price History
          </h2>
          <p className="text-sm" style={{ color: 'var(--stone-gray)' }}>
            Track precious metal price trends over time
          </p>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn btn-secondary btn-sm flex items-center gap-2"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => handleTabChange('silver')}
          className={`px-6 py-2 rounded-md transition-all font-medium ${
            activeTab === 'silver'
              ? 'bg-white shadow-sm text-gray-900'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: '#C0C0C0' }}
            />
            Silver
          </div>
        </button>
        <button
          onClick={() => handleTabChange('gold')}
          className={`px-6 py-2 rounded-md transition-all font-medium ${
            activeTab === 'gold'
              ? 'bg-white shadow-sm text-gray-900'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: '#FFD700' }}
            />
            Gold
          </div>
        </button>
      </div>

      {/* Price History Table */}
      <div className="card">
        <div className="card-body p-0">
          {error ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingDown size={24} className="text-red-600" />
              </div>
              <p className="text-red-600 mb-4">{error}</p>
              <button onClick={handleRefresh} className="btn btn-primary btn-sm">
                Try Again
              </button>
            </div>
          ) : currentHistory.length > 0 ? (
            <>
              {/* Table Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <BarChart3 size={20} style={{ color: metalColor }} />
                  <h3 className="font-semibold text-lg" style={{ color: 'var(--dark-gray)' }}>
                    {metalName} Price History
                  </h3>
                  <span className="px-2 py-1 bg-gray-100 text-xs rounded-full" style={{ color: 'var(--stone-gray)' }}>
                    {currentHistory.length} records
                  </span>
                </div>
              </div>

              {/* Table Content */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price per Tola
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Change
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentHistory.map((record, index) => {
                      const previousPrice = index < currentHistory.length - 1 
                        ? currentHistory[index + 1].pricePerTola 
                        : null;
                      const priceChange = calculatePriceChange(record.pricePerTola, previousPrice);
                      
                      return (
                        <tr key={record._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Calendar size={14} className="text-gray-400 mr-2" />
                              <span className="text-sm font-medium" style={{ color: 'var(--dark-gray)' }}>
                                {new Date(record.effectiveDate).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <DollarSign size={14} className="text-gray-400 mr-1" />
                              <span className="text-lg font-bold" style={{ color: 'var(--saffron)' }}>
                                Rs. {record.pricePerTola.toLocaleString()}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {priceChange.direction !== 'stable' && previousPrice ? (
                              <div className="flex items-center gap-1">
                                {priceChange.direction === 'up' ? (
                                  <TrendingUp size={14} className="text-green-500" />
                                ) : (
                                  <TrendingDown size={14} className="text-red-500" />
                                )}
                                <span
                                  className={`text-sm font-medium ${
                                    priceChange.direction === 'up' ? 'text-green-600' : 'text-red-600'
                                  }`}
                                >
                                  {priceChange.direction === 'up' ? '+' : '-'}Rs. {Math.round(priceChange.change).toLocaleString()}
                                </span>
                                <span
                                  className={`text-xs ${
                                    priceChange.direction === 'up' ? 'text-green-500' : 'text-red-500'
                                  }`}
                                >
                                  ({priceChange.percentage.toFixed(2)}%)
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--stone-gray)' }}>
                            {new Date(record.lastScrapedAt).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm" style={{ color: 'var(--stone-gray)' }}>
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="btn btn-secondary btn-sm disabled:opacity-50"
                      >
                        <ChevronLeft size={16} />
                        Previous
                      </button>
                      
                      {/* Page Numbers */}
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-3 py-1 rounded text-sm ${
                                pageNum === currentPage
                                  ? 'bg-saffron text-white'
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                              style={{
                                backgroundColor: pageNum === currentPage ? 'var(--saffron)' : undefined
                              }}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="btn btn-secondary btn-sm disabled:opacity-50"
                      >
                        Next
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <BarChart3 size={24} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--dark-gray)' }}>
                No Price History Available
              </h3>
              <p className="mb-4" style={{ color: 'var(--stone-gray)' }}>
                {metalName} price history will appear here once data is available.
              </p>
              <button onClick={handleRefresh} className="btn btn-primary">
                Refresh Data
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PriceHistory;
