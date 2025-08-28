import React from "react";
import { ArrowLeft, Printer, Phone, Mail, MapPin, Calendar, FileText, Building2, CreditCard, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Party {
  name: string;
  address: string;
  mobile?: string;
  state?: string;
  gstin?: string;
  place_of_supply?: string;
}

interface InvoiceItem {
  id: string;
  item_name: string;
  hsn_code?: string;
  quantity: number;
  rate: number;
  gst_percent: number;
  gst_amount: number;
  total_amount: number;
}

interface Business {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin?: string;
  pan?: string;
}

interface Invoice {
  invoice_number: string;
  invoice_date: string;
  business: Business;
  party: Party;
  items: InvoiceItem[];
  subtotal: number;
  total_tax: number;
  net_total: number;
  payment_received: number;
  balance_due: number;
  notes?: string;
}

interface A4SinglePageInvoiceProps {
  invoice: Invoice;
  onBack?: () => void;
}

const formatNumber = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const numberToWords = (num: number): string => {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  const convertHundreds = (n: number): string => {
    let result = '';
    
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    
    if (n > 0) {
      result += ones[n] + ' ';
    }
    
    return result;
  };

  if (num === 0) return 'Zero Rupees Only';
  
  let result = '';
  let crores = Math.floor(num / 10000000);
  let lakhs = Math.floor((num % 10000000) / 100000);
  let thousands = Math.floor((num % 100000) / 1000);
  let hundreds = num % 1000;
  
  if (crores > 0) {
    result += convertHundreds(crores) + 'Crore ';
  }
  
  if (lakhs > 0) {
    result += convertHundreds(lakhs) + 'Lakh ';
  }
  
  if (thousands > 0) {
    result += convertHundreds(thousands) + 'Thousand ';
  }
  
  if (hundreds > 0) {
    result += convertHundreds(hundreds);
  }
  
  return result.trim() + ' Rupees Only';
};

export default function A4SinglePageInvoice({ invoice, onBack }: A4SinglePageInvoiceProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleBackClick = () => {
    console.log("Back button clicked - navigating to sales-entry");
    console.log("onBack function:", onBack);
    if (onBack) {
      onBack();
    } else {
      console.warn("No onBack function provided - using fallback navigation to sales-entry");
      // Fallback navigation to sales-entry page
      if (typeof window !== 'undefined') {
        window.location.href = '/sales-entry';
      }
    }
  };

  // Calculate due date (30 days from invoice date)
  const dueDate = new Date(invoice.invoice_date);
  dueDate.setDate(dueDate.getDate() + 30);

  // Debug logging for invoice items
  console.log("=== A4SinglePageInvoice DEBUG ===");
  console.log("Invoice items received:", invoice.items);
  console.log("Items count:", invoice.items?.length);

  // Ensure items is always an array
  const invoiceItems = invoice.items && Array.isArray(invoice.items) ? invoice.items : [];
  
  // Calculate totals from items if not provided
  const calculateTotals = () => {
    let calculatedSubtotal = 0;
    let calculatedTax = 0;
    
    invoiceItems.forEach(item => {
      const quantity = Number(item?.quantity || 0);
      const rate = Number(item?.rate || 0);
      const gstPercent = Number(item?.gst_percent || 0);
      
      const baseAmount = quantity * rate;
      const gstAmount = (baseAmount * gstPercent) / 100;
      
      calculatedSubtotal += baseAmount;
      calculatedTax += gstAmount;
    });
    
    return {
      subtotal: calculatedSubtotal,
      totalTax: calculatedTax,
      netTotal: calculatedSubtotal + calculatedTax
    };
  };
  
  const totals = calculateTotals();
  const displaySubtotal = invoice.subtotal || totals.subtotal;
  const displayTotalTax = invoice.total_tax || totals.totalTax;
  const displayNetTotal = invoice.net_total || totals.netTotal;

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Header with Back Button - Hidden in Print */}
      <div className="no-print bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="outline" size="sm" onClick={handleBackClick}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <h1 className="text-lg font-semibold text-gray-900">Invoice Preview</h1>
        </div>
        <Button onClick={handlePrint} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
          <Printer className="h-4 w-4" />
          Print / Save PDF
        </Button>
      </div>

      {/* A4 Invoice Container */}
      <div className="invoice-container mx-auto p-4 print:p-0">
        <div className="invoice-page bg-white shadow-xl print:shadow-none border-0 print:border-0 rounded-lg print:rounded-none">
          
          {/* Professional Header */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b-2 border-blue-200 p-8 rounded-t-lg print:rounded-none">
            <div className="grid grid-cols-2 gap-8 items-center">
              {/* Company Info */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Building2 className="h-8 w-8 text-blue-600" />
                  <h1 className="text-3xl font-bold text-gray-800">{invoice.business.name}</h1>
                </div>
                <div className="space-y-2 text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 flex-shrink-0 text-blue-500" />
                    <span className="text-base">{invoice.business.address}, {invoice.business.city}, {invoice.business.state} - {invoice.business.pincode}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 flex-shrink-0 text-blue-500" />
                    <span className="text-base">{invoice.business.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 flex-shrink-0 text-blue-500" />
                    <span className="text-base">{invoice.business.email}</span>
                  </div>
                  <div className="flex gap-6 mt-3">
                    {invoice.business.gstin && (
                      <div className="text-sm text-gray-700"><span className="font-medium">GSTIN:</span> {invoice.business.gstin}</div>
                    )}
                    {invoice.business.pan && (
                      <div className="text-sm text-gray-700"><span className="font-medium">PAN:</span> {invoice.business.pan}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Invoice Header */}
              <div className="text-right">
                <div className="bg-white border border-blue-200 rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-end gap-2 mb-3">
                    <FileText className="h-6 w-6 text-blue-600" />
                    <h2 className="text-2xl font-bold text-gray-800">TAX INVOICE</h2>
                  </div>
                  <div className="text-blue-600 text-base mb-4 font-medium">ORIGINAL FOR RECIPIENT</div>
                  <div className="space-y-2 text-base">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Invoice No:</span>
                      <span className="font-semibold text-gray-800">{invoice.invoice_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-semibold text-gray-800">{new Date(invoice.invoice_date).toLocaleDateString('en-GB')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Due Date:</span>
                      <span className="font-semibold text-gray-800">{dueDate.toLocaleDateString('en-GB')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6">
            {/* Bill To / Ship To Section */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Bill To */}
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <h3 className="text-base font-bold text-gray-800 uppercase">Bill To</h3>
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-gray-800 text-base">{invoice.party.name}</div>
                  <div className="text-gray-700 text-sm flex items-start gap-2">
                    <MapPin className="h-3 w-3 mt-0.5 text-blue-500 flex-shrink-0" />
                    <span>{invoice.party.address}</span>
                  </div>
                  {invoice.party.mobile && (
                    <div className="text-gray-700 text-sm flex items-center gap-2">
                      <Phone className="h-3 w-3 text-blue-500" />
                      <span>{invoice.party.mobile}</span>
                    </div>
                  )}
                  {invoice.party.state && (
                    <div className="text-gray-700 text-sm">
                      <span className="font-medium">Place of Supply:</span> {invoice.party.state}
                    </div>
                  )}
                  {invoice.party.gstin && (
                    <div className="text-gray-700 text-sm">
                      <span className="font-medium">GSTIN:</span> {invoice.party.gstin}
                    </div>
                  )}
                </div>
              </div>

              {/* Ship To */}
              <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <h3 className="text-base font-bold text-gray-800 uppercase">Ship To</h3>
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-gray-800 text-base">{invoice.party.name}</div>
                  <div className="text-gray-700 text-sm flex items-start gap-2">
                    <MapPin className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                    <span>{invoice.party.address}</span>
                  </div>
                  {invoice.party.mobile && (
                    <div className="text-gray-700 text-sm flex items-center gap-2">
                      <Phone className="h-3 w-3 text-green-500" />
                      <span>{invoice.party.mobile}</span>
                    </div>
                  )}
                  {invoice.party.state && (
                    <div className="text-gray-700 text-sm">
                      <span className="font-medium">Place of Supply:</span> {invoice.party.state}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-6">
              <div className="overflow-hidden rounded-lg border border-gray-300 shadow-sm">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                      <th className="border border-gray-300 px-4 py-4 text-left text-base font-bold w-16">S.NO.</th>
                      <th className="border border-gray-300 px-4 py-4 text-left text-base font-bold">ITEMS</th>
                      <th className="border border-gray-300 px-4 py-4 text-left text-base font-bold w-24">HSN</th>
                      <th className="border border-gray-300 px-4 py-4 text-center text-base font-bold w-20">QTY.</th>
                      <th className="border border-gray-300 px-4 py-4 text-right text-base font-bold w-28">RATE</th>
                      <th className="border border-gray-300 px-4 py-4 text-center text-base font-bold w-20">TAX</th>
                      <th className="border border-gray-300 px-4 py-4 text-right text-base font-bold w-32">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {invoiceItems && invoiceItems.length > 0 ? (
                      invoiceItems.map((item, index) => {
                        console.log(`Rendering item ${index}:`, item);
                        
                        // Calculate values with fallbacks
                        const quantity = Number(item?.quantity || 0);
                        const rate = Number(item?.rate || 0);
                        const gstPercent = Number(item?.gst_percent || 0);
                        
                        // Calculate amount if not provided
                        const baseAmount = quantity * rate;
                        const gstAmount = Number(item?.gst_amount || ((baseAmount * gstPercent) / 100));
                        const totalAmount = Number(item?.total_amount || (baseAmount + gstAmount));
                        
                        console.log(`Item ${index} calculations:`, {
                          quantity,
                          rate,
                          baseAmount,
                          gstPercent,
                          gstAmount,
                          totalAmount
                        });
                        
                        return (
                          <tr key={item.id || `item-${index}`} className="hover:bg-blue-50 transition-colors border-b border-gray-200">
                            <td className="border border-gray-200 px-4 py-4 text-center text-base font-medium text-gray-700">{index + 1}</td>
                            <td className="border border-gray-200 px-4 py-4 text-base font-medium text-gray-800">
                              {item?.item_name || `Item ${index + 1}`}
                            </td>
                            <td className="border border-gray-200 px-4 py-4 text-base text-center text-gray-600">{item?.hsn_code || '-'}</td>
                            <td className="border border-gray-200 px-4 py-4 text-base text-center font-medium text-gray-700">{quantity} PCS</td>
                            <td className="border border-gray-200 px-4 py-4 text-base text-right font-medium text-gray-700">₹ {formatNumber(rate)}</td>
                            <td className="border border-gray-200 px-4 py-4 text-base text-center font-medium text-gray-700">{formatNumber(gstPercent)}%</td>
                            <td className="border border-gray-200 px-4 py-4 text-base text-right font-bold text-blue-600">₹ {formatNumber(totalAmount)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="border border-gray-200 px-4 py-8 text-center text-gray-500 italic">
                          No items found in this invoice (Items: {JSON.stringify(invoice.items)})
                        </td>
                      </tr>
                    )}
                    
                    {/* Fill empty rows for consistent layout but reduce count */}
                    {invoiceItems && invoiceItems.length < 5 && Array.from({ length: 5 - invoiceItems.length }).map((_, index) => (
                      <tr key={`empty-${index}`} className="border-b border-gray-100">
                        <td className="border border-gray-200 px-4 py-2 h-10 text-gray-300">&nbsp;</td>
                        <td className="border border-gray-200 px-4 py-2 text-gray-300">&nbsp;</td>
                        <td className="border border-gray-200 px-4 py-2 text-gray-300">&nbsp;</td>
                        <td className="border border-gray-200 px-4 py-2 text-gray-300">&nbsp;</td>
                        <td className="border border-gray-200 px-4 py-2 text-gray-300">&nbsp;</td>
                        <td className="border border-gray-200 px-4 py-2 text-gray-300">&nbsp;</td>
                        <td className="border border-gray-200 px-4 py-2 text-gray-300">&nbsp;</td>
                      </tr>
                    ))}

                    {/* Subtotal Row */}
                    <tr className="bg-gradient-to-r from-blue-100 to-blue-200">
                      <td colSpan={5} className="border border-gray-300 px-4 py-4 text-center text-base font-bold text-gray-800 uppercase">Subtotal</td>
                      <td className="border border-gray-300 px-4 py-4 text-center text-base font-bold text-gray-800">{invoiceItems?.length || 0}</td>
                      <td className="border border-gray-300 px-4 py-4 text-right text-base font-bold text-blue-600">₹ {formatNumber(displaySubtotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-2 gap-6">
              {/* Terms and Conditions */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h4 className="text-base font-bold text-gray-800 mb-3 uppercase flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Terms and Conditions
                </h4>
                <div className="text-xs text-gray-700 space-y-1">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">1.</span>
                    <span>Goods once sold will not be taken back or exchanged</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">2.</span>
                    <span>All disputes are subject to {invoice.business.city} jurisdiction only</span>
                  </div>
                  {invoice.notes && (
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-blue-600">3.</span>
                      <span>{invoice.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Totals Section */}
              <div className="space-y-4">
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                  <h4 className="text-base font-bold text-gray-800 mb-3 uppercase">Payment Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">Taxable Amount</span>
                      <span className="font-semibold text-gray-800">₹ {formatNumber(displaySubtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">IGST @{invoiceItems?.[0]?.gst_percent || 0}%</span>
                      <span className="font-semibold text-gray-800">₹ {formatNumber(displayTotalTax)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">Round Off</span>
                      <span className="font-semibold text-gray-800">₹ 0.01</span>
                    </div>
                    <div className="border-t-2 border-blue-300 pt-2 flex justify-between items-center">
                      <span className="font-bold text-base text-gray-800">Total Amount</span>
                      <span className="font-bold text-lg text-blue-600">₹ {formatNumber(displayNetTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">Received Amount</span>
                      <span className="font-semibold text-green-600">₹ {formatNumber(invoice.payment_received || 0)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <div className="text-xs text-gray-600 mb-1 font-medium uppercase">Total Amount (in words)</div>
                  <div className="text-sm font-bold text-gray-800 leading-relaxed">
                    {numberToWords(Math.round(displayNetTotal))}
                  </div>
                </div>
              </div>
            </div>

            {/* Signature Section */}
            <div className="flex justify-end mt-8">
              <div className="text-center">
                <div className="w-40 h-16 border-b-2 border-blue-300 mb-2"></div>
                <div className="text-sm text-gray-600 font-medium">Authorised Signature</div>
                <div className="font-bold text-gray-800 mt-1 text-sm">{invoice.business.name}</div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-6 pt-4 border-t border-blue-200">
              <div className="text-xs text-gray-500 italic">
                This is a computer-generated invoice and does not require a physical signature.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .invoice-container {
            margin: 0 !important;
            padding: 0 !important;
            max-width: none !important;
          }
          
          .invoice-page {
            width: 210mm !important;
            min-height: auto !important;
            max-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            font-size: 18px !important;
            background: white !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            overflow: hidden !important;
          }
          
          @page {
            size: A4;
            margin: 0;
          }
          
          .bg-gradient-to-r {
            background: linear-gradient(to right, #dbeafe, #bfdbfe) !important;
          }
          
          table {
            font-size: 16px !important;
            page-break-inside: avoid;
          }
          
          th, td {
            padding: 4mm 4mm !important;
            font-size: 16px !important;
          }
          
          .text-sm {
            font-size: 16px !important;
          }
          
          .text-xs {
            font-size: 14px !important;
          }
          
          .text-base {
            font-size: 18px !important;
          }
          
          .text-lg {
            font-size: 20px !important;
          }
          
          .text-xl {
            font-size: 24px !important;
          }
          
          .text-2xl {
            font-size: 28px !important;
          }
          
          .text-3xl {
            font-size: 32px !important;
          }
          
          h1, h2, h3, h4 {
            page-break-after: avoid;
          }
          
          .grid {
            page-break-inside: avoid;
          }
          
          .p-8 {
            padding: 6mm !important;
          }
          
          .p-6 {
            padding: 4mm !important;
          }
          
          .p-4 {
            padding: 3mm !important;
          }
          
          .mb-8 {
            margin-bottom: 6mm !important;
          }
          
          .mb-6 {
            margin-bottom: 4mm !important;
          }
          
          .mb-4 {
            margin-bottom: 3mm !important;
          }
          
          .gap-8 {
            gap: 6mm !important;
          }
          
          .gap-6 {
            gap: 4mm !important;
          }
        }
        
        .invoice-container {
          max-width: 210mm;
        }
        
        .invoice-page {
          width: 210mm;
          min-height: auto;
          max-height: 297mm;
          margin: 0 auto;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
