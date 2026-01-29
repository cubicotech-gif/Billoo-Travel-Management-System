# Fix Query Status Constraint Error

## Problem
Getting error: `"new row for relation 'queries' violates check constraint 'queries_status_check'"`

This happens because the database has a CHECK constraint that restricts the allowed values for the `status` column, but our application is using different values.

## Solution
Run the SQL migration to update the constraint.

---

## Step 1: Check Current Constraint

**Run this in Supabase SQL Editor to see what values are currently allowed:**

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'queries'::regclass
AND conname = 'queries_status_check';
```

This will show you the current constraint definition.

---

## Step 2: Run the Migration

**Open Supabase SQL Editor and run:**

File: `supabase/migrations/20260129_update_queries_status_constraint.sql`

Or copy this SQL:

```sql
-- Remove old status constraint
ALTER TABLE queries
DROP CONSTRAINT IF EXISTS queries_status_check;

-- Add new constraint with ALL workflow status values
ALTER TABLE queries
ADD CONSTRAINT queries_status_check
CHECK (status IN (
  'New Query - Not Responded',
  'Responded - Awaiting Reply',
  'Working on Proposal',
  'Proposal Sent',
  'Revisions Requested',
  'Finalized & Booking',
  'Services Booked',
  'In Delivery',
  'Completed',
  'Cancelled'
));

-- Set default status
ALTER TABLE queries
ALTER COLUMN status SET DEFAULT 'New Query - Not Responded';
```

---

## Step 3: Update Existing Data (if needed)

**If you have existing queries with old status values, run these:**

```sql
-- Update old "new" status to new format
UPDATE queries
SET status = 'New Query - Not Responded'
WHERE status IN ('new', 'New', 'pending', 'Pending');

-- Update old "working" status
UPDATE queries
SET status = 'Working on Proposal'
WHERE status IN ('working', 'Working', 'in_progress');

-- Update old "sent" status
UPDATE queries
SET status = 'Proposal Sent'
WHERE status IN ('sent', 'Sent', 'proposal_sent');

-- Update old "completed" status
UPDATE queries
SET status = 'Completed'
WHERE status IN ('completed', 'Complete', 'done', 'Done');

-- Update old "cancelled" status
UPDATE queries
SET status = 'Cancelled'
WHERE status IN ('cancelled', 'Canceled', 'rejected', 'lost');
```

---

## Step 4: Verify the Fix

**Check if any queries still have invalid status:**

```sql
SELECT id, query_number, status, client_name
FROM queries
WHERE status NOT IN (
  'New Query - Not Responded',
  'Responded - Awaiting Reply',
  'Working on Proposal',
  'Proposal Sent',
  'Revisions Requested',
  'Finalized & Booking',
  'Services Booked',
  'In Delivery',
  'Completed',
  'Cancelled'
);
```

If this returns any rows, manually update them:
```sql
UPDATE queries
SET status = 'New Query - Not Responded'
WHERE id = 'your-query-id-here';
```

---

## Step 5: Verify Constraint is Updated

**Confirm the new constraint is in place:**

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'queries'::regclass
AND conname = 'queries_status_check';
```

Should show:
```
CHECK ((status = ANY (ARRAY[
  'New Query - Not Responded'::text,
  'Responded - Awaiting Reply'::text,
  'Working on Proposal'::text,
  'Proposal Sent'::text,
  'Revisions Requested'::text,
  'Finalized & Booking'::text,
  'Services Booked'::text,
  'In Delivery'::text,
  'Completed'::text,
  'Cancelled'::text
])))
```

---

## Step 6: Test Status Changes

1. Go to your app
2. Open any query
3. Try changing the status in the dropdown
4. ✅ Should work without errors!
5. Check browser console - should see success logs:
   ```
   ✅ Database updated successfully
   ✅ Status changed to: Proposal Sent
   ```

---

## All Allowed Status Values

The application now uses these exact status values:

| Status Value | Stage | Description |
|-------------|-------|-------------|
| `New Query - Not Responded` | 1 | Fresh query, needs response |
| `Responded - Awaiting Reply` | 2 | Waiting for customer reply |
| `Working on Proposal` | 3 | Building package proposal |
| `Proposal Sent` | 4 | Proposal sent, awaiting feedback |
| `Revisions Requested` | 5 | Customer requested changes |
| `Finalized & Booking` | 6 | Approved, ready to book |
| `Services Booked` | 7 | All services booked |
| `In Delivery` | 8 | Services being delivered |
| `Completed` | 9 | Successfully completed |
| `Cancelled` | 10 | Cancelled or lost |

**IMPORTANT:** These values are **case-sensitive** and must match exactly (including spaces and ampersands).

---

## Troubleshooting

### Error: "constraint already exists"
The constraint already has the right values. No action needed.

### Error: "column contains invalid data"
You have existing queries with status values not in the allowed list. Run Step 3 to update them.

### Error: "permission denied"
You need to be database owner or have ALTER TABLE privileges. Use Supabase dashboard SQL Editor which runs as superuser.

### Status changes still fail
1. Check browser console for exact error message
2. Verify constraint was updated (Step 5)
3. Check for typos in status values (must match exactly)
4. Clear browser cache and reload

---

## Success Indicators

✅ Migration runs without errors
✅ Constraint check query shows new values
✅ No invalid queries found
✅ Status dropdown changes work
✅ Console logs show successful updates
✅ Purple debug panel updates correctly

---

**After running this migration, all status changes should work perfectly!**
