# Proposal Management Integration Guide

This guide explains how to integrate the new Proposal Management features into the existing query system.

## Components Created

### 1. Core Components
- ✅ **SendProposalModal.tsx** - Modal for sending proposals to customers
- ✅ **CustomerResponseModal.tsx** - Log customer responses to proposals
- ✅ **FinalizePackageModal.tsx** - Finalize accepted proposals
- ✅ **QueryTimeline.tsx** - Visual timeline of query progress
- ✅ **ProposalSummaryPanel.tsx** - Comprehensive proposal summary

### 2. Utilities & Types
- ✅ **src/types/proposals.ts** - TypeScript types and constants
- ✅ **src/lib/proposalUtils.ts** - Calculation and template utilities
- ✅ **src/lib/api/proposals.ts** - API functions for proposals

### 3. Database
- ✅ **Migration: 20260128_query_proposals.sql** - Database schema
- ✅ **Updated database.ts** - TypeScript types for new tables

## Updated Workflow Statuses

Replace the existing WORKFLOW_STAGES in EnhancedQueries.tsx with:

```typescript
const WORKFLOW_STAGES = [
  { value: 'New Query - Not Responded', label: '🆕 New Query', color: 'red', priority: 1 },
  { value: 'Responded - Awaiting Reply', label: '💬 Awaiting Reply', color: 'blue', priority: 2 },
  { value: 'Working on Proposal', label: '📝 Working on Proposal', color: 'yellow', priority: 3 },
  { value: 'Proposal Sent', label: '📤 Proposal Sent', color: 'purple', priority: 4 },
  { value: 'Revisions Requested', label: '🔄 Revisions Requested', color: 'orange', priority: 5 },
  { value: 'Finalized & Booking', label: '✅ Finalized & Booking', color: 'indigo', priority: 6 },
  { value: 'Services Booked', label: '🎫 Services Booked', color: 'teal', priority: 7 },
  { value: 'In Delivery', label: '🚀 In Delivery', color: 'cyan', priority: 8 },
  { value: 'Completed', label: '✔️ Completed', color: 'green', priority: 9 },
  { value: 'Cancelled', label: '❌ Cancelled', color: 'gray', priority: 10 },
]
```

## Integration Steps for Query Detail Page

### Step 1: Add Required Imports

```typescript
import SendProposalModal from '@/components/queries/SendProposalModal'
import CustomerResponseModal from '@/components/queries/CustomerResponseModal'
import FinalizePackageModal from '@/components/queries/FinalizePackageModal'
import QueryTimeline from '@/components/queries/QueryTimeline'
import ProposalSummaryPanel from '@/components/queries/ProposalSummaryPanel'
import { calculateProposalTotals } from '@/lib/proposalUtils'
import { getQueryServicesForProposal, getLatestProposal } from '@/lib/api/proposals'
```

### Step 2: Add State for Modals

```typescript
const [showSendProposalModal, setShowSendProposalModal] = useState(false)
const [showCustomerResponseModal, setShowCustomerResponseModal] = useState(false)
const [showFinalizeModal, setShowFinalizeModal] = useState(false)
const [proposalCalculation, setProposalCalculation] = useState(null)
const [latestProposal, setLatestProposal] = useState(null)
```

### Step 3: Load Proposal Data

```typescript
useEffect(() => {
  if (selectedQuery) {
    loadProposalData(selectedQuery.id)
  }
}, [selectedQuery])

const loadProposalData = async (queryId: string) => {
  try {
    const services = await getQueryServicesForProposal(queryId)
    const totalPassengers = selectedQuery.adults + selectedQuery.children + selectedQuery.infants
    const calc = calculateProposalTotals(services, totalPassengers)
    setProposalCalculation(calc)

    const proposal = await getLatestProposal(queryId)
    setLatestProposal(proposal)
  } catch (error) {
    console.error('Error loading proposal data:', error)
  }
}
```

### Step 4: Add Proposal Section to Query Detail View

In your query detail section, add after the services section:

