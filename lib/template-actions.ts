"use server"

import { getSupabaseClient } from "@/lib/supabase"
import { getCurrentUser } from "@/lib/supabase"

export async function saveCustomTemplate(
  businessId: string,
  templateData: any
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error("User not authenticated")
    }

    const client = getSupabaseClient()
    if (!client) {
      throw new Error("Supabase client not available")
    }

    // Call RPC to save template
    const { data, error } = await client.rpc("rpc_create_custom_template", {
      p_business_id: businessId,
      p_user_id: user.id,
      p_name: templateData.name,
      p_description: templateData.description,
      p_template_json: templateData,
    })

    if (error) {
      console.error("RPC error:", error)
      throw new Error(error.message || "Failed to save template")
    }

    return { success: true, data: data?.[0] }
  } catch (error) {
    console.error("Error saving template:", error)
    throw error
  }
}

export async function getCustomTemplates(businessId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error("User not authenticated")
    }

    const client = getSupabaseClient()
    if (!client) {
      throw new Error("Supabase client not available")
    }

    // Call RPC to get templates
    const { data, error } = await client.rpc("rpc_get_custom_templates", {
      p_business_id: businessId,
    })

    if (error) {
      console.error("RPC error:", error)
      throw new Error(error.message || "Failed to fetch templates")
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error("Error fetching templates:", error)
    throw error
  }
}

export async function deleteCustomTemplate(templateId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error("User not authenticated")
    }

    const client = getSupabaseClient()
    if (!client) {
      throw new Error("Supabase client not available")
    }

    // Call RPC to delete template
    const { data, error } = await client.rpc("rpc_delete_custom_template", {
      p_template_id: templateId,
    })

    if (error) {
      console.error("RPC error:", error)
      throw new Error(error.message || "Failed to delete template")
    }

    return { success: true }
  } catch (error) {
    console.error("Error deleting template:", error)
    throw error
  }
}

export async function getCustomTemplate(templateId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error("User not authenticated")
    }

    const client = getSupabaseClient()
    if (!client) {
      throw new Error("Supabase client not available")
    }

    // Query custom_templates table directly
    const { data, error } = await client
      .from("custom_templates")
      .select("*")
      .eq("id", templateId)
      .single()

    if (error) {
      console.error("Query error:", error)
      throw new Error(error.message || "Failed to fetch template")
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error fetching template:", error)
    throw error
  }
}
