-- Script to manage and test the scheduled reports system

-- ============================================
-- 1. VIEW CURRENT CRON JOBS
-- ============================================
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job
WHERE jobname = 'send-reports-cron' OR jobname LIKE '%report%'
ORDER BY jobname;


-- ============================================
-- 2. VIEW RECENT CRON JOB EXECUTIONS
-- ============================================
SELECT 
  jobid,
  jobname,
  start_time,
  end_time,
  succeeded,
  returned_message,
  query
FROM cron.job_run_details
WHERE jobname = 'send-reports-cron'
ORDER BY start_time DESC
LIMIT 10;


-- ============================================
-- 3. VIEW REPORT SENDING HISTORY
-- ============================================
SELECT 
  id,
  business_id,
  recipient_email,
  report_type,
  sent_at,
  status,
  error_message,
  jsonb_pretty(report_data) as report_summary
FROM reports_sent
ORDER BY sent_at DESC
LIMIT 20;


-- ============================================
-- 4. REPORTS BY STATUS
-- ============================================
SELECT 
  status,
  COUNT(*) as count,
  MAX(sent_at) as last_sent,
  STRING_AGG(DISTINCT recipient_email, ', ') as recipients
FROM reports_sent
GROUP BY status
ORDER BY count DESC;


-- ============================================
-- 5. MANUALLY INSERT TEST REPORT RECORD
-- ============================================
-- Use this to test if reports_sent table is working
INSERT INTO reports_sent (
  business_id,
  recipient_email,
  report_type,
  report_data,
  status,
  sent_at
) VALUES (
  gen_random_uuid(),
  'test@example.com',
  'business_summary',
  jsonb_build_object(
    'totalInvoices', 10,
    'totalSalesAmount', 50000,
    'totalPaidAmount', 30000,
    'totalPendingAmount', 20000,
    'totalExpenses', 5000,
    'outstandingInvoices', 3,
    'recentInvoices', 2
  ),
  'sent',
  now()
);

SELECT 'Test record inserted' as message;


-- ============================================
-- 6. DISABLE CRON JOB (if needed)
-- ============================================
-- Run this to stop the scheduled reports
-- SELECT cron.unschedule('send-reports-cron');


-- ============================================
-- 7. RE-ENABLE CRON JOB (if disabled)
-- ============================================
-- Run this to restart the scheduled reports (every 12 hours at 00:00 and 12:00 UTC)
-- SELECT cron.schedule('send-reports-cron', '0 0,12 * * *', 'SELECT public.trigger_scheduled_reports()');


-- ============================================
-- 8. CHANGE SCHEDULE (examples)
-- ============================================

-- Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)
-- SELECT cron.unschedule('send-reports-cron');
-- SELECT cron.schedule('send-reports-cron', '0 0,6,12,18 * * *', 'SELECT public.trigger_scheduled_reports()');

-- Every 4 hours
-- SELECT cron.unschedule('send-reports-cron');
-- SELECT cron.schedule('send-reports-cron', '0 0,4,8,12,16,20 * * *', 'SELECT public.trigger_scheduled_reports()');

-- Every hour
-- SELECT cron.unschedule('send-reports-cron');
-- SELECT cron.schedule('send-reports-cron', '0 * * * *', 'SELECT public.trigger_scheduled_reports()');

-- Daily at 9 AM UTC
-- SELECT cron.unschedule('send-reports-cron');
-- SELECT cron.schedule('send-reports-cron', '0 9 * * *', 'SELECT public.trigger_scheduled_reports()');


-- ============================================
-- 9. CLEANUP: DELETE OLD REPORTS (keep last 30 days)
-- ============================================
-- DELETE FROM reports_sent
-- WHERE sent_at < now() - interval '30 days';


-- ============================================
-- 10. GET STATISTICS
-- ============================================
SELECT
  COUNT(*) as total_reports,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
  MIN(sent_at) as first_report,
  MAX(sent_at) as last_report,
  COUNT(DISTINCT business_id) as unique_businesses,
  COUNT(DISTINCT DATE(sent_at)) as days_with_reports
FROM reports_sent;
