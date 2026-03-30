'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import type {
  ServiceType,
  Currency,
  HotelPricing as HotelPricingType,
  FlightPricing as FlightPricingType,
  SimplePricing as SimplePricingType,
  CreateServiceInput,
  QueryService,
} from '@/types/query';
import { SERVICE_TYPE_CONFIG } from '@/types/query';
import { SUPPORTED_CURRENCIES, formatCurrency } from '@/lib/formatCurrency';

import { queryServiceApi } from '@/lib/api/queries';

import HotelPricingComponent from '@/components/queries/services/pricing/HotelPricing';
import FlightPricingComponent from '@/components/queries/services/pricing/FlightPricing';
import SimplePricingComponent from '@/components/queries/services/pricing/SimplePricing';

import HotelDetails from '@/components/queries/services/details/HotelDetails';
import FlightDetails from '@/components/queries/services/details/FlightDetails';
import VisaDetails from '@/components/queries/services/details/VisaDetails';
import TransportDetails from '@/components/queries/services/details/TransportDetails';
import TourDetails from '@/components/queries/services/details/TourDetails';
import InsuranceDetails from '@/components/queries/services/details/InsuranceDetails';
import OtherDetails from '@/components/queries/services/details/OtherDetails';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  queryId: string;
  editingService?: QueryService;
  defaultPax?: { adults: number; children: number; infants: number };
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

const SERVICE_TYPES: { value: ServiceType; label: string }[] = Object.entries(
  SERVICE_TYPE_CONFIG
).map(([value, config]) => ({ value: value as ServiceType, label: config.label }));

function getDefaultHotelPricing(): HotelPricingType {
  return { cost_per_night: 0, selling_per_night: 0, rooms: 1, nights: 1 };
}

function getDefaultFlightPricing(
  defaultPax?: Props['defaultPax']
): FlightPricingType {
  return {
    adult: { cost: 0, selling: 0, count: defaultPax?.adults ?? 1 },
    child: { cost: 0, selling: 0, count: defaultPax?.children ?? 0 },
    infant: { cost: 0, selling: 0, count: defaultPax?.infants ?? 0 },
  };
}

function getDefaultSimplePricing(): SimplePricingType {
  return { unit_cost: 0, unit_selling: 0, quantity: 1 };
}

function calcHotelTotals(p: HotelPricingType) {
  const cost = p.cost_per_night * p.rooms * p.nights;
  const selling = p.selling_per_night * p.rooms * p.nights;
  return { cost, selling };
}

function calcFlightTotals(p: FlightPricingType) {
  const cost =
    p.adult.cost * p.adult.count +
    p.child.cost * p.child.count +
    p.infant.cost * p.infant.count;
  const selling =
    p.adult.selling * p.adult.count +
    p.child.selling * p.child.count +
    p.infant.selling * p.infant.count;
  return { cost, selling };
}

function calcSimpleTotals(p: SimplePricingType) {
  const cost = p.unit_cost * p.quantity;
  const selling = p.unit_selling * p.quantity;
  return { cost, selling };
}

