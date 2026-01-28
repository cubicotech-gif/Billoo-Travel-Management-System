# Testing Guide - Query Phase A: Proposal Management

This guide provides step-by-step testing procedures for the complete Proposal Management system.

## Prerequisites

### 1. Database Setup
```bash
# Run the migration
psql -U your_user -d your_database -f supabase/migrations/20260128_query_proposals.sql

# Verify tables created
psql -U your_user -d your_database -c "\dt query_proposals"

# Verify new columns added to queries table
psql -U your_user -d your_database -c "\d queries"
```

### 2. Test Data Setup
Create test queries with the following scenarios:
- Query 1: Fresh query ready for proposal
- Query 2: Query with existing proposal sent
- Query 3: Query with revisions requested
- Query 4: Finalized query
- Query 5: Query with expired proposal

## Test Suite 1: Proposal Creation & Sending

### Test 1.1: Create Initial Proposal
**Objective:** Verify proposal can be created from query with services

**Steps:**
1. Navigate to Queries page
2. Select a query with status "Working on Proposal"
3. Ensure query has at least 1 service added
4. Click "Send Proposal" button
5. Verify SendProposalModal opens

**Expected Results:**
- ✅ Modal displays with correct query details
- ✅ Customer name and contact info are pre-filled
- ✅ Proposal text is auto-generated with all services
- ✅ WhatsApp and Email channels are selected by default
- ✅ Validity is set to 7 days by default
- ✅ Package summary shows correct totals

**SQL Verification:**
```sql
-- Check query has services
SELECT * FROM vendor_transactions WHERE query_id = 'query-id-here';

-- After sending, verify proposal created
SELECT * FROM query_proposals WHERE query_id = 'query-id-here' ORDER BY version_number DESC LIMIT 1;

-- Verify query updated
SELECT status, proposal_sent_date, current_proposal_version FROM queries WHERE id = 'query-id-here';
```

### Test 1.2: Customize Proposal Text
**Objective:** Verify custom proposal text works

**Steps:**
1. In SendProposalModal, click "Use Custom Message"
2. Edit the proposal text
3. Add custom message
4. Click "Send Proposal"

**Expected Results:**
- ✅ Can edit proposal text freely
- ✅ Custom text is saved in database
- ✅ Proposal sends successfully with custom text

### Test 1.3: Multi-Channel Delivery
**Objective:** Test sending via multiple channels

**Steps:**
1. Select all three channels: WhatsApp, Email, SMS
2. Send proposal
3. Verify sent_via array in database

**Expected Results:**
- ✅ All selected channels are saved
- ✅ sent_via = ['whatsapp', 'email', 'sms']
- ✅ Communication is logged for each channel

### Test 1.4: Validity Period
**Objective:** Test custom validity periods

**Steps:**
1. Change validity from 7 to 14 days
2. Send proposal
3. Check valid_until date

**Expected Results:**
- ✅ valid_until = sent_date + 14 days
- ✅ Validity date shown in proposal text
- ✅ Days remaining calculated correctly

### Test 1.5: Proposal Without Services
**Objective:** Verify error handling for empty proposals

**Steps:**
1. Try to send proposal for query with no services
2. Observe error message

**Expected Results:**
- ✅ Error message displayed
- ✅ Cannot send proposal without services
- ✅ User prompted to add services first

---

## Test Suite 2: Customer Response Tracking

### Test 2.1: Log Accepted Response
**Objective:** Test accepted proposal flow

**Steps:**
1. Select query with status "Proposal Sent"
2. Click "Customer Responded?" button
3. Select "Accepted - Ready to proceed"
4. Add feedback: "Customer confirmed, ready to book"
5. Set response date to today
6. Click "Save Response"

**Expected Results:**
- ✅ Proposal status changes to 'accepted'
- ✅ Query status changes to "Finalized & Booking"
- ✅ Customer feedback saved
- ✅ Response date recorded
- ✅ FinalizePackageModal opens automatically

**SQL Verification:**
```sql
-- Check proposal updated
SELECT status, customer_response, customer_feedback, response_date
FROM query_proposals WHERE id = 'proposal-id';

-- Check query updated
SELECT status, finalized_date FROM queries WHERE id = 'query-id';
```

### Test 2.2: Log Revisions Requested
**Objective:** Test revision request flow

**Steps:**
1. Select query with proposal sent
2. Click "Customer Responded?"
3. Select "Wants Changes - Needs revision"
4. Add feedback: "Hotel too expensive, need cheaper option"
5. Save response

