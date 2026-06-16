# Automated Health Check System - 24 Hours

## Overview
An automated health check system that runs every 24 hours, performs comprehensive system checks, and saves results with timestamps to the database.

## What Was Created

### 1. Database Table: `health_checks`
- **Purpose**: Stores all health check results and historical data
- **Key Fields**:
  - `id`: Unique identifier
  - `check_timestamp`: When the check was performed (UTC)
  - `status`: Overall status - `healthy`, `degraded`, or `unhealthy`
  - `database_status`: Database connectivity status
  - `api_status`: API operational status
  - `data_integrity`: Data integrity check result
  - `business_count`: Number of businesses at check time
  - `invoice_count`: Number of invoices at check time
  - `total_checks`: Total number of checks performed
  - `passed_checks`: Number of checks that passed
  - `failed_checks`: Number of checks that failed
  - `check_details`: JSON object with detailed check results
  - `response_time_ms`: Time taken to complete health check
  - `error_message`: Any error encountered during checks
  - `created_at`: Record creation timestamp

### 2. Edge Function: `health-check`
- **Endpoint**: `https://preqthotdoqokunvzpzn.supabase.co/functions/v1/health-check`
- **Performs 6 comprehensive checks**:
  1. **Database Connectivity** - Verifies database is accessible
  2. **Businesses Table** - Checks businesses data and counts records
  3. **Invoices Table** - Checks invoices data and counts records
  4. **Expenses Table** - Checks expenses data and counts records
  5. **Parties Table** - Checks parties data and counts records
  6. **Data Integrity** - Validates data relationships (orphan checks)

### 3. Cron Schedule: `daily-health-check`
- **Schedule**: Daily at 00:00 UTC (every 24 hours)
- **Cron Expression**: `0 0 * * *`
- **Trigger**: pg_cron PostgreSQL extension

## Features

### Automated Checks Include:
- ✅ Database connectivity verification
- ✅ Table data availability
- ✅ Record counts for all major tables
- ✅ Data integrity validation
- ✅ Orphan record detection
- ✅ Response time measurement
- ✅ Detailed check results in JSON format
- ✅ Historical tracking with timestamps

### Status Indicators:
- **Healthy**: All checks passed
- **Degraded**: Some checks failed but system operational
- **Unhealthy**: Critical failures, system unavailable

## Monitoring

### View Latest Health Check
```sql
SELECT 
  check_timestamp,
  status,
  database_status,
  api_status,
  data_integrity,
  passed_checks,
  failed_checks,
  response_time_ms,
  jsonb_pretty(check_details) as details
FROM health_checks
ORDER BY check_timestamp DESC
LIMIT 1;
```

### View Health Check History (Last 7 Days)
```sql
SELECT 
  check_timestamp,
  status,
  passed_checks,
  failed_checks,
  response_time_ms,
  business_count,
  invoice_count
FROM health_checks
WHERE check_timestamp > now() - interval '7 days'
ORDER BY check_timestamp DESC;
```

### Count Checks by Status
```sql
SELECT 
  status,
  COUNT(*) as count,
  MAX(check_timestamp) as last_check,
  AVG(response_time_ms) as avg_response_time_ms
FROM health_checks
GROUP BY status
ORDER BY count DESC;
```

### View Failed Checks
```sql
SELECT 
  check_timestamp,
  status,
  failed_checks,
  error_message,
  jsonb_pretty(check_details) as details
FROM health_checks
WHERE failed_checks > 0
ORDER BY check_timestamp DESC
LIMIT 10;
```

### Check System Trends
```sql
SELECT 
  DATE(check_timestamp) as check_date,
  COUNT(*) as total_checks,
  SUM(CASE WHEN status = 'healthy' THEN 1 ELSE 0 END) as healthy_count,
  SUM(CASE WHEN status = 'degraded' THEN 1 ELSE 0 END) as degraded_count,
  SUM(CASE WHEN status = 'unhealthy' THEN 1 ELSE 0 END) as unhealthy_count,
  AVG(response_time_ms)::int as avg_response_time,
  AVG(business_count)::int as avg_businesses,
  AVG(invoice_count)::int as avg_invoices
FROM health_checks
WHERE check_timestamp > now() - interval '30 days'
GROUP BY DATE(check_timestamp)
ORDER BY check_date DESC;
```

## Testing

### Run Health Check Manually
```bash
curl -X POST \
  https://preqthotdoqokunvzpzn.supabase.co/functions/v1/health-check \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### View Cron Job Status
```sql
SELECT 
  jobname,
  schedule,
  command,
  active,
  last_start,
  last_successful_finish
FROM cron.job
WHERE jobname = 'daily-health-check';
```

### View Last Cron Execution
```sql
SELECT 
  jobid,
  jobname,
  start_time,
  end_time,
  succeeded,
  returned_message
