export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string | null;
          entity_id: string | null;
          entity_type: string | null;
          id: string;
          ip_address: unknown;
          new_value: Json | null;
          old_value: Json | null;
          user_agent: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string | null;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          ip_address?: unknown;
          new_value?: Json | null;
          old_value?: Json | null;
          user_agent?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string | null;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          ip_address?: unknown;
          new_value?: Json | null;
          old_value?: Json | null;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      businesses: {
        Row: {
          anti_fraud_mode: string | null;
          authorized_ip: unknown;
          contact_email: string;
          contact_phone: string | null;
          created_at: string | null;
          deleted_at: string | null;
          id: string;
          industry: string;
          lat: number | null;
          lng: number | null;
          logo_url: string | null;
          name: string;
          owner_user_id: string;
          radius_meters: number | null;
          status: string | null;
          timezone: string;
          trial_ends_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          anti_fraud_mode?: string | null;
          authorized_ip?: unknown;
          contact_email: string;
          contact_phone?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          id?: string;
          industry: string;
          lat?: number | null;
          lng?: number | null;
          logo_url?: string | null;
          name: string;
          owner_user_id: string;
          radius_meters?: number | null;
          status?: string | null;
          timezone?: string;
          trial_ends_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          anti_fraud_mode?: string | null;
          authorized_ip?: unknown;
          contact_email?: string;
          contact_phone?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          id?: string;
          industry?: string;
          lat?: number | null;
          lng?: number | null;
          logo_url?: string | null;
          name?: string;
          owner_user_id?: string;
          radius_meters?: number | null;
          status?: string | null;
          timezone?: string;
          trial_ends_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          auth_user_id: string | null;
          business_id: string;
          created_at: string | null;
          email: string | null;
          first_name: string | null;
          id: string;
          last_name: string | null;
          phone_number: string | null;
          updated_at: string | null;
        };
        Insert: {
          auth_user_id?: string | null;
          business_id: string;
          created_at?: string | null;
          email?: string | null;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          phone_number?: string | null;
          updated_at?: string | null;
        };
        Update: {
          auth_user_id?: string | null;
          business_id?: string;
          created_at?: string | null;
          email?: string | null;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          phone_number?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'customers_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
        ];
      };
      employees: {
        Row: {
          business_id: string;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          pin_hash: string;
          shift_start: string | null;
          shift_end: string | null;
          updated_at: string | null;
        };
        Insert: {
          business_id: string;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          pin_hash: string;
          shift_start?: string | null;
          shift_end?: string | null;
          updated_at?: string | null;
        };
        Update: {
          business_id?: string;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          pin_hash?: string;
          shift_start?: string | null;
          shift_end?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'employees_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
        ];
      };
      loyalty_programs: {
        Row: {
          business_id: string;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          reward_description: string | null;
          stamp_goal: number;
          terms_and_conditions: string | null;
          type: string;
          updated_at: string | null;
        };
        Insert: {
          business_id: string;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          reward_description?: string | null;
          stamp_goal?: number;
          terms_and_conditions?: string | null;
          type?: string;
          updated_at?: string | null;
        };
        Update: {
          business_id?: string;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          reward_description?: string | null;
          stamp_goal?: number;
          terms_and_conditions?: string | null;
          type?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'loyalty_programs_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
        ];
      };
      pass_installations: {
        Row: {
          created_at: string | null;
          customer_id: string | null;
          device_id: string;
          device_token: string | null;
          id: string;
          installed_at: string | null;
          is_removed: boolean | null;
          pass_id: string;
          platform: string;
          removed_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          customer_id?: string | null;
          device_id: string;
          device_token?: string | null;
          id?: string;
          installed_at?: string | null;
          is_removed?: boolean | null;
          pass_id: string;
          platform: string;
          removed_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          customer_id?: string | null;
          device_id?: string;
          device_token?: string | null;
          id?: string;
          installed_at?: string | null;
          is_removed?: boolean | null;
          pass_id?: string;
          platform?: string;
          removed_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pass_installations_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pass_installations_pass_id_fkey';
            columns: ['pass_id'];
            isOneToOne: false;
            referencedRelation: 'passes';
            referencedColumns: ['id'];
          },
        ];
      };
      passes: {
        Row: {
          apple_pass_id: string | null;
          background_color: string | null;
          business_id: string;
          created_at: string | null;
          description: string | null;
          foreground_color: string | null;
          google_pass_id: string | null;
          id: string;
          is_published: boolean | null;
          pass_type: string;
          program_id: string | null;
          published_at: string | null;
          qr_code_url: string | null;
          updated_at: string | null;
        };
        Insert: {
          apple_pass_id?: string | null;
          background_color?: string | null;
          business_id: string;
          created_at?: string | null;
          description?: string | null;
          foreground_color?: string | null;
          google_pass_id?: string | null;
          id?: string;
          is_published?: boolean | null;
          pass_type?: string;
          program_id?: string | null;
          published_at?: string | null;
          qr_code_url?: string | null;
          updated_at?: string | null;
        };
        Update: {
          apple_pass_id?: string | null;
          background_color?: string | null;
          business_id?: string;
          created_at?: string | null;
          description?: string | null;
          foreground_color?: string | null;
          google_pass_id?: string | null;
          id?: string;
          is_published?: boolean | null;
          pass_type?: string;
          program_id?: string | null;
          published_at?: string | null;
          qr_code_url?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'passes_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'passes_program_id_fkey';
            columns: ['program_id'];
            isOneToOne: false;
            referencedRelation: 'loyalty_programs';
            referencedColumns: ['id'];
          },
        ];
      };
      redemptions: {
        Row: {
          business_id: string;
          created_at: string | null;
          employee_id: string | null;
          id: string;
          installation_id: string;
          is_valid: boolean | null;
          redeemed_at: string | null;
          rejection_reason: string | null;
          stamp_count_at_redemption: number;
        };
        Insert: {
          business_id: string;
          created_at?: string | null;
          employee_id?: string | null;
          id?: string;
          installation_id: string;
          is_valid?: boolean | null;
          redeemed_at?: string | null;
          rejection_reason?: string | null;
          stamp_count_at_redemption: number;
        };
        Update: {
          business_id?: string;
          created_at?: string | null;
          employee_id?: string | null;
          id?: string;
          installation_id?: string;
          is_valid?: boolean | null;
          redeemed_at?: string | null;
          rejection_reason?: string | null;
          stamp_count_at_redemption?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'redemptions_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'redemptions_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'redemptions_installation_id_fkey';
            columns: ['installation_id'];
            isOneToOne: false;
            referencedRelation: 'pass_installations';
            referencedColumns: ['id'];
          },
        ];
      };
      stamp_transactions: {
        Row: {
          business_id: string;
          created_at: string | null;
          employee_id: string | null;
          fraud_check_data: Json | null;
          id: string;
          installation_id: string;
          is_valid: boolean | null;
          stamp_count: number;
          stamp_goal: number;
        };
        Insert: {
          business_id: string;
          created_at?: string | null;
          employee_id?: string | null;
          fraud_check_data?: Json | null;
          id?: string;
          installation_id: string;
          is_valid?: boolean | null;
          stamp_count: number;
          stamp_goal: number;
        };
        Update: {
          business_id?: string;
          created_at?: string | null;
          employee_id?: string | null;
          fraud_check_data?: Json | null;
          id?: string;
          installation_id?: string;
          is_valid?: boolean | null;
          stamp_count?: number;
          stamp_goal?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'stamp_transactions_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stamp_transactions_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stamp_transactions_installation_id_fkey';
            columns: ['installation_id'];
            isOneToOne: false;
            referencedRelation: 'pass_installations';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
