# Invoice Template Editor - Complete Implementation Guide

## Overview

The Invoice Template Editor is a comprehensive WYSIWYG (What You See Is What You Get) system that allows users to create, customize, and manage their own invoice templates. Users can adjust colors, text, sizes, layouts, and save templates to their account and database.

## Features

### 1. **Template Customization**
- **WYSIWYG Editor**: Visual drag-and-drop interface
- **Element Types**:
  - Text (with full font control)
  - Lines/Borders
  - Tables (for invoice items)
  - Images (logo, backgrounds)
  - QR Codes
- **Complete Styling Control**:
  - Font family, size, weight
  - Colors (text, background, borders)
  - Opacity and rotation
  - Text alignment
  - Custom positioning (X, Y coordinates)
  - Custom sizing (width, height)

### 2. **Page Settings**
- Custom page dimensions (A4, Letter, custom sizes)
- Page margins
- Background colors
- Zoom level for editing (25% - 200%)

### 3. **Template Management**
- Save templates to account
- Load and edit existing templates
- Delete templates
- Live preview
- Supports multiple templates per business

### 4. **Invoice Rendering**
- Render invoices using custom templates
- Support for template variables ({{invoice_no}}, {{party_name}}, etc.)
- Print and PDF export functionality

## Database Schema

### custom_templates Table

```sql
CREATE TABLE public.custom_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id),
    user_id UUID NOT NULL REFERENCES public.users(id),
    name TEXT NOT NULL,
    description TEXT,
    template_json JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT custom_templates_unique_name UNIQUE(business_id, name)
);
```

## File Structure

### Components

- **`components/TemplateEditor.tsx`**
  - Main WYSIWYG editor component
  - Sidebar with element management and properties
  - Canvas area with real-time preview
  - Save dialog

- **`components/CustomTemplatesManager.tsx`**
  - Template management interface
  - Create, edit, delete templates
  - Template list with previews
  - Integration point for TemplateEditor

- **`components/InvoiceRenderer.tsx`**
  - Renders invoices with custom or predefined templates
  - Print and PDF export functionality

### Utilities

- **`lib/template-renderer.ts`**
  - CustomTemplateRenderer class
  - HTML rendering from template JSON
  - Variable interpolation
  - PDF export (requires html2pdf)
  - Print functionality

- **`lib/template-actions.ts`**
  - Server-side template operations
  - Save/load/delete templates

### API Routes

- **`app/api/templates/route.ts`**
  - POST: Save new template
  - GET: List all templates for a business

- **`app/api/templates/[id]/route.ts`**
  - GET: Load specific template
  - PUT: Update template
  - DELETE: Delete template

### Database Migration

- **`db/create-custom-templates.sql`**
  - Creates custom_templates table
  - Sets up RLS policies
  - Creates RPC functions

## Integration with Settings

The template editor is integrated into the Settings page under the "Templates" tab:

```tsx
import CustomTemplatesManager from "@/components/CustomTemplatesManager"

<CustomTemplatesManager
  businessId={business.id}
  userId={userId}
  onTemplateSelect={(templateId) => {
    handleTemplateSelect(templateId)
    handleBusinessSave()
  }}
/>
```

## Usage Guide

### For End Users

#### Creating a New Template

1. Go to Settings → Templates tab
2. Click "New Template" button
3. In the Template Editor:
   - Add elements (text, lines, tables, images, QR codes)
   - Customize each element:
     - Double-click or select from sidebar
     - Use Properties panel to modify:
       - Font settings
       - Colors
       - Size and position
       - Opacity
   - Preview template in real-time
   - Adjust zoom level for better visibility
4. Click "Save Template"
5. Enter template name and description
6. Click "Save Template" again

#### Using a Template for Invoices

1. Go to Settings → Templates tab
2. Select your custom template
3. Click "Use" button to make it active
4. When creating invoices, your custom template will be used

#### Editing a Template

1. Go to Settings → Templates tab
2. Find the template in the list
3. Click "Edit" button
4. Make your changes in the editor
5. Click "Save Template"

### For Developers

#### Rendering an Invoice with Custom Template

```tsx
import InvoiceRenderer from "@/components/InvoiceRenderer"

<InvoiceRenderer
  invoiceData={invoiceData}
  templateId={customTemplateId}
  templateType="custom"
/>
```

#### Using Template Variables

In template text elements, use these variables:

