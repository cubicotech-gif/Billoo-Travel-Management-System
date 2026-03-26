import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, ChevronRight } from 'lucide-react';
import { getProximityAlerts, type ProximityAlert } from '../../lib/api/queries';

export default function TravelAlertBanner() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<ProximityAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const data = await getProximityAlerts();
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load travel alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || alerts.length === 0) return null;

  const urgentCount = alerts.filter(a => a.severity === 'urgent').length;
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;

  return (
    <div className={`rounded-xl border p-4 ${
      urgentCount > 0
        ? 'bg-red-50 border-red-200'
        : criticalCount > 0
        ? 'bg-orange-50 border-orange-200'
        : 'bg-amber-50 border-amber-200'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-5 h-5 ${urgentCount > 0 ? 'text-red-600' : 'text-amber-600'}`} />
          <h3 className="font-semibold text-gray-900">
            Travel Alerts ({alerts.length})
          </h3>
        </div>
      </div>

      <div className="space-y-2">
        {alerts.slice(0, 5).map(alert => (
          <div
            key={alert.queryId}
            onClick={() => navigate(`/queries/${alert.queryId}`)}
            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
              alert.severity === 'urgent'
                ? 'bg-red-100 hover:bg-red-200 border border-red-300'
                : alert.severity === 'critical'
                ? 'bg-orange-100 hover:bg-orange-200 border border-orange-300'
                : 'bg-amber-100 hover:bg-amber-200 border border-amber-300'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {alert.queryNumber} - {alert.clientName}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  alert.severity === 'urgent' ? 'bg-red-600 text-white' :
                  alert.severity === 'critical' ? 'bg-orange-600 text-white' :
                  'bg-amber-600 text-white'
                }`}>
                  {alert.daysUntilTravel === 0 ? 'TODAY' : `${alert.daysUntilTravel}d`}
                </span>
              </div>
              <div className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {alert.destination} &middot; {alert.issues.join(' | ')}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </div>
        ))}
      </div>

      {alerts.length > 5 && (
        <button
          onClick={() => navigate('/queries')}
          className="mt-2 text-xs text-gray-600 hover:text-gray-900 underline"
        >
          View all {alerts.length} alerts
        </button>
      )}
    </div>
  );
}
