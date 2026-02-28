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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      blog_posts: {
        Row: {
          author_id: string
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string
          id: string
          is_published: boolean
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      imei_brands: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      imei_carriers: {
        Row: {
          country_id: string
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          country_id: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          country_id?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "imei_carriers_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "imei_countries"
            referencedColumns: ["id"]
          },
        ]
      }
      imei_countries: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      imei_providers: {
        Row: {
          api_url: string | null
          avg_rating: number | null
          commission_percent: number | null
          created_at: string
          fulfillment_type: string | null
          id: string
          is_verified: boolean | null
          logo_url: string | null
          name: string
          sort_order: number
          status: string
          success_rate: number | null
          total_completed: number | null
          total_reviews: number | null
        }
        Insert: {
          api_url?: string | null
          avg_rating?: number | null
          commission_percent?: number | null
          created_at?: string
          fulfillment_type?: string | null
          id?: string
          is_verified?: boolean | null
          logo_url?: string | null
          name: string
          sort_order?: number
          status?: string
          success_rate?: number | null
          total_completed?: number | null
          total_reviews?: number | null
        }
        Update: {
          api_url?: string | null
          avg_rating?: number | null
          commission_percent?: number | null
          created_at?: string
          fulfillment_type?: string | null
          id?: string
          is_verified?: boolean | null
          logo_url?: string | null
          name?: string
          sort_order?: number
          status?: string
          success_rate?: number | null
          total_completed?: number | null
          total_reviews?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          order_id: string
          provider_id: string | null
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          provider_id?: string | null
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          provider_id?: string | null
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "recent_completions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "imei_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "imei_providers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_notes: string | null
          completed_at: string | null
          created_at: string
          credential_id: string | null
          credentials: string
          custom_fields_data: Json | null
          fulfillment_mode: string
          id: string
          imei_number: string | null
          order_code: string
          price: number
          product_id: string | null
          product_name: string
          product_type: string | null
          result: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          completed_at?: string | null
          created_at?: string
          credential_id?: string | null
          credentials?: string
          custom_fields_data?: Json | null
          fulfillment_mode?: string
          id?: string
          imei_number?: string | null
          order_code: string
          price: number
          product_id?: string | null
          product_name: string
          product_type?: string | null
          result?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          completed_at?: string | null
          created_at?: string
          credential_id?: string | null
          credentials?: string
          custom_fields_data?: Json | null
          fulfillment_mode?: string
          id?: string
          imei_number?: string | null
          order_code?: string
          price?: number
          product_id?: string | null
          product_name?: string
          product_type?: string | null
          result?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "product_credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          accepted_currency: string | null
          binance_uid: string | null
          created_at: string
          id: string
          is_active: boolean
          method_id: string
          min_deposit: number
          name: string
          network: string | null
          phone: string | null
          provider: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          accepted_currency?: string | null
          binance_uid?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          method_id: string
          min_deposit?: number
          name?: string
          network?: string | null
          phone?: string | null
          provider: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          accepted_currency?: string | null
          binance_uid?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          method_id?: string
          min_deposit?: number
          name?: string
          network?: string | null
          phone?: string | null
          provider?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      pricing_tiers: {
        Row: {
          created_at: string
          id: string
          max_qty: number | null
          min_qty: number
          product_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          max_qty?: number | null
          min_qty?: number
          product_id: string
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          max_qty?: number | null
          min_qty?: number
          product_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "pricing_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_credentials: {
        Row: {
          created_at: string
          credentials: string
          expires_at: string | null
          id: string
          is_sold: boolean
          product_id: string
          sold_at: string | null
          sold_to: string | null
        }
        Insert: {
          created_at?: string
          credentials: string
          expires_at?: string | null
          id?: string
          is_sold?: boolean
          product_id: string
          sold_at?: string | null
          sold_to?: string | null
        }
        Update: {
          created_at?: string
          credentials?: string
          expires_at?: string | null
          id?: string
          is_sold?: boolean
          product_id?: string
          sold_at?: string | null
          sold_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_credentials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_custom_fields: {
        Row: {
          created_at: string
          field_name: string
          field_type: string
          id: string
          linked_mode: string
          max_length: number | null
          min_length: number | null
          options: Json | null
          product_id: string
          required: boolean
          sort_order: number
        }
        Insert: {
          created_at?: string
          field_name: string
          field_type?: string
          id?: string
          linked_mode: string
          max_length?: number | null
          min_length?: number | null
          options?: Json | null
          product_id: string
          required?: boolean
          sort_order?: number
        }
        Update: {
          created_at?: string
          field_name?: string
          field_type?: string
          id?: string
          linked_mode?: string
          max_length?: number | null
          min_length?: number | null
          options?: Json | null
          product_id?: string
          required?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_custom_fields_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          api_provider: string | null
          base_currency: string
          base_price: number
          brand: string | null
          brand_id: string | null
          carrier: string | null
          carrier_id: string | null
          category: string
          country: string | null
          country_id: string | null
          created_at: string
          delivery_time_config: Json
          description: string
          duration: string
          final_price: number | null
          fulfillment_modes: Json
          icon: string
          id: string
          image_url: string | null
          margin_percent: number | null
          name: string
          processing_time: string | null
          product_code: string
          product_type: string
          provider_id: string | null
          provider_price: number | null
          retail_price: number
          sort_order: number
          stock: number
          type: string
          wholesale_price: number
        }
        Insert: {
          api_provider?: string | null
          base_currency?: string
          base_price?: number
          brand?: string | null
          brand_id?: string | null
          carrier?: string | null
          carrier_id?: string | null
          category?: string
          country?: string | null
          country_id?: string | null
          created_at?: string
          delivery_time_config?: Json
          description?: string
          duration: string
          final_price?: number | null
          fulfillment_modes?: Json
          icon?: string
          id?: string
          image_url?: string | null
          margin_percent?: number | null
          name: string
          processing_time?: string | null
          product_code?: string
          product_type?: string
          provider_id?: string | null
          provider_price?: number | null
          retail_price: number
          sort_order?: number
          stock?: number
          type?: string
          wholesale_price: number
        }
        Update: {
          api_provider?: string | null
          base_currency?: string
          base_price?: number
          brand?: string | null
          brand_id?: string | null
          carrier?: string | null
          carrier_id?: string | null
          category?: string
          country?: string | null
          country_id?: string | null
          created_at?: string
          delivery_time_config?: Json
          description?: string
          duration?: string
          final_price?: number | null
          fulfillment_modes?: Json
          icon?: string
          id?: string
          image_url?: string | null
          margin_percent?: number | null
          name?: string
          processing_time?: string | null
          product_code?: string
          product_type?: string
          provider_id?: string | null
          provider_price?: number | null
          retail_price?: number
          sort_order?: number
          stock?: number
          type?: string
          wholesale_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "imei_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "imei_carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "imei_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "imei_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "imei_providers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          balance: number
          created_at: string
          email: string
          id: string
          name: string
          total_orders: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          email?: string
          id?: string
          name?: string
          total_orders?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          email?: string
          id?: string
          name?: string
          total_orders?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_history: {
        Row: {
          created_at: string
          id: string
          rate: number
          source: string
        }
        Insert: {
          created_at?: string
          id?: string
          rate: number
          source?: string
        }
        Update: {
          created_at?: string
          id?: string
          rate?: number
          source?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          method: string | null
          screenshot_url: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string
          id?: string
          method?: string | null
          screenshot_url?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          method?: string | null
          screenshot_url?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      imei_providers_public: {
        Row: {
          avg_rating: number | null
          created_at: string | null
          fulfillment_type: string | null
          id: string | null
          is_verified: boolean | null
          logo_url: string | null
          name: string | null
          sort_order: number | null
          status: string | null
          success_rate: number | null
          total_completed: number | null
          total_reviews: number | null
        }
        Insert: {
          avg_rating?: number | null
          created_at?: string | null
          fulfillment_type?: string | null
          id?: string | null
          is_verified?: boolean | null
          logo_url?: string | null
          name?: string | null
          sort_order?: number | null
          status?: string | null
          success_rate?: number | null
          total_completed?: number | null
          total_reviews?: number | null
        }
        Update: {
          avg_rating?: number | null
          created_at?: string | null
          fulfillment_type?: string | null
          id?: string | null
          is_verified?: boolean | null
          logo_url?: string | null
          name?: string | null
          sort_order?: number | null
          status?: string | null
          success_rate?: number | null
          total_completed?: number | null
          total_reviews?: number | null
        }
        Relationships: []
      }
      recent_completions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string | null
          product_name: string | null
          status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_purchase: {
        Args: {
          p_custom_fields?: Json
          p_fulfillment_mode?: string
          p_imei_number?: string
          p_product_id: string
          p_quantity?: number
          p_user_id: string
        }
        Returns: Json
      }
      random_alnum4: { Args: never; Returns: string }
      recalculate_usd_prices: { Args: never; Returns: undefined }
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