```
{{invoice_no}}
{{date}}
{{party_name}}
{{party_email}}
{{party_phone}}
{{party_gstin}}
{{party_address}}
{{party_state}}
{{subtotal}}
{{total_tax}}
{{net_total}}
{{payment_received}}
{{balance_due}}
{{business_name}}
{{business_address}}
{{business_gstin}}
{{business_phone}}
{{business_email}}
{{business_pan}}
```

#### Rendering Template as HTML

```tsx
import { CustomTemplateRenderer } from "@/lib/template-renderer"

const html = CustomTemplateRenderer.renderHTML(template, invoiceData)
document.body.innerHTML = html
```

#### Exporting to PDF

```tsx
import { CustomTemplateRenderer } from "@/lib/template-renderer"

await CustomTemplateRenderer.exportToPDF(template, invoiceData, "invoice.pdf")
```

## Template JSON Structure

Templates are stored as JSON with the following structure:

```json
{
  "name": "Template Name",
  "description": "Optional description",
  "pageWidth": 210,
  "pageHeight": 297,
  "pageMargin": 10,
  "backgroundColor": "#FFFFFF",
  "elements": [
    {
      "id": "element-1234567890",
      "type": "text",
      "label": "Header Text",
      "content": "Invoice - {{invoice_no}}",
      "x": 20,
      "y": 20,
      "width": 170,
      "height": 20,
      "fontSize": 16,
      "fontFamily": "Arial",
      "fontWeight": "bold",
      "color": "#000000",
      "backgroundColor": "transparent",
      "borderColor": "#000000",
      "borderWidth": 0,
      "textAlign": "center",
      "rotation": 0,
      "opacity": 1,
      "visible": true,
      "editable": true
    },
    {
      "id": "element-table-1",
      "type": "table",
      "label": "Items Table",
      "x": 10,
      "y": 50,
      "width": 190,
      "height": 60,
      "fontSize": 10,
      "fontFamily": "Arial",
      "color": "#000000",
      "backgroundColor": "transparent",
      "borderWidth": 1,
      "borderColor": "#000000",
      "visible": true
    }
  ]
}
```

## Installation & Setup

### Step 1: Apply Database Migration

Run the migration to create the custom_templates table:

```bash
# Using Supabase SQL Editor
# Copy and paste the content of db/create-custom-templates.sql
```

### Step 2: Install Dependencies

Ensure these packages are installed:

```bash
npm install lucide-react @radix-ui/react-dialog @radix-ui/react-tabs
```

### Step 3: For PDF Export (Optional)

If you want PDF export functionality, install html2pdf:

```bash
npm install html2pdf.js
```

Add to your HTML head:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
```

### Step 4: Integrate Components

The components are already integrated in Settings. Ensure the imports are correct in:

- `app/settings/page.tsx`
- Your invoice pages that need custom template support

## Environment Setup

Ensure your `.env.local` has Supabase configuration:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## API Endpoints

### POST /api/templates

Save a new or update existing template

**Request:**
```json
{
  "businessId": "uuid",
  "template": {
    "name": "Template Name",
    "description": "Description",
    "pageWidth": 210,
    "pageHeight": 297,
    "pageMargin": 10,
    "backgroundColor": "#FFFFFF",
    "elements": []
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "template-uuid",
    "name": "Template Name",
    "template_json": {...},
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### GET /api/templates?businessId=uuid

Get all templates for a business

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "template-uuid",
      "name": "Template Name",
      "description": "Description",
      "template_json": {...},
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### GET /api/templates/[id]

Get a specific template

### PUT /api/templates/[id]

Update a specific template

### DELETE /api/templates/[id]

Delete a specific template

## Troubleshooting

### 1. Templates Not Saving

- Check Supabase RLS policies
- Ensure user is authenticated
- Verify businessId is correct

### 2. Template Variables Not Interpolating

- Check variable names match exactly (case-sensitive)
- Ensure invoiceData properties are populated

### 3. PDF Export Not Working

- Install html2pdf.js library
- Include the CDN link in HTML head
- Check browser console for errors

### 4. Custom Template Not Rendering

- Verify template JSON structure
- Check element positioning is in valid range
- Ensure font families are available

## Performance Considerations

- Templates are cached in localStorage for quick access
- Large template with many elements may slow down editor
- Rendering templates is server-side for production use
- Consider limiting element count to 100 per template

## Security

- RLS policies restrict users to their business templates
- Templates are stored encrypted in Supabase
- User can only access their own business templates
- API endpoints require authentication

## Future Enhancements

- Template library/marketplace
- Collaborative template editing
- Template versioning
- Template import/export
- Conditional elements based on invoice data
- Multi-language support in templates
- Custom fonts upload
- Background image support for full page
- Batch template operations
