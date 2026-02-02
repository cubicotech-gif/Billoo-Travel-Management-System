# Query Workflow Testing Guide

## Complete 10-Stage Query Lifecycle Testing

This guide will walk you through testing the complete query workflow from initial contact to completion.

---

## Prerequisites

1. **Apply Database Migration:**
   ```bash
   # Apply the SQL migration file to your Supabase database
   # Navigate to Supabase Dashboard → SQL Editor
   # Run the migration file: supabase/migrations/20260202_fix_query_workflow_stages.sql
   ```

2. **Verify Database Tables:**
   - Ensure `queries` table has new fields:
     - `proposal_sent_date`
     - `finalized_date`
     - `completed_date`
     - `customer_feedback`
     - `stage_notes`

   - Ensure `query_services` table has new fields:
     - `booking_status`
     - `booked_date`
     - `booking_confirmation`
     - `voucher_url`
     - `delivery_status`

3. **Verify Application is Running:**
   ```bash
   npm run dev
   ```

---

## Complete Workflow Test Procedure

### STAGE 1: New Query - Not Responded

**Goal:** Create a new query and verify the service building interface appears.

**Steps:**
1. Navigate to **Queries** page
2. Click "**+ New Query**" button
3. Fill in query details:
   - Client Name: "Test Customer"
   - Client Phone: "0300-1234567"
   - Destination: "Makkah"
   - Travel Date: Select future date
   - Adults: 2
   - Service Type: "Umrah Package"
4. Click "**Create Query**"
5. Query should be created with status: "**New Query - Not Responded**"

**Expected UI:**
- ✅ Stage indicator shows "1 - New Query"
- ✅ Banner says "Building Package Proposal"
- ✅ Section to add services is visible
- ✅ "No services added yet" placeholder shown
- ✅ Query details card visible

**Screenshot Checkpoint:** Take screenshot showing service building UI

---

### STAGE 2-3: Responded & Working on Proposal

**Goal:** Change status and verify UI remains in service building mode.

**Steps:**
1. Open the query from Stage 1
2. Change status dropdown to "**🟡 Awaiting Client Reply**"
3. Verify UI still shows service building interface
4. Change status to "**🔵 Working on Proposal**"
5. Verify UI still shows service building interface

**Expected UI:**
- ✅ Same service building interface for all 3 initial stages
- ✅ Stage indicator updates to show current stage number
- ✅ Banner message updates appropriately
- ✅ Service addition section remains visible

**Screenshot Checkpoint:** UI should look identical for stages 1-3

---

### STAGE 4: Proposal Sent

**Goal:** Send proposal and verify proposal tracking UI appears.

**Steps:**
1. **NOTE:** Normally you would add services first, but for testing we can proceed
2. Click "**📧 Send Proposal to Customer**" button (if services exist)
   - OR manually change status to "**📧 Proposal Sent**"
3. Page should refresh and show completely different UI

**Expected UI:**
- ✅ Stage indicator shows "4 - Proposal Sent"
- ✅ Green success banner: "📧 Proposal Sent to Customer"
- ✅ Proposal summary panel visible
- ✅ "Sent on:" date displayed
- ✅ **Customer Response** section with 3 buttons:
   - ✅ "Customer Accepted" (green)
   - ✅ "Requested Changes" (amber)
   - ✅ "Customer Declined" (red)
- ✅ NO service building UI visible

**Screenshot Checkpoint:** Take screenshot showing proposal sent UI

---

### STAGE 5: Revisions Requested

**Goal:** Test revision flow and verify edit interface appears.

**Steps:**
1. From Stage 4, click "**✏️ Requested Changes**" button
2. Enter customer feedback in modal: "Please add 2 nights in Madinah"
3. Click "**Submit Response**"
4. Status should change to "**🟣 Revisions Requested**"

**Expected UI:**
- ✅ Stage indicator shows "5 - Revisions"
- ✅ Amber warning banner: "⚠️ Customer Requested Changes"
- ✅ **Customer Feedback** section displays entered feedback
- ✅ **Edit Package Services** section visible
- ✅ Services listed (if any exist)
- ✅ "**📧 Send Revised Proposal**" button at bottom
- ✅ Package summary showing updated totals

