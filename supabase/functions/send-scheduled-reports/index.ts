import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Initialize Supabase client with service role
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Types
interface Business {
  id: string;
  user_id: string;
  name: string;
  email: string;
  city: string;
  state: string;
}

interface BusinessSummary {
  totalInvoices: number;
  totalSalesAmount: number;
  totalPaidAmount: number;
  totalPendingAmount: number;
  totalExpenses: number;
  outstandingInvoices: number;
  recentInvoices: number;
}

// Generate business summary report
async function generateBusinessReport(
  businessId: string
): Promise<BusinessSummary | null> {
  try {
    // Get invoices summary
    const { data: invoices } = await supabase
      .from("invoices")
      .select("*")
      .eq("business_id", businessId)
      .eq("type", "sales");

    // Get expenses summary
    const { data: expenses } = await supabase
      .from("expenses")
      .select("amount")
      .eq("business_id", businessId);

    // Calculate summary
    const totalInvoices = invoices?.length || 0;
    const totalSalesAmount = invoices?.reduce(
      (sum, inv) => sum + (parseFloat(inv.net_total) || 0),
      0
    ) || 0;
    const totalPaidAmount = invoices?.reduce(
      (sum, inv) => sum + (parseFloat(inv.payment_received) || 0),
      0
    ) || 0;
    const totalPendingAmount = invoices?.reduce(
      (sum, inv) => sum + (parseFloat(inv.balance_due) || 0),
      0
    ) || 0;
    const totalExpenses = expenses?.reduce(
      (sum, exp) => sum + (parseFloat(exp.amount) || 0),
      0
    ) || 0;
    const outstandingInvoices =
      invoices?.filter((inv) => inv.status === "overdue" || inv.status === "partial")
        .length || 0;

    // Recent invoices (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentInvoices =
      invoices?.filter(
        (inv) => new Date(inv.created_at) >= sevenDaysAgo
      ).length || 0;

    return {
      totalInvoices,
      totalSalesAmount,
      totalPaidAmount,
      totalPendingAmount,
      totalExpenses,
      outstandingInvoices,
      recentInvoices,
    };
  } catch (error) {
    console.error(`Error generating report for business ${businessId}:`, error);
    return null;
  }
}

// Send email to business owner
async function sendEmailReport(
  email: string,
  businessName: string,
  summary: BusinessSummary
): Promise<boolean> {
  try {
    // Prepare email body with report data
    const emailBody = `
      <h2>Business Summary Report - ${businessName}</h2>
      <p>Generated on: ${new Date().toLocaleString()}</p>
      
      <h3>Financial Summary</h3>
      <ul>
        <li><strong>Total Invoices:</strong> ${summary.totalInvoices}</li>
        <li><strong>Total Sales Amount:</strong> ₹${summary.totalSalesAmount.toFixed(2)}</li>
        <li><strong>Amount Paid:</strong> ₹${summary.totalPaidAmount.toFixed(2)}</li>
        <li><strong>Amount Pending:</strong> ₹${summary.totalPendingAmount.toFixed(2)}</li>
        <li><strong>Total Expenses:</strong> ₹${summary.totalExpenses.toFixed(2)}</li>
        <li><strong>Outstanding Invoices:</strong> ${summary.outstandingInvoices}</li>
        <li><strong>Recent Invoices (7 days):</strong> ${summary.recentInvoices}</li>
      </ul>
      
      <p>Login to HisabKitab to view more details: <a href="https://hisabkitab.store">Dashboard</a></p>
    `;

    // Call Supabase email service via Edge Function or SendGrid
    // For now, we'll log this - you need to configure email sending
    console.log(`Email would be sent to ${email}:`, emailBody);

    // In production, use SendGrid or Resend API
    // const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `Bearer ${Deno.env.get("SENDGRID_API_KEY")}`,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     personalizations: [{ to: [{ email }] }],
    //     from: { email: "reports@hisabkitab.store" },
    //     subject: `Business Summary Report - ${businessName}`,
    //     html_content: emailBody,
    //   }),
    // });

    return true;
  } catch (error) {
    console.error(`Error sending email to ${email}:`, error);
    return false;
  }
}

// Main function: Generate and send reports
async function sendReports() {
  console.log("Starting 12-hour scheduled report job...");

  try {
    // Fetch all businesses
    const { data: businesses, error: businessError } = await supabase
      .from("businesses")
      .select("id, user_id, name, email");

    if (businessError) throw businessError;

    let successCount = 0;
    let failureCount = 0;

    // Process each business
    for (const business of businesses || []) {
      try {
        // Generate report
        const summary = await generateBusinessReport(business.id);

        if (!summary) {
          // Save failure record
          await supabase.from("reports_sent").insert({
            business_id: business.id,
            recipient_email: business.email,
            report_type: "business_summary",
            status: "failed",
            error_message: "Failed to generate report",
          });
          failureCount++;
          continue;
        }

        // Send email
        const emailSent = await sendEmailReport(
          business.email,
          business.name,
          summary
        );

        // Save report record
        const { error: insertError } = await supabase
          .from("reports_sent")
          .insert({
            business_id: business.id,
            recipient_email: business.email,
            report_type: "business_summary",
            report_data: summary,
            status: emailSent ? "sent" : "failed",
            error_message: emailSent ? null : "Email delivery failed",
            sent_at: new Date().toISOString(),
          });

        if (insertError) throw insertError;

        successCount++;
        console.log(
          `✓ Report sent to ${business.name} (${business.email})`
        );
      } catch (error) {
        failureCount++;
        console.error(
          `✗ Error processing business ${business.name}:`,
          error
        );
      }
    }

    console.log(
      `Report job completed: ${successCount} sent, ${failureCount} failed`
    );

    return {
      success: true,
      message: `Reports sent: ${successCount}, Failed: ${failureCount}`,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error in report job:", error);
    return {
      success: false,
      error: String(error),
      timestamp: new Date().toISOString(),
    };
  }
}

// Deno serve handler
serve(async (req) => {
  // Verify the request is from Supabase cron (check authorization if needed)
  const authHeader = req.headers.get("authorization");

  if (
    req.method !== "POST" &&
    req.method !== "GET"
  ) {
    return new Response("Method not allowed", { status: 405 });
  }

  const result = await sendReports();

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
    status: result.success ? 200 : 500,
  });
});
