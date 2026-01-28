# Query Phase B: Booking & Vendor Payments - Testing Guide

## Overview
This guide covers testing the complete booking workflow for Query Phase B, which enables booking services with vendors, recording payments, and managing booking confirmations.

## Prerequisites

### 1. Database Setup
Run the migration to add booking fields:
```bash
# Apply the migration in Supabase
psql -U postgres -d your_database < supabase/migrations/20260128_add_booking_fields.sql
```

Or run in Supabase SQL Editor:
```sql
-- See: supabase/migrations/20260128_add_booking_fields.sql
```

### 2. Storage Bucket Setup
Create the booking-vouchers storage bucket in Supabase Dashboard:

1. Go to Storage → Create bucket
2. Name: `booking-vouchers`
3. Public: ✅ Yes (read-only)
4. File size limit: 5MB
5. Allowed MIME types: `application/pdf`, `image/jpeg`, `image/png`

### 3. Sample Data Required
- At least one query with status "Finalized & Booking"
- Query should have services assigned
- Services should have vendors assigned
- Services should have purchase and selling prices

## Testing Workflow

### Test 1: Booking Mode Alert
**Scenario**: Query enters booking stage

**Steps**:
1. Open a query with status "Finalized & Booking"
2. Navigate to Query Workspace

**Expected Results**:
- ✅ Blue "BOOKING MODE ACTIVE" alert displays at top
- ✅ Shows 3 step checklist
- ✅ Alert is visually distinct with icon

**Pass Criteria**: Alert displays correctly with all information

---

### Test 2: Booking Progress Tracker
**Scenario**: Monitor overall booking progress

**Steps**:
1. View query in booking stage
2. Observe progress tracker panel

**Expected Results**:
- ✅ Shows "0 of X confirmed" initially
- ✅ Progress bar at 0%
- ✅ Lists all services with "Pending" status
- ✅ Status icons display correctly

**Pass Criteria**: All services tracked accurately

---

### Test 3: Pay Vendor (New Transaction)
**Scenario**: Pay vendor for a service without existing transaction

**Steps**:
1. Open service card in booking stage
2. Click "Pay Vendor" button
3. Wait for transaction creation
4. Record payment in modal (use existing RecordPaymentModal)
5. Submit payment

**Expected Results**:
- ✅ System creates vendor_transaction automatically
- ✅ Transaction links to service, vendor, and query
- ✅ Payment modal opens with pre-filled data
- ✅ Service status updates to "payment_sent"
- ✅ Booking progress updates

**Pass Criteria**: Payment recorded and service status updated

---

### Test 4: Pay Vendor (Existing Transaction)
**Scenario**: Make additional payment on existing transaction

**Steps**:
1. Click "Pay Vendor" on service with existing transaction
2. Payment modal opens with transaction data
3. Record additional payment

**Expected Results**:
- ✅ Opens existing transaction (no duplicate created)
- ✅ Shows payment history
- ✅ Can add additional payment
- ✅ Service status remains "payment_sent"

**Pass Criteria**: No duplicate transactions created

---

### Test 5: Skip Vendor Payment
**Scenario**: Skip payment for complimentary service

**Steps**:
1. Click "Skip Payment" on service
2. Select reason: "Complimentary service"
3. Add notes: "VIP customer - complimentary upgrade"
4. Submit

**Expected Results**:
- ✅ Skip payment modal displays
- ✅ Warning message shows
- ✅ Requires reason selection
- ✅ Service updates to "payment_sent"
- ✅ payment_skipped flag set to true
- ✅ Reason saved in database

**Pass Criteria**: Service marked appropriately without payment

---

### Test 6: Upload Booking Voucher (With File)
**Scenario**: Upload confirmation document

**Steps**:
1. After payment, click "Upload Voucher & Confirm"
2. Enter confirmation: "HLT-12345"
3. Upload PDF file (2MB)
4. Add notes: "Room 501, early check-in arranged"
5. Click "Save & Mark as Confirmed"

**Expected Results**:
- ✅ File validation works (size, type)
- ✅ File uploads to Supabase Storage
- ✅ Public URL generated
- ✅ Service status → "confirmed"
- ✅ booked_date set to current date
- ✅ Progress tracker updates
- ✅ If all services confirmed → Query status → "Services Booked"

**Pass Criteria**: File uploaded and service confirmed

---

