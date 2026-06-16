-- Health Check Management & Monitoring Script
-- Use these queries to monitor, test, and manage the automated health check system

-- ============================================
-- 1. VIEW CURRENT CRON JOB
-- ============================================
SELECT 
  jobname,
  schedule,
  command,
  active,
  database
FROM cron.job
WHERE jobname = 'daily-health-check';


-- ============================================
-- 2. VIEW LATEST HEALTH CHECK RESULT
-- ============================================
SELECT 
  check_timestamp,
  status,
  database_status,
  api_status,
  data_integrity,
  passed_checks || ' / ' || total_checks as checks_passed,
  failed_checks,
  response_time_ms || ' ms' as response_time,
  business_count as businesses,
  invoice_count as invoices,
  error_message,
  jsonb_pretty(check_details) as detailed_results
FROM health_checks
ORDER BY check_timestamp DESC
LIMIT 1;


-- ============================================
-- 3. VIEW HEALTH CHECK HISTORY (LAST 7 DAYS)
-- ============================================
SELECT 
  check_timestamp::date as check_date,
  check_timestamp::time as check_time,
  status,
  passed_checks,
  failed_checks,
  response_time_ms,
  business_count,
  invoice_count
FROM health_checks
WHERE check_timestamp > now() - interval '7 days'
ORDER BY check_timestamp DESC;


-- ============================================
-- 4. HEALTH CHECK STATUS SUMMARY
-- ============================================
SELECT 
  status,
  COUNT(*) as total_checks,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 1) as percentage,
  MAX(check_timestamp) as last_check,
  AVG(response_time_ms)::int as avg_response_time_ms,
  MIN(response_time_ms) as fastest_check_ms,
  MAX(response_time_ms) as slowest_check_ms
FROM health_checks
WHERE check_timestamp > now() - interval '30 days'
GROUP BY status
ORDER BY count DESC;


-- ============================================
-- 5. FAILED HEALTH CHECKS
-- ============================================
SELECT 
  check_timestamp,
  status,
  failed_checks,
  error_message,
  jsonb_pretty(check_details) as details,
  response_time_ms
FROM health_checks
WHERE failed_checks > 0
ORDER BY check_timestamp DESC
LIMIT 10;


-- ============================================
-- 6. SYSTEM TRENDS (LAST 30 DAYS)
-- ============================================
SELECT 
  DATE(check_timestamp) as check_date,
  COUNT(*) as total_checks,
  SUM(CASE WHEN status = 'healthy' THEN 1 ELSE 0 END) as healthy_count,
  SUM(CASE WHEN status = 'degraded' THEN 1 ELSE 0 END) as degraded_count,
  SUM(CASE WHEN status = 'unhealthy' THEN 1 ELSE 0 END) as unhealthy_count,
  ROUND(100.0 * SUM(CASE WHEN status = 'healthy' THEN 1 ELSE 0 END) / COUNT(*), 1) as healthy_percentage,
  AVG(response_time_ms)::int as avg_response_time_ms,
  AVG(business_count)::int as avg_businesses,
  AVG(invoice_count)::int as avg_invoices
FROM health_checks
WHERE check_timestamp > now() - interval '30 days'
GROUP BY DATE(check_timestamp)
ORDER BY check_date DESC;


-- ============================================
-- 7. DATA INTEGRITY ISSUES
-- ============================================
SELECT 
  check_timestamp,
  data_integrity,
  (check_details->>'orphan_invoices')::int as orphan_invoices,
  error_message
FROM health_checks
WHERE data_integrity != 'ok' OR check_details->>'data_integrity' != 'true'
ORDER BY check_timestamp DESC
LIMIT 10;


-- ============================================
-- 8. RECENT CRON JOB EXECUTIONS
-- ============================================
SELECT 
  jobid,
  jobname,
  start_time,
  end_time,
  EXTRACT(EPOCH FROM (end_time - start_time))::int as duration_seconds,
  succeeded,
  CASE WHEN succeeded THEN '\u2713' ELSE '\u2717' END as result,
  returned_message
FROM cron.job_run_details
WHERE jobname = 'daily-health-check'
ORDER BY start_time DESC
LIMIT 10;


-- ============================================
-- 9. HEALTH CHECK STATISTICS
-- ============================================
SELECT 
  COUNT(*) as total_checks,
  COUNT(DISTINCT DATE(check_timestamp)) as days_with_checks,
  ROUND(AVG(response_time_ms)::numeric, 0)::int as avg_response_time_ms,
  MIN(response_time_ms) as fastest_ms,
  MAX(response_time_ms) as slowest_ms,
  ROUND(100.0 * SUM(CASE WHEN status = 'healthy' THEN 1 ELSE 0 END) / COUNT(*), 1) as healthy_percentage,
  ROUND(100.0 * SUM(CASE WHEN status = 'degraded' THEN 1 ELSE 0 END) / COUNT(*), 1) as degraded_percentage,
  ROUND(100.0 * SUM(CASE WHEN status = 'unhealthy' THEN 1 ELSE 0 END) / COUNT(*), 1) as unhealthy_percentage,
  MAX(check_timestamp) as last_check,
  MIN(check_timestamp) as first_check,
  (MAX(check_timestamp) - MIN(check_timestamp)) as time_span