```tsx
{/* Proposal Management Section */}
{selectedQuery && ['Working on Proposal', 'Proposal Sent', 'Revisions Requested',
  'Finalized & Booking', 'Services Booked', 'In Delivery', 'Completed'].includes(selectedQuery.status) && (
  <ProposalSummaryPanel
    query={selectedQuery}
    onSendProposal={() => setShowSendProposalModal(true)}
    onLogResponse={() => setShowCustomerResponseModal(true)}
    onFinalize={() => setShowFinalizeModal(true)}
  />
)}

{/* Query Timeline */}
{selectedQuery && (
  <QueryTimeline query={selectedQuery} />
)}
```

### Step 5: Add Modal Components

At the end of your component, before the closing div:

```tsx
{/* Send Proposal Modal */}
{showSendProposalModal && selectedQuery && proposalCalculation && (
  <SendProposalModal
    isOpen={showSendProposalModal}
    onClose={() => setShowSendProposalModal(false)}
    query={selectedQuery}
    calculation={proposalCalculation}
    onSuccess={() => {
      loadQueries()
      loadProposalData(selectedQuery.id)
    }}
  />
)}

{/* Customer Response Modal */}
{showCustomerResponseModal && latestProposal && (
  <CustomerResponseModal
    isOpen={showCustomerResponseModal}
    onClose={() => setShowCustomerResponseModal(false)}
    proposalId={latestProposal.id}
    proposalVersion={latestProposal.version_number}
    onSuccess={() => {
      loadQueries()
      loadProposalData(selectedQuery.id)
    }}
  />
)}

{/* Finalize Package Modal */}
{showFinalizeModal && selectedQuery && proposalCalculation && (
  <FinalizePackageModal
    isOpen={showFinalizeModal}
    onClose={() => setShowFinalizeModal(false)}
    queryId={selectedQuery.id}
    totalAmount={proposalCalculation.totalSelling}
    travelDate={selectedQuery.travel_date}
    onSuccess={() => {
      loadQueries()
      loadProposalData(selectedQuery.id)
    }}
  />
)}
```

## Query Card Enhancements

Add proposal status to query cards:

```tsx
{/* Proposal Status Badge */}
{query.status === 'Proposal Sent' && latestProposal && (
  <div className="mt-2 flex items-center text-xs text-purple-600">
    <Clock className="w-3 h-3 mr-1" />
    Sent {formatRelativeTime(latestProposal.sent_date)}
    {latestProposal.valid_until && (
      <span className="ml-2">
        • {getDaysRemaining(latestProposal.valid_until)} days left
      </span>
    )}
  </div>
)}

{query.status === 'Revisions Requested' && latestProposal?.customer_feedback && (
  <div className="mt-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
    {latestProposal.customer_feedback}
  </div>
)}
```

## Quick Action Buttons

Update query card actions based on status:

```tsx
const renderQuickActions = (query: Query) => {
  switch (query.status) {
    case 'Working on Proposal':
      return (
        <button
          onClick={() => handleSendProposal(query)}
          className="btn btn-sm btn-primary"
        >
          <Send className="w-4 h-4 mr-1" />
          Send Proposal
        </button>
      )

    case 'Proposal Sent':
      return (
        <button
          onClick={() => handleLogResponse(query)}
          className="btn btn-sm btn-purple"
        >
          <MessageCircle className="w-4 h-4 mr-1" />
          Log Response
        </button>
      )

    case 'Revisions Requested':
      return (
        <button
          onClick={() => handleSendProposal(query)}
          className="btn btn-sm btn-orange"
        >
          <Edit className="w-4 h-4 mr-1" />
          Send Revised Proposal
        </button>
      )

    case 'Finalized & Booking':
      return (
        <span className="text-sm text-green-600 font-medium">
          ✅ Ready to book with vendors
        </span>
      )

    default:
      return null
  }
}
```

## Dashboard Filters

Add new filters for proposal stages:

```tsx
const getProposalFilters = () => [
  { value: 'proposals_sent', label: 'Proposals Sent', count: queries.filter(q => q.status === 'Proposal Sent').length },
  { value: 'awaiting_response', label: 'Awaiting Response', count: queries.filter(q => q.status === 'Proposal Sent').length },
  { value: 'revisions', label: 'Revisions Requested', count: queries.filter(q => q.status === 'Revisions Requested').length },
  { value: 'finalized', label: 'Finalized', count: queries.filter(q => q.status === 'Finalized & Booking').length },
]
```

