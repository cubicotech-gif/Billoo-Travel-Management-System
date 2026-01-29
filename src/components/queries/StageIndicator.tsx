import {
  AlertCircle, Clock, FileText, Send, Edit,
  CheckCircle, Package, Truck, Trophy, XCircle
} from 'lucide-react';

interface StageIndicatorProps {
  status: string;
}

interface StageInfo {
  icon: React.ReactNode;
  title: string;
  message: string;
  nextAction: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

const getStageInfo = (status: string): StageInfo => {
  const stages: Record<string, StageInfo> = {
    'New Query - Not Responded': {
      icon: <AlertCircle className="w-6 h-6" />,
      title: 'New Query - Needs Response',
      message: 'Fresh query received. Customer is waiting for your response.',
      nextAction: 'Respond to customer and start building proposal',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      textColor: 'text-red-900'
    },
    'Responded - Awaiting Reply': {
      icon: <Clock className="w-6 h-6" />,
      title: 'Awaiting Customer Reply',
      message: 'You\'ve responded to the customer. Waiting for their reply.',
      nextAction: 'Wait for customer response, then continue with proposal',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-300',
      textColor: 'text-yellow-900'
    },
    'Working on Proposal': {
      icon: <FileText className="w-6 h-6" />,
      title: 'Building Package Proposal',
      message: 'Create a detailed proposal by adding services (hotels, flights, transport, etc.)',
      nextAction: 'Add services and send proposal to customer',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300',
      textColor: 'text-blue-900'
    },
    'Proposal Sent': {
      icon: <Send className="w-6 h-6" />,
      title: 'Proposal Sent - Awaiting Customer Response',
      message: 'Package proposal has been sent to customer. Waiting for their feedback.',
      nextAction: 'Log customer response (approved, rejected, or needs changes)',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300',
      textColor: 'text-green-900'
    },
    'Revisions Requested': {
      icon: <Edit className="w-6 h-6" />,
      title: 'Customer Requested Changes',
      message: 'Customer reviewed the proposal and requested modifications.',
      nextAction: 'Update services based on feedback and resend proposal',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-300',
      textColor: 'text-purple-900'
    },
    'Finalized & Booking': {
      icon: <CheckCircle className="w-6 h-6" />,
      title: 'Package Approved - Ready to Book!',
      message: 'Customer approved the package. Time to book services with vendors.',
      nextAction: 'Pay vendors, upload booking confirmations, and confirm all services',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-300',
      textColor: 'text-teal-900'
    },
    'Services Booked': {
      icon: <Package className="w-6 h-6" />,
      title: 'All Services Booked Successfully',
      message: 'All vendors paid, all bookings confirmed. Package is ready for delivery.',
      nextAction: 'Track service delivery and customer experience',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-300',
      textColor: 'text-indigo-900'
    },
    'In Delivery': {
      icon: <Truck className="w-6 h-6" />,
      title: 'Services In Delivery',
      message: 'Customer is currently using the booked services. Track their experience.',
      nextAction: 'Monitor service delivery, mark complete when finished',
      bgColor: 'bg-cyan-50',
      borderColor: 'border-cyan-300',
      textColor: 'text-cyan-900'
    },
    'Completed': {
      icon: <Trophy className="w-6 h-6" />,
      title: 'Query Completed Successfully!',
      message: 'Customer journey complete. All services delivered successfully.',
      nextAction: 'Review profit margins and customer satisfaction',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300',
      textColor: 'text-green-900'
    },
    'Cancelled': {
      icon: <XCircle className="w-6 h-6" />,
      title: 'Query Cancelled',
      message: 'This query was cancelled or lost. No further action needed.',
      nextAction: 'Review cancellation reason and learn from feedback',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-300',
      textColor: 'text-gray-900'
    }
  };

  return stages[status] || {
    icon: <AlertCircle className="w-6 h-6" />,
    title: 'Unknown Status',
    message: 'Status not recognized',
    nextAction: 'Update query status',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
    textColor: 'text-gray-900'
  };
};

export default function StageIndicator({ status }: StageIndicatorProps) {
  const stageInfo = getStageInfo(status);

  return (
    <div className={`${stageInfo.bgColor} border-2 ${stageInfo.borderColor} rounded-lg p-6 shadow-sm`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`${stageInfo.textColor} flex-shrink-0`}>
          {stageInfo.icon}
        </div>

        {/* Content */}
        <div className="flex-1">
          <h2 className={`text-xl font-bold ${stageInfo.textColor} mb-2`}>
            {stageInfo.title}
          </h2>
          <p className={`text-sm ${stageInfo.textColor} mb-3 opacity-90`}>
            {stageInfo.message}
          </p>
          <div className={`inline-flex items-center gap-2 text-sm font-medium ${stageInfo.textColor} bg-white bg-opacity-50 px-3 py-1.5 rounded-lg`}>
            <span className="text-xs opacity-75">NEXT STEP:</span>
            <span>{stageInfo.nextAction}</span>
          </div>
        </div>

        {/* Stage number badge (optional) */}
        <div className={`${stageInfo.textColor} bg-white bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg flex-shrink-0`}>
          {getStageNumber(status)}
        </div>
      </div>
    </div>
  );
}

function getStageNumber(status: string): string {
  const stageNumbers: Record<string, string> = {
    'New Query - Not Responded': '1',
    'Responded - Awaiting Reply': '2',
    'Working on Proposal': '3',
    'Proposal Sent': '4',
    'Revisions Requested': '5',
    'Finalized & Booking': '6',
    'Services Booked': '7',
    'In Delivery': '8',
    'Completed': '✓',
    'Cancelled': '✗'
  };

  return stageNumbers[status] || '?';
}
