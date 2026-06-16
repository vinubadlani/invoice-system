# 12-Hour Scheduled Reports Setup

## Overview
A fully automated cron job system has been set up that generates business summary reports every 12 hours and sends them to business owners.

## What Was Created

### 1. Database Table: `reports_sent`
- **Location**: Supabase PostgreSQL database
- **Purpose**: Stores all report generation and sending records
- **Key Fields**:
  - `id`: Unique identifier
  - `business_id`: Links to the business
  - `recipient_email`: Email address of business owner
  - `report_type`: Type of report (default: `business_summary`)
  - `sent_at`: Timestamp when report was sent
  - `report_data`: JSON data containing the report metrics
  - `status`: `sent`, `failed`, or `pending`
  - `error_message`: Error details if failed
  - `created_at` & `updated_at`: Audit timestamps

### 2. Edge Function: `send-scheduled-reports`
- **Type**: Supabase Edge Function (Deno runtime)
- **Endpoint**: `https://preqthotdoqokunvzpzn.supabase.co/functions/v1/send-scheduled-reports`
- **Trigger**: Via pg_cron every 12 hours
- **What it does**:
  1. Fetches all businesses from the database
  2. Generates a summary report for each business including:
     - Total invoices count
     - Total sales amount
     - Amount paid & pending
     - Total expenses
     - Outstanding invoices count
     - Recent invoices (last 7 days)
  3. Sends formatted email to business owner
  4. Records report in `reports_sent` table with timestamp

### 3. Cron Schedule: `send-reports-cron`
- **Schedule**: Every 12 hours at 00:00 and 12:00 UTC
- **Cron Expression**: `0 0,12 * * *`
- **Trigger**: pg_cron PostgreSQL extension

## Configuration

### Email Sending Setup (REQUIRED)

The Edge Function supports SendGrid for email delivery. To enable it:

1. **Get SendGrid API Key**:
   - Sign up at https://sendgrid.com
   - Navigate to Settings → API Keys
   - Create a new API key with Mail Send permissions

2. **Add to Supabase Secrets**:
   - Go to Supabase Dashboard → Project Settings → Secrets
   - Add: `SENDGRID_API_KEY` = your API key

3. **Configure Email Sender**:
   - Update the `from` email in the Edge Function code to a verified sender

### Optional: Adjust Schedule

To change the 12-hour schedule:

```sql
-- Modify the cron job (example: every 6 hours)
-- Stop existing job
SELECT cron.unschedule('send-reports-cron');

-- Create new schedule (0 0,6,12,18 * * * = every 6 hours)
SELECT cron.schedule('send-reports-cron', '0 0,6,12,18 * * *', 'SELECT public.trigger_scheduled_reports()');
```

### Cron Expression Guide
```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 7) (0 or 7 is Sunday)
│ │ │ │ │
│ │ │ │ │
0 0,12 * * *    → Every 12 hours (00:00 & 12:00 UTC)
0 */6 * * *     → Every 6 hours
0 */4 * * *     → Every 4 hours
0 * * * *       → Every hour
0 0 * * *       → Daily at 00:00 UTC
```

## Monitoring

### View Report History
```sql
-- Check all sent reports
SELECT * FROM reports_sent 
ORDER BY sent_at DESC 
LIMIT 20;

-- Check failed reports
SELECT * FROM reports_sent 
WHERE status = 'failed' 
ORDER BY sent_at DESC;

-- Count by status
SELECT status, COUNT(*) as count 
FROM reports_sent 
GROUP BY status;

-- Reports sent in last 24 hours
SELECT * FROM reports_sent 
WHERE sent_at > now() - interval '24 hours'
ORDER BY sent_at DESC;
```

### View Cron Job Status
```sql
-- Check scheduled jobs
SELECT * FROM cron.job 
WHERE jobname = 'send-reports-cron';

-- Check cron logs
SELECT * FROM cron.job_run_details 
WHERE jobname = 'send-reports-cron' 
ORDER BY start_time DESC 
LIMIT 10;
```

### Test the Function Manually
```bash
curl -X POST \
  https://preqthotdoqokunvzpzn.supabase.co/functions/v1/send-scheduled-reports \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Report Format

Each email includes:

```
Business Summary Report - [Business Name]
Generated on: [Date/Time]

Financial Summary:
- Total Invoices: X
- Total Sales Amount: ₹X,XXX.XX
- Amount Paid: ₹X,XXX.XX
- Amount Pending: ₹X,XXX.XX
- Total Expenses: ₹X,XXX.XX
- Outstanding Invoices: X
- Recent Invoices (7 days): X

Login to HisabKitab to view more details: https://hisabkitab.store/dashboard
```

## Troubleshooting

### No reports being sent?
1. Check if `send-reports-cron` job exists:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'send-reports-cron';
   ```

2. Check job run logs:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobname = 'send-reports-cron' 
   ORDER BY start_time DESC LIMIT 5;
   ```

3. Verify Edge Function is deployed:
   ```bash
   curl https://preqthotdoqokunvzpzn.supabase.co/functions/v1/send-scheduled-reports
   ```

### Email not sending?
1. Ensure `SENDGRID_API_KEY` is set in Supabase Secrets
2. Check that the sender email is verified in SendGrid
3. Verify business email addresses are correct in database
4. Check Edge Function logs in Supabase Dashboard

### Database not found error?
- Ensure the `businesses`, `invoices`, and `expenses` tables exist
- Verify business email field is populated

## Next Steps

1. **Set up SendGrid API key** in Supabase Secrets
2. **Verify email sender** is configured
3. **Test the function** manually
4. **Monitor reports_sent table** for successful deliveries
5. **Adjust schedule** if needed for your timezone/requirements

## Performance Notes

- Each report generation queries invoices and expenses (optimized with indexes)
- Email sending is non-blocking; failures are logged
- Cron job runs in database maintenance window
- Reports are stored for audit trail and replay capability