**Expected Results:**
- ✅ Proposal status = 'revised'
- ✅ Query status = "Revisions Requested"
- ✅ Revision banner displays in query detail
- ✅ Customer feedback shown in banner
- ✅ "Edit Services" and "Send Revised Proposal" buttons visible

### Test 2.3: Log Rejected Response
**Objective:** Test rejection flow

**Steps:**
1. Select query with proposal sent
2. Log response as "Rejected - Not interested"
3. Add feedback: "Customer chose different travel agent"
4. Save response

**Expected Results:**
- ✅ Proposal status = 'rejected'
- ✅ Query status = "Cancelled"
- ✅ Query moved to cancelled section
- ✅ No further actions available

### Test 2.4: Customer Needs Time
**Objective:** Test "needs time" response

**Steps:**
1. Log response as "Needs more time"
2. Add feedback: "Customer will decide in 3 days"
3. Save response

**Expected Results:**
- ✅ Proposal status = 'sent'
- ✅ Query status remains "Proposal Sent"
- ✅ Validity countdown continues
- ✅ Can log response again later

---

## Test Suite 3: Revision Workflow

### Test 3.1: Create Revised Proposal
**Objective:** Test sending revised proposal after changes

**Steps:**
1. Open query with status "Revisions Requested"
2. Navigate to services section
3. Edit services (change hotel, adjust price)
4. Save service changes
5. Click "Send Revised Proposal"
6. Verify new proposal text reflects changes
7. Send revised proposal

**Expected Results:**
- ✅ New proposal version created (v2, v3, etc.)
- ✅ Old proposal status = 'revised'
- ✅ New proposal status = 'sent'
- ✅ Query status = "Proposal Sent"
- ✅ Version number incremented
- ✅ Services snapshot updated with new services

**SQL Verification:**
```sql
-- Check version history
SELECT version_number, status, sent_date, total_amount
FROM query_proposals
WHERE query_id = 'query-id'
ORDER BY version_number ASC;

-- Verify old proposal marked as revised
SELECT status FROM query_proposals WHERE id = 'old-proposal-id';
-- Should return 'revised'
```

### Test 3.2: Compare Proposal Versions
**Objective:** Test version comparison

**Steps:**
1. View proposal history
2. Compare v1 and v2
3. Check changes highlighted

**Expected Results:**
- ✅ Changes section shows:
  - ❌ Removed services
  - ✅ Added services
  - 🔄 Modified services
  - 💰 Price changes
- ✅ Differences clearly marked
- ✅ Old and new prices shown

### Test 3.3: Multiple Revisions
**Objective:** Test multiple revision cycles

**Steps:**
1. Send initial proposal (v1)
2. Customer requests changes
3. Send revision (v2)
4. Customer requests more changes
5. Send revision (v3)
6. Customer accepts v3

**Expected Results:**
- ✅ All 3 versions in database
- ✅ v1 and v2 status = 'revised'
- ✅ v3 status = 'accepted'
- ✅ Timeline shows complete history
- ✅ Can view any version

---

## Test Suite 4: Package Finalization

### Test 4.1: Finalize Without Advance Payment
**Objective:** Test finalization without payment

**Steps:**
1. Accept a proposal
2. In FinalizePackageModal, don't check "Record Advance Payment"
3. Add internal notes: "Customer will pay full amount before travel"
4. Click "Finalize & Start Booking"

**Expected Results:**
- ✅ Query status = "Finalized & Booking"
- ✅ finalized_date set to today
- ✅ advance_payment_amount = null
- ✅ Internal notes saved
- ✅ Proposal locked (no more edits)

**SQL Verification:**
```sql
SELECT status, finalized_date, advance_payment_amount
FROM queries WHERE id = 'query-id';
```

### Test 4.2: Finalize With Advance Payment
**Objective:** Test finalization with advance payment

**Steps:**
1. Accept a proposal (total: Rs 267,000)
2. Check "Record Advance Payment"
3. Enter amount: Rs 100,000
4. Select payment date: today
5. Select payment method: Bank Transfer
6. Add notes: "Received via bank transfer, transaction #12345"
7. Finalize

**Expected Results:**
- ✅ Query status = "Finalized & Booking"
- ✅ advance_payment_amount = 100,000
- ✅ advance_payment_date = today
- ✅ Balance remaining: Rs 167,000 (displayed)
- ✅ Payment notes saved