**Screenshot Checkpoint:** Take screenshot showing revisions UI

---

### STAGE 6: Finalized & Booking

**Goal:** Test booking workflow and verify booking progress tracking.

**Steps:**
1. From Stage 5, click "**📧 Send Revised Proposal**"
2. Status changes back to "Proposal Sent"
3. Click "**✅ Customer Accepted**" button
4. Enter feedback (optional): "Customer confirmed and ready to book"
5. Click "**Submit Response**"
6. Status should change to "**✅ Finalized & Booking**"

**Expected UI:**
- ✅ Stage indicator shows "6 - Booking"
- ✅ Teal success banner: "✅ Package Finalized - Ready to Book"
- ✅ **Booking Progress** tracker showing:
   - Services Confirmed: 0 / X
   - Progress bar at 0%
- ✅ **Services to Book** section with service cards
- ✅ Each service card has booking actions:
   - "Pay Vendor" button
   - "Upload Voucher" button
   - "Mark as Booked" button
- ✅ NO proposal or revision UI visible

**Screenshot Checkpoint:** Take screenshot showing booking UI

---

### STAGE 7: Services Booked (Auto-Advance Test)

**Goal:** Test auto-advancement when all services are booked.

**Steps:**
1. From Stage 6, for each service card:
   - Click "**✓ Mark as Booked**" button
   - Service card should turn green
   - Booking progress should update
2. When last service is marked booked:
   - Progress should reach 100%
   - Green success message: "All services booked! Advancing..."
   - **After 1 second**, status should auto-advance to "**📦 Services Booked**"

**Expected UI:**
- ✅ Stage indicator shows "7 - Booked"
- ✅ Purple/Indigo banner: "🎉 All Services Successfully Booked!"
- ✅ **Confirmed Bookings** section listing all services
- ✅ Each service shows:
   - ✅ Confirmed badge
   - Booking date
   - Vendor paid amount
- ✅ **Booking Documents** section
- ✅ "**📧 Email Documents**" button
- ✅ "**🚚 Start Service Delivery Tracking**" button

**Screenshot Checkpoint:** Take screenshot showing services booked UI

---

### STAGE 8: In Delivery

**Goal:** Test delivery tracking and service completion.

**Steps:**
1. From Stage 7, click "**🚚 Start Service Delivery Tracking**"
2. Status should change to "**🚚 In Delivery**"

**Expected UI:**
- ✅ Stage indicator shows "8 - Delivery"
- ✅ Cyan banner: "🚚 Services Being Delivered"
- ✅ **Delivery Progress** tracker showing:
   - Services Delivered: 0 / X
   - Progress bar at 0%
- ✅ **Service Delivery Tracker** with cards for each service
- ✅ Each service card has delivery status buttons:
   - "Mark In Progress"
   - "Mark Delivered"
   - "Report Issue"
- ✅ "**Mark Query as Completed**" button at bottom (disabled initially)

**Testing Delivery Status:**
1. Click "**Mark In Progress**" on first service
   - Card should turn blue
   - Status badge shows "In Progress"
2. Click "**Mark Delivered**" on first service
   - Card should turn green
   - Status badge shows "Delivered"
   - Delivery progress updates
3. Mark all services as "Delivered"
   - Progress reaches 100%
   - "Mark as Completed" button becomes enabled (green)

**Screenshot Checkpoint:** Take screenshot showing delivery tracking UI

---

### STAGE 9: Completed

**Goal:** Test query completion and final summary.

**Steps:**
1. From Stage 8 (with all services delivered), click "**✅ Mark Query as Completed**"
2. Status should change to "**✅ Completed**"

**Expected UI:**
- ✅ Stage indicator shows "9 - Complete" with checkmark
- ✅ Green success banner with trophy icon: "✅ Query Completed Successfully!"
- ✅ **Final Summary** section showing:
   - Query number, customer, destination
   - Services delivered count
   - Complete timeline (created → proposal → finalized → completed dates)
   - List of all delivered services
