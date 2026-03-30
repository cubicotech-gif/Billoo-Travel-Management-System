import UmrahFields from './UmrahFields';
import HajjFields from './HajjFields';
import VisaFields from './VisaFields';
import FlightFields from './FlightFields';
import HotelFields from './HotelFields';
import TransportFields from './TransportFields';
import LeisureFields from './LeisureFields';
import OtherFields from './OtherFields';

interface Props {
  category: string;
  details: Record<string, any>;
  onChange: (details: Record<string, any>) => void;
  departureDate: string;
  returnDate: string;
}

export default function ServiceCategoryFields({ category, details, onChange, departureDate, returnDate }: Props) {
  switch (category) {
    case 'umrah':
      return <UmrahFields details={details} onChange={onChange} departureDate={departureDate} returnDate={returnDate} />;
    case 'hajj':
      return <HajjFields details={details} onChange={onChange} />;
    case 'visa_only':
      return <VisaFields details={details} onChange={onChange} />;
    case 'flight_only':
      return <FlightFields details={details} onChange={onChange} />;
    case 'hotel_only':
      return <HotelFields details={details} onChange={onChange} />;
    case 'transport_only':
      return <TransportFields details={details} onChange={onChange} />;
    case 'leisure':
      return <LeisureFields details={details} onChange={onChange} />;
    case 'other':
      return <OtherFields details={details} onChange={onChange} />;
    default:
      return null;
  }
}