**SQL Verification:**
```sql
SELECT status, advance_payment_amount, advance_payment_date
FROM queries WHERE id = 'query-id';
```

### Test 4.3: Validate Payment Amounts
**Objective:** Test payment validation

**Steps:**
1. Try to enter advance amount > total package
2. Try to enter negative amount
3. Try to enter zero amount
4. Observe validation errors

**Expected Results:**
- ✅ Error: "Advance payment cannot exceed total"
- ✅ Error: "Please enter a valid amount"
- ✅ Cannot finalize with invalid amount
- ✅ Validation messages clear and helpful

---

## Test Suite 5: Timeline & History

### Test 5.1: Complete Query Timeline
**Objective:** Verify timeline shows all events

**Steps:**
1. Create a query
2. Respond to customer
3. Work on proposal
4. Send proposal (v1)
5. Request revisions
6. Send revised proposal (v2)
7. Accept proposal
8. Finalize package
9. View timeline

**Expected Results:**
- ✅ Timeline shows all 9 events in order
- ✅ Each event has correct icon and color
- ✅ Dates and times accurate
- ✅ Descriptions included where applicable
- ✅ Current status highlighted

### Test 5.2: Proposal History View
**Objective:** Test proposal history display

**Steps:**
1. View query with multiple proposals
2. Check proposal history section
3. Click on previous versions

**Expected Results:**
- ✅ All proposals listed (v1, v2, v3...)
- ✅ Each shows: status, sent date, channels
- ✅ Latest version marked as "Latest"
- ✅ Can view details of old proposals
- ✅ Customer feedback shown for each

---

## Test Suite 6: Proposal Status & Validity

### Test 6.1: Active Proposal Status
**Objective:** Test active proposal display

**Steps:**
1. Send proposal with 7-day validity
2. View query card
3. Check proposal status badge

**Expected Results:**
- ✅ Shows "Awaiting Response"
- ✅ Shows days remaining
- ✅ Purple badge for active proposals
- ✅ "Log Response" button visible

### Test 6.2: Expiring Soon Warning
**Objective:** Test expiring proposal warning

**Steps:**
1. Send proposal with 2-day validity
2. View query card
3. Check warning display

**Expected Results:**
- ✅ Orange badge for expiring soon
- ✅ Shows "2 days left"
- ✅ Warning message displayed
- ✅ Can still log response

### Test 6.3: Expired Proposal
**Objective:** Test expired proposal handling

**Steps:**
1. Send proposal with 1-day validity
2. Wait or manually set valid_until to yesterday
3. View query
4. Check expired status

**Expected Results:**
- ✅ Red badge for expired
- ✅ Shows "Expired" message
- ✅ Suggests sending new proposal
- ✅ Can log response or send new proposal

**Manual Test:**
```sql
-- Manually expire a proposal for testing
UPDATE query_proposals
SET valid_until = CURRENT_DATE - INTERVAL '1 day'
WHERE id = 'proposal-id';
```

### Test 6.4: Auto-Expire Batch Job
**Objective:** Test automatic expiration

**Steps:**
1. Create multiple proposals with different validity dates
2. Run expiration check function
3. Verify expired proposals updated

**SQL:**
```sql
-- Check expiration function
SELECT * FROM query_proposals
WHERE status = 'sent' AND valid_until < CURRENT_DATE;

-- Update expired proposals
UPDATE query_proposals
SET status = 'expired'
WHERE status = 'sent' AND valid_until < CURRENT_DATE;
```

---

## Test Suite 7: Edge Cases & Error Handling

### Test 7.1: Concurrent Responses
**Objective:** Test simultaneous responses to same proposal

**Steps:**
1. Open query in two browser tabs
2. In tab 1, log response as "Accepted"
3. In tab 2, try to log response as "Rejected"
4. Observe conflict handling

**Expected Results:**
- ✅ First response saves successfully
- ✅ Second response either blocked or updates existing
- ✅ No data corruption
- ✅ User notified of conflict

### Test 7.2: Deleted Query with Proposals
**Objective:** Test cascade delete

**Steps:**
1. Create query with proposals
2. Delete query
3. Check proposals table

**Expected Results:**
- ✅ Proposals deleted automatically (CASCADE)
- ✅ No orphaned proposals
- ✅ Database constraint enforced

### Test 7.3: Missing Services
**Objective:** Test proposal with deleted services

**Steps:**
1. Send proposal with services
2. Delete a service from vendor_transactions
3. View proposal
4. Check services_snapshot

