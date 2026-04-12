import { NextRequest, NextResponse } from "next/server"
import { getSupabaseClient, getCurrentUser } from "@/lib/supabase"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const templateId = id

    const client = getSupabaseClient()
    if (!client) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      )
    }

    // Call RPC to delete template
    const { data, error } = await client.rpc("rpc_delete_custom_template", {
      p_template_id: templateId,
    })

    if (error) {
      console.error("RPC error:", error)
      return NextResponse.json(
        { error: error.message || "Failed to delete template" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error: any) {
    console.error("Error deleting template:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const templateId = id

    const client = getSupabaseClient()
    if (!client) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      )
    }

    // Query custom_templates table directly
    const { data, error } = await client
      .from("custom_templates")
      .select("*")
      .eq("id", templateId)
      .single()

    if (error) {
      console.error("Query error:", error)
      return NextResponse.json(
        { error: error.message || "Failed to fetch template" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error("Error fetching template:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const templateId = id

    const body = await request.json()
    const { name, description, template_json } = body

    const client = getSupabaseClient()
    if (!client) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      )
    }

    // Update template
    const { data, error } = await client
      .from("custom_templates")
      .update({
        name,
        description,
        template_json,
        updated_at: new Date().toISOString(),
      })
      .eq("id", templateId)
      .select()

    if (error) {
      console.error("Query error:", error)
      return NextResponse.json(
        { error: error.message || "Failed to update template" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data?.[0],
    })
  } catch (error: any) {
    console.error("Error updating template:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
