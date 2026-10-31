
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "business_members": {
                  Row: {
                    "business_id": string,"created_at": string,"role": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"role"?: string,"user_id": string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_members_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"businesses": {
                  Row: {
                    "address": string | null,"created_at": string,"currency": string,"date_format": string,"default_hourly_cost": number,"default_target_margin": number,"email": string | null,"id": string,"invoice_footer": string | null,"invoice_prefix": string,"logo_data_url": string | null,"market": string,"name": string,"next_invoice_number": number,"next_quote_number": number,"onboarding_completed_at": string | null,"owner_id": string,"owner_name": string | null,"payment_terms_days": number,"phone": string | null,"quote_prefix": string,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"created_at"?: string,"currency": string,"date_format": string,"default_hourly_cost"?: number,"default_target_margin"?: number,"email"?: string | null,"id"?: string,"invoice_footer"?: string | null,"invoice_prefix"?: string,"logo_data_url"?: string | null,"market": string,"name": string,"next_invoice_number"?: number,"next_quote_number"?: number,"onboarding_completed_at"?: string | null,"owner_id": string,"owner_name"?: string | null,"payment_terms_days"?: number,"phone"?: string | null,"quote_prefix"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string | null,"created_at"?: string,"currency"?: string,"date_format"?: string,"default_hourly_cost"?: number,"default_target_margin"?: number,"email"?: string | null,"id"?: string,"invoice_footer"?: string | null,"invoice_prefix"?: string,"logo_data_url"?: string | null,"market"?: string,"name"?: string,"next_invoice_number"?: number,"next_quote_number"?: number,"onboarding_completed_at"?: string | null,"owner_id"?: string,"owner_name"?: string | null,"payment_terms_days"?: number,"phone"?: string | null,"quote_prefix"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"clients": {
                  Row: {
                    "address_line1": string | null,"address_line2": string | null,"archived_at": string | null,"business_id": string,"city": string | null,"created_at": string,"email": string | null,"id": string,"is_demo": boolean,"name": string,"notes": string | null,"phone": string | null,"postal_code": string | null,"region": string | null,"service_preferences": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address_line1"?: string | null,"address_line2"?: string | null,"archived_at"?: string | null,"business_id": string,"city"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"is_demo"?: boolean,"name": string,"notes"?: string | null,"phone"?: string | null,"postal_code"?: string | null,"region"?: string | null,"service_preferences"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "address_line1"?: string | null,"address_line2"?: string | null,"archived_at"?: string | null,"business_id"?: string,"city"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"is_demo"?: boolean,"name"?: string,"notes"?: string | null,"phone"?: string | null,"postal_code"?: string | null,"region"?: string | null,"service_preferences"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clients_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"document_customizations": {
                  Row: {
                    "business_id": string,"content": NonNullable<Json>,"slug": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"content"?: NonNullable<Json>,"slug": string,"updated_at"?: string
                  }
                  Update: {
                    "business_id"?: string,"content"?: NonNullable<Json>,"slug"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "document_customizations_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"expenses": {
                  Row: {
                    "amount": number,"business_id": string,"category": string,"created_at": string,"currency": string,"description": string,"id": string,"is_demo": boolean,"job_id": string | null,"spent_on": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"business_id": string,"category": string,"created_at"?: string,"currency": string,"description": string,"id"?: string,"is_demo"?: boolean,"job_id"?: string | null,"spent_on"?: string
                  }
                  Update: {
                    "amount"?: number,"business_id"?: string,"category"?: string,"created_at"?: string,"currency"?: string,"description"?: string,"id"?: string,"is_demo"?: boolean,"job_id"?: string | null,"spent_on"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "expenses_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expenses_business_id_job_id_fkey"
      columns: ["business_id","job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["business_id","id"]
    }
                  ]
                },"invoice_items": {
                  Row: {
                    "amount": number | null,"business_id": string,"description": string,"id": string,"invoice_id": string,"position": number,"quantity": number,"unit_price": number
                  }
                  ComputedFields: never
                  Insert: {
                    "amount"?: never,"business_id": string,"description": string,"id"?: string,"invoice_id": string,"position"?: number,"quantity": number,"unit_price": number
                  }
                  Update: {
                    "amount"?: never,"business_id"?: string,"description"?: string,"id"?: string,"invoice_id"?: string,"position"?: number,"quantity"?: number,"unit_price"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "invoice_items_business_id_invoice_id_fkey"
      columns: ["business_id","invoice_id"]
isOneToOne: false
      referencedRelation: "invoices"
      referencedColumns: ["business_id","id"]
    }
                  ]
                },"invoices": {
                  Row: {
                    "business_id": string,"client_id": string,"created_at": string,"currency": string,"due_date": string,"id": string,"is_demo": boolean,"issue_date": string,"job_id": string | null,"notes": string | null,"number": string,"status": string,"subtotal": number,"total": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"client_id": string,"created_at"?: string,"currency": string,"due_date": string,"id"?: string,"is_demo"?: boolean,"issue_date"?: string,"job_id"?: string | null,"notes"?: string | null,"number": string,"status"?: string,"subtotal"?: number,"total"?: number,"updated_at"?: string
                  }
                  Update: {
                    "business_id"?: string,"client_id"?: string,"created_at"?: string,"currency"?: string,"due_date"?: string,"id"?: string,"is_demo"?: boolean,"issue_date"?: string,"job_id"?: string | null,"notes"?: string | null,"number"?: string,"status"?: string,"subtotal"?: number,"total"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "invoices_business_id_client_id_fkey"
      columns: ["business_id","client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["business_id","id"]
    },{
      foreignKeyName: "invoices_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoices_business_id_job_id_fkey"
      columns: ["business_id","job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["business_id","id"]
    }
                  ]
                },"job_checklist_items": {
                  Row: {
                    "business_id": string,"done": boolean,"done_at": string | null,"id": string,"job_id": string,"label": string,"position": number,"section": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"done"?: boolean,"done_at"?: string | null,"id"?: string,"job_id": string,"label": string,"position"?: number,"section"?: string
                  }
                  Update: {
                    "business_id"?: string,"done"?: boolean,"done_at"?: string | null,"id"?: string,"job_id"?: string,"label"?: string,"position"?: number,"section"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "job_checklist_items_business_id_job_id_fkey"
      columns: ["business_id","job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["business_id","id"]
    }
                  ]
                },"jobs": {
                  Row: {
                    "business_id": string,"cancelled_at": string | null,"checklist_slug": string | null,"client_id": string,"completed_at": string | null,"created_at": string,"currency": string,"duration_minutes": number,"execution_notes": string | null,"id": string,"is_demo": boolean,"price": number,"quote_id": string | null,"scheduled_date": string,"service_type": string,"start_time": string,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"cancelled_at"?: string | null,"checklist_slug"?: string | null,"client_id": string,"completed_at"?: string | null,"created_at"?: string,"currency": string,"duration_minutes": number,"execution_notes"?: string | null,"id"?: string,"is_demo"?: boolean,"price": number,"quote_id"?: string | null,"scheduled_date": string,"service_type": string,"start_time": string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "business_id"?: string,"cancelled_at"?: string | null,"checklist_slug"?: string | null,"client_id"?: string,"completed_at"?: string | null,"created_at"?: string,"currency"?: string,"duration_minutes"?: number,"execution_notes"?: string | null,"id"?: string,"is_demo"?: boolean,"price"?: number,"quote_id"?: string | null,"scheduled_date"?: string,"service_type"?: string,"start_time"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "jobs_business_id_client_id_fkey"
      columns: ["business_id","client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["business_id","id"]
    },{
      foreignKeyName: "jobs_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jobs_business_id_quote_id_fkey"
      columns: ["business_id","quote_id"]
isOneToOne: false
      referencedRelation: "quotes"
      referencedColumns: ["business_id","id"]
    }
                  ]
                },"licenses": {
                  Row: {
                    "activated_at": string | null,"created_at": string,"email": string,"external_ref": string | null,"id": string,"purchased_at": string,"revoke_reason": string | null,"revoked_at": string | null,"source": string,"status": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activated_at"?: string | null,"created_at"?: string,"email": string,"external_ref"?: string | null,"id"?: string,"purchased_at"?: string,"revoke_reason"?: string | null,"revoked_at"?: string | null,"source"?: string,"status"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "activated_at"?: string | null,"created_at"?: string,"email"?: string,"external_ref"?: string | null,"id"?: string,"purchased_at"?: string,"revoke_reason"?: string | null,"revoked_at"?: string | null,"source"?: string,"status"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"payments": {
                  Row: {
                    "amount": number,"business_id": string,"client_id": string | null,"created_at": string,"currency": string,"id": string,"invoice_id": string | null,"is_demo": boolean,"method": string,"notes": string | null,"paid_on": string,"reference": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"business_id": string,"client_id"?: string | null,"created_at"?: string,"currency": string,"id"?: string,"invoice_id"?: string | null,"is_demo"?: boolean,"method"?: string,"notes"?: string | null,"paid_on"?: string,"reference"?: string | null
                  }
                  Update: {
                    "amount"?: number,"business_id"?: string,"client_id"?: string | null,"created_at"?: string,"currency"?: string,"id"?: string,"invoice_id"?: string | null,"is_demo"?: boolean,"method"?: string,"notes"?: string | null,"paid_on"?: string,"reference"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_business_id_client_id_fkey"
      columns: ["business_id","client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["business_id","id"]
    },{
      foreignKeyName: "payments_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_business_id_invoice_id_fkey"
      columns: ["business_id","invoice_id"]
isOneToOne: false
      referencedRelation: "invoices"
      referencedColumns: ["business_id","id"]
    }
                  ]
                },"quote_items": {
                  Row: {
                    "amount": number | null,"business_id": string,"description": string,"id": string,"position": number,"quantity": number,"quote_id": string,"unit_price": number
                  }
                  ComputedFields: never
                  Insert: {
                    "amount"?: never,"business_id": string,"description": string,"id"?: string,"position"?: number,"quantity": number,"quote_id": string,"unit_price": number
                  }
                  Update: {
                    "amount"?: never,"business_id"?: string,"description"?: string,"id"?: string,"position"?: number,"quantity"?: number,"quote_id"?: string,"unit_price"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "quote_items_business_id_quote_id_fkey"
      columns: ["business_id","quote_id"]
isOneToOne: false
      referencedRelation: "quotes"
      referencedColumns: ["business_id","id"]
    }
                  ]
                },"quote_versions": {
                  Row: {
                    "business_id": string,"created_at": string,"id": string,"quote_id": string,"snapshot": NonNullable<Json>,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"id"?: string,"quote_id": string,"snapshot": NonNullable<Json>,"version": number
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"id"?: string,"quote_id"?: string,"snapshot"?: NonNullable<Json>,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "quote_versions_business_id_quote_id_fkey"
      columns: ["business_id","quote_id"]
isOneToOne: false
      referencedRelation: "quotes"
      referencedColumns: ["business_id","id"]
    }
                  ]
                },"quotes": {
                  Row: {
                    "accepted_at": string | null,"business_id": string,"client_id": string,"created_at": string,"currency": string,"declined_at": string | null,"id": string,"is_demo": boolean,"issue_date": string,"notes": string | null,"number": string,"pricing": Json | null,"sent_at": string | null,"service_type": string,"status": string,"subtotal": number,"total": number,"updated_at": string,"valid_until": string | null,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"business_id": string,"client_id": string,"created_at"?: string,"currency": string,"declined_at"?: string | null,"id"?: string,"is_demo"?: boolean,"issue_date"?: string,"notes"?: string | null,"number": string,"pricing"?: Json | null,"sent_at"?: string | null,"service_type": string,"status"?: string,"subtotal"?: number,"total"?: number,"updated_at"?: string,"valid_until"?: string | null,"version"?: number
                  }
                  Update: {
                    "accepted_at"?: string | null,"business_id"?: string,"client_id"?: string,"created_at"?: string,"currency"?: string,"declined_at"?: string | null,"id"?: string,"is_demo"?: boolean,"issue_date"?: string,"notes"?: string | null,"number"?: string,"pricing"?: Json | null,"sent_at"?: string | null,"service_type"?: string,"status"?: string,"subtotal"?: number,"total"?: number,"updated_at"?: string,"valid_until"?: string | null,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "quotes_business_id_client_id_fkey"
      columns: ["business_id","client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["business_id","id"]
    },{
      foreignKeyName: "quotes_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "business_currency":
{ Args: { "p_business_id": string }; Returns: string
                           },
"claim_my_license":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"convert_quote_to_job":
{ Args: { "p_checklist": Json,"p_checklist_slug": string,"p_duration_minutes": number,"p_quote_id": string,"p_scheduled_date": string,"p_start_time": string }; Returns: string
                           },
"create_business":
{ Args: { "p_address"?: string,"p_currency": string,"p_date_format": string,"p_default_hourly_cost"?: number,"p_default_target_margin"?: number,"p_email"?: string,"p_market": string,"p_name": string,"p_owner_name"?: string,"p_phone"?: string,"p_timezone": string }; Returns: string
                           },
"create_job":
{ Args: { "p_checklist": Json,"p_checklist_slug": string,"p_client_id": string,"p_duration_minutes": number,"p_execution_notes": string,"p_is_demo"?: boolean,"p_price": number,"p_scheduled_date": string,"p_service_type": string,"p_start_time": string }; Returns: string
                           },
"current_business_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"delete_client_permanently":
{ Args: { "p_client_id": string }; Returns: undefined
                           },
"delete_my_account":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"has_active_license":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_business_member":
{ Args: { "p_business_id": string }; Returns: boolean
                           },
"next_document_number":
{ Args: { "p_business_id": string,"p_kind": string }; Returns: string
                           },
"remove_demo_data":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"replace_job_checklist":
{ Args: { "p_checklist": Json,"p_job_id": string }; Returns: undefined
                           },
"save_invoice":
{ Args: { "p_client_id": string,"p_due_date": string,"p_invoice_id": string,"p_is_demo"?: boolean,"p_issue_date": string,"p_items": Json,"p_job_id": string,"p_notes": string,"p_status": string }; Returns: string
                           },
"save_quote":
{ Args: { "p_client_id": string,"p_is_demo"?: boolean,"p_issue_date": string,"p_items": Json,"p_notes": string,"p_pricing": Json,"p_quote_id": string,"p_service_type": string,"p_valid_until": string }; Returns: string
                           },
"validate_line_items":
{ Args: { "p_items": Json }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