**Expected Results:**
- ✅ Proposal still displays correctly
- ✅ Uses services_snapshot (frozen copy)
- ✅ No errors even if services deleted
- ✅ Snapshot preserved historical data

### Test 7.4: Network Failures
**Objective:** Test network error handling

**Steps:**
1. Disconnect network
2. Try to send proposal
3. Observe error handling
4. Reconnect and retry

**Expected Results:**
- ✅ Clear error message displayed
- ✅ User can retry
- ✅ Form data not lost
- ✅ No partial data saved

---

## Test Suite 8: Mobile Responsiveness

### Test 8.1: Mobile Modal Display
**Objective:** Test modals on mobile devices

**Steps:**
1. Open on mobile device (or use browser dev tools)
2. Test SendProposalModal
3. Test CustomerResponseModal
4. Test FinalizePackageModal

**Expected Results:**
- ✅ Modals fit on screen
- ✅ All buttons accessible
- ✅ Text readable without zooming
- ✅ Scrolling works smoothly
- ✅ Touch targets adequate size (44px minimum)

### Test 8.2: Query Cards on Mobile
**Objective:** Test query cards mobile layout

**Steps:**
1. View queries list on mobile
2. Check card layout
3. Test action buttons

**Expected Results:**
- ✅ Cards stack vertically
- ✅ All info visible
- ✅ Buttons accessible
- ✅ No horizontal scrolling
- ✅ Touch interactions work

---

## Performance Tests

### Test P1: Large Proposal Load Time
**Objective:** Test performance with many proposals

**Setup:**
```sql
-- Create 50 proposals for a query
INSERT INTO query_proposals (query_id, version_number, proposal_text, services_snapshot, total_amount, sent_date, sent_via)
SELECT
  'query-id',
  generate_series(1, 50),
  'Test proposal',
  '[]'::jsonb,
  100000,
  NOW() - (generate_series(1, 50) || ' days')::interval,
  ARRAY['whatsapp']
FROM generate_series(1, 50);
```

**Expected Results:**
- ✅ Page loads in < 2 seconds
- ✅ Timeline renders smoothly
- ✅ No UI lag
- ✅ Pagination works if implemented

### Test P2: Proposal Text Generation
**Objective:** Test template performance

**Steps:**
1. Create query with 20 services
2. Generate proposal text
3. Measure time

**Expected Results:**
- ✅ Generates in < 100ms
- ✅ All services included
- ✅ Formatting correct
- ✅ No memory issues

---

## Regression Tests

Run these tests after any code changes:

1. ✅ Create new query → Still works
2. ✅ Send proposal → Status updates correctly
3. ✅ Log response → All response types work
4. ✅ Finalize package → Payment recorded
5. ✅ Timeline display → All events shown
6. ✅ Version comparison → Changes detected
7. ✅ Mobile views → All responsive
8. ✅ API calls → All endpoints functional

---

## Test Data Cleanup

After testing:

```sql
-- Delete test proposals
DELETE FROM query_proposals WHERE query_id IN (
  SELECT id FROM queries WHERE client_name LIKE 'Test%'
);

-- Delete test queries
DELETE FROM queries WHERE client_name LIKE 'Test%';

-- Reset sequences if needed
SELECT setval('query_proposals_id_seq', (SELECT MAX(id) FROM query_proposals));
```

---

## Automated Test Script Template

```javascript
// Example Jest test
describe('Proposal Management', () => {
  test('should create proposal successfully', async () => {
    const proposal = await createProposal({
      queryId: 'test-query-id',
      versionNumber: 1,
      proposalText: 'Test proposal',
      // ...
    });

    expect(proposal).toBeDefined();
    expect(proposal.version_number).toBe(1);
    expect(proposal.status).toBe('sent');
  });

  test('should update status on customer response', async () => {
    const response = await updateProposalResponse({
      proposalId: 'test-proposal-id',
      responseType: 'accepted',
      feedback: 'Test feedback',
      responseDate: new Date().toISOString()
    });

    expect(response.status).toBe('accepted');
  });
});
```

---

## Success Criteria

All tests must pass before deploying to production:

- ✅ All 50+ test cases pass
- ✅ No console errors
- ✅ No database errors
- ✅ Mobile responsive on all screens
- ✅ Performance meets targets
- ✅ Error handling graceful
- ✅ Data integrity maintained
- ✅ User experience smooth

## Test Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA Lead | | | |
| Product Owner | | | |

---

**Testing Complete!** 🎉

If all tests pass, the Proposal Management Phase A is ready for production.