FROM cron.job_run_details
WHERE jobname = 'daily-health-check'
ORDER BY start_time DESC
LIMIT 5;
```

## Configuration

### Change Schedule (Examples)

**Every 6 hours:**
```sql
SELECT cron.unschedule('daily-health-check');
SELECT cron.schedule('daily-health-check', '0 0,6,12,18 * * *', 'SELECT public.trigger_health_check()');
```

**Every 4 hours:**
```sql
SELECT cron.unschedule('daily-health-check');
SELECT cron.schedule('daily-health-check', '0 0,4,8,12,16,20 * * *', 'SELECT public.trigger_health_check()');
```

**Every hour:**
```sql
SELECT cron.unschedule('daily-health-check');
SELECT cron.schedule('daily-health-check', '0 * * * *', 'SELECT public.trigger_health_check()');
```

**Twice daily (00:00 and 12:00 UTC):**
```sql
SELECT cron.unschedule('daily-health-check');
SELECT cron.schedule('daily-health-check', '0 0,12 * * *', 'SELECT public.trigger_health_check()');
```

**Custom time (9 AM UTC):**
```sql
SELECT cron.unschedule('daily-health-check');
SELECT cron.schedule('daily-health-check', '0 9 * * *', 'SELECT public.trigger_health_check()');
```

### Cron Expression Reference
```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 7) (0 or 7 is Sunday)
│ │ │ │ │
│ │ │ │ │
0 0 * * *    → Daily at 00:00 UTC
0 */6 * * *  → Every 6 hours
0 */4 * * *  → Every 4 hours
0 * * * *    → Every hour
0 9 * * *    → Daily at 9 AM UTC
0 2 * * MON  → Every Monday at 2 AM UTC
```

## Alerts & Notifications

To set up automated alerts when health check fails:

```sql
-- Create a notifications table
CREATE TABLE IF NOT EXISTS health_alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  check_id uuid REFERENCES health_checks(id),
  alert_type text,
  message text,
  severity text CHECK (severity IN ('info', 'warning', 'critical')),
  sent_at timestamp with time zone DEFAULT now(),
  acknowledged boolean DEFAULT false
);

-- Trigger alert on unhealthy status
CREATE OR REPLACE FUNCTION alert_on_unhealthy_check()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'unhealthy' THEN
    INSERT INTO health_alerts (check_id, alert_type, message, severity)
    VALUES (
      NEW.id,
      'system_unhealthy',
      'System health check failed - ' || NEW.error_message,
      'critical'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER health_check_alert_trigger
AFTER INSERT ON health_checks
FOR EACH ROW
EXECUTE FUNCTION alert_on_unhealthy_check();
```

## Cleanup

### Archive Old Health Checks (Keep Last 90 Days)
```sql
DELETE FROM health_checks
WHERE check_timestamp < now() - interval '90 days';
```

### Archive Old Alerts (Keep Last 30 Days)
```sql
DELETE FROM health_alerts
WHERE sent_at < now() - interval '30 days';
```

## Performance Notes

- Health check completes in ~500-1000ms typically
- No impact on production queries
- Results stored for historical trending
- Runs during low-traffic window (00:00 UTC)
- Lightweight validation checks only

## Dashboard Queries

### System Health Dashboard
```sql
SELECT 
  (SELECT status FROM health_checks ORDER BY check_timestamp DESC LIMIT 1) as current_status,
  (SELECT response_time_ms FROM health_checks ORDER BY check_timestamp DESC LIMIT 1) as last_check_time_ms,
  (SELECT passed_checks FROM health_checks ORDER BY check_timestamp DESC LIMIT 1) as last_passed_checks,
  (SELECT failed_checks FROM health_checks ORDER BY check_timestamp DESC LIMIT 1) as last_failed_checks,
  (SELECT business_count FROM health_checks ORDER BY check_timestamp DESC LIMIT 1) as total_businesses,
  (SELECT invoice_count FROM health_checks ORDER BY check_timestamp DESC LIMIT 1) as total_invoices,
  (SELECT COUNT(*) FROM health_checks WHERE check_timestamp > now() - interval '24 hours' AND status = 'healthy') as healthy_in_24h;
```

## Troubleshooting

### Health check not running?
1. Verify cron job exists:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'daily-health-check';
   ```

2. Check recent execution:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobname = 'daily-health-check' 
   ORDER BY start_time DESC LIMIT 5;
   ```

3. Verify Edge Function is deployed:
   ```bash
   curl https://preqthotdoqokunvzpzn.supabase.co/functions/v1/health-check
   ```

### Too many records?
- Archive old records using the cleanup queries above
- Create a retention policy to auto-delete records older than 90 days

### Need more detailed checks?
- Edit the Edge Function to add custom health checks specific to your business logic
- Add checks for external services, APIs, or third-party integrations
