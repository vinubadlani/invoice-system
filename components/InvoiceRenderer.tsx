"use client"

import React, { useEffect, useState } from "react"
import { Loader2, Download, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CustomTemplateRenderer, InvoiceData } from "@/lib/template-renderer"
import { CustomTemplate } from "@/components/TemplateEditor"
import { useToast } from "@/hooks/use-toast"

interface InvoiceRendererProps {
  invoiceData: InvoiceData
  templateId?: string | null
  templateType?: "custom" | "predefined"
  onCustomTemplateNotFound?: () => void
}

export const InvoiceRenderer: React.FC<InvoiceRendererProps> = ({
  invoiceData,
  templateId,
  templateType = "predefined",
  onCustomTemplateNotFound,
}) => {
  const { toast } = useToast()
  const [customTemplate, setCustomTemplate] = useState<CustomTemplate | null>(null)
  const [loading, setLoading] = useState(false)
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    if (templateType === "custom" && templateId) {
      loadCustomTemplate()
    } else {
      // Use predefined template rendering
      renderInvoice()
    }
  }, [templateId, templateType, invoiceData])

  const loadCustomTemplate = async () => {
    if (!templateId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/templates/${templateId}`)

      if (!response.ok) {
        throw new Error("Failed to load template")
      }

      const data = await response.json()
      const template = data.data.template_json as CustomTemplate
      setCustomTemplate(template)
      renderCustomTemplate(template)
    } catch (error: any) {
      console.error("Error loading template:", error)
      toast({
        title: "Error",
        description: "Failed to load template. Using default template.",
        variant: "destructive",
      })
      onCustomTemplateNotFound?.()
    } finally {
      setLoading(false)
    }
  }

  const renderCustomTemplate = (template: CustomTemplate) => {
    try {
      const renderedHtml = CustomTemplateRenderer.renderHTML(template, invoiceData)
      setHtml(renderedHtml)
    } catch (error) {
      console.error("Error rendering custom template:", error)
      toast({
        title: "Error",
        description: "Failed to render template",
        variant: "destructive",
      })
    }
  }

  const renderInvoice = () => {
    // This will be implemented with predefined template rendering
    // For now, we'll show a placeholder
    setHtml("<div>Using predefined template...</div>")
  }

  const handlePrint = () => {
    if (customTemplate) {
      CustomTemplateRenderer.print(customTemplate, invoiceData)
    } else {
      window.print()
    }
  }

  const handleDownloadPDF = async () => {
    if (customTemplate) {
      try {
        await CustomTemplateRenderer.exportToPDF(
          customTemplate,
          invoiceData,
          `${invoiceData.invoice_no}.pdf`
        )
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to download PDF. Please check console for details.",
          variant: "destructive",
        })
      }
    }
  }

  if (loading) {
    return (
      <Card className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading template...</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-2 justify-end bg-white p-4 rounded-lg border border-gray-200">
        <Button onClick={handlePrint} variant="outline" className="gap-2">
          <Printer className="h-4 w-4" />
          Print
        </Button>
        <Button onClick={handleDownloadPDF} className="gap-2">
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
      </div>

      {/* Invoice Render Area */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-auto">
        {html ? (
          <div
            dangerouslySetInnerHTML={{
              __html: html,
            }}
            className="mx-auto bg-white p-4"
          />
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>Failed to render invoice</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default InvoiceRenderer