- ✅ **Profit Analysis** section with 4 metrics:
   - Total Cost Price (paid to vendors)
   - Total Selling Price (received from customer)
   - Total Profit (highlighted in green)
   - Profit Margin percentage
   - Profit insights based on margin
- ✅ **Customer Satisfaction** section
- ✅ Action buttons:
   - "Download Query Report"
   - "Export All Documents"
- ✅ Final success message at bottom

**Screenshot Checkpoint:** Take screenshot showing completion summary

---

### STAGE 10: Cancelled (Alternative Path)

**Goal:** Test cancellation from any stage.

**Steps:**
1. Create a new query or use existing one
2. From **Stage 4 (Proposal Sent)**, click "**❌ Customer Declined**"
3. Enter cancellation reason: "Customer found cheaper alternative"
4. Click "**Submit Response**"
5. Status should change to "**❌ Cancelled**"

**Expected UI:**
- ✅ Stage indicator shows "Cancelled" with X icon
- ✅ Red/Orange banner: "❌ Query Cancelled"
- ✅ **Cancellation Details** showing:
   - Query information
   - Timeline
   - Cancellation reason/feedback
- ✅ **What Happened?** section explaining possible reasons
- ✅ **Learnings for Future** section with insights
- ✅ **Follow-up Options**:
   - "Schedule Follow-up Call"
   - "Add to Nurture Campaign"
- ✅ Archive notice at bottom

**Screenshot Checkpoint:** Take screenshot showing cancelled UI

---

## Critical UI Conditional Rendering Tests

### Test 1: Status Dropdown Changes UI Immediately

**Steps:**
1. Open any query
2. Change status dropdown to different stages
3. Verify UI changes immediately without page refresh

**Expected Behavior:**
- ✅ UI updates instantly when status changes
- ✅ Each status shows completely different interface
- ✅ No remnants of previous stage UI visible
- ✅ Console logs show: "✅ Status changed to: [new status]"

---

### Test 2: Service Building Stages (1-3) Show Same UI

**Steps:**
1. Create query with status "New Query - Not Responded"
2. Change to "Responded - Awaiting Reply" → UI should remain same
3. Change to "Working on Proposal" → UI should remain same

**Expected Behavior:**
- ✅ All three stages show service building interface
- ✅ Banner message changes but layout is identical
- ✅ Service addition section always visible

---

### Test 3: Proposal Sent Shows Customer Response UI

**Steps:**
1. Change status to "Proposal Sent"
2. Verify new UI appears

**Expected Behavior:**
- ✅ Service building UI disappears
- ✅ Proposal summary appears
- ✅ Customer response buttons visible
- ✅ "Log Customer Response" functionality works

---

### Test 4: Booking Stage Shows Progress Tracking

**Steps:**
1. Change status to "Finalized & Booking"
2. Verify booking UI appears

**Expected Behavior:**
- ✅ Booking progress bar visible
- ✅ Service cards show booking actions
- ✅ Progress updates when services marked booked
- ✅ Auto-advances when all booked

---

### Test 5: Completed Stage is Read-Only

**Steps:**
1. Change status to "Completed"
2. Verify summary UI

**Expected Behavior:**
- ✅ No editable fields visible
- ✅ Only summary and analytics shown
- ✅ All data display-only
- ✅ Profit analysis calculated correctly

---

## Database Verification Tests

### Test 1: Status Constraint Works

**Query to run in Supabase SQL Editor:**
```sql
-- This should succeed
UPDATE queries
SET status = 'Proposal Sent'
WHERE id = 'your-query-id';

-- This should FAIL with constraint error
UPDATE queries
SET status = 'Invalid Status'
WHERE id = 'your-query-id';
```

**Expected:**
- ✅ Valid status updates succeed
- ✅ Invalid status rejected with error

---

### Test 2: Timestamp Fields Auto-Populate

