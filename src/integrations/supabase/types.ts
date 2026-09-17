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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      comprovantes: {
        Row: {
          corrida_id: string
          enviado_em: string
          id: string
          imagem_url: string | null
          observacao: string | null
        }
        Insert: {
          corrida_id: string
          enviado_em?: string
          id?: string
          imagem_url?: string | null
          observacao?: string | null
        }
        Update: {
          corrida_id?: string
          enviado_em?: string
          id?: string
          imagem_url?: string | null
          observacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comprovantes_corrida_id_fkey"
            columns: ["corrida_id"]
            isOneToOne: false
            referencedRelation: "corridas"
            referencedColumns: ["id"]
          },
        ]
      }
      corridas: {
        Row: {
          aceita_em: string | null
          ausencia: boolean
          created_at: string
          decisao_estabelecimento: string | null
          destino_endereco: string
          destino_lat: number | null
          destino_lng: number | null
          finalizada_em: string | null
          forma_pagamento: string
          id: string
          iniciada_em: string | null
          motoboy_id: string | null
          novo_destino_endereco: string | null
          observacoes: string | null
          origem_endereco: string
          origem_lat: number | null
          origem_lng: number | null
          solicitante_id: string | null
          solicitante_nome: string
          status: string
          taxa_retorno: number
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          aceita_em?: string | null
          ausencia?: boolean
          created_at?: string
          decisao_estabelecimento?: string | null
          destino_endereco: string
          destino_lat?: number | null
          destino_lng?: number | null
          finalizada_em?: string | null
          forma_pagamento?: string
          id?: string
          iniciada_em?: string | null
          motoboy_id?: string | null
          novo_destino_endereco?: string | null
          observacoes?: string | null
          origem_endereco: string
          origem_lat?: number | null
          origem_lng?: number | null
          solicitante_id?: string | null
          solicitante_nome?: string
          status?: string
          taxa_retorno?: number
          tipo: string
          updated_at?: string
          valor?: number
        }
        Update: {
          aceita_em?: string | null
          ausencia?: boolean
          created_at?: string
          decisao_estabelecimento?: string | null
          destino_endereco?: string
          destino_lat?: number | null
          destino_lng?: number | null
          finalizada_em?: string | null
          forma_pagamento?: string
          id?: string
          iniciada_em?: string | null
          motoboy_id?: string | null
          novo_destino_endereco?: string | null
          observacoes?: string | null
          origem_endereco?: string
          origem_lat?: number | null
          origem_lng?: number | null
          solicitante_id?: string | null
          solicitante_nome?: string
          status?: string
          taxa_retorno?: number
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "corridas_motoboy_id_fkey"
            columns: ["motoboy_id"]
            isOneToOne: false
            referencedRelation: "motoboys"
            referencedColumns: ["id"]
          },
        ]
      }
      motoboys: {
        Row: {
          created_at: string
          email: string
          id: string
          lat: number | null
          lng: number | null
          localizacao_atualizada_em: string | null
          moto_modelo: string
          moto_placa: string
          nome: string
          online: boolean
          pix_key: string
          telefone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string
          id: string
          lat?: number | null
          lng?: number | null
          localizacao_atualizada_em?: string | null
          moto_modelo?: string
          moto_placa?: string
          nome: string
          online?: boolean
          pix_key?: string
          telefone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          lat?: number | null
          lng?: number | null
          localizacao_atualizada_em?: string | null
          moto_modelo?: string
          moto_placa?: string
          nome?: string
          online?: boolean
          pix_key?: string
          telefone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aceitar_corrida: {
        Args: { p_corrida_id: string }
        Returns: {
          aceita_em: string | null
          ausencia: boolean
          created_at: string
          decisao_estabelecimento: string | null
          destino_endereco: string
          destino_lat: number | null
          destino_lng: number | null
          finalizada_em: string | null
          forma_pagamento: string
          id: string
          iniciada_em: string | null
          motoboy_id: string | null
          novo_destino_endereco: string | null
          observacoes: string | null
          origem_endereco: string
          origem_lat: number | null
          origem_lng: number | null
          solicitante_id: string | null
          solicitante_nome: string
          status: string
          taxa_retorno: number
          tipo: string
          updated_at: string
          valor: number
        }
        SetofOptions: {
          from: "*"
          to: "corridas"
          isOneToOne: true
          isSetofReturn: false
        }
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
