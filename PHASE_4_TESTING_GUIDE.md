# PHASE 4: VENDOR LEDGER & ACCOUNTING SECTION - TESTING GUIDE

## Overview
This guide helps you test the Vendor Ledger and Accounting Section features implemented in Phase 4.

## Prerequisites
- Phase 1, 2, and 3 must be completed
- Database tables (vendors, vendor_transactions) must be set up
- Some vendors and transactions should exist in the database for testing

---

## TEST 1: Main Tab Navigation

### Steps:
1. Navigate to **Vendor Management** page
2. Check that you see **two main tabs**:
   - ✅ Vendor Management
   - ✅ Accounting Section

### Expected Results:
- Both tabs are visible
- Default tab is "Vendor Management"
- Clicking "Accounting Section" switches to the accounting view
- Tab switching works smoothly without errors

---

## TEST 2: Accounting Section Sub-Tabs

### Steps:
1. Click on **Accounting Section** tab
2. Check that you see **two sub-tabs**:
   - ✅ Vendor Accounts
   - ✅ Total Accounts

### Expected Results:
- Both sub-tabs are visible
- Default sub-tab is "Vendor Accounts"
- "Total Accounts" shows "Coming Soon" placeholder
- Sub-tab switching works correctly

---

## TEST 3: Vendor Selector

### Steps:
1. In **Vendor Accounts** sub-tab, locate the vendor selector dropdown
2. Click on the dropdown
3. Select a vendor from the list

### Expected Results:
- Dropdown shows all active vendors
- Each vendor shows: Name + Type (e.g., "AL-SAFA HOTELS - Hotel")
- Selecting a vendor loads their full ledger
- The ledger displays correctly with vendor details

---

## TEST 4: View All Vendors Mode

### Steps:
1. Click **"View All Vendors"** button
2. Observe the vendor summary cards grid

### Expected Results:
- Grid displays all active vendors
- Each card shows:
  - ✅ Vendor name and type
  - ✅ Financial summary (Total Business, Total Paid, Pending, Profit)
  - ✅ Profit percentage
  - ✅ Action buttons (View Ledger, View Profile)
- Cards are responsive (3 columns on desktop, 2 on tablet, 1 on mobile)

---

## TEST 5: Vendor Summary Cards

### Steps:
1. In "View All Vendors" mode, examine a vendor card
2. Check all financial figures

### Expected Results:
- Total Business matches database value
- Total Paid is displayed with green checkmark if > 0
- Pending amount is shown with warning icon if > 0
- Profit displays with percentage
- All amounts are formatted as Pakistani Rupees (Rs)

---

## TEST 6: View Individual Vendor Ledger

### Steps:
1. Click **"View Ledger"** button on any vendor card
2. Wait for the ledger to load

### Expected Results:
- Ledger page loads successfully
- Vendor header displays correctly:
  - ✅ Vendor name
  - ✅ Vendor type
  - ✅ Currency (PKR)
- "Back to All Vendors" button is visible
- Financial summary cards are displayed (5 cards)

---

## TEST 7: Financial Summary Cards

### Steps:
1. In vendor ledger view, examine the 5 summary cards:
   - Total Business
   - Total Paid
   - Pending Payment
   - Total Profit
   - Avg Margin

### Expected Results:
- All cards display correct values from database
- Cards have appropriate colors:
  - Blue: Total Business
  - Green: Total Paid
  - Red: Pending
  - Purple: Total Profit
  - Orange: Avg Margin
- Cards are responsive (5 columns on desktop, 2 columns on mobile)

---

## TEST 8: Transaction Filters

### Steps:
1. In vendor ledger, locate the **Filters** section
2. Test each filter:
   - Date From
   - Date To
   - Status (All, Pending, Paid, Partial, Overpaid)
   - Service Type (Hotel, Flight, Transport, etc.)
   - Search (by description, booking ref, query number)

### Expected Results:
- All filters work correctly
- Transactions update immediately when filter changes
- Multiple filters can be applied together
- "Showing X of Y transactions" count updates correctly
- "Clear Filters" button resets all filters

---

## TEST 9: Transaction Cards Display

### Steps:
1. Scroll through the transaction list
2. Examine a transaction card

### Expected Results:
- Each card displays:
  - ✅ Transaction date
  - ✅ Query number and client name
  - ✅ Payment status badge (with correct color)
  - ✅ Service icon and type
  - ✅ Service description
  - ✅ City (if available)
  - ✅ Currency and exchange rate
  - ✅ Purchase amount (original + PKR)
  - ✅ Selling amount (original + PKR)
  - ✅ Profit (original + PKR)
  - ✅ Passenger name
  - ✅ Booking reference (if available)
