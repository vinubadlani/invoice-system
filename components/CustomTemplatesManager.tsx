"use client"

import React, { useState, useEffect } from "react"
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Loader2,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import TemplateEditor, { CustomTemplate } from "./TemplateEditor"
import { useToast } from "@/hooks/use-toast"

interface CustomTemplatesManagerProps {
  businessId: string
  userId: string
  onTemplateSelect?: (templateId: string) => void
}

export const CustomTemplatesManager: React.FC<CustomTemplatesManagerProps> = ({
  businessId,
  userId,
  onTemplateSelect,
}) => {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<CustomTemplate | undefined>(undefined)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadTemplates()
  }, [businessId])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/templates?businessId=${businessId}`)
      if (!response.ok) {
        throw new Error("Failed to load templates")
      }
      const data = await response.json()
      setTemplates(data.data || [])
    } catch (error: any) {
      console.error("Error loading templates:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load templates",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTemplate = async (template: CustomTemplate) => {
    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          template,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save template")
      }

      const data = await response.json()
      
      if (editingTemplate) {
        // Update existing template in list
        setTemplates(templates.map(t => t.id === data.data.id ? data.data : t))
      } else {
        // Add new template to list
        setTemplates([...templates, data.data])
      }

      toast({
        title: "Success",
        description: "Template saved successfully!",
      })

      setShowEditor(false)
      setEditingTemplate(undefined)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save template",
        variant: "destructive",
      })
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      setDeleting(true)
      const response = await fetch(`/api/templates/${templateId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete template")
      }

      setTemplates(templates.filter(t => t.id !== templateId))
      toast({
        title: "Success",
        description: "Template deleted successfully!",
      })
      setShowDeleteConfirm(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template.template_json as CustomTemplate)
    setShowEditor(true)
  }

  const handleNewTemplate = () => {
    setEditingTemplate(undefined)
    setShowEditor(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <FileText className="h-5 w-5 mr-2 text-blue-600" />
            Custom Templates
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Create and manage your custom invoice templates
          </p>
        </div>
        <Button onClick={handleNewTemplate} className="gap-2">
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-4">
              No custom templates yet. Create one to get started!
            </p>
            <Button onClick={handleNewTemplate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      {template.name}
                    </CardTitle>
                    <p className="text-xs text-gray-600 mt-1">
                      {template.description || "No description"}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xs text-gray-500 mb-4">
                  <div className="flex justify-between mb-2">
                    <span>Page Size:</span>
                    <span>
                      {template.template_json?.pageWidth || 210}mm ×{" "}
                      {template.template_json?.pageHeight || 297}mm
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Elements:</span>
                    <span>{template.template_json?.elements?.length || 0}</span>
                  </div>
                </div>

                {/* Preview thumbnail */}
                <div className="bg-gray-100 rounded p-2 mb-4 min-h-24 flex items-center justify-center text-xs text-gray-500 border border-gray-200">
                  <div
                    className="w-full h-20 bg-white rounded"
                    style={{
                      backgroundColor:
                        template.template_json?.backgroundColor || "#fff",
                    }}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleEditTemplate(template)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => setShowDeleteConfirm(template.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  {onTemplateSelect && (
                    <Button
                      onClick={() => onTemplateSelect(template.id)}
                      size="sm"
                      className="flex-1"
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Use
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Template Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "Create New Template"}
            </DialogTitle>
          </DialogHeader>
          <TemplateEditor
            template={editingTemplate}
            onSave={handleSaveTemplate}
            businessId={businessId}
            userId={userId}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm !== null} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 my-4">
            Are you sure you want to delete this template? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                showDeleteConfirm && handleDeleteTemplate(showDeleteConfirm)
              }
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CustomTemplatesManager
