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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          body: string
          clan_id: string | null
          created_at: string
          id: string
          user_id: string
          username: string
        }
        Insert: {
          body: string
          clan_id?: string | null
          created_at?: string
          id?: string
          user_id: string
          username: string
        }
        Update: {
          body?: string
          clan_id?: string | null
          created_at?: string
          id?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_members: {
        Row: {
          clan_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          clan_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          clan_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_members_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_stash: {
        Row: {
          clan_id: string
          item: string
          qty: number
        }
        Insert: {
          clan_id: string
          item: string
          qty?: number
        }
        Update: {
          clan_id?: string
          item?: string
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "clan_stash_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_wars: {
        Row: {
          attacker: string
          attacker_name: string
          created_at: string
          defender: string
          defender_name: string
          id: string
          loot: string
          won: boolean
        }
        Insert: {
          attacker: string
          attacker_name: string
          created_at?: string
          defender: string
          defender_name: string
          id?: string
          loot?: string
          won: boolean
        }
        Update: {
          attacker?: string
          attacker_name?: string
          created_at?: string
          defender?: string
          defender_name?: string
          id?: string
          loot?: string
          won?: boolean
        }
        Relationships: []
      }
      clans: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      gifts: {
        Row: {
          claimed: boolean
          created_at: string
          from_id: string
          from_name: string
          id: string
          item: string
          qty: number
          to_id: string
        }
        Insert: {
          claimed?: boolean
          created_at?: string
          from_id: string
          from_name: string
          id?: string
          item: string
          qty: number
          to_id: string
        }
        Update: {
          claimed?: boolean
          created_at?: string
          from_id?: string
          from_name?: string
          id?: string
          item?: string
          qty?: number
          to_id?: string
        }
        Relationships: []
      }
      market_offers: {
        Row: {
          buyer_id: string | null
          created_at: string
          give_item: string
          give_qty: number
          id: string
          seller_claimed: boolean
          seller_id: string
          status: string
          want_item: string
          want_qty: number
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string
          give_item: string
          give_qty: number
          id?: string
          seller_claimed?: boolean
          seller_id: string
          status?: string
          want_item: string
          want_qty: number
        }
        Update: {
          buyer_id?: string | null
          created_at?: string
          give_item?: string
          give_qty?: number
          id?: string
          seller_claimed?: boolean
          seller_id?: string
          status?: string
          want_item?: string
          want_qty?: number
        }
        Relationships: []
      }
      player_quests: {
        Row: {
          created_at: string
          helper_id: string | null
          id: string
          poster_claimed: boolean
          poster_id: string
          reward_item: string
          reward_qty: number
          status: string
          title: string
          want_item: string
          want_qty: number
        }
        Insert: {
          created_at?: string
          helper_id?: string | null
          id?: string
          poster_claimed?: boolean
          poster_id: string
          reward_item: string
          reward_qty: number
          status?: string
          title: string
          want_item: string
          want_qty: number
        }
        Update: {
          created_at?: string
          helper_id?: string | null
          id?: string
          poster_claimed?: boolean
          poster_id?: string
          reward_item?: string
          reward_qty?: number
          status?: string
          title?: string
          want_item?: string
          want_qty?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          day: number
          id: string
          level: number
          score: number
          updated_at: string
          username: string
        }
        Insert: {
          day?: number
          id: string
          level?: number
          score?: number
          updated_at?: string
          username: string
        }
        Update: {
          day?: number
          id?: string
          level?: number
          score?: number
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      saves: {
        Row: {
          state: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          state: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          state?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_contrib: {
        Row: {
          amount: number
          updated_at: string
          user_id: string
          username: string
          week: string
        }
        Insert: {
          amount?: number
          updated_at?: string
          user_id: string
          username: string
          week: string
        }
        Update: {
          amount?: number
          updated_at?: string
          user_id?: string
          username?: string
          week?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _valid_item: { Args: { _i: string }; Returns: boolean }
      clan_raid: { Args: { _target: string }; Returns: Json }
      create_clan: { Args: { _name: string }; Returns: string }
      gift_claim: {
        Args: never
        Returns: {
          from_name: string
          item: string
          qty: number
        }[]
      }
      gift_send: {
        Args: { _item: string; _qty: number; _to: string }
        Returns: undefined
      }
      is_clan_member: {
        Args: { _clan: string; _user: string }
        Returns: boolean
      }
      join_clan: { Args: { _clan: string }; Returns: undefined }
      leave_clan: { Args: never; Returns: undefined }
      market_accept: { Args: { _offer: string }; Returns: boolean }
      market_cancel: { Args: { _offer: string }; Returns: boolean }
      market_claim: {
        Args: never
        Returns: {
          item: string
          qty: number
        }[]
      }
      market_post: {
        Args: { _give: string; _gq: number; _want: string; _wq: number }
        Returns: string
      }
      my_clan: { Args: never; Returns: string }
      quest_cancel: { Args: { _quest: string }; Returns: boolean }
      quest_claim: {
        Args: never
        Returns: {
          item: string
          qty: number
        }[]
      }
      quest_fulfill: { Args: { _quest: string }; Returns: boolean }
      quest_post: {
        Args: {
          _reward: string
          _rq: number
          _title: string
          _want: string
          _wq: number
        }
        Returns: string
      }
      stash_deposit: {
        Args: { _item: string; _qty: number }
        Returns: undefined
      }
      stash_withdraw: {
        Args: { _item: string; _qty: number }
        Returns: boolean
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
