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
          is_strategic_final: boolean
          latitude: number | null
          longitude: number | null
          monuments: string[] | null
          name: string
          operation_name: string
          operation_number: number
          phase: number
          puzzle_position_x: number | null
          puzzle_position_y: number | null
          release_order: number
          season_number: number
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
          is_strategic_final?: boolean
          latitude?: number | null
          longitude?: number | null
          monuments?: string[] | null
          name: string
          operation_name?: string
          operation_number?: number
          phase?: number
          puzzle_position_x?: number | null
          puzzle_position_y?: number | null
          release_order?: number
          season_number?: number
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
          is_strategic_final?: boolean
          latitude?: number | null
          longitude?: number | null
          monuments?: string[] | null
          name?: string
          operation_name?: string
          operation_number?: number
          phase?: number
          puzzle_position_x?: number | null
          puzzle_position_y?: number | null
          release_order?: number
          season_number?: number
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
      player_country_progress: {
        Row: {
          attempts_count: number
          best_score: number
          country_code: string
          fragment_granted: boolean
          id: string
          last_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts_count?: number
          best_score?: number
          country_code: string
          fragment_granted?: boolean
          id?: string
          last_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts_count?: number
          best_score?: number
          country_code?: string
          fragment_granted?: boolean
          id?: string
          last_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          has_completed_puzzle: boolean
          id: string
          last_mission_at: string | null
          leaderboard_visible: boolean
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
          has_completed_puzzle?: boolean
          id?: string
          last_mission_at?: string | null
          leaderboard_visible?: boolean
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
          has_completed_puzzle?: boolean
          id?: string
          last_mission_at?: string | null
          leaderboard_visible?: boolean
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
      questions: {
        Row: {
          answer_options: Json
          category: string
          correct_answer: string
          country_id: string
          created_at: string
          difficulty_level: number
          id: string
          question_text: string
        }
        Insert: {
          answer_options?: Json
          category?: string
          correct_answer: string
          country_id: string
          created_at?: string
          difficulty_level?: number
          id?: string
          question_text: string
        }
        Update: {
          answer_options?: Json
          category?: string
          correct_answer?: string
          country_id?: string
          created_at?: string
          difficulty_level?: number
          id?: string
          question_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_country_id_fkey"
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
      user_fragments: {
        Row: {
          country_id: string
          created_at: string
          fragment_index: number
          id: string
          is_placed: boolean
          obtained_at: string
          placed_at: string | null
          user_id: string
        }
        Insert: {
          country_id: string
          created_at?: string
          fragment_index?: number
          id?: string
          is_placed?: boolean
          obtained_at?: string
          placed_at?: string | null
          user_id: string
        }
        Update: {
          country_id?: string
          created_at?: string
          fragment_index?: number
          id?: string
          is_placed?: boolean
          obtained_at?: string
          placed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_fragments_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          attempts: number
          best_score: number
          country_id: string
          created_at: string
          fragment_unlocked: boolean
          id: string
          last_attempt_at: string | null
          success: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          best_score?: number
          country_id: string
          created_at?: string
          fragment_unlocked?: boolean
          id?: string
          last_attempt_at?: string | null
          success?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          best_score?: number
          country_id?: string
          created_at?: string
          fragment_unlocked?: boolean
          id?: string
          last_attempt_at?: string | null
          success?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
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
          central_calcul_step: number
          central_dilemma_unlocked: boolean
          central_word_attempts: number
          central_word_validated: boolean
          ending_path: string | null
          id: string
          secrets_unlocked: number
          suspicion_level: number
          trust_level: number
          updated_at: string
          user_id: string
        }
        Insert: {
          central_calcul_step?: number
          central_dilemma_unlocked?: boolean
          central_word_attempts?: number
          central_word_validated?: boolean
          ending_path?: string | null
          id?: string
          secrets_unlocked?: number
          suspicion_level?: number
          trust_level?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          central_calcul_step?: number
          central_dilemma_unlocked?: boolean
          central_word_attempts?: number
          central_word_validated?: boolean
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
      leaderboard: {
        Row: {
          display_name: string | null
          level: number | null
          subscription_type: string | null
          xp: number | null
        }
        Insert: {
          display_name?: string | null
          level?: number | null
          subscription_type?: string | null
          xp?: number | null
        }
        Update: {
          display_name?: string | null
          level?: number | null
          subscription_type?: string | null
          xp?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      complete_country_attempt: {
        Args: {
          p_country_code: string
          p_score: number
          p_total?: number
          p_user_id: string
        }
        Returns: Json
      }
      get_leaderboard: {
        Args: { p_limit?: number }
        Returns: {
          display_name: string
          level: number
          rank: number
          subscription_type: string
          xp: number
        }[]
      }
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
