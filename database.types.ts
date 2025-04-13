export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      Addresses: {
        Row: {
          address_id: number
          city: string
          created_at: string
          state_province: string
          street: string
          zip_postal: string | null
        }
        Insert: {
          address_id?: number
          city: string
          created_at?: string
          state_province: string
          street: string
          zip_postal?: string | null
        }
        Update: {
          address_id?: number
          city?: string
          created_at?: string
          state_province?: string
          street?: string
          zip_postal?: string | null
        }
        Relationships: []
      }
      BleacherEvents: {
        Row: {
          bleacher_event_id: number
          bleacher_id: number
          created_at: string
          event_id: number
        }
        Insert: {
          bleacher_event_id?: number
          bleacher_id: number
          created_at?: string
          event_id: number
        }
        Update: {
          bleacher_event_id?: number
          bleacher_id?: number
          created_at?: string
          event_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "BleacherEvents_bleacher_id_fkey"
            columns: ["bleacher_id"]
            isOneToOne: false
            referencedRelation: "Bleachers"
            referencedColumns: ["bleacher_id"]
          },
          {
            foreignKeyName: "BleacherEvents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "Events"
            referencedColumns: ["event_id"]
          },
        ]
      }
      Bleachers: {
        Row: {
          bleacher_id: number
          bleacher_number: number
          bleacher_rows: number
          bleacher_seats: number
          created_at: string
          created_by: string | null
          home_base_id: number
          updated_at: string | null
          updated_by: string | null
          winter_home_base_id: number
        }
        Insert: {
          bleacher_id?: number
          bleacher_number: number
          bleacher_rows: number
          bleacher_seats: number
          created_at?: string
          created_by?: string | null
          home_base_id: number
          updated_at?: string | null
          updated_by?: string | null
          winter_home_base_id: number
        }
        Update: {
          bleacher_id?: number
          bleacher_number?: number
          bleacher_rows?: number
          bleacher_seats?: number
          created_at?: string
          created_by?: string | null
          home_base_id?: number
          updated_at?: string | null
          updated_by?: string | null
          winter_home_base_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "Bleachers_home_base_id_fkey"
            columns: ["home_base_id"]
            isOneToOne: false
            referencedRelation: "HomeBases"
            referencedColumns: ["home_base_id"]
          },
          {
            foreignKeyName: "Bleachers_winter_home_base_id_fkey"
            columns: ["winter_home_base_id"]
            isOneToOne: false
            referencedRelation: "HomeBases"
            referencedColumns: ["home_base_id"]
          },
        ]
      }
      Events: {
        Row: {
          address_id: number
          booked: boolean
          created_at: string
          event_end: string
          event_id: number
          event_name: string
          event_start: string
          fifteen_row: number | null
          hsl_hue: number | null
          lenient: boolean
          must_be_clean: boolean
          notes: string | null
          setup_start: string | null
          seven_row: number | null
          teardown_end: string | null
          ten_row: number | null
          total_seats: number | null
        }
        Insert: {
          address_id: number
          booked?: boolean
          created_at?: string
          event_end: string
          event_id?: number
          event_name: string
          event_start: string
          fifteen_row?: number | null
          hsl_hue?: number | null
          lenient: boolean
          must_be_clean?: boolean
          notes?: string | null
          setup_start?: string | null
          seven_row?: number | null
          teardown_end?: string | null
          ten_row?: number | null
          total_seats?: number | null
        }
        Update: {
          address_id?: number
          booked?: boolean
          created_at?: string
          event_end?: string
          event_id?: number
          event_name?: string
          event_start?: string
          fifteen_row?: number | null
          hsl_hue?: number | null
          lenient?: boolean
          must_be_clean?: boolean
          notes?: string | null
          setup_start?: string | null
          seven_row?: number | null
          teardown_end?: string | null
          ten_row?: number | null
          total_seats?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "Events_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "Addresses"
            referencedColumns: ["address_id"]
          },
        ]
      }
      HomeBases: {
        Row: {
          created_at: string
          home_base_id: number
          home_base_name: string
        }
        Insert: {
          created_at?: string
          home_base_id?: number
          home_base_name: string
        }
        Update: {
          created_at?: string
          home_base_id?: number
          home_base_name?: string
        }
        Relationships: []
      }
      InvitedUsers: {
        Row: {
          created_at: string
          email: string
          invited_user_id: number
        }
        Insert: {
          created_at?: string
          email: string
          invited_user_id?: number
        }
        Update: {
          created_at?: string
          email?: string
          invited_user_id?: number
        }
        Relationships: []
      }
      Users: {
        Row: {
          clerk_user_id: string | null
          created_at: string
          email: string
          first_name: string | null
          last_name: string | null
          phone: string | null
          user_id: number
        }
        Insert: {
          clerk_user_id?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          user_id?: number
        }
        Update: {
          clerk_user_id?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          user_id?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
