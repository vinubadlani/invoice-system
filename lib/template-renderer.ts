import { CustomTemplate, TemplateElement } from "@/components/TemplateEditor"

export interface InvoiceData {
  id: string
  invoice_no: string
  date: string
  party_name: string
  party_email?: string
  party_phone?: string
  party_gstin?: string
  party_address?: string
  party_state?: string
  items: any[]
  subtotal: number
  total_tax: number
  net_total: number
  payment_received: number
  balance_due: number
  status?: string
  terms_conditions?: string
  business?: {
    name: string
    address: string
    city?: string
    state?: string
    pincode?: string
    phone: string
    email: string
    gstin?: string
    pan?: string
    bank_name?: string
    account_no?: string
    ifsc_code?: string
    upi_id?: string
  }
  [key: string]: any
}

export class CustomTemplateRenderer {
  /**
   * Render custom template as HTML
   */
  static renderHTML(template: CustomTemplate, invoiceData: InvoiceData): string {
    const pageStyles = `
      page {
        size: ${template.pageWidth}mm ${template.pageHeight}mm;
        margin: ${template.pageMargin}mm;
        background-color: ${template.backgroundColor};
        display: block;
        page-break-after: always;
      }
      
      @page {
        size: ${template.pageWidth}mm ${template.pageHeight}mm;
        margin: ${template.pageMargin}mm;
      }
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Segoe UI', sans-serif;
        font-size: 12px;
        color: #333;
      }
    `

    const containerStyle = `
      position: relative;
      width: ${template.pageWidth}mm;
      height: ${template.pageHeight}mm;
      background-color: ${template.backgroundColor};
      overflow: hidden;
    `

    const elementsHTML = template.elements
      .filter((el) => el.visible)
      .map((element) => this.renderElement(element, invoiceData))
      .join("")

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          ${pageStyles}
        </style>
      </head>
      <body>
        <page>
          <div style="${containerStyle}">
            ${elementsHTML}
          </div>
        </page>
      </body>
      </html>
    `
  }

  /**
   * Render individual element
   */
  private static renderElement(
    element: TemplateElement,
    invoiceData: InvoiceData
  ): string {
    const baseStyle = `
      position: absolute;
      left: ${element.x}mm;
      top: ${element.y}mm;
      width: ${element.width}mm;
      height: ${element.height}mm;
      background-color: ${element.backgroundColor};
      color: ${element.color};
      font-family: ${element.fontFamily};
      font-size: ${element.fontSize}px;
      font-weight: ${element.fontWeight};
      text-align: ${element.textAlign};
      opacity: ${element.opacity};
      transform: rotate(${element.rotation}deg);
      ${element.borderWidth > 0 ? `border: ${element.borderWidth}px solid ${element.borderColor};` : `border: 1px dashed rgba(0,0,0,0.1);`}
      padding: 4px;
      overflow: hidden;
      display: ${element.visible ? "block" : "none"};
    `

    const content = this.interpolateContent(element.content || "", invoiceData)

    switch (element.type) {
      case "text":
        return `<div style="${baseStyle}">${this.escapeHTML(content)}</div>`

      case "line":
        return `
          <div style="${baseStyle} border: none; border-bottom: 2px solid ${element.color}; height: 0;"></div>
        `

      case "table":
        return `
          <div style="${baseStyle}">
            ${this.renderInvoiceTable(invoiceData)}
          </div>
        `

      case "image":
        return `
          <img src="${element.content}" style="${baseStyle} object-fit: cover;" />
        `

      case "qrcode":
        return `
          <div style="${baseStyle} display: flex; align-items: center; justify-content: center;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=${Math.min(element.width, element.height)}x${Math.min(element.width, element.height)}&data=${encodeURIComponent(content)}" style="width: 100%; height: 100%; object-fit: contain;" />
          </div>
        `

      default:
        return ""
    }
  }

  /**
   * Interpolate template variables with invoice data
   */
  private static interpolateContent(content: string, invoiceData: InvoiceData): string {
    return content
      .replace(/\{\{invoice_no\}\}/g, invoiceData.invoice_no)
      .replace(/\{\{date\}\}/g, invoiceData.date)
      .replace(/\{\{party_name\}\}/g, invoiceData.party_name)
      .replace(/\{\{party_email\}\}/g, invoiceData.party_email || "")
      .replace(/\{\{party_phone\}\}/g, invoiceData.party_phone || "")
      .replace(/\{\{party_gstin\}\}/g, invoiceData.party_gstin || "")
      .replace(/\{\{party_address\}\}/g, invoiceData.party_address || "")
      .replace(/\{\{party_state\}\}/g, invoiceData.party_state || "")
      .replace(/\{\{subtotal\}\}/g, invoiceData.subtotal?.toFixed(2) || "0")
      .replace(/\{\{total_tax\}\}/g, invoiceData.total_tax?.toFixed(2) || "0")
      .replace(/\{\{net_total\}\}/g, invoiceData.net_total?.toFixed(2) || "0")
      .replace(/\{\{payment_received\}\}/g, invoiceData.payment_received?.toFixed(2) || "0")
      .replace(/\{\{balance_due\}\}/g, invoiceData.balance_due?.toFixed(2) || "0")
      .replace(/\{\{business_name\}\}/g, invoiceData.business?.name || "")
      .replace(/\{\{business_address\}\}/g, invoiceData.business?.address || "")
      .replace(/\{\{business_gstin\}\}/g, invoiceData.business?.gstin || "")
      .replace(/\{\{business_phone\}\}/g, invoiceData.business?.phone || "")
      .replace(/\{\{business_email\}\}/g, invoiceData.business?.email || "")
      .replace(/\{\{business_pan\}\}/g, invoiceData.business?.pan || "")
  }

  /**
   * Render invoice items table
   */
  private static renderInvoiceTable(invoiceData: InvoiceData): string {
    const headerStyle = `
      background-color: #f3f4f6;
      font-weight: bold;
      border-bottom: 2px solid #000;
      padding: 4px;
    `

    const rowStyle = `
      border-bottom: 1px solid #e5e7eb;
      padding: 4px;
    `

    const rows = (invoiceData.items || [])
      .map(
        (item, index) => `
        <tr style="${rowStyle}">
          <td style="text-align: center;">${index + 1}</td>
          <td>${item.item_name || ""}</td>
          <td style="text-align: center;">${item.hsn_code || ""}</td>
          <td style="text-align: right;">${item.quantity || 0}</td>
          <td style="text-align: right;">₹${(item.rate || 0).toFixed(2)}</td>
          <td style="text-align: right;">${item.gst_percent || 0}%</td>
          <td style="text-align: right;">₹${(item.gst_amount || 0).toFixed(2)}</td>
          <td style="text-align: right;">₹${(item.total_amount || 0).toFixed(2)}</td>
        </tr>
      `
      )
      .join("")

    return `
      <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
        <thead>
          <tr style="${headerStyle}">
            <th style="text-align: center; width: 30px;">Sr</th>
            <th>Item Name</th>
            <th style="text-align: center; width: 50px;">HSN</th>
            <th style="text-align: right; width: 40px;">Qty</th>
            <th style="text-align: right; width: 50px;">Rate</th>
            <th style="text-align: right; width: 40px;">GST%</th>
            <th style="text-align: right; width: 50px;">GST</th>
            <th style="text-align: right; width: 60px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `
  }

