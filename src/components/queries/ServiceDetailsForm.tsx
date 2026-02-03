interface ServiceDetailsFormProps {
  serviceType: string;
  details: any;
  onChange: (details: any) => void;
}

export default function ServiceDetailsForm({ serviceType, details, onChange }: ServiceDetailsFormProps) {

  const updateDetail = (field: string, value: any) => {
    onChange({ ...details, [field]: value });
  };

  const renderHotelFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Check-in Date *
          </label>
          <input
            type="date"
            value={details.check_in || ''}
            onChange={(e) => updateDetail('check_in', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Check-out Date *
          </label>
          <input
            type="date"
            value={details.check_out || ''}
            onChange={(e) => updateDetail('check_out', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Hotel Name *
        </label>
        <input
          type="text"
          value={details.hotel_name || ''}
          onChange={(e) => updateDetail('hotel_name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., Hilton Makkah Convention Hotel"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Room Type *
          </label>
          <select
            value={details.room_type || ''}
            onChange={(e) => updateDetail('room_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Select...</option>
            <option value="Single">Single</option>
            <option value="Double">Double</option>
            <option value="Triple">Triple</option>
            <option value="Quad">Quad</option>
            <option value="Suite">Suite</option>
            <option value="Family Room">Family Room</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Rooms *
          </label>
          <input
            type="number"
            min="1"
            value={details.rooms || 1}
            onChange={(e) => updateDetail('rooms', parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meal Plan
          </label>
          <select
            value={details.meal_plan || ''}
            onChange={(e) => updateDetail('meal_plan', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select...</option>
            <option value="Room Only">Room Only</option>
            <option value="Breakfast Included">Breakfast Included</option>
            <option value="Half Board">Half Board (Breakfast + Dinner)</option>
            <option value="Full Board">Full Board (All Meals)</option>
            <option value="All Inclusive">All Inclusive</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Star Rating
          </label>
          <select
            value={details.star_rating || ''}
            onChange={(e) => updateDetail('star_rating', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select...</option>
            <option value="3">3 Star</option>
            <option value="4">4 Star</option>
            <option value="5">5 Star</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderFlightFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Departure Date & Time *
          </label>
          <input
            type="datetime-local"
            value={details.departure_date || ''}
            onChange={(e) => updateDetail('departure_date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Return Date & Time
          </label>
          <input
            type="datetime-local"
            value={details.return_date || ''}
            onChange={(e) => updateDetail('return_date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Airline *
        </label>
        <input
          type="text"
          value={details.airline || ''}
          onChange={(e) => updateDetail('airline', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., PIA, Emirates, Saudi Airlines"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Flight Number
          </label>
          <input
            type="text"
            value={details.flight_number || ''}
            onChange={(e) => updateDetail('flight_number', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., PK-301"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Class
          </label>
          <select
            value={details.class || ''}
            onChange={(e) => updateDetail('class', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select...</option>
            <option value="Economy">Economy</option>
            <option value="Premium Economy">Premium Economy</option>
            <option value="Business">Business</option>
            <option value="First Class">First Class</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            From (City) *
          </label>
          <input
            type="text"
            value={details.from_city || ''}
            onChange={(e) => updateDetail('from_city', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Karachi"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            To (City) *
          </label>
          <input
            type="text"
            value={details.to_city || ''}
            onChange={(e) => updateDetail('to_city', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Jeddah"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Baggage Allowance
        </label>
        <input
          type="text"
          value={details.baggage || ''}
          onChange={(e) => updateDetail('baggage', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., 30kg checked + 7kg cabin"
        />
      </div>
    </div>
  );

  const renderTransportFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pickup Date & Time *
          </label>
          <input
            type="datetime-local"
            value={details.pickup_datetime || ''}
            onChange={(e) => updateDetail('pickup_datetime', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Drop-off Date & Time
          </label>
          <input
            type="datetime-local"
            value={details.dropoff_datetime || ''}
            onChange={(e) => updateDetail('dropoff_datetime', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pickup Location *
          </label>
          <input
            type="text"
            value={details.pickup_location || ''}
            onChange={(e) => updateDetail('pickup_location', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Jeddah Airport Terminal 1"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Drop-off Location
          </label>
          <input
            type="text"
            value={details.dropoff_location || ''}
            onChange={(e) => updateDetail('dropoff_location', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Hotel in Makkah"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Vehicle Type *
        </label>
        <select
          value={details.vehicle_type || ''}
          onChange={(e) => updateDetail('vehicle_type', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="">Select...</option>
          <option value="Sedan">Sedan (4 passengers)</option>
          <option value="SUV">SUV (6 passengers)</option>
          <option value="Van">Van (8-10 passengers)</option>
          <option value="Mini Bus">Mini Bus (15-20 passengers)</option>
          <option value="Coach">Coach (30+ passengers)</option>
          <option value="Luxury Car">Luxury Car</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Driver Details (Optional)
        </label>
        <input
          type="text"
          value={details.driver_info || ''}
          onChange={(e) => updateDetail('driver_info', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Driver name and contact"
        />
      </div>
    </div>
  );

  const renderVisaFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Visa Type *
        </label>
        <select
          value={details.visa_type || ''}
          onChange={(e) => updateDetail('visa_type', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="">Select...</option>
          <option value="Umrah Visa">Umrah Visa</option>
          <option value="Hajj Visa">Hajj Visa</option>
          <option value="Tourist Visa">Tourist Visa</option>
          <option value="Business Visa">Business Visa</option>
          <option value="Visit Visa">Visit Visa</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nationality *
          </label>
          <input
            type="text"
            value={details.nationality || ''}
            onChange={(e) => updateDetail('nationality', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Pakistani"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Processing Time
          </label>
          <input
            type="text"
            value={details.processing_time || ''}
            onChange={(e) => updateDetail('processing_time', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., 5-7 business days"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Validity Period
        </label>
        <input
          type="text"
          value={details.validity || ''}
          onChange={(e) => updateDetail('validity', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., 30 days from date of issue"
        />
      </div>
    </div>
  );

  const renderActivityFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Activity Name *
        </label>
        <input
          type="text"
          value={details.activity_name || ''}
          onChange={(e) => updateDetail('activity_name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., Desert Safari, City Tour"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration
          </label>
          <input
            type="text"
            value={details.duration || ''}
            onChange={(e) => updateDetail('duration', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., 4 hours, Full day"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location
          </label>
          <input
            type="text"
            value={details.location || ''}
            onChange={(e) => updateDetail('location', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Dubai Desert"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          What's Included
        </label>
        <textarea
          value={details.includes || ''}
          onChange={(e) => updateDetail('includes', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
          placeholder="e.g., Pickup/dropoff, Refreshments, Guide"
        />
      </div>
    </div>
  );

  const renderGuideFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Guide Name *
        </label>
        <input
          type="text"
          value={details.guide_name || ''}
          onChange={(e) => updateDetail('guide_name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., Ahmed Ali"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Languages Spoken
        </label>
        <input
          type="text"
          value={details.languages || ''}
          onChange={(e) => updateDetail('languages', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., English, Urdu, Arabic"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration
          </label>
          <input
            type="text"
            value={details.duration || ''}
            onChange={(e) => updateDetail('duration', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., 2 hours, Full trip"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meeting Point
          </label>
          <input
            type="text"
            value={details.meeting_point || ''}
            onChange={(e) => updateDetail('meeting_point', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Hotel lobby"
          />
        </div>
      </div>
    </div>
  );

  const renderInsuranceFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Insurance Type *
        </label>
        <select
          value={details.insurance_type || ''}
          onChange={(e) => updateDetail('insurance_type', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="">Select...</option>
          <option value="Travel Insurance">Travel Insurance</option>
          <option value="Health Insurance">Health Insurance</option>
          <option value="Trip Cancellation">Trip Cancellation Insurance</option>
          <option value="Medical Emergency">Medical Emergency Coverage</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Coverage Amount
          </label>
          <input
            type="text"
            value={details.coverage_amount || ''}
            onChange={(e) => updateDetail('coverage_amount', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., $50,000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Provider
          </label>
          <input
            type="text"
            value={details.provider || ''}
            onChange={(e) => updateDetail('provider', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Adamjee Insurance"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Policy Number
        </label>
        <input
          type="text"
          value={details.policy_number || ''}
          onChange={(e) => updateDetail('policy_number', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Policy number (if available)"
        />
      </div>
    </div>
  );

  // Return appropriate fields based on service type
  return (
    <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200 mt-4">
      <h4 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
        <span>📋</span>
        {serviceType} Specific Details
      </h4>
      {serviceType === 'Hotel' && renderHotelFields()}
      {serviceType === 'Flight' && renderFlightFields()}
      {serviceType === 'Transport' && renderTransportFields()}
      {serviceType === 'Visa' && renderVisaFields()}
      {serviceType === 'Activity' && renderActivityFields()}
      {serviceType === 'Guide' && renderGuideFields()}
      {serviceType === 'Insurance' && renderInsuranceFields()}
      {!['Hotel', 'Flight', 'Transport', 'Visa', 'Activity', 'Guide', 'Insurance'].includes(serviceType) && (
        <p className="text-gray-500 text-sm text-center py-4">
          No specific details required for this service type
        </p>
      )}
    </div>
  );
}
