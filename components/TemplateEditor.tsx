"use client"

import React, { useState, useEffect } from "react"
import {
  Plus,
  Trash2,
  Copy,
  Save,
  Eye,
  Settings,
  Type,
  Palette,
  Layout,
  Grid,
  ChevronDown,
  X,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

export interface TemplateElement {
  id: string
  type: "text" | "line" | "image" | "table" | "qrcode"
  label: string
  content?: string
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  fontFamily: string
  fontWeight: string
  color: string
  backgroundColor: string
  borderColor: string
  borderWidth: number
  textAlign: "left" | "center" | "right"
  rotation: number
  opacity: number
  visible: boolean
  editable: boolean
}

export interface CustomTemplate {
  id?: string
  name: string
  description: string
  pageWidth: number
  pageHeight: number
  pageMargin: number
  backgroundColor: string
  elements: TemplateElement[]
}

interface TemplateEditorProps {
  template?: CustomTemplate
  onSave: (template: CustomTemplate) => Promise<void>
  businessId: string
  userId: string
}

const DEFAULT_FONTS = [
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Courier New",
  "Verdana",
  "Georgia",
  "Comic Sans MS",
]

const COLORS = [
  "#000000",
  "#FFFFFF",
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
  "#808080",
  "#C0C0C0",
]

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  template,
  onSave,
  businessId,
  userId,
}) => {
  const { toast } = useToast()
  const [currentTemplate, setCurrentTemplate] = useState<CustomTemplate>(
    template || {
      name: "Untitled Template",
      description: "",
      pageWidth: 210,
      pageHeight: 297,
      pageMargin: 10,
      backgroundColor: "#FFFFFF",
      elements: [],
    }
  )

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(100)
  const [showPreview, setShowPreview] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [templateName, setTemplateName] = useState(currentTemplate.name)
  const [templateDescription, setTemplateDescription] = useState(
    currentTemplate.description
  )
  const [saving, setSaving] = useState(false)

  const selectedElement = currentTemplate.elements.find(
    (el) => el.id === selectedElementId
  )

  const addElement = (type: TemplateElement["type"]) => {
    const newElement: TemplateElement = {
      id: `element-${Date.now()}`,
      type,
      label: `${type} ${currentTemplate.elements.length + 1}`,
      content: type === "text" ? "Sample Text" : undefined,
      x: 20,
      y: 20 + currentTemplate.elements.length * 30,
      width: 100,
      height: 20,
      fontSize: 12,
      fontFamily: "Arial",
      fontWeight: "normal",
      color: "#000000",
      backgroundColor: "transparent",
      borderColor: "#000000",
      borderWidth: 0,
      textAlign: "left",
      rotation: 0,
      opacity: 1,
      visible: true,
      editable: true,
    }
    setCurrentTemplate({
      ...currentTemplate,
      elements: [...currentTemplate.elements, newElement],
    })
    setSelectedElementId(newElement.id)
  }

  const updateElement = (id: string, updates: Partial<TemplateElement>) => {
    setCurrentTemplate({
      ...currentTemplate,
      elements: currentTemplate.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
    })
  }

  const deleteElement = (id: string) => {
    setCurrentTemplate({
      ...currentTemplate,
      elements: currentTemplate.elements.filter((el) => el.id !== id),
    })
    if (selectedElementId === id) {
      setSelectedElementId(null)
    }
  }

  const duplicateElement = (id: string) => {
    const element = currentTemplate.elements.find((el) => el.id === id)
    if (element) {
      const newElement = {
        ...element,
        id: `element-${Date.now()}`,
        x: element.x + 10,
        y: element.y + 10,
      }
      setCurrentTemplate({
        ...currentTemplate,
        elements: [...currentTemplate.elements, newElement],
      })
      setSelectedElementId(newElement.id)
    }
  }

  const resetTemplate = () => {
    setCurrentTemplate({
      name: "Untitled Template",
      description: "",
      pageWidth: 210,
      pageHeight: 297,
      pageMargin: 10,
      backgroundColor: "#FFFFFF",
      elements: [],
    })
    setSelectedElementId(null)
  }

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast({
        title: "Error",
        description: "Template name is required",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const templateData = {
        ...currentTemplate,
        name: templateName,
        description: templateDescription,
      }
      await onSave(templateData)
      toast({
        title: "Success",
        description: "Template saved successfully!",
      })
      setShowSaveDialog(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save template",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full h-full bg-gray-50 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Template Editor</h2>
          <p className="text-sm text-gray-600">
            {currentTemplate.name || "Untitled Template"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button
            onClick={() => setShowSaveDialog(true)}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Template
          </Button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-120px)]">
        {/* Left Sidebar - Tools */}
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <Tabs defaultValue="elements" className="w-full">
            <TabsList className="w-full rounded-none border-b">
              <TabsTrigger value="elements" className="flex-1">
                Elements
              </TabsTrigger>
              <TabsTrigger value="properties" className="flex-1">
                Properties
              </TabsTrigger>
            </TabsList>

            {/* Elements Tab */}
            <TabsContent value="elements" className="p-4 space-y-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase">
                  Add Elements
                </p>
                <Button
                  onClick={() => addElement("text")}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Type className="h-4 w-4 mr-2" />
                  Text
                </Button>
                <Button
                  onClick={() => addElement("line")}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Layout className="h-4 w-4 mr-2" />
                  Line
                </Button>
                <Button
                  onClick={() => addElement("table")}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Grid className="h-4 w-4 mr-2" />
                  Table
                </Button>
                <Button
                  onClick={() => addElement("image")}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <img src="/images/image-icon.svg" alt="Image" className="h-4 w-4 mr-2" />
                  Image
                </Button>
                <Button
                  onClick={() => addElement("qrcode")}
                  variant="outline"
                  className="w-full justify-start"
                >
                  QR Code
                </Button>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                  Elements on Page ({currentTemplate.elements.length})
                </p>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {currentTemplate.elements.map((element) => (
                    <div
                      key={element.id}
                      onClick={() => setSelectedElementId(element.id)}
                      className={`p-2 rounded cursor-pointer text-sm transition-colors ${
                        selectedElementId === element.id
                          ? "bg-blue-100 border border-blue-400"
                          : "bg-gray-100 border border-gray-200 hover:bg-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{element.label}</span>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              duplicateElement(element.id)
                            }}
                            className="p-1 hover:bg-gray-300 rounded"
                            title="Duplicate"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteElement(element.id)
                            }}
                            className="p-1 hover:bg-red-200 rounded"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Properties Tab */}
            <TabsContent value="properties" className="p-4 space-y-4">
              {selectedElement ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-semibold">Element Label</Label>
                    <Input
                      value={selectedElement.label}
                      onChange={(e) =>
                        updateElement(selectedElement.id, { label: e.target.value })
                      }
                      className="text-sm"
                    />
                  </div>

                  {selectedElement.type === "text" && (
                    <>
                      <div>
                        <Label className="text-xs font-semibold">Content</Label>
                        <textarea
                          value={selectedElement.content || ""}
                          onChange={(e) =>
                            updateElement(selectedElement.id, { content: e.target.value })
                          }
                          className="w-full p-2 text-xs border rounded"
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Font Family</Label>
                        <Select
                          value={selectedElement.fontFamily}
                          onValueChange={(value) =>
                            updateElement(selectedElement.id, { fontFamily: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DEFAULT_FONTS.map((font) => (
                              <SelectItem key={font} value={font}>
                                {font}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">
                          Font Size ({selectedElement.fontSize}px)
                        </Label>
                        <Slider
                          value={[selectedElement.fontSize]}
                          onValueChange={([value]) =>
                            updateElement(selectedElement.id, { fontSize: value })
                          }
                          min={8}
                          max={72}
                          step={1}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Font Weight</Label>
                        <Select
                          value={selectedElement.fontWeight}
                          onValueChange={(value) =>
                            updateElement(selectedElement.id, { fontWeight: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="bold">Bold</SelectItem>
                            <SelectItem value="600">Semi-bold</SelectItem>
                            <SelectItem value="300">Light</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Text Align</Label>
                        <Select
                          value={selectedElement.textAlign}
                          onValueChange={(value: any) =>
                            updateElement(selectedElement.id, { textAlign: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">Left</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="right">Right</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <div>
                    <Label className="text-xs font-semibold">Text Color</Label>
                    <div className="flex gap-2 flex-wrap">
                      {COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() =>
                            updateElement(selectedElement.id, { color })
                          }
                          className={`w-8 h-8 rounded border-2 ${
                            selectedElement.color === color
                              ? "border-gray-900"
                              : "border-gray-300"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">
                      Background Color
                    </Label>
                    <div className="flex gap-2 flex-wrap">
                      {[...COLORS, "transparent"].map((color) => (
                        <button
                          key={color}
                          onClick={() =>
                            updateElement(selectedElement.id, {
                              backgroundColor: color,
                            })
                          }
                          className={`w-8 h-8 rounded border-2 ${
                            selectedElement.backgroundColor === color
                              ? "border-gray-900"
                              : "border-gray-300"
                          }`}
                          style={{
                            backgroundColor:
                              color === "transparent" ? "#f3f4f6" : color,
                            borderStyle: color === "transparent" ? "dashed" : "solid",
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">
                      Opacity ({Math.round(selectedElement.opacity * 100)}%)
                    </Label>
                    <Slider
                      value={[selectedElement.opacity]}
                      onValueChange={([value]) =>
                        updateElement(selectedElement.id, { opacity: value })
                      }
                      min={0}
                      max={1}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  <div className="border-t pt-2">
                    <p className="text-xs font-semibold mb-2">Position & Size</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">X (mm)</Label>
                        <Input
                          type="number"
                          value={selectedElement.x}
                          onChange={(e) =>
                            updateElement(selectedElement.id, { x: parseFloat(e.target.value) })
                          }
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Y (mm)</Label>
                        <Input
                          type="number"
                          value={selectedElement.y}
                          onChange={(e) =>
                            updateElement(selectedElement.id, { y: parseFloat(e.target.value) })
                          }
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Width (mm)</Label>
                        <Input
                          type="number"
                          value={selectedElement.width}
                          onChange={(e) =>
                            updateElement(selectedElement.id, { width: parseFloat(e.target.value) })
                          }
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Height (mm)</Label>
                        <Input
                          type="number"
                          value={selectedElement.height}
                          onChange={(e) =>
                            updateElement(selectedElement.id, { height: parseFloat(e.target.value) })
                          }
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Settings className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Select an element to edit its properties</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-gradient-to-b from-gray-100 to-gray-200 p-6 overflow-auto">
          <div className="flex items-center justify-center min-h-full">
            <div
              className="relative bg-white shadow-lg"
              style={{
                width: `${(currentTemplate.pageWidth / 10) * (zoom / 100)}mm`,
                height: `${(currentTemplate.pageHeight / 10) * (zoom / 100)}mm`,
                backgroundColor: currentTemplate.backgroundColor,
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top center",
              }}
            >
              {/* Page Content */}
              {currentTemplate.elements.map((element) => (
                <div
                  key={element.id}
                  onClick={() => setSelectedElementId(element.id)}
                  className={`absolute cursor-pointer transition-colors ${
                    selectedElementId === element.id ? "ring-2 ring-blue-500" : ""
                  }`}
                  style={{
                    left: `${(element.x / 10) * (zoom / 100)}mm`,
                    top: `${(element.y / 10) * (zoom / 100)}mm`,
                    width: `${(element.width / 10) * (zoom / 100)}mm`,
                    height: `${(element.height / 10) * (zoom / 100)}mm`,
                    backgroundColor: element.backgroundColor,
                    color: element.color,
                    fontSize: `${element.fontSize * (zoom / 100)}px`,
                    fontFamily: element.fontFamily,
                    fontWeight: element.fontWeight,
                    textAlign: element.textAlign,
                    opacity: element.opacity,
                    transform: `rotate(${element.rotation}deg)`,
                    border:
                      element.borderWidth > 0
                        ? `${element.borderWidth}px solid ${element.borderColor}`
                        : "1px dashed rgba(0,0,0,0.1)",
                    display: element.visible ? "block" : "none",
                    padding: "4px",
                  }}
                >
                  {element.type === "text" && (
                    <div className="overflow-hidden text-ellipsis">
                      {element.content}
                    </div>
                  )}
                  {element.type === "line" && (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        borderBottom: `2px solid ${element.color}`,
                      }}
                    />
                  )}
                  {element.type === "table" && (
                    <table className="w-full border-collapse text-xs">
                      <tbody>
                        <tr>
                          <td className="border p-1">Col 1</td>
                          <td className="border p-1">Col 2</td>
                          <td className="border p-1">Col 3</td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Page Settings */}
        <div className="w-64 bg-white border-l border-gray-200 overflow-y-auto p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase mb-3">
              Page Settings
            </p>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Page Width (mm)</Label>
                <Input
                  type="number"
                  value={currentTemplate.pageWidth}
                  onChange={(e) =>
                    setCurrentTemplate({
                      ...currentTemplate,
                      pageWidth: parseFloat(e.target.value),
                    })
                  }
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Page Height (mm)</Label>
                <Input
                  type="number"
                  value={currentTemplate.pageHeight}
                  onChange={(e) =>
                    setCurrentTemplate({
                      ...currentTemplate,
                      pageHeight: parseFloat(e.target.value),
                    })
                  }
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Page Margin (mm)</Label>
                <Input
                  type="number"
                  value={currentTemplate.pageMargin}
                  onChange={(e) =>
                    setCurrentTemplate({
                      ...currentTemplate,
                      pageMargin: parseFloat(e.target.value),
                    })
                  }
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Background Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() =>
                        setCurrentTemplate({
                          ...currentTemplate,
                          backgroundColor: color,
                        })
                      }
                      className={`w-8 h-8 rounded border-2 ${
                        currentTemplate.backgroundColor === color
                          ? "border-gray-900"
                          : "border-gray-300"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <Label className="text-xs font-semibold mb-2 block">
              Zoom: {zoom}%
            </Label>
            <Slider
              value={[zoom]}
              onValueChange={([value]) => setZoom(value)}
              min={25}
              max={200}
              step={5}
              className="w-full"
            />
          </div>

          <div className="border-t pt-4 space-y-2">
            <Button
              onClick={resetTemplate}
              variant="outline"
              className="w-full justify-start text-red-600"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Template
            </Button>
          </div>
        </div>
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template Name</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter template name"
              />
            </div>
            <div>
              <Label>Description (Optional)</Label>
              <textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Enter template description"
                className="w-full p-2 border rounded text-sm"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate} disabled={saving}>
              {saving ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          <div className="bg-gray-100 p-8 rounded overflow-auto max-h-[70vh]">
            <div
              className="bg-white shadow-lg mx-auto"
              style={{
                width: `${currentTemplate.pageWidth}mm`,
                height: `${currentTemplate.pageHeight}mm`,
                backgroundColor: currentTemplate.backgroundColor,
                position: "relative",
              }}
            >
              {currentTemplate.elements.map((element) => (
                <div
                  key={element.id}
                  style={{
                    position: "absolute",
                    left: `${element.x}mm`,
                    top: `${element.y}mm`,
                    width: `${element.width}mm`,
                    height: `${element.height}mm`,
                    backgroundColor: element.backgroundColor,
                    color: element.color,
                    fontSize: `${element.fontSize}px`,
                    fontFamily: element.fontFamily,
                    fontWeight: element.fontWeight,
                    textAlign: element.textAlign,
                    opacity: element.opacity,
                    border:
                      element.borderWidth > 0
                        ? `${element.borderWidth}px solid ${element.borderColor}`
                        : "none",
                    display: element.visible ? "block" : "none",
                    padding: "4px",
                  }}
                >
                  {element.type === "text" && element.content}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TemplateEditor