## Testing Checklist

### Phase 1: Basic Proposal Flow
- [ ] Create a query and move it to "Working on Proposal" status
- [ ] Click "Send Proposal" and verify modal opens
- [ ] Select communication channels (WhatsApp, Email)
- [ ] Verify proposal text is auto-generated with correct details
- [ ] Send proposal and verify query status changes to "Proposal Sent"
- [ ] Verify proposal is saved in query_proposals table

### Phase 2: Customer Response
- [ ] Click "Customer Responded?" on a sent proposal
- [ ] Test "Accepted" response → Status changes to "Finalized & Booking"
- [ ] Test "Wants Changes" → Status changes to "Revisions Requested"
- [ ] Test "Rejected" → Status changes to "Cancelled"
- [ ] Test "Needs Time" → Status remains "Proposal Sent"
- [ ] Verify customer feedback is saved

### Phase 3: Revision Flow
- [ ] On a "Revisions Requested" query, verify revision banner shows
- [ ] Edit services (change hotel, price, etc.)
- [ ] Click "Send Revised Proposal"
- [ ] Verify new proposal version (v2) is created
- [ ] Verify old proposal status changed to "revised"
- [ ] Verify changes are tracked between versions

### Phase 4: Finalization
- [ ] Accept a proposal to trigger finalization modal
- [ ] Enter advance payment details (optional)
- [ ] Finalize package
- [ ] Verify status changes to "Finalized & Booking"
- [ ] Verify advance payment is recorded
- [ ] Verify proposal is locked (no more edits)

### Phase 5: Timeline & History
- [ ] Open query detail and verify timeline shows all events
- [ ] Verify proposal history shows all versions
- [ ] Verify dates and timestamps are accurate
- [ ] Test viewing previous proposal versions
- [ ] Verify changes between versions are highlighted

### Phase 6: Edge Cases
- [ ] Test expired proposals (validity period passed)
- [ ] Test sending proposal without services
- [ ] Test duplicate proposal sends
- [ ] Test concurrent responses to same proposal
- [ ] Test deleting a query with proposals
- [ ] Test mobile responsiveness of all modals

## Database Migration

Run the migration:

```bash
# Apply the migration
psql -U your_user -d your_database -f supabase/migrations/20260128_query_proposals.sql

# Or if using Supabase CLI:
supabase migration up
```

## API Endpoints Verification

Verify these functions work:
- `getNextProposalVersion()` - Returns correct version number
- `createProposal()` - Creates proposal and updates query
- `getQueryProposals()` - Fetches all proposals for a query
- `getLatestProposal()` - Fetches latest proposal
- `updateProposalResponse()` - Updates response and changes status
- `finalizeQuery()` - Finalizes query and records payment

## Common Issues & Solutions

### Issue: Proposal text not generating
**Solution:** Check that services exist for the query and calculation is complete

### Issue: Status not updating after response
**Solution:** Verify RLS policies allow updates on queries table

### Issue: Modal not closing after success
**Solution:** Ensure `onSuccess()` callback is called and modal state resets

### Issue: Timeline events out of order
**Solution:** Check date fields are properly set and timezone handling is correct

### Issue: Expired proposals not detected
**Solution:** Run `updateExpiredProposals()` periodically or on page load

## Performance Optimization

1. **Lazy load proposal data** - Only fetch when needed
2. **Cache proposal calculations** - Avoid recalculating on every render
3. **Batch proposal updates** - Group status changes
4. **Index database queries** - Ensure proper indexes on query_id and sent_date

## Next Steps (Phase B)

After this phase is complete and tested, proceed to:
- **Phase B: Vendor Booking** - Book services with vendors
- **Phase C: Payment Tracking** - Track customer payments
- **Phase D: Service Delivery** - Manage service delivery and completion

## Support & Documentation

- All components are fully typed with TypeScript
- PropTypes are defined in component interfaces
- Utility functions have JSDoc comments
- Database functions have SQL comments

For questions or issues, refer to the component source code which includes detailed comments.
