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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          key: string
          name: string
        }
        Insert: {
          created_at?: string
          description: string
          icon?: string
          id?: string
          key: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      countries: {
        Row: {
          code: string
          created_at: string
          description: string | null
          difficulty_base: number
          historical_events: string[] | null
          id: string
          is_secret: boolean
          latitude: number | null
          longitude: number | null
          monuments: string[] | null
          name: string
          phase: number
          release_order: number
          symbols: string[] | null
          visibility_level: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          difficulty_base?: number
          historical_events?: string[] | null
          id?: string
          is_secret?: boolean
          latitude?: number | null
          longitude?: number | null
          monuments?: string[] | null
          name: string
          phase?: number
          release_order?: number
          symbols?: string[] | null
          visibility_level?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          difficulty_base?: number
          historical_events?: string[] | null
          id?: string
          is_secret?: boolean
          latitude?: number | null
          longitude?: number | null
          monuments?: string[] | null
          name?: string
          phase?: number
          release_order?: number
          symbols?: string[] | null
          visibility_level?: number
        }
        Relationships: []
      }
      missions: {
        Row: {
          completed: boolean
          completed_at: string | null
          country_id: string
          created_at: string
          id: string
          mission_data: Json | null
          mission_title: string
          score: number | null
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          country_id: string
          created_at?: string
          id?: string
          mission_data?: Json | null
          mission_title: string
          score?: number | null
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          country_id?: string
          created_at?: string
          id?: string
          mission_data?: Json | null
          mission_title?: string
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          last_mission_at: string | null
          level: number
          longest_streak: number
          streak: number
          subscription_type: string
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          last_mission_at?: string | null
          level?: number
          longest_streak?: number
          streak?: number
          subscription_type?: string
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          last_mission_at?: string | null
          level?: number
          longest_streak?: number
          streak?: number
          subscription_type?: string
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      puzzle_pieces: {
        Row: {
          country_id: string
          created_at: string
          id: string
          piece_index: number
          unlocked: boolean
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          country_id: string
          created_at?: string
          id?: string
          piece_index?: number
          unlocked?: boolean
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          country_id?: string
          created_at?: string
          id?: string
          piece_index?: number
          unlocked?: boolean
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "puzzle_pieces_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          awarded_at: string
          badge_key: string
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_key: string
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_key?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_key_fkey"
            columns: ["badge_key"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["key"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_story_state: {
        Row: {
          ending_path: string | null
          id: string
          secrets_unlocked: number
          suspicion_level: number
          trust_level: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ending_path?: string | null
          id?: string
          secrets_unlocked?: number
          suspicion_level?: number
          trust_level?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ending_path?: string | null
          id?: string
          secrets_unlocked?: number
          suspicion_level?: number
          trust_level?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
