import HajjFields from './HajjFields'
import VisaFields from './VisaFields'
import FlightFields from './FlightFields'
import HotelFields from './HotelFields'
import TransportFields from './TransportFields'
import LeisureFields from './LeisureFields'
import OtherFields from './OtherFields'

interface ServiceFieldsRouterProps {
  serviceType: string
  values: Record<string, any>
  onChange: (field: string, value: any) => void
  totalPax?: number
}

export default function ServiceFieldsRouter({ serviceType, values, onChange, totalPax }: ServiceFieldsRouterProps) {
  // Umrah fields are handled directly in the main form (they have dedicated DB columns)
  // This router handles all OTHER service types via the service_details JSONB column.
  switch (serviceType) {
    case 'Hajj Package':
      return <HajjFields values={values} onChange={onChange} />
    case 'Visa Service':
      return <VisaFields values={values} onChange={onChange} totalPax={totalPax} />
    case 'Ticket Booking':
      return <FlightFields values={values} onChange={onChange} />
    case 'Hotel Only':
      return <HotelFields values={values} onChange={onChange} />
    case 'Transport Service':
      return <TransportFields values={values} onChange={onChange} />
    case 'Leisure Tourism':
      return <LeisureFields values={values} onChange={onChange} />
    case 'Other':
      return <OtherFields values={values} onChange={onChange} />
    default:
      return null
  }
}