**Query to run:**
```sql
SELECT
  status,
  proposal_sent_date,
  finalized_date,
  completed_date,
  customer_feedback
FROM queries
WHERE id = 'your-query-id';
```

**Expected:**
- ✅ `proposal_sent_date` populated when status = "Proposal Sent"
- ✅ `finalized_date` populated when status = "Finalized & Booking"
- ✅ `completed_date` populated when status = "Completed"
- ✅ Dates in ISO format

---

### Test 3: Service Booking Fields Work

**Query to run:**
```sql
SELECT
  service_description,
  booking_status,
  booked_date,
  delivery_status
FROM query_services
WHERE query_id = 'your-query-id';
```

**Expected:**
- ✅ `booking_status` defaults to 'pending'
- ✅ `delivery_status` defaults to 'not_started'
- ✅ `booked_date` populated when marked as booked
- ✅ Status values constrained to valid options

---

## Common Issues & Solutions

### Issue 1: UI doesn't change when status changes

**Solution:**
- Check browser console for errors
- Verify `loadQueryData()` is called after status update
- Check that conditional rendering logic in `renderStageContent()` is working

---

### Issue 2: Status dropdown shows old values

**Solution:**
- Verify `WORKFLOW_STAGES` constant in `EnhancedQueries.tsx` has all 10 stages
- Check database constraint includes all status values
- Clear browser cache

---

### Issue 3: Database constraint error on status update

**Solution:**
- Apply the migration file: `20260202_fix_query_workflow_stages.sql`
- Verify constraint includes all 10 statuses
- Update any queries with invalid statuses

---

### Issue 4: TypeScript errors

**Solution:**
- Verify `query-workflow.ts` types match database fields
- Check all stage components import correct types
- Run `npm run build` to check for type errors

---

## Success Criteria Checklist

✅ **Database:**
- [ ] Migration applied successfully
- [ ] All new fields exist
- [ ] Constraints prevent invalid statuses
- [ ] Indexes created

✅ **Status Dropdown:**
- [ ] Shows all 10 stages
- [ ] Updates work in queries list
- [ ] Updates work in query workspace
- [ ] UI changes immediately on update

✅ **Stage-Specific UI:**
- [ ] Service Building (Stages 1-3) works
- [ ] Proposal Sent (Stage 4) works
- [ ] Revisions (Stage 5) works
- [ ] Booking (Stage 6) works with progress
- [ ] Services Booked (Stage 7) works
- [ ] Delivery (Stage 8) works with tracking
- [ ] Completed (Stage 9) shows summary
- [ ] Cancelled (Stage 10) shows details

✅ **Workflow Features:**
- [ ] Customer response modal works
- [ ] Booking status tracking works
- [ ] Delivery status tracking works
- [ ] Auto-advancement works when all booked
- [ ] Timestamps auto-populate
- [ ] Customer feedback saves

✅ **Data Integrity:**
- [ ] No data loss on status changes
- [ ] Services persist across stages
- [ ] Financial calculations correct
- [ ] Timeline dates accurate

---

## Performance Tests

### Load Test
1. Create 50+ queries
2. Change status on multiple queries rapidly
3. Verify no performance degradation

### Concurrent Updates
1. Open same query in 2 browser tabs
2. Change status in one tab
3. Refresh other tab
4. Verify changes reflected

---

## Deployment Checklist

Before deploying to production:

- [ ] All tests pass
- [ ] Migration applied to production database
- [ ] Backup database before migration
- [ ] Test on staging environment first
- [ ] Document any configuration changes
- [ ] Update API documentation
- [ ] Train users on new workflow

---

## Next Steps: Phase B Integration

Once workflow is verified:
1. Integrate vendor payment system
2. Add document upload functionality
3. Implement email notifications
4. Add booking voucher management
5. Create comprehensive reporting

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify database migration was applied
3. Check network tab for failed API calls
4. Review this guide's troubleshooting section
5. Create GitHub issue with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Console errors
   - Screenshots

---

**Document Version:** 1.0
**Last Updated:** 2026-02-02
**Author:** Claude AI Assistant