### Test 7: Upload Booking Voucher (Without File)
**Scenario**: Confirm booking without uploading document

**Steps**:
1. Click "Upload Voucher & Confirm"
2. Enter confirmation: "PK789ABC"
3. Leave file upload empty
4. Add notes
5. Submit

**Expected Results**:
- ✅ Allows submission without file
- ✅ Service confirmed
- ✅ voucher_url remains null
- ✅ Can edit later to add file

**Pass Criteria**: Confirmation works without mandatory file

---

### Test 8: File Upload Validation
**Scenario**: Test file upload restrictions

**Test Cases**:
| File Type | Size | Expected |
|-----------|------|----------|
| .pdf | 2MB | ✅ Success |
| .jpg | 3MB | ✅ Success |
| .png | 1MB | ✅ Success |
| .pdf | 6MB | ❌ Error: "File size must be less than 5MB" |
| .docx | 2MB | ❌ Error: "Only PDF, JPG, and PNG files are allowed" |
| .exe | 1MB | ❌ Error: File type not allowed |

**Pass Criteria**: All validations work as expected

---

### Test 9: Vendor Payment Summary
**Scenario**: View payment summary for query

**Steps**:
1. Navigate to query with multiple services
2. Record payments for various services
3. View Vendor Payment Summary panel

**Expected Results**:
- ✅ Shows total to pay, total paid, pending
- ✅ Groups payments by vendor
- ✅ Shows payment status per service
- ✅ Displays payment dates
- ✅ "View All Vendor Transactions" link works

**Pass Criteria**: Accurate financial summary displayed

---

### Test 10: Booking Progress Updates
**Scenario**: Progress tracker updates in real-time

**Steps**:
1. Query has 3 services (all pending)
2. Confirm 1st service → Progress: 1/3 (33%)
3. Confirm 2nd service → Progress: 2/3 (67%)
4. Confirm 3rd service → Progress: 3/3 (100%)

**Expected Results**:
- ✅ Progress bar updates after each confirmation
- ✅ Status icons change color
- ✅ Completion message shows at 100%
- ✅ Query status updates to "Services Booked"

**Pass Criteria**: Real-time progress tracking works

---

### Test 11: Booking Summary Report
**Scenario**: Generate booking confirmation report

**Steps**:
1. Complete all service bookings
2. Click to open Booking Summary Report
3. Review all sections
4. Click "Download Report"

**Expected Results**:
- ✅ Shows travel details (destination, dates, passengers)
- ✅ Lists all confirmed bookings
- ✅ Shows confirmation numbers
- ✅ Displays attached documents
- ✅ Downloads text file with summary
- ✅ File named: `booking-summary-{query_number}.txt`

**Pass Criteria**: Complete report generated with all details

---

### Test 12: Edit Confirmed Booking
**Scenario**: Update booking information after confirmation

**Steps**:
1. Open confirmed service
2. Click "Edit" button
3. Update confirmation number
4. Upload new voucher file
5. Update notes
6. Save changes

**Expected Results**:
- ✅ VoucherUploadModal opens with existing data
- ✅ Can update all fields
- ✅ New file replaces old file in storage
- ✅ Changes saved successfully
- ✅ Status remains "confirmed"

**Pass Criteria**: Editing works without breaking confirmation

---

### Test 13: Cancel Booking
**Scenario**: Cancel a confirmed booking

**Steps**:
1. Call cancelBooking API for a service
2. Provide cancellation reason
3. Check service status

**Expected Results**:
- ✅ Service status → "cancelled"
- ✅ Reason saved in booking_notes
- ✅ Service displayed with red cancelled badge
- ✅ Query status updates if all were confirmed

**Pass Criteria**: Cancellation handled properly

---

### Test 14: All Services Booked Notification
**Scenario**: Completion alert when all services confirmed

**Steps**:
1. Confirm last remaining service
2. Observe UI changes

**Expected Results**:
- ✅ Query status → "Services Booked"
- ✅ BookingModeAlert changes to green success
- ✅ Shows "ALL SERVICES BOOKED!" message
- ✅ Displays completion checklist
- ✅ Progress tracker shows 100% with success message

**Pass Criteria**: Clear visual feedback on completion

---

### Test 15: Vendor Not Assigned Error
**Scenario**: Try to pay for service without vendor

**Steps**:
1. Create service without assigning vendor
2. Click "Pay Vendor"