export default function AddEditServiceModal({
  isOpen,
  onClose,
  onSaved,
  queryId,
  editingService,
  defaultPax,
}: Props) {
  const isEditing = !!editingService;

  // ---- Form state ----
  const [serviceType, setServiceType] = useState<ServiceType>('hotel');
  const [description, setDescription] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [currency, setCurrency] = useState<Currency>('PKR');
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [serviceStartDate, setServiceStartDate] = useState('');
  const [serviceEndDate, setServiceEndDate] = useState('');
  const [serviceDetails, setServiceDetails] = useState<Record<string, any>>({});

  // Pricing state per type
  const [hotelPricing, setHotelPricing] = useState<HotelPricingType>(
    getDefaultHotelPricing()
  );
  const [flightPricing, setFlightPricing] = useState<FlightPricingType>(
    getDefaultFlightPricing(defaultPax)
  );
  const [simplePricing, setSimplePricing] = useState<SimplePricingType>(
    getDefaultSimplePricing()
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Populate form when editing ----
  useEffect(() => {
    if (!isOpen) return;

    if (editingService) {
      setServiceType(editingService.service_type);
      setDescription(editingService.description || '');
      setVendorName(editingService.vendor_name || '');
      setCurrency(editingService.currency);
      setExchangeRate(editingService.exchange_rate ?? 1);
      setNotes(editingService.notes || '');
      setServiceStartDate(editingService.service_start_date || '');
      setServiceEndDate(editingService.service_end_date || '');
      setServiceDetails(editingService.service_details || {});

      const pd = editingService.pricing_details || {};
      if (editingService.service_type === 'hotel') {
        setHotelPricing({
          cost_per_night: pd.cost_per_night ?? 0,
          selling_per_night: pd.selling_per_night ?? 0,
          rooms: pd.rooms ?? 1,
          nights: pd.nights ?? 1,
        });
      } else if (editingService.service_type === 'flight') {
        setFlightPricing({
          adult: pd.adult ?? { cost: 0, selling: 0, count: defaultPax?.adults ?? 1 },
          child: pd.child ?? { cost: 0, selling: 0, count: defaultPax?.children ?? 0 },
          infant: pd.infant ?? { cost: 0, selling: 0, count: defaultPax?.infants ?? 0 },
        });
      } else {
        setSimplePricing({
          unit_cost: pd.unit_cost ?? 0,
          unit_selling: pd.unit_selling ?? 0,
          quantity: pd.quantity ?? 1,
        });
      }
    } else {
      // Reset for new service
      setServiceType('hotel');
      setDescription('');
      setVendorName('');
      setCurrency('PKR');
      setExchangeRate(1);
      setNotes('');
      setServiceStartDate('');
      setServiceEndDate('');
      setServiceDetails({});
      setHotelPricing(getDefaultHotelPricing());
      setFlightPricing(getDefaultFlightPricing(defaultPax));
      setSimplePricing(getDefaultSimplePricing());
    }

    setError(null);
    setSaving(false);
  }, [isOpen, editingService, defaultPax]);

  // ---- Calculated totals ----
  const totals = useMemo(() => {
    if (serviceType === 'hotel') return calcHotelTotals(hotelPricing);
    if (serviceType === 'flight') return calcFlightTotals(flightPricing);
    return calcSimpleTotals(simplePricing);
  }, [serviceType, hotelPricing, flightPricing, simplePricing]);

  const costPrice = totals.cost;
  const sellingPrice = totals.selling;
  const profit = sellingPrice - costPrice;
  const effectiveRate = currency === 'PKR' ? 1 : exchangeRate;
  const costPricePkr = Math.round(costPrice * effectiveRate * 100) / 100;
  const sellingPricePkr = Math.round(sellingPrice * effectiveRate * 100) / 100;
  const profitPkr = Math.round(profit * effectiveRate * 100) / 100;

  // ---- Pricing details object ----
  const getPricingDetails = useCallback((): Record<string, any> => {
    if (serviceType === 'hotel') return { ...hotelPricing };
    if (serviceType === 'flight') return { ...flightPricing };
    return { ...simplePricing };
  }, [serviceType, hotelPricing, flightPricing, simplePricing]);

  // ---- Handle service type change ----
  const handleServiceTypeChange = (newType: ServiceType) => {
    setServiceType(newType);
    setServiceDetails({});
  };

  // ---- Save ----
  const handleSave = async () => {
    if (!description.trim()) {
      setError('Description is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: CreateServiceInput = {
        query_id: queryId,
        service_type: serviceType,
        description: description.trim(),
        vendor_name: vendorName.trim() || undefined,
        currency,
        exchange_rate: currency === 'PKR' ? 1 : exchangeRate,
        cost_price: costPrice,
        selling_price: sellingPrice,
        profit,
        cost_price_pkr: costPricePkr,
        selling_price_pkr: sellingPricePkr,
        profit_pkr: profitPkr,
        pricing_details: getPricingDetails(),
        service_details: serviceDetails,
        service_start_date: serviceStartDate || undefined,
        service_end_date: serviceEndDate || undefined,
        notes: notes.trim() || undefined,
      };

      if (isEditing && editingService) {
        await queryServiceApi.update(editingService.id, payload);
      } else {
        await queryServiceApi.add(payload);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save service. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ---- Render pricing component ----
  const renderPricing = () => {
    if (serviceType === 'hotel') {
      return (
        <HotelPricingComponent
          pricing={hotelPricing}
          onChange={setHotelPricing}
          currency={currency}
        />
      );
    }
    if (serviceType === 'flight') {
      return (
        <FlightPricingComponent
          pricing={flightPricing}
          onChange={setFlightPricing}
          currency={currency}
        />
      );
    }
    return (
      <SimplePricingComponent
        pricing={simplePricing}
        onChange={setSimplePricing}
        currency={currency}
      />
    );
  };

  // ---- Render detail fields ----
  const renderDetails = () => {
    const props = { details: serviceDetails, onChange: setServiceDetails };
    switch (serviceType) {
      case 'hotel':
        return <HotelDetails {...props} />;
      case 'flight':
        return <FlightDetails {...props} />;
      case 'visa':
        return <VisaDetails {...props} />;
      case 'transport':
        return <TransportDetails {...props} />;
      case 'tour':
        return <TourDetails {...props} />;
      case 'insurance':
        return <InsuranceDetails {...props} />;
      case 'other':
        return <OtherDetails {...props} />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="relative my-4 w-full max-w-3xl rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Service' : 'Add Service'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[calc(100vh-10rem)] space-y-6 overflow-y-auto px-6 py-5">
          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* 1. Service Type */}
          <div>
            <label className={labelClass}>Service Type</label>
            <select
              className={inputClass}
              value={serviceType}
              onChange={(e) => handleServiceTypeChange(e.target.value as ServiceType)}
            >
              {SERVICE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Description */}
          <div>
            <label className={labelClass}>
              Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={inputClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the service"
            />
          </div>

          {/* 3. Vendor */}
          <div>
            <label className={labelClass}>Vendor Name</label>
            <input
              type="text"
              className={inputClass}
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="Enter vendor / supplier name"
            />
          </div>

          {/* 4. Currency & Exchange Rate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Currency</label>
              <select
                className={inputClass}
                value={currency}
                onChange={(e) => {
                  const newCurrency = e.target.value as Currency;
                  setCurrency(newCurrency);
                  if (newCurrency === 'PKR') {
                    setExchangeRate(1);
                  }
                }}
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
            {currency !== 'PKR' && (
              <div>
                <label className={labelClass}>
                  Exchange Rate (1 {currency} = ? PKR)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.0001"
                  className={inputClass}
                  value={exchangeRate || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setExchangeRate(isNaN(val) ? 0 : val);
                  }}
                  placeholder="e.g. 74.50"
                />
              </div>
            )}
          </div>

          {/* 5. Pricing */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Pricing</h3>
            {renderPricing()}

            {/* PKR summary when foreign currency */}
            {currency !== 'PKR' && exchangeRate > 0 && (
              <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-4 space-y-1">
                <p className="text-xs font-medium text-blue-800 mb-2">
                  PKR Equivalent (Rate: {exchangeRate})
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">Cost in PKR</span>
                  <span className="font-medium text-blue-900">
                    {formatCurrency(costPricePkr, 'PKR')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">Selling in PKR</span>
                  <span className="font-medium text-blue-900">
                    {formatCurrency(sellingPricePkr, 'PKR')}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t border-blue-200 pt-1">
                  <span className="text-blue-700">Profit in PKR</span>
                  <span
                    className={`font-semibold ${
                      profitPkr > 0
                        ? 'text-green-600'
                        : profitPkr < 0
                          ? 'text-red-600'
                          : 'text-gray-600'
                    }`}
                  >
                    {formatCurrency(profitPkr, 'PKR')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 6. Service Details */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              {SERVICE_TYPE_CONFIG[serviceType].label} Details
            </h3>
            {renderDetails()}
          </div>

          {/* 7. Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Service Start Date</label>
              <input
                type="date"
                className={inputClass}
                value={serviceStartDate}
                onChange={(e) => setServiceStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Service End Date</label>
              <input
                type="date"
                className={inputClass}
                value={serviceEndDate}
                onChange={(e) => setServiceEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* 8. Notes */}
          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              className={inputClass}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes about this service"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isEditing ? 'Update Service' : 'Add Service'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
