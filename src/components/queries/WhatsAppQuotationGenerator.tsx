import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Query, QueryService } from '../../types/query-workflow';
import { format } from 'date-fns';

interface Props {
  query: Query;
  services: QueryService[];
}

export default function WhatsAppQuotationGenerator({ query, services }: Props) {
  const [copied, setCopied] = useState(false);

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'TBD';
    try {
      return format(new Date(date), 'MMM dd, yyyy');
    } catch {
      return date;
    }
  };

  const calculateNights = (checkIn: string, checkOut: string) => {
    try {
      const nights = Math.ceil(
        (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
      );
      return nights;
    } catch {
      return null;
    }
  };

  const generateMessage = () => {
    const totalPrice = services.reduce((sum, s) => sum + ((s.selling_price || 0) * (s.quantity || 1)), 0);

    const totalPax = (query.adults || 0) + (query.children || 0) + (query.infants || 0);
    const perPersonPrice = totalPax > 0 ? Math.round(totalPrice / totalPax) : totalPrice;

    let message = `السلام علیکم و رحمۃ اللہ\n\n`;
    message += `*${query.client_name}* Sahab,\n\n`;
    message += `Here is your *${query.destination}* package quotation:\n\n`;
    message += `━━━━━━━━━━━━━━━━━━\n`;
    message += `📍 *Destination:* ${query.destination}\n`;

    if (query.travel_date) {
      message += `📅 *Travel Date:* ${formatDate(query.travel_date)}`;
      if (query.return_date) {
        message += ` to ${formatDate(query.return_date)}`;
      }
      message += `\n`;
    }

    message += `👥 *Passengers:* `;
    const paxDetails = [];
    if (query.adults > 0) paxDetails.push(`${query.adults} Adults`);
    if (query.children > 0) paxDetails.push(`${query.children} Children`);
    if (query.infants > 0) paxDetails.push(`${query.infants} Infants`);
    message += paxDetails.join(', ') || '0';
    message += `\n`;

    message += `━━━━━━━━━━━━━━━━━━\n\n`;

    message += `*📦 Package Includes:*\n\n`;

    // Group services by type
    const hotels = services.filter(s => s.service_type === 'Hotel');
    const flights = services.filter(s => s.service_type === 'Flight');
    const transports = services.filter(s => s.service_type === 'Transport');
    const visas = services.filter(s => s.service_type === 'Visa');
    const activities = services.filter(s => s.service_type === 'Activity');
    const guides = services.filter(s => s.service_type === 'Guide');
    const insurances = services.filter(s => s.service_type === 'Insurance');
    const others = services.filter(s =>
      !['Hotel', 'Flight', 'Transport', 'Visa', 'Activity', 'Guide', 'Insurance'].includes(s.service_type)
    );

    if (hotels.length > 0) {
      message += `🏨 *Hotels:*\n`;
      hotels.forEach(h => {
        const details = h.service_details || {};
        message += `• ${details.hotel_name || h.service_description}\n`;
        if (details.room_type) message += `  Room Type: ${details.room_type}\n`;
        if (details.meal_plan) message += `  Meals: ${details.meal_plan}\n`;
        if (details.check_in && details.check_out) {
          const nights = calculateNights(details.check_in, details.check_out);
          if (nights) {
            message += `  Duration: ${nights} night${nights > 1 ? 's' : ''}\n`;
          }
        }
        if (details.star_rating) message += `  Rating: ${details.star_rating} ⭐\n`;
      });
      message += `\n`;
    }

    if (flights.length > 0) {
      message += `✈️ *Flights:*\n`;
      flights.forEach(f => {
        const details = f.service_details || {};
        message += `• ${details.airline || 'Flight'}`;
        if (details.from_city && details.to_city) {
          message += `: ${details.from_city} → ${details.to_city}`;
        }
        message += `\n`;
        if (details.class) message += `  Class: ${details.class}\n`;
        if (details.baggage) message += `  Baggage: ${details.baggage}\n`;
      });
      message += `\n`;
    }

    if (transports.length > 0) {
      message += `🚗 *Transport:*\n`;
      transports.forEach(t => {
        const details = t.service_details || {};
        message += `• ${details.vehicle_type || 'Transport'}\n`;
        if (details.pickup_location) {
          message += `  ${details.pickup_location}`;
          if (details.dropoff_location) {
            message += ` → ${details.dropoff_location}`;
          }
          message += `\n`;
        }
      });
      message += `\n`;
    }

    if (visas.length > 0) {
      message += `📄 *Visa Services:*\n`;
      visas.forEach(v => {
        const details = v.service_details || {};
        message += `• ${details.visa_type || 'Visa'}\n`;
        if (details.processing_time) message += `  Processing: ${details.processing_time}\n`;
      });
      message += `\n`;
    }

    if (activities.length > 0) {
      message += `🎯 *Activities:*\n`;
      activities.forEach(a => {
        const details = a.service_details || {};
        message += `• ${details.activity_name || a.service_description}\n`;
        if (details.duration) message += `  Duration: ${details.duration}\n`;
      });
      message += `\n`;
    }

    if (guides.length > 0) {
      message += `👨‍🏫 *Guide Services:*\n`;
      guides.forEach(g => {
        const details = g.service_details || {};
        message += `• ${details.guide_name || g.service_description}\n`;
        if (details.languages) message += `  Languages: ${details.languages}\n`;
      });
      message += `\n`;
    }

    if (insurances.length > 0) {
      message += `🛡️ *Insurance:*\n`;
      insurances.forEach(i => {
        const details = i.service_details || {};
        message += `• ${details.insurance_type || i.service_description}\n`;
        if (details.coverage_amount) message += `  Coverage: ${details.coverage_amount}\n`;
      });
      message += `\n`;
    }

    if (others.length > 0) {
      message += `📋 *Additional Services:*\n`;
      others.forEach(o => {
        message += `• ${o.service_description}\n`;
      });
      message += `\n`;
    }

    message += `━━━━━━━━━━━━━━━━━━\n\n`;
    message += `💰 *Package Price:*\n`;
    message += `Total: *Rs ${totalPrice.toLocaleString()}*\n`;

    if (totalPax > 1) {
      message += `Per Person: *Rs ${perPersonPrice.toLocaleString()}*\n`;
    }

    message += `\n━━━━━━━━━━━━━━━━━━\n\n`;
    message += `📌 *Important Notes:*\n`;
    message += `• Valid for ${query.is_tentative_dates ? 'tentative dates (subject to availability)' : 'confirmed dates'}\n`;
    message += `• Payment terms will be discussed\n`;
    message += `• Subject to availability at time of booking\n\n`;

    message += `📞 *Contact Us:*\n`;
    message += `☎️ ${query.client_phone || 'Contact Number'}\n`;
    message += `📧 ${query.client_email || 'Email'}\n\n`;

    message += `🌟 *Billoo Travels*\n`;
    message += `Your Trusted Travel Partner\n\n`;
    message += `*JazakAllah Khair!* 🤲`;

    return message;
  };

  const copyToClipboard = () => {
    const message = generateMessage();
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    });
  };

  const openWhatsApp = () => {
    const message = generateMessage();
    const phoneNumber = query.client_phone?.replace(/[^0-9]/g, '') || '';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span className="text-2xl">💬</span>
        WhatsApp Quotation
      </h3>

      <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-200 mb-4 max-h-96 overflow-y-auto">
        <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800 leading-relaxed">
          {generateMessage()}
        </pre>
      </div>

      <div className="flex gap-3">
        <button
          onClick={copyToClipboard}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
        >
          {copied ? (
            <>
              <Check className="w-5 h-5 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-5 h-5" />
              Copy Message
            </>
          )}
        </button>

        {query.client_phone && (
          <button
            onClick={openWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <span className="text-xl">📱</span>
            Send via WhatsApp
          </button>
        )}
      </div>

      <p className="text-sm text-gray-600 mt-3 text-center">
        {query.client_phone
          ? 'Copy and paste or send directly to WhatsApp'
          : 'Copy and paste this message to WhatsApp manually'}
      </p>
    </div>
  );
}