**Expected Results**:
- ✅ "Pay Vendor" button disabled or shows warning
- ✅ Error message: "Please assign a vendor to this service first"
- ✅ Prevents creating transaction

**Pass Criteria**: Proper validation before payment

---

### Test 16: Mobile Responsiveness
**Scenario**: Test on mobile devices

**Test Viewports**:
- iPhone SE (375px)
- iPhone 12 Pro (390px)
- iPad (768px)
- Desktop (1920px)

**Check**:
- ✅ Booking cards stack vertically on mobile
- ✅ Progress tracker readable on small screens
- ✅ Modals fit in viewport
- ✅ File upload works on mobile
- ✅ Buttons accessible and tappable
- ✅ Text readable without horizontal scroll

**Pass Criteria**: Fully functional on all screen sizes

---

### Test 17: Multiple Vendors Same Service Type
**Scenario**: Book multiple hotels from different vendors

**Steps**:
1. Add 2 hotel services with different vendors
2. Pay each vendor separately
3. Confirm both bookings

**Expected Results**:
- ✅ Separate transactions created per vendor
- ✅ Vendor Payment Summary groups correctly
- ✅ Each service tracked independently
- ✅ No conflicts between similar services

**Pass Criteria**: Multi-vendor support works correctly

---

### Test 18: Network Error Handling
**Scenario**: Handle upload failures gracefully

**Steps**:
1. Disconnect internet
2. Try uploading voucher
3. Reconnect and retry

**Expected Results**:
- ✅ Shows error message
- ✅ Doesn't mark service as confirmed
- ✅ Allows retry
- ✅ No partial state updates

**Pass Criteria**: Graceful error handling

---

### Test 19: Concurrent Booking Updates
**Scenario**: Multiple users booking same query

**Steps**:
1. User A confirms Service 1
2. User B confirms Service 2 simultaneously
3. Check progress tracker

**Expected Results**:
- ✅ Both confirmations save
- ✅ No conflicts
- ✅ Progress tracker accurate
- ✅ Query status updates correctly

**Pass Criteria**: Concurrent updates handled properly

---

### Test 20: Booking Documents Download
**Scenario**: Download all vouchers

**Steps**:
1. Confirm 3 services with voucher files
2. View Booking Documents section
3. Click individual "View" links
4. Click "Download All as ZIP" (if implemented)

**Expected Results**:
- ✅ Each voucher opens in new tab
- ✅ Files are accessible
- ✅ Correct files linked to services
- ✅ ZIP download contains all files (if implemented)

**Pass Criteria**: All documents accessible

---

## Performance Testing

### Load Test
- Test with query containing 20+ services
- All operations should complete in <3 seconds
- No UI lag or freezing

### File Upload Performance
- 5MB file should upload in <10 seconds on average connection
- Progress indicator during upload
- No timeout errors

## Security Testing

### File Upload Security
- ✅ Only authenticated users can upload
- ✅ File type validation on server
- ✅ File size limits enforced
- ✅ No script injection through filenames
- ✅ Bucket permissions correctly set

### Payment Security
- ✅ Only authorized users can record payments
- ✅ Transaction amounts validated
- ✅ No duplicate payments without detection

## Known Issues & Limitations

1. **ZIP Download**: Download all as ZIP not yet implemented
2. **Share with Customer**: Email/WhatsApp share feature pending
3. **Print View**: Printer-friendly booking summary not yet available
4. **Bulk Operations**: No bulk confirm/cancel yet

## Regression Testing Checklist

After any changes to booking system, verify:
- [ ] Existing queries still load
- [ ] Proposal system (Phase A) unaffected
- [ ] Vendor transaction system works
- [ ] Service cards display correctly
- [ ] All modals open/close properly
- [ ] Database migrations applied cleanly
- [ ] No TypeScript errors
- [ ] Build completes successfully

## Rollback Plan

If critical issues found:
1. Revert database migration
2. Remove booking components from QueryWorkspace
3. Restore previous version
4. Investigate and fix issues
5. Re-deploy with fixes

## Support Contacts

For testing issues:
- Database: Check Supabase logs
- Storage: Verify bucket permissions
- UI: Check browser console for errors
- API: Review Network tab in DevTools

---

**Last Updated**: January 28, 2026
**Phase**: Query Phase B - Booking & Vendor Payments
**Status**: Ready for Testing
