import { CheckCircle, Clock, Send, XCircle } from 'lucide-react';
import { BookingStatus } from '../../types/query-workflow';

interface Props {
  status: BookingStatus;
  className?: string;
}

export default function BookingStatusBadge({ status, className = '' }: Props) {
  const getStatusConfig = () => {
    switch (status) {
      case 'confirmed':
        return {
          icon: <CheckCircle className="w-3 h-3" />,
          label: 'Confirmed',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200'
        };
      case 'payment_sent':
        return {
          icon: <Send className="w-3 h-3" />,
          label: 'Payment Sent',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200'
        };
      case 'cancelled':
        return {
          icon: <XCircle className="w-3 h-3" />,
          label: 'Cancelled',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-200'
        };
      case 'pending':
      default:
        return {
          icon: <Clock className="w-3 h-3" />,
          label: 'Pending',
          bgColor: 'bg-amber-100',
          textColor: 'text-amber-800',
          borderColor: 'border-amber-200'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
