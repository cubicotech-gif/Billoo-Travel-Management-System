import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Download, Share2, FileText, CheckCircle, Loader, X } from 'lucide-react';
import { getBookingDocuments } from '../../../lib/api/booking';

interface BookingSummaryReportProps {
  query: any;
  services: any[];
  isOpen: boolean;
  onClose: () => void;
}

export default function BookingSummaryReport({
  query,
  services,
  isOpen,
  onClose
}: BookingSummaryReportProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen, query.id]);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const docs = await getBookingDocuments(query.id);
      setDocuments(docs);
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadReport = () => {
    // Generate text report
    const reportContent = generateTextReport();
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `booking-summary-${query.query_number}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateTextReport = () => {
    const passengerText = [
      query.adults > 0 ? `${query.adults} Adult${query.adults > 1 ? 's' : ''}` : '',
      query.children > 0 ? `${query.children} Child${query.children > 1 ? 'ren' : ''}` : '',
      query.infants > 0 ? `${query.infants} Infant${query.infants > 1 ? 's' : ''}` : ''
    ].filter(Boolean).join(', ');

    const travelDates = query.travel_date && query.return_date
      ? `${format(new Date(query.travel_date), 'MMM dd')} - ${format(new Date(query.return_date), 'MMM dd, yyyy')}`
      : 'TBD';

    let report = `
========================================
BOOKING CONFIRMATION SUMMARY
========================================

Query #${query.query_number}
Customer: ${query.client_name}
Phone: ${query.client_phone}
${query.client_email ? `Email: ${query.client_email}` : ''}

========================================
TRAVEL DETAILS
========================================

Destination: ${query.destination}
Travel Dates: ${travelDates}
Passengers: ${passengerText}
Service Type: ${query.service_type || 'N/A'}

========================================
CONFIRMED BOOKINGS
========================================

`;

    const confirmedServices = services.filter(s => s.booking_status === 'confirmed');

    confirmedServices.forEach((service, index) => {
      report += `
${index + 1}. ${service.service_description}
   Type: ${service.service_type}
   ${service.city ? `Location: ${service.city}` : ''}
   Confirmation: ${service.booking_confirmation || 'N/A'}
   ${service.booked_date ? `Booked: ${format(new Date(service.booked_date), 'MMM dd, yyyy')}` : ''}
   ${service.booking_notes ? `Notes: ${service.booking_notes}` : ''}
`;
    });

    report += `
========================================
BOOKING DOCUMENTS
========================================

Total Documents: ${documents.length}

`;

    documents.forEach((doc, index) => {
      report += `${index + 1}. ${doc.service_description}
   Confirmation: ${doc.booking_confirmation}
   Document: ${doc.voucher_url ? 'Available' : 'Not uploaded'}

`;
    });

    report += `
========================================
Generated on: ${format(new Date(), 'MMM dd, yyyy HH:mm')}
========================================
`;

    return report;
  };

  if (!isOpen) return null;

  const confirmedServices = services.filter(s => s.booking_status === 'confirmed');
  const passengerText = [
    query.adults > 0 ? `${query.adults} Adult${query.adults > 1 ? 's' : ''}` : '',
    query.children > 0 ? `${query.children} Child${query.children > 1 ? 'ren' : ''}` : '',
    query.infants > 0 ? `${query.infants} Infant${query.infants > 1 ? 's' : ''}` : ''
  ].filter(Boolean).join(', ');

  const travelDates = query.travel_date && query.return_date
    ? `${format(new Date(query.travel_date), 'MMM dd')} - ${format(new Date(query.return_date), 'MMM dd, yyyy')}`
    : 'TBD';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Booking Confirmation Summary</h2>
            <p className="text-sm text-gray-600 mt-1">
              Query #{query.query_number} - {query.client_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Travel Details */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Travel Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Destination:</span>
                <div className="font-semibold text-gray-900">{query.destination}</div>
              </div>
              <div>
                <span className="text-gray-600">Travel Dates:</span>
                <div className="font-semibold text-gray-900">{travelDates}</div>
              </div>
              <div>
                <span className="text-gray-600">Passengers:</span>
                <div className="font-semibold text-gray-900">{passengerText}</div>
              </div>
              <div>
                <span className="text-gray-600">Service Type:</span>
                <div className="font-semibold text-gray-900">{query.service_type || 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* Confirmed Bookings */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Confirmed Bookings ({confirmedServices.length})
            </h3>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : confirmedServices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No confirmed bookings yet
              </div>
            ) : (
              <div className="space-y-4">
                {confirmedServices.map((service) => (
                  <div
                    key={service.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{service.service_description}</h4>
                        <p className="text-sm text-gray-600">{service.service_type}</p>
                      </div>
                      <div className="flex items-center gap-1 text-green-700 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        <span>Confirmed</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                      {service.booking_confirmation && (
                        <div>
                          <span className="text-gray-600">Confirmation:</span>
                          <div className="font-mono text-gray-900 font-semibold">
                            {service.booking_confirmation}
                          </div>
                        </div>
                      )}
                      {service.booked_date && (
                        <div>
                          <span className="text-gray-600">Booked:</span>
                          <div className="text-gray-900">
                            {format(new Date(service.booked_date), 'MMM dd, yyyy')}
                          </div>
                        </div>
                      )}
                      {service.city && (
                        <div>
                          <span className="text-gray-600">Location:</span>
                          <div className="text-gray-900">{service.city}</div>
                        </div>
                      )}
                      {service.voucher_url && (
                        <div>
                          <span className="text-gray-600">Voucher:</span>
                          <div>
                            <a
                              href={service.voucher_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" />
                              View Document
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    {service.booking_notes && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <span className="text-xs text-gray-600">Notes:</span>
                        <p className="text-sm text-gray-900 mt-1">{service.booking_notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Booking Documents */}
          {documents.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Attached Documents ({documents.length})
              </h3>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{doc.service_description}</div>
                        <div className="text-xs text-gray-500">
                          Confirmation: {doc.booking_confirmation}
                        </div>
                      </div>
                    </div>
                    {doc.voucher_url && (
                      <a
                        href={doc.voucher_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p>All booking documents are attached. Please keep these confirmations safe for your travel.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleDownloadReport}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Report</span>
          </button>
          <button
            onClick={() => {
              // Placeholder for share functionality
              alert('Share functionality coming soon!');
            }}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            <span>Share with Customer</span>
          </button>
        </div>
      </div>
    </div>
  );
}
