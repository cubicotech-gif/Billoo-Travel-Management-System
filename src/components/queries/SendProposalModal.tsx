import React, { useState, useEffect } from 'react';
import { X, Send, Edit, FileText } from 'lucide-react';
import type { Database } from '../../types/database';
import type { ProposalCalculation } from '../../types/proposals';
import { COMMUNICATION_CHANNELS } from '../../types/proposals';
import {
  generateProposalText,
  getDefaultProposalTemplate,
  formatCurrency
} from '../../lib/proposalUtils';
import {
  createProposal,
  getNextProposalVersion,
  getQueryServicesForProposal
} from '../../lib/api/proposals';

type Query = Database['public']['Tables']['queries']['Row'];

interface SendProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: Query;
  calculation: ProposalCalculation;
  onSuccess: () => void;
}

export default function SendProposalModal({
  isOpen,
  onClose,
  query,
  calculation,
  onSuccess
}: SendProposalModalProps) {
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['whatsapp', 'email']);
  const [proposalText, setProposalText] = useState('');
  const [validityDays, setValidityDays] = useState(7);
  const [isCustomMessage, setIsCustomMessage] = useState(false);
  const [generatePDF, setGeneratePDF] = useState(false);
  const [detailedBreakdown, setDetailedBreakdown] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate default proposal text
  useEffect(() => {
    if (isOpen && !isCustomMessage) {
      const template = getDefaultProposalTemplate();
      const text = generateProposalText(template, query, calculation, validityDays);
      setProposalText(text);
    }
  }, [isOpen, query, calculation, validityDays, isCustomMessage]);

  const handleChannelToggle = (channelId: string) => {
    setSelectedChannels(prev =>
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  const handleSendProposal = async () => {
    if (selectedChannels.length === 0) {
      setError('Please select at least one communication channel');
      return;
    }

    if (!proposalText.trim()) {
      setError('Proposal message cannot be empty');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      // Get user ID from auth
      const userId = localStorage.getItem('userId') || '';

      // Get next version number
      const versionNumber = await getNextProposalVersion(query.id);

      // Get services snapshot
      const services = await getQueryServicesForProposal(query.id);

      // Create proposal
      await createProposal(
        {
          queryId: query.id,
          versionNumber,
          proposalText,
          servicesSnapshot: services,
          totalAmount: calculation.totalSelling,
          costAmount: calculation.totalCost,
          profitAmount: calculation.totalProfit,
          profitPercentage: calculation.profitPercentage,
          sentVia: selectedChannels,
          validityDays
        },
        userId
      );

      // Success!
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error sending proposal:', err);
      setError('Failed to send proposal. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleUseCustomMessage = () => {
    setIsCustomMessage(true);
  };

  const handleUseTemplate = () => {
    setIsCustomMessage(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Send Proposal to Customer</h2>
            <p className="text-sm text-gray-500 mt-1">
              {query.client_name} • {query.client_phone}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Send Via */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Send Via:
            </label>
            <div className="space-y-2">
              {COMMUNICATION_CHANNELS.map(channel => (
                <label
                  key={channel.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedChannels.includes(channel.id)}
                    onChange={() => handleChannelToggle(channel.id)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-xl">{channel.icon}</span>
                  <span className="text-gray-700">
                    {channel.label}
                    {channel.id === 'whatsapp' && query.client_phone && (
                      <span className="text-gray-500 ml-1">({query.client_phone})</span>
                    )}
                    {channel.id === 'email' && query.client_email && (
                      <span className="text-gray-500 ml-1">({query.client_email})</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Proposal Message */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Proposal Message:
              </label>
              <div className="flex space-x-2">
                {isCustomMessage ? (
                  <button
                    onClick={handleUseTemplate}
                    className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center"
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    Use Template
                  </button>
                ) : (
                  <button
                    onClick={handleUseCustomMessage}
                    className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Use Custom Message
                  </button>
                )}
              </div>
            </div>
            <textarea
              value={proposalText}
              onChange={(e) => setProposalText(e.target.value)}
              rows={16}
              className="w-full border border-gray-300 rounded-lg p-4 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Proposal message will be generated here..."
            />
            <p className="text-xs text-gray-500 mt-2">
              {proposalText.length} characters
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={generatePDF}
                onChange={(e) => setGeneratePDF(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Save as PDF and attach</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={detailedBreakdown}
                onChange={(e) => setDetailedBreakdown(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Generate detailed breakdown</span>
            </label>
          </div>

          {/* Validity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proposal Validity:
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">Valid for</span>
              <input
                type="number"
                value={validityDays}
                onChange={(e) => setValidityDays(parseInt(e.target.value) || 7)}
                min={1}
                max={90}
                className="w-20 border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <span className="text-gray-600">days</span>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
            <h4 className="font-medium text-indigo-900 mb-2">Package Summary</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-indigo-700">Total Services:</span>
                <span className="font-medium text-indigo-900">{calculation.totalServices}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-indigo-700">Total Package:</span>
                <span className="font-medium text-indigo-900">{formatCurrency(calculation.totalSelling)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-indigo-700">Per Person:</span>
                <span className="font-medium text-indigo-900">{formatCurrency(calculation.perPersonCost)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition"
            disabled={isSending}
          >
            Cancel
          </button>
          <div className="flex space-x-3">
            <button
              onClick={handleSendProposal}
              disabled={isSending || selectedChannels.length === 0}
              className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSending ? 'Sending...' : 'Send Proposal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
