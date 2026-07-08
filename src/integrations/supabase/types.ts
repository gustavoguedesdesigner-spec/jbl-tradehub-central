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
      arquivos: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          mime_type: string | null
          nome: string
          storage_path: string
          tamanho_bytes: number | null
          updated_at: string
          url_publica: string | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          mime_type?: string | null
          nome: string
          storage_path: string
          tamanho_bytes?: number | null
          updated_at?: string
          url_publica?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          mime_type?: string | null
          nome?: string
          storage_path?: string
          tamanho_bytes?: number | null
          updated_at?: string
          url_publica?: string | null
        }
        Relationships: []
      }
      arquivos_vinculos: {
        Row: {
          arquivo_id: string
          created_at: string
          entidade_id: string
          entidade_tipo: string
          id: string
        }
        Insert: {
          arquivo_id: string
          created_at?: string
          entidade_id: string
          entidade_tipo: string
          id?: string
        }
        Update: {
          arquivo_id?: string
          created_at?: string
          entidade_id?: string
          entidade_tipo?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arquivos_vinculos_arquivo_id_fkey"
            columns: ["arquivo_id"]
            isOneToOne: false
            referencedRelation: "arquivos"
            referencedColumns: ["id"]
          },
        ]
      }
      briefings: {
        Row: {
          aprovado_em: string | null
          aprovado_por_id: string | null
          autor_id: string | null
          conteudo: Json
          created_at: string
          id: string
          lancamento_id: string
          mensagem_chave: string | null
          objetivo: string | null
          publico_alvo: string | null
          status: Database["public"]["Enums"]["briefing_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por_id?: string | null
          autor_id?: string | null
          conteudo?: Json
          created_at?: string
          id?: string
          lancamento_id: string
          mensagem_chave?: string | null
          objetivo?: string | null
          publico_alvo?: string | null
          status?: Database["public"]["Enums"]["briefing_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por_id?: string | null
          autor_id?: string | null
          conteudo?: Json
          created_at?: string
          id?: string
          lancamento_id?: string
          mensagem_chave?: string | null
          objetivo?: string | null
          publico_alvo?: string | null
          status?: Database["public"]["Enums"]["briefing_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "briefings_aprovado_por_id_fkey"
            columns: ["aprovado_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "briefings_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "briefings_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: true
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      campanhas: {
        Row: {
          codigo: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          id: string
          nome: string
          responsavel_id: string | null
          status: Database["public"]["Enums"]["campanha_status"]
          updated_at: string
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          nome: string
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["campanha_status"]
          updated_at?: string
        }
        Update: {
          codigo?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["campanha_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanhas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      comentarios: {
        Row: {
          autor_id: string | null
          corpo: string
          created_at: string
          entidade_id: string
          entidade_tipo: string
          id: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          autor_id?: string | null
          corpo: string
          created_at?: string
          entidade_id: string
          entidade_tipo: string
          id?: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          autor_id?: string | null
          corpo?: string
          created_at?: string
          entidade_id?: string
          entidade_tipo?: string
          id?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comentarios"
            referencedColumns: ["id"]
          },
        ]
      }
      compatibilidades: {
        Row: {
          created_at: string
          id: string
          material_id: string
          observacao: string | null
          produto_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          observacao?: string | null
          produto_id: string
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          observacao?: string | null
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compatibilidades_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais_pdv"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compatibilidades_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      familias: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          cnpj: string | null
          contato_email: string | null
          contato_nome: string | null
          contato_telefone: string | null
          created_at: string
          id: string
          nome: string
          observacoes: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string
          id?: string
          nome: string
          observacoes?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string
          id?: string
          nome?: string
          observacoes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      historico: {
        Row: {
          acao: string
          autor_id: string | null
          created_at: string
          dados_antes: Json | null
          dados_depois: Json | null
          entidade_id: string
          entidade_tipo: string
          id: string
        }
        Insert: {
          acao: string
          autor_id?: string | null
          created_at?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          entidade_id: string
          entidade_tipo: string
          id?: string
        }
        Update: {
          acao?: string
          autor_id?: string | null
          created_at?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          entidade_id?: string
          entidade_tipo?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos: {
        Row: {
          campanha_id: string | null
          codigo: string | null
          created_at: string
          data_lancamento: string | null
          data_prevista: string | null
          descricao: string | null
          id: string
          nome: string
          prioridade: number
          responsavel_id: string | null
          status: Database["public"]["Enums"]["lancamento_status"]
          updated_at: string
        }
        Insert: {
          campanha_id?: string | null
          codigo?: string | null
          created_at?: string
          data_lancamento?: string | null
          data_prevista?: string | null
          descricao?: string | null
          id?: string
          nome: string
          prioridade?: number
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["lancamento_status"]
          updated_at?: string
        }
        Update: {
          campanha_id?: string | null
          codigo?: string | null
          created_at?: string
          data_lancamento?: string | null
          data_prevista?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          prioridade?: number
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["lancamento_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos_materiais: {
        Row: {
          created_at: string
          id: string
          lancamento_id: string
          material_id: string
          observacao: string | null
          quantidade: number
        }
        Insert: {
          created_at?: string
          id?: string
          lancamento_id: string
          material_id: string
          observacao?: string | null
          quantidade?: number
        }
        Update: {
          created_at?: string
          id?: string
          lancamento_id?: string
          material_id?: string
          observacao?: string | null
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_materiais_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_materiais_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais_pdv"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos_produtos: {
        Row: {
          created_at: string
          id: string
          lancamento_id: string
          produto_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lancamento_id: string
          produto_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lancamento_id?: string
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_produtos_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      linhas: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      materiais_pdv: {
        Row: {
          codigo: string
          created_at: string
          descricao: string | null
          dimensoes: string | null
          fornecedor_id: string | null
          id: string
          nome: string
          tipo: string | null
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          descricao?: string | null
          dimensoes?: string | null
          fornecedor_id?: string | null
          id?: string
          nome: string
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          descricao?: string | null
          dimensoes?: string | null
          fornecedor_id?: string | null
          id?: string
          nome?: string
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materiais_pdv_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          categoria_id: string | null
          created_at: string
          descricao: string | null
          ean: string | null
          familia_id: string | null
          id: string
          linha_id: string | null
          nome: string
          preco_sugerido: number | null
          sku: string
          status: Database["public"]["Enums"]["produto_status"]
          updated_at: string
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string
          descricao?: string | null
          ean?: string | null
          familia_id?: string | null
          id?: string
          linha_id?: string | null
          nome: string
          preco_sugerido?: number | null
          sku: string
          status?: Database["public"]["Enums"]["produto_status"]
          updated_at?: string
        }
        Update: {
          categoria_id?: string | null
          created_at?: string
          descricao?: string | null
          ean?: string | null
          familia_id?: string | null
          id?: string
          linha_id?: string | null
          nome?: string
          preco_sugerido?: number | null
          sku?: string
          status?: Database["public"]["Enums"]["produto_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_familia_id_fkey"
            columns: ["familia_id"]
            isOneToOne: false
            referencedRelation: "familias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_linha_id_fkey"
            columns: ["linha_id"]
            isOneToOne: false
            referencedRelation: "linhas"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_imagens: {
        Row: {
          created_at: string
          id: string
          ordem: number
          principal: boolean
          produto_id: string
          storage_path: string
          url_publica: string
        }
        Insert: {
          created_at?: string
          id?: string
          ordem?: number
          principal?: boolean
          produto_id: string
          storage_path: string
          url_publica: string
        }
        Update: {
          created_at?: string
          id?: string
          ordem?: number
          principal?: boolean
          produto_id?: string
          storage_path?: string
          url_publica?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_imagens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          cargo: string | null
          created_at: string
          email: string | null
          id: string
          nome: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          email?: string | null
          id: string
          nome?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          updated_at?: string
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
      briefing_status: "rascunho" | "em_revisao" | "aprovado" | "arquivado"
      campanha_status: "planejada" | "em_andamento" | "concluida" | "cancelada"
      lancamento_status: "planejado" | "em_andamento" | "lancado" | "cancelado"
      produto_status: "ativo" | "inativo" | "descontinuado" | "lancamento"
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
      briefing_status: ["rascunho", "em_revisao", "aprovado", "arquivado"],
      campanha_status: ["planejada", "em_andamento", "concluida", "cancelada"],
      lancamento_status: ["planejado", "em_andamento", "lancado", "cancelado"],
      produto_status: ["ativo", "inativo", "descontinuado", "lancamento"],
    },
  },
} as const
