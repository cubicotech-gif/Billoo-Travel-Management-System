import { useRef } from 'react';
import { X, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '../../lib/formatCurrency';
import type { ItineraryData, ItineraryPassenger } from '../../lib/api/queries';
import type { QueryService } from '../../types/query-workflow';

interface Props {
  data: ItineraryData;
  onClose: () => void;
}

const SERVICE_ORDER: Record<string, number> = {
  Flight: 1, Hotel: 2, Transport: 3, Visa: 4, Insurance: 5,
  'Tour Package': 6, Umrah: 7, Hajj: 8, Other: 9,
};

function sortServices(services: QueryService[]): QueryService[] {
  return [...services].sort((a, b) => {
    // First by date
    if (a.service_date && b.service_date) {
      return new Date(a.service_date).getTime() - new Date(b.service_date).getTime();
    }
    if (a.service_date) return -1;
    if (b.service_date) return 1;
    // Then by type priority
    return (SERVICE_ORDER[a.service_type] || 9) - (SERVICE_ORDER[b.service_type] || 9);
  });
}

function getServiceIcon(type: string): string {
  switch (type) {
    case 'Flight': return '&#9992;&#65039;';
    case 'Hotel': return '&#127976;';
    case 'Transport': return '&#128656;';
    case 'Visa': return '&#128203;';
    case 'Insurance': return '&#128737;&#65039;';
    case 'Tour Package': case 'Umrah': case 'Hajj': return '&#127771;';
    default: return '&#128204;';
  }
}

function renderServiceDetail(service: QueryService): string {
  const details = service.service_details || {};
  const lines: string[] = [];

  if (service.service_type === 'Flight') {
    if (details.airline) lines.push(`<strong>Airline:</strong> ${details.airline}${details.flight_number ? ` | Flight: ${details.flight_number}` : ''}`);
    if (details.from_city || details.to_city) lines.push(`<strong>Route:</strong> ${details.from_city || '—'} → ${details.to_city || '—'}`);
    if (details.class) lines.push(`<strong>Class:</strong> ${details.class}`);
    if (details.pnr) lines.push(`<strong>PNR:</strong> ${details.pnr}`);
  } else if (service.service_type === 'Hotel') {
    if (details.hotel_name) lines.push(`<strong>Hotel:</strong> ${details.hotel_name}`);
    if (details.check_in) lines.push(`<strong>Check-in:</strong> ${formatDate(details.check_in)}${details.check_out ? ` | <strong>Check-out:</strong> ${formatDate(details.check_out)}` : ''}`);
    if (details.room_type) lines.push(`<strong>Room Type:</strong> ${details.room_type}${details.rooms ? ` | Rooms: ${details.rooms}` : ''}`);
    if (details.meal_plan) lines.push(`<strong>Meal Plan:</strong> ${details.meal_plan}`);
  } else if (service.service_type === 'Transport') {
    if (details.vehicle_type) lines.push(`<strong>Vehicle:</strong> ${details.vehicle_type}`);
    if (details.pickup_location) lines.push(`<strong>Pickup:</strong> ${details.pickup_location}`);
    if (details.route) lines.push(`<strong>Route:</strong> ${details.route}`);
  } else if (service.service_type === 'Visa') {
    if (details.visa_type) lines.push(`<strong>Type:</strong> ${details.visa_type}`);
    if (details.status) lines.push(`<strong>Status:</strong> ${details.status}`);
  }

  // Generic: booking confirmation
  if (service.booking_confirmation) {
    lines.push(`<strong>Booking Ref:</strong> ${service.booking_confirmation}`);
  }

  return lines.join('<br/>');
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export default function ItineraryPrintView({ data, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const { query, passengers, services, financialSummary } = data;
  const sortedServices = sortServices(services);

  const totalPax = query.adults + query.children + query.infants;

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html><html><head>
        <title>Itinerary - ${query.query_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #1a202c; padding: 40px; font-size: 12px; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 24px; border-bottom: 3px solid #1a365d; padding-bottom: 16px; }
          .header h1 { color: #1a365d; font-size: 22px; margin-bottom: 2px; letter-spacing: 2px; }
          .header h2 { color: #4a5568; font-size: 14px; font-weight: normal; }
          .info-box { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .info-label { color: #718096; font-size: 11px; text-transform: uppercase; }
          .info-value { font-weight: 600; }
          .section-title { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #1a365d; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin: 20px 0 12px; font-weight: 700; }
          .passenger-list { padding: 0; list-style: none; }
          .passenger-list li { padding: 6px 0; border-bottom: 1px solid #edf2f7; display: flex; justify-content: space-between; }
          .service-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 12px; page-break-inside: avoid; }
          .service-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
          .service-type { font-weight: 700; font-size: 13px; color: #1a365d; }
          .service-desc { font-weight: 600; margin-bottom: 6px; }
          .service-details { color: #4a5568; font-size: 11px; line-height: 1.8; }
          .service-vendor { color: #718096; font-size: 11px; margin-top: 4px; }
          .voucher-link { color: #2b6cb0; font-size: 11px; }
          .notes-box { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 14px; margin-top: 20px; }
          .notes-title { font-weight: 700; color: #92400e; margin-bottom: 6px; }
          .notes-list { padding-left: 16px; color: #78350f; font-size: 11px; }
          .payment-box { background: #f0fff4; border: 1px solid #9ae6b4; border-radius: 8px; padding: 14px; margin-top: 16px; }
          .payment-row { display: flex; justify-content: space-between; padding: 4px 0; }
          .payment-label { color: #4a5568; }
          .payment-value { font-weight: 600; }
          .footer { text-align: center; margin-top: 32px; padding-top: 16px; border-top: 2px solid #1a365d; color: #718096; font-size: 11px; }
          .footer strong { color: #1a365d; }
          @media print { body { padding: 20px; } .no-print { display: none; } }
        </style>
      </head><body>${content.innerHTML}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleWhatsApp = () => {
    let text = `*BILLOO TRAVEL SERVICES*\n_Travel Itinerary_\n\n`;
    text += `*Ref:* ${query.query_number}\n`;
    text += `*Guest:* ${query.client_name}${totalPax > 0 ? ` (${totalPax} pax)` : ''}\n`;
    text += `*Destination:* ${query.destination}\n`;
    if (query.travel_date) text += `*Dates:* ${formatDate(query.travel_date)}${query.return_date ? ` — ${formatDate(query.return_date)}` : ''}\n`;
    text += `\n--- ITINERARY ---\n\n`;

    sortedServices.forEach((s, i) => {
      text += `*${i + 1}. ${s.service_type}*\n`;
      text += `${s.service_description}\n`;
      if (s.service_date) text += `Date: ${formatDate(s.service_date)}\n`;
      if (s.booking_confirmation) text += `Ref: ${s.booking_confirmation}\n`;
      text += `\n`;
    });

    text += `--- PAYMENT ---\n`;
    text += `Total: ${formatCurrency(financialSummary.total)}\n`;
    if (financialSummary.paid > 0) text += `Paid: ${formatCurrency(financialSummary.paid)}\n`;
    if (financialSummary.pending > 0) text += `Balance: ${formatCurrency(financialSummary.pending)}\n`;
    text += `\n_Thank you for choosing Billoo Travel Services_`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <h2 className="text-lg font-bold text-gray-900">Travel Itinerary Preview</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsApp}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Share via WhatsApp
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Print / PDF
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto p-6">
          <div ref={printRef}>
            {/* Header */}
            <div className="header">
              <h1>BILLOO TRAVEL SERVICES</h1>
              <h2>Travel Itinerary &amp; Voucher</h2>
            </div>

            {/* Booking Info */}
            <div className="info-box">
              <div className="info-grid">
                <div>
                  <div className="info-label">Booking Reference</div>
                  <div className="info-value">{query.query_number}</div>
                </div>
                <div>
                  <div className="info-label">Prepared For</div>
                  <div className="info-value">{query.client_name}{totalPax > 0 ? ` (${totalPax} passengers)` : ''}</div>
                </div>
                <div>
                  <div className="info-label">Destination</div>
                  <div className="info-value">{query.destination}</div>
                </div>
                <div>
                  <div className="info-label">Travel Dates</div>
                  <div className="info-value">
                    {query.travel_date ? formatDate(query.travel_date) : '—'}
                    {query.return_date ? ` — ${formatDate(query.return_date)}` : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Passengers */}
            {passengers.length > 0 && (
              <>
                <div className="section-title">PASSENGERS</div>
                <ul className="passenger-list">
                  {passengers.map((p: ItineraryPassenger, i: number) => (
                    <li key={i}>
                      <span>{i + 1}. {p.first_name} {p.last_name}{p.gender ? ` (${p.gender})` : ''}</span>
                      {p.passport_number && <span>Passport: {p.passport_number}</span>}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Itinerary */}
            <div className="section-title">ITINERARY</div>
            {sortedServices.map((service, idx) => {
              const detailHtml = renderServiceDetail(service);

              return (
                <div key={service.id} className="service-card">
                  <div className="service-header">
                    <span className="service-type">
                      <span dangerouslySetInnerHTML={{ __html: getServiceIcon(service.service_type) }} />{' '}
                      {service.service_type.toUpperCase()}
                      {service.service_date && (
                        <span style={{ fontWeight: 'normal', fontSize: '11px', color: '#718096', marginLeft: '8px' }}>
                          {formatDate(service.service_date)}
                        </span>
                      )}
                    </span>
                    <span style={{ fontSize: '11px', color: '#718096' }}>#{idx + 1}</span>
                  </div>
                  <div className="service-desc">{service.service_description}</div>
                  {detailHtml && (
                    <div className="service-details" dangerouslySetInnerHTML={{ __html: detailHtml }} />
                  )}
                  {service.vendors && (
                    <div className="service-vendor">Vendor: {service.vendors.name}</div>
                  )}
                  {service.voucher_url && (
                    <div className="voucher-link">
                      <a href={service.voucher_url} target="_blank" rel="noopener noreferrer">
                        View Voucher
                      </a>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Important Notes */}
            <div className="notes-box">
              <div className="notes-title">IMPORTANT NOTES</div>
              <ul className="notes-list">
                <li>Check-in time: 2:00 PM | Check-out time: 12:00 PM (unless otherwise stated)</li>
                <li>Keep passport and visa copies at all times</li>
                <li>Arrive at the airport at least 3 hours before departure</li>
                <li>Contact us immediately for any service issues</li>
              </ul>
            </div>

            {/* Payment Summary */}
            <div className="payment-box">
              <div style={{ fontWeight: 700, color: '#276749', marginBottom: '8px' }}>PAYMENT SUMMARY</div>
              <div className="payment-row">
                <span className="payment-label">Total Package:</span>
                <span className="payment-value">{formatCurrency(financialSummary.total)}</span>
              </div>
              {financialSummary.paid > 0 && (
                <div className="payment-row">
                  <span className="payment-label">Paid:</span>
                  <span className="payment-value" style={{ color: '#276749' }}>
                    {formatCurrency(financialSummary.paid)}
                  </span>
                </div>
              )}
              {financialSummary.pending > 0 && (
                <div className="payment-row" style={{ borderTop: '1px solid #9ae6b4', paddingTop: '6px', marginTop: '4px' }}>
                  <span className="payment-label" style={{ fontWeight: 600 }}>Balance Due:</span>
                  <span className="payment-value" style={{ color: '#c53030' }}>
                    {formatCurrency(financialSummary.pending)}
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="footer">
              <p>Thank you for choosing <strong>Billoo Travel Services</strong></p>
              <p style={{ marginTop: '4px' }}>Contact: +92-21-XXXXXXX | billoo.travel@gmail.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
