export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
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
          setup_confirmed: boolean
          setup_text: string | null
          teardown_confirmed: boolean
          teardown_text: string | null
        }
        Insert: {
          bleacher_event_id?: number
          bleacher_id: number
          created_at?: string
          event_id: number
          setup_confirmed?: boolean
          setup_text?: string | null
          teardown_confirmed?: boolean
          teardown_text?: string | null
        }
        Update: {
          bleacher_event_id?: number
          bleacher_id?: number
          created_at?: string
          event_id?: number
          setup_confirmed?: boolean
          setup_text?: string | null
          teardown_confirmed?: boolean
          teardown_text?: string | null
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
          linxup_device_id: string | null
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
          linxup_device_id?: string | null
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
          linxup_device_id?: string | null
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
      BleacherUsers: {
        Row: {
          bleacher_id: number
          bleacher_user_id: number
          created_at: string
          season: string
          user_id: number
        }
        Insert: {
          bleacher_id: number
          bleacher_user_id?: number
          created_at?: string
          season: string
          user_id: number
        }
        Update: {
          bleacher_id?: number
          bleacher_user_id?: number
          created_at?: string
          season?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "BleacherUsers_bleacher_id_fkey"
            columns: ["bleacher_id"]
            isOneToOne: false
            referencedRelation: "Bleachers"
            referencedColumns: ["bleacher_id"]
          },
          {
            foreignKeyName: "BleacherUsers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "Users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      Blocks: {
        Row: {
          bleacher_id: number | null
          block_id: number
          created_at: string
          date: string | null
          text: string | null
        }
        Insert: {
          bleacher_id?: number | null
          block_id?: number
          created_at?: string
          date?: string | null
          text?: string | null
        }
        Update: {
          bleacher_id?: number | null
          block_id?: number
          created_at?: string
          date?: string | null
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "block_bleacher_id_fkey"
            columns: ["bleacher_id"]
            isOneToOne: false
            referencedRelation: "Bleachers"
            referencedColumns: ["bleacher_id"]
          },
        ]
      }
      Drivers: {
        Row: {
          created_at: string
          driver_id: number
          pay_currency: string
          pay_per_unit: string
          pay_rate_cents: number
          tax: number
          user_id: number
        }
        Insert: {
          created_at?: string
          driver_id?: number
          pay_currency?: string
          pay_per_unit?: string
          pay_rate_cents?: number
          tax?: number
          user_id: number
        }
        Update: {
          created_at?: string
          driver_id?: number
          pay_currency?: string
          pay_per_unit?: string
          pay_rate_cents?: number
          tax?: number
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "Drivers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "Users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      Events: {
        Row: {
          address_id: number
          booked: boolean
          created_at: string
          created_by_user_id: number | null
          event_end: string
          event_id: number
          event_name: string
          event_start: string
          fifteen_row: number | null
          goodshuffle_url: string | null
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
          created_by_user_id?: number | null
          event_end: string
          event_id?: number
          event_name: string
          event_start: string
          fifteen_row?: number | null
          goodshuffle_url?: string | null
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
          created_by_user_id?: number | null
          event_end?: string
          event_id?: number
          event_name?: string
          event_start?: string
          fifteen_row?: number | null
          goodshuffle_url?: string | null
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
          {
            foreignKeyName: "Events_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "Users"
            referencedColumns: ["user_id"]
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
      Tasks: {
        Row: {
          created_at: string
          created_by_user_id: number
          description: string
          name: string
          task_id: number
          task_status_id: number
          task_type_id: number
        }
        Insert: {
          created_at?: string
          created_by_user_id: number
          description: string
          name: string
          task_id?: number
          task_status_id: number
          task_type_id: number
        }
        Update: {
          created_at?: string
          created_by_user_id?: number
          description?: string
          name?: string
          task_id?: number
          task_status_id?: number
          task_type_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "Tasks_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "Users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "Tasks_task_status_id_fkey"
            columns: ["task_status_id"]
            isOneToOne: false
            referencedRelation: "TaskStatuses"
            referencedColumns: ["task_status_id"]
          },
          {
            foreignKeyName: "Tasks_task_type_id_fkey"
            columns: ["task_type_id"]
            isOneToOne: false
            referencedRelation: "TaskTypes"
            referencedColumns: ["task_type_id"]
          },
        ]
      }
      TaskStatuses: {
        Row: {
          created_at: string
          hex: string
          label: string
          task_status_id: number
        }
        Insert: {
          created_at?: string
          hex: string
          label: string
          task_status_id?: number
        }
        Update: {
          created_at?: string
          hex?: string
          label?: string
          task_status_id?: number
        }
        Relationships: []
      }
      TaskTypes: {
        Row: {
          created_at: string
          label: string
          task_type_id: number
        }
        Insert: {
          created_at?: string
          label: string
          task_type_id?: number
        }
        Update: {
          created_at?: string
          label?: string
          task_type_id?: number
        }
        Relationships: []
      }
      UserHomeBases: {
        Row: {
          created_at: string
          home_base_id: number | null
          user_home_base_id: number
          user_id: number | null
        }
        Insert: {
          created_at?: string
          home_base_id?: number | null
          user_home_base_id?: number
          user_id?: number | null
        }
        Update: {
          created_at?: string
          home_base_id?: number | null
          user_home_base_id?: number
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "userhomebases_home_base_id_fkey"
            columns: ["home_base_id"]
            isOneToOne: false
            referencedRelation: "HomeBases"
            referencedColumns: ["home_base_id"]
          },
          {
            foreignKeyName: "userhomebases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "Users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      UserRoles: {
        Row: {
          created_at: string
          id: number
          role: string
        }
        Insert: {
          created_at?: string
          id?: number
          role: string
        }
        Update: {
          created_at?: string
          id?: number
          role?: string
        }
        Relationships: []
      }
      Users: {
        Row: {
          avatar_image_url: string | null
          clerk_user_id: string | null
          created_at: string
          email: string
          first_name: string | null
          last_name: string | null
          phone: string | null
          role: number | null
          status: number
          user_id: number
        }
        Insert: {
          avatar_image_url?: string | null
          clerk_user_id?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          role?: number | null
          status?: number
          user_id?: number
        }
        Update: {
          avatar_image_url?: string | null
          clerk_user_id?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          role?: number | null
          status?: number
          user_id?: number
        }
        Relationships: []
      }
      UserStatuses: {
        Row: {
          created_at: string
          id: number
          status: string
        }
        Insert: {
          created_at?: string
          id?: number
          status: string
        }
        Update: {
          created_at?: string
          id?: number
          status?: string
        }
        Relationships: []
      }
      WorkTrackers: {
        Row: {
          bleacher_id: number | null
          created_at: string
          date: string | null
          dropoff_address_id: number | null
          dropoff_poc: string | null
          dropoff_time: string | null
          internal_notes: string | null
          notes: string | null
          pay_cents: number | null
          pickup_address_id: number | null
          pickup_poc: string | null
          pickup_time: string | null
          user_id: number | null
          work_tracker_id: number
        }
        Insert: {
          bleacher_id?: number | null
          created_at?: string
          date?: string | null
          dropoff_address_id?: number | null
          dropoff_poc?: string | null
          dropoff_time?: string | null
          internal_notes?: string | null
          notes?: string | null
          pay_cents?: number | null
          pickup_address_id?: number | null
          pickup_poc?: string | null
          pickup_time?: string | null
          user_id?: number | null
          work_tracker_id?: number
        }
        Update: {
          bleacher_id?: number | null
          created_at?: string
          date?: string | null
          dropoff_address_id?: number | null
          dropoff_poc?: string | null
          dropoff_time?: string | null
          internal_notes?: string | null
          notes?: string | null
          pay_cents?: number | null
          pickup_address_id?: number | null
          pickup_poc?: string | null
          pickup_time?: string | null
          user_id?: number | null
          work_tracker_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "worktrackers_bleacher_id_fkey"
            columns: ["bleacher_id"]
            isOneToOne: false
            referencedRelation: "Bleachers"
            referencedColumns: ["bleacher_id"]
          },
          {
            foreignKeyName: "worktrackers_dropoff_address_id_fkey"
            columns: ["dropoff_address_id"]
            isOneToOne: false
            referencedRelation: "Addresses"
            referencedColumns: ["address_id"]
          },
          {
            foreignKeyName: "worktrackers_pickup_address_id_fkey"
            columns: ["pickup_address_id"]
            isOneToOne: false
            referencedRelation: "Addresses"
            referencedColumns: ["address_id"]
          },
          {
            foreignKeyName: "worktrackers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "Users"
            referencedColumns: ["user_id"]
          },
        ]
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