FROM health_checks;


-- ============================================
-- 10. TEST INSERT - Manual Test Record
-- ============================================
-- Uncomment to insert a test health check record
-- INSERT INTO health_checks (
--   status,
--   database_status,
--   api_status,
--   data_integrity,
--   business_count,
--   invoice_count,
--   total_checks,
--   passed_checks,
--   failed_checks,
--   response_time_ms,
--   check_details,
--   check_timestamp
-- ) VALUES (
--   'healthy',
--   'operational',
--   'operational',
--   'ok',
--   5,
--   150,
--   6,
--   6,
--   0,
--   850,
--   jsonb_build_object(
--     'database_connectivity', true,
--     'business_count', 5,
--     'businesses_table', true,
--     'invoice_count', 150,
--     'invoices_table', true,
--     'expenses_table', true,
--     'parties_table', true,
--     'data_integrity', true,
--     'test', true
--   ),
--   now()
-- );


-- ============================================
-- 11. CHANGE CRON SCHEDULE
-- ============================================
-- Every 6 hours (0 AM, 6 AM, 12 PM, 6 PM UTC):
-- SELECT cron.unschedule('daily-health-check');
-- SELECT cron.schedule('daily-health-check', '0 0,6,12,18 * * *', 'SELECT public.trigger_health_check()');

-- Every 4 hours:
-- SELECT cron.unschedule('daily-health-check');
-- SELECT cron.schedule('daily-health-check', '0 0,4,8,12,16,20 * * *', 'SELECT public.trigger_health_check()');

-- Every hour:
-- SELECT cron.unschedule('daily-health-check');
-- SELECT cron.schedule('daily-health-check', '0 * * * *', 'SELECT public.trigger_health_check()');

-- Twice daily (Midnight and Noon UTC):
-- SELECT cron.unschedule('daily-health-check');
-- SELECT cron.schedule('daily-health-check', '0 0,12 * * *', 'SELECT public.trigger_health_check()');

-- Daily at 9 AM UTC:
-- SELECT cron.unschedule('daily-health-check');
-- SELECT cron.schedule('daily-health-check', '0 9 * * *', 'SELECT public.trigger_health_check()');


-- ============================================
-- 12. DISABLE/ENABLE CRON JOB
-- ============================================
-- To disable:
-- UPDATE cron.job SET active = false WHERE jobname = 'daily-health-check';

-- To enable:
-- UPDATE cron.job SET active = true WHERE jobname = 'daily-health-check';


-- ============================================
-- 13. CLEANUP OLD HEALTH CHECKS
-- ============================================
-- Keep only last 90 days:
-- DELETE FROM health_checks WHERE check_timestamp < now() - interval '90 days';

-- Keep only last 30 days:
-- DELETE FROM health_checks WHERE check_timestamp < now() - interval '30 days';

-- Keep only last 7 days:
-- DELETE FROM health_checks WHERE check_timestamp < now() - interval '7 days';


-- ============================================
-- 14. EXPORT HEALTH DATA
-- ============================================
-- Export last 30 days as CSV-like format
SELECT 
  check_timestamp::text,
  status,
  database_status,
  api_status,
  data_integrity,
  business_count::text,
  invoice_count::text,
  total_checks::text,
  passed_checks::text,
  failed_checks::text,
  response_time_ms::text,
  error_message,
  check_details::text
FROM health_checks
WHERE check_timestamp > now() - interval '30 days'
ORDER BY check_timestamp DESC;


-- ============================================
-- 15. UPTIME PERCENTAGE CALCULATION
-- ============================================
SELECT 
  ROUND(
    100.0 * SUM(CASE WHEN status IN ('healthy', 'degraded') THEN 1 ELSE 0 END) / COUNT(*),
    2
  ) as uptime_percentage,
  SUM(CASE WHEN status = 'healthy' THEN 1 ELSE 0 END) as healthy_checks,
  SUM(CASE WHEN status = 'degraded' THEN 1 ELSE 0 END) as degraded_checks,
  SUM(CASE WHEN status = 'unhealthy' THEN 1 ELSE 0 END) as downtime_checks,
  COUNT(*) as total_checks
FROM health_checks
WHERE check_timestamp > now() - interval '30 days';