- Status badges are color-coded:
  - 🔴 Red: Pending
  - ✅ Green: Paid
  - 🟡 Yellow: Partial
  - 💰 Blue: Overpaid

---

## TEST 10: Transaction Card Expansion

### Steps:
1. Click **"More Details"** button on any transaction card
2. Examine the expanded details

### Expected Results:
- Card expands smoothly
- Additional details are shown:
  - ✅ Transaction created date
  - ✅ Last updated date
  - ✅ Exchange rate breakdown
  - ✅ Payment details (if paid)
  - ✅ Notes (if available)
- Edit and Delete buttons are visible
- Delete button is disabled for paid transactions
- "Less Details" button collapses the card

---

## TEST 11: Transaction Actions

### Steps:
1. Click **"View Query"** button on a transaction
2. Click **"Mark as Paid"** button (if status is pending)
3. In expanded view, click **"Edit"** button
4. Click **"Delete"** button on an unpaid transaction

### Expected Results:
- "View Query" shows appropriate message (to be implemented)
- "Mark as Paid" shows Phase 5 message: "Payment recording will be available in next phase"
- "Edit" shows placeholder message
- "Delete" shows confirmation dialog
- Delete is disabled for paid transactions with explanatory text

---

## TEST 12: Ledger Summary Footer

### Steps:
1. Scroll to the bottom of the transaction list
2. Examine the **"Ledger Summary"** section

### Expected Results:
- Summary displays:
  - ✅ Total Transactions count
  - ✅ Total Purchase (PKR)
  - ✅ Total Selling (PKR)
  - ✅ Total Profit with percentage
  - ✅ Payment Status breakdown:
    - Paid: Amount + count
    - Pending: Amount + count
    - Partial: count
- Summary reflects **filtered** transactions (not all transactions)
- Amounts are accurately calculated
- When filters are applied, summary updates accordingly

---

## TEST 13: Export Functionality

### Steps:
1. Click **"Export"** button in the ledger header
2. Examine the Export Modal

### Expected Results:
- Modal opens with title "Export Vendor Ledger"
- Shows vendor name and transaction count
- Export format options are displayed:
  - ✅ CSV (Spreadsheet) - Available
  - ⏳ PDF - Coming Soon (disabled)
  - ⏳ Excel - Coming Soon (disabled)
- Date range fields are present
- Include options checkboxes are present:
  - ✅ Transaction Details
  - ✅ Currency Breakdown
  - ✅ Payment Status
  - ✅ Summary Totals

---

## TEST 14: CSV Export

### Steps:
1. In Export Modal, select **CSV format**
2. Optionally set a date range
3. Check/uncheck include options
4. Click **"Export CSV"** button

### Expected Results:
- CSV file downloads successfully
- Filename format: `vendor-ledger-{vendor-name}-{date}.csv`
- CSV opens in Excel/Google Sheets without issues
- All selected columns are present:
  - Date, Query Number, Client Name, Passenger, Service Type, Description
  - Currency, Exchange Rate, Purchase/Selling amounts
  - Payment Status, Amount Paid
  - Booking Reference, Notes
- If "Summary Totals" is checked, summary section is included at bottom
- All data is properly formatted and readable
- Special characters and commas are properly escaped

---

## TEST 15: Empty States

### Steps:
1. Test with a vendor that has **no transactions**
2. Apply filters that return **no results**

### Expected Results:
- **No transactions:** Shows message "No transactions yet" with icon
- **No filter results:** Shows "No transactions found" with "Clear Filters" button
- Empty states are user-friendly and provide guidance

---

## TEST 16: Mobile Responsiveness

### Steps:
1. Open the app on mobile device or resize browser to mobile width (< 768px)
2. Navigate through all sections

### Expected Results:
- Main tabs stack properly
- Sub-tabs are readable and touchable
- Vendor cards stack vertically (1 per row)
- Financial summary cards stack vertically
- Filters stack vertically with proper spacing
- Transaction cards are readable on mobile
- All buttons are touch-friendly
- Export modal is full-screen on mobile
- No horizontal scrolling
- Text is readable (not too small)

---

## TEST 17: Loading States

### Steps:
1. Navigate to Accounting Section
2. Select a vendor with many transactions
3. Observe loading indicators

### Expected Results:
- Spinner/loading indicator appears while data loads
- No errors during loading
- UI is not interactive during loading
- Loading completes within reasonable time
- Data displays correctly after loading

---

## TEST 18: Error Handling

### Steps:
1. Disconnect internet (or simulate network error)
2. Try to load vendors/transactions
3. Reconnect and retry

### Expected Results:
- Error messages are displayed (if implemented)
- App doesn't crash
- User can retry after error
- Console shows meaningful error messages (not exposed to user)