  /**
   * Escape HTML special characters
   */
  private static escapeHTML(text: string): string {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }

  /**
   * Export template as PDF (requires html2pdf library)
   */
  static async exportToPDF(
    template: CustomTemplate,
    invoiceData: InvoiceData,
    filename: string = "invoice.pdf"
  ): Promise<void> {
    // This requires html2pdf library to be installed
    // npm install html2pdf.js
    const element = document.createElement("div")
    element.innerHTML = this.renderHTML(template, invoiceData)

    // Check if html2pdf is available
    if (typeof (window as any).html2pdf === "undefined") {
      console.warn(
        "html2pdf library not loaded. Please install: npm install html2pdf.js"
      )
      return
    }

    const options = {
      margin: template.pageMargin,
      filename: filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: {
        unit: "mm",
        format: [template.pageWidth, template.pageHeight],
        orientation: "portrait",
      },
    }

    await (window as any).html2pdf().set(options).from(element).save()
  }

  /**
   * Print template
   */
  static print(template: CustomTemplate, invoiceData: InvoiceData): void {
    const printWindow = window.open(
      "",
      "_blank",
      "width=1200,height=800"
    ) as Window & {
      document: Document
    }

    const html = this.renderHTML(template, invoiceData)
    printWindow.document.write(html)
    printWindow.document.close()

    printWindow.setTimeout(() => {
      printWindow.print()
    }, 250)
  }
}
