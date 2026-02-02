import { Trophy, TrendingUp, Star, Download, FileText } from 'lucide-react';
import { Query, QueryService } from '../../../types/query-workflow';
import { format } from 'date-fns';

interface Props {
  query: Query;
  services: QueryService[];
}

export default function StageCompleted({ query, services }: Props) {
  const totalCost = services.reduce((sum, s) => sum + (s.cost_price || 0) * (s.quantity || 1), 0);
  const totalSelling = services.reduce((sum, s) => sum + (s.selling_price || 0) * (s.quantity || 1), 0);
  const totalProfit = totalSelling - totalCost;
  const profitMargin = totalSelling > 0 ? (totalProfit / totalSelling) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Success Banner */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 text-white rounded-full mb-4">
          <Trophy className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-green-900 mb-2">
          ✅ Query Completed Successfully!
        </h2>
        <p className="text-green-700 mb-3">
          All services have been delivered and the customer journey is complete.
        </p>
        {query.completed_date && (
          <p className="text-sm text-green-600">
            Completed on: {format(new Date(query.completed_date), 'MMMM dd, yyyy \'at\' hh:mm a')}
          </p>
        )}
      </div>

      {/* Completion Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Final Summary
        </h3>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-xs text-gray-600 mb-1">Query Information</div>
            <div className="space-y-2 mt-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Query Number:</span>
                <span className="font-medium text-gray-900">#{query.query_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Customer:</span>
                <span className="font-medium text-gray-900">{query.client_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Destination:</span>
                <span className="font-medium text-gray-900">{query.destination}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Services Delivered:</span>
                <span className="font-medium text-gray-900">{services.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-xs text-gray-600 mb-1">Timeline</div>
            <div className="space-y-2 mt-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Query Created:</span>
                <span className="font-medium text-gray-900">
                  {format(new Date(query.created_at), 'MMM dd, yyyy')}
                </span>
              </div>
              {query.proposal_sent_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Proposal Sent:</span>
                  <span className="font-medium text-gray-900">
                    {format(new Date(query.proposal_sent_date), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
              {query.finalized_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Finalized:</span>
                  <span className="font-medium text-gray-900">
                    {format(new Date(query.finalized_date), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
              {query.completed_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Completed:</span>
                  <span className="font-medium text-gray-900">
                    {format(new Date(query.completed_date), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Services Breakdown */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="font-semibold text-gray-900 mb-3">Services Delivered:</h4>
          <div className="space-y-2">
            {services.map((service, index) => (
              <div
                key={service.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-500">#{index + 1}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {service.service_type}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{service.service_description}</p>
                  {service.vendors && (
                    <p className="text-xs text-gray-600">Vendor: {service.vendors.name}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Revenue</div>
                  <div className="font-semibold text-gray-900">
                    Rs {((service.selling_price || 0) * (service.quantity || 1)).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Profit Analysis */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-300 p-6">
        <h3 className="text-xl font-semibold text-green-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Profit Analysis
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="text-xs text-gray-600 mb-2">Total Cost Price</div>
            <div className="text-2xl font-bold text-gray-900">
              Rs {totalCost.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">Paid to vendors</div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="text-xs text-gray-600 mb-2">Total Selling Price</div>
            <div className="text-2xl font-bold text-gray-900">
              Rs {totalSelling.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">Received from customer</div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-green-300">
            <div className="text-xs text-green-700 mb-2">Total Profit</div>
            <div className="text-2xl font-bold text-green-700">
              Rs {totalProfit.toLocaleString()}
            </div>
            <div className="text-xs text-green-600 mt-1">Net earnings</div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-green-300">
            <div className="text-xs text-green-700 mb-2">Profit Margin</div>
            <div className="text-2xl font-bold text-green-700">{profitMargin.toFixed(1)}%</div>
            <div className="text-xs text-green-600 mt-1">
              {profitMargin >= 30 ? 'Excellent!' : profitMargin >= 20 ? 'Good' : 'Fair'}
            </div>
          </div>
        </div>

        {/* Profit Insights */}
        <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">💡 Profit Insights</h4>
          <div className="text-sm text-gray-700 space-y-1">
            {profitMargin >= 30 && (
              <p className="text-green-700">
                ✅ Excellent profit margin! This query was very successful.
              </p>
            )}
            {profitMargin >= 20 && profitMargin < 30 && (
              <p className="text-blue-700">
                ✅ Good profit margin achieved on this query.
              </p>
            )}
            {profitMargin < 20 && profitMargin >= 10 && (
              <p className="text-amber-700">
                ⚠️ Fair profit margin. Consider optimizing pricing in future queries.
              </p>
            )}
            {profitMargin < 10 && (
              <p className="text-red-700">
                ⚠️ Low profit margin. Review pricing strategy for similar queries.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Customer Satisfaction */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          Customer Satisfaction
        </h3>

        {query.customer_feedback ? (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-4">
            <p className="text-sm text-blue-900 italic">"{query.customer_feedback}"</p>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4 text-center">
            <p className="text-sm text-gray-600">No customer feedback recorded yet</p>
          </div>
        )}

        <button
          onClick={() => alert('Phase B: Customer feedback and review system will open here')}
          className="w-full px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
        >
          📝 Collect Post-Trip Feedback
        </button>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => alert('Phase B: Generate comprehensive query report')}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <Download className="w-4 h-4" />
            Download Query Report
          </button>
          <button
            onClick={() => alert('Phase B: Export all documents and financials')}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <FileText className="w-4 h-4" />
            Export All Documents
          </button>
        </div>
      </div>

      {/* Final Note */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <p className="text-sm text-green-800">
          🎉 This query has been successfully completed. All financial transactions are recorded and
          services have been delivered. Great work!
        </p>
      </div>
    </div>
  );
}