---

## TEST 19: Search Functionality

### Steps:
1. In "View All Vendors" mode, use the search box
2. Type vendor name, type, or partial text
3. Observe filtered results

### Expected Results:
- Search filters vendors in real-time
- Matches are found for:
  - ✅ Vendor name
  - ✅ Vendor type
- Case-insensitive search
- "No vendors found" message if no matches
- Search clears when input is cleared

---

## TEST 20: Navigation & Breadcrumbs

### Steps:
1. Navigate from All Vendors → Specific Vendor Ledger
2. Click "Back to All Vendors"
3. Switch between main tabs

### Expected Results:
- Navigation is smooth without page refresh
- "Back" button returns to vendor list correctly
- State is preserved when switching tabs
- No 404 errors or broken links
- URL updates appropriately (if routing is implemented)

---

## TEST 21: Data Accuracy

### Steps:
1. Pick a vendor and note their summary values
2. Open their ledger and verify:
   - Total from all transactions matches summary
   - Profit calculations are correct
   - Payment status totals add up

### Expected Results:
- All financial calculations are accurate
- Database values match displayed values
- No rounding errors or significant discrepancies
- Currency conversions are correct (Original × Exchange Rate = PKR)

---

## TEST 22: Multiple Vendors Test

### Steps:
1. Create 10+ vendors with transactions
2. View all vendors
3. Switch between different vendors rapidly

### Expected Results:
- All vendors display correctly
- No performance issues
- Each vendor's data is isolated (no cross-contamination)
- Switching is fast and smooth

---

## PERFORMANCE TESTS

### Test 23: Large Dataset
- Test with 100+ transactions for a vendor
- Check if pagination/infinite scroll is needed
- Verify no lag in filtering or scrolling

### Test 24: Concurrent Users
- Have multiple users access accounting section
- Verify no data conflicts
- Check for race conditions

---

## SECURITY TESTS

### Test 25: Authorization
- Verify only authorized users can access accounting section
- Check that vendor data is properly scoped
- Ensure no sensitive data leaks in console/network tab

---

## INTEGRATION TESTS

### Test 26: Integration with Phase 3
- Verify transaction data flows from Phase 3 (Transaction Modal)
- Check that vendor updates reflect immediately
- Test real-time updates (if implemented)

### Test 27: Integration with Phase 2
- Verify vendor data syncs with Vendor Management
- Check that vendor profile links work
- Test that vendor changes reflect in accounting

---

## CHECKLIST SUMMARY

Complete this checklist to ensure Phase 4 is fully tested:

- [ ] Main tab navigation works
- [ ] Sub-tabs switch correctly
- [ ] Vendor selector loads all vendors
- [ ] "View All Vendors" displays summary cards
- [ ] Individual ledger displays correctly
- [ ] All 5 financial summary cards show accurate data
- [ ] All filters work (date, status, type, search)
- [ ] Transaction cards display all required info
- [ ] Transaction expansion shows additional details
- [ ] Status badges are color-coded correctly
- [ ] Action buttons work (View Query, Mark as Paid, Edit, Delete)
- [ ] Ledger summary footer calculates correctly
- [ ] Export modal opens
- [ ] CSV export downloads and opens correctly
- [ ] Empty states display appropriately
- [ ] Mobile responsive on all screen sizes
- [ ] Loading states work
- [ ] Errors are handled gracefully
- [ ] Search filters vendors correctly
- [ ] Navigation and back buttons work
- [ ] Data accuracy verified
- [ ] Multiple vendors work correctly
- [ ] Performance is acceptable with large datasets
- [ ] No TypeScript errors
- [ ] No console errors

---

## KNOWN LIMITATIONS (TO BE IMPLEMENTED IN FUTURE PHASES)

1. **Phase 5 Features:**
   - "Mark as Paid" functionality (shows placeholder message)
   - Payment recording
   - Payment method selection

2. **Future Enhancements:**
   - PDF export
   - Excel export
   - Transaction edit functionality
   - Transaction delete functionality
   - View Query integration
   - View Profile integration
   - Real-time updates
   - Pagination for large datasets
   - Advanced search/filters

---

## REPORTING ISSUES

When reporting bugs, please include:
1. Test number from this guide
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Screenshots (if applicable)
6. Browser/device information
7. Console errors (if any)

---

## SUCCESS CRITERIA

Phase 4 is considered complete when:
- ✅ All 27 tests pass
- ✅ No TypeScript errors
- ✅ No runtime errors
- ✅ Mobile responsive
- ✅ CSV export works
- ✅ All financial calculations are accurate
- ✅ User experience is smooth and intuitive

---

**Last Updated:** January 28, 2026
**Phase:** 4
**Version:** 1.0
