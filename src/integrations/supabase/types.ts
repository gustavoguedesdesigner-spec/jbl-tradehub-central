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
      asset_comentarios: {
        Row: {
          asset_id: string
          autor: string | null
          corpo: string
          created_at: string
          id: string
        }
        Insert: {
          asset_id: string
          autor?: string | null
          corpo: string
          created_at?: string
          id?: string
        }
        Update: {
          asset_id?: string
          autor?: string | null
          corpo?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_comentarios_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_pastas: {
        Row: {
          cor: string | null
          created_at: string
          icone: string | null
          id: string
          nome: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          icone?: string | null
          id?: string
          nome: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          icone?: string | null
          id?: string
          nome?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_pastas_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "asset_pastas"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_vinculos: {
        Row: {
          asset_id: string
          created_at: string
          entidade_id: string
          entidade_tipo: Database["public"]["Enums"]["asset_entidade"]
          id: string
          ordem: number
          papel: string | null
        }
        Insert: {
          asset_id: string
          created_at?: string
          entidade_id: string
          entidade_tipo: Database["public"]["Enums"]["asset_entidade"]
          id?: string
          ordem?: number
          papel?: string | null
        }
        Update: {
          asset_id?: string
          created_at?: string
          entidade_id?: string
          entidade_tipo?: Database["public"]["Enums"]["asset_entidade"]
          id?: string
          ordem?: number
          papel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_vinculos_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          altura: number | null
          autor: string | null
          categoria: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          downloads: number
          duracao_segundos: number | null
          formato: string | null
          id: string
          largura: number | null
          metadata: Json
          nome: string
          pasta_id: string | null
          peso_bytes: number | null
          preview_path: string | null
          status: Database["public"]["Enums"]["asset_status"]
          storage_path: string
          tags: string[]
          thumbnail_path: string | null
          tipo: Database["public"]["Enums"]["asset_tipo"]
          updated_at: string
          versao: string | null
        }
        Insert: {
          altura?: number | null
          autor?: string | null
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          downloads?: number
          duracao_segundos?: number | null
          formato?: string | null
          id?: string
          largura?: number | null
          metadata?: Json
          nome: string
          pasta_id?: string | null
          peso_bytes?: number | null
          preview_path?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          storage_path: string
          tags?: string[]
          thumbnail_path?: string | null
          tipo?: Database["public"]["Enums"]["asset_tipo"]
          updated_at?: string
          versao?: string | null
        }
        Update: {
          altura?: number | null
          autor?: string | null
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          downloads?: number
          duracao_segundos?: number | null
          formato?: string | null
          id?: string
          largura?: number | null
          metadata?: Json
          nome?: string
          pasta_id?: string | null
          peso_bytes?: number | null
          preview_path?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          storage_path?: string
          tags?: string[]
          thumbnail_path?: string | null
          tipo?: Database["public"]["Enums"]["asset_tipo"]
          updated_at?: string
          versao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_pasta_id_fkey"
            columns: ["pasta_id"]
            isOneToOne: false
            referencedRelation: "asset_pastas"
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
      import_batches: {
        Row: {
          created_at: string
          criados_assets: number
          criados_materiais: number
          criados_produtos: number
          duplicados: number
          id: string
          ignorados: number
          metadata: Json
          nome: string
          origem: string | null
          relacionamentos: number
          status: string
          tempo_ms: number | null
          total_3d: number
          total_adobe: number
          total_arquivos: number
          total_desconhecidos: number
          total_excel: number
          total_imagens: number
          total_pdf: number
          total_powerpoint: number
          total_videos: number
          updated_at: string
          usuario: string | null
        }
        Insert: {
          created_at?: string
          criados_assets?: number
          criados_materiais?: number
          criados_produtos?: number
          duplicados?: number
          id?: string
          ignorados?: number
          metadata?: Json
          nome?: string
          origem?: string | null
          relacionamentos?: number
          status?: string
          tempo_ms?: number | null
          total_3d?: number
          total_adobe?: number
          total_arquivos?: number
          total_desconhecidos?: number
          total_excel?: number
          total_imagens?: number
          total_pdf?: number
          total_powerpoint?: number
          total_videos?: number
          updated_at?: string
          usuario?: string | null
        }
        Update: {
          created_at?: string
          criados_assets?: number
          criados_materiais?: number
          criados_produtos?: number
          duplicados?: number
          id?: string
          ignorados?: number
          metadata?: Json
          nome?: string
          origem?: string | null
          relacionamentos?: number
          status?: string
          tempo_ms?: number | null
          total_3d?: number
          total_adobe?: number
          total_arquivos?: number
          total_desconhecidos?: number
          total_excel?: number
          total_imagens?: number
          total_pdf?: number
          total_powerpoint?: number
          total_videos?: number
          updated_at?: string
          usuario?: string | null
        }
        Relationships: []
      }
      import_items: {
        Row: {
          asset_id: string | null
          batch_id: string
          caminho_original: string | null
          categoria_sugerida: string | null
          created_at: string
          destino: string | null
          erro: string | null
          familia_sugerida: string | null
          id: string
          material_id: string | null
          material_sugerido: string | null
          metadata: Json
          mime: string | null
          nome_arquivo: string
          pasta: string | null
          produto_id: string | null
          produto_sugerido: string | null
          status: string
          storage_path: string | null
          tamanho: number | null
          tipo_detectado: string | null
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          batch_id: string
          caminho_original?: string | null
          categoria_sugerida?: string | null
          created_at?: string
          destino?: string | null
          erro?: string | null
          familia_sugerida?: string | null
          id?: string
          material_id?: string | null
          material_sugerido?: string | null
          metadata?: Json
          mime?: string | null
          nome_arquivo: string
          pasta?: string | null
          produto_id?: string | null
          produto_sugerido?: string | null
          status?: string
          storage_path?: string | null
          tamanho?: number | null
          tipo_detectado?: string | null
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          batch_id?: string
          caminho_original?: string | null
          categoria_sugerida?: string | null
          created_at?: string
          destino?: string | null
          erro?: string | null
          familia_sugerida?: string | null
          id?: string
          material_id?: string | null
          material_sugerido?: string | null
          metadata?: Json
          mime?: string | null
          nome_arquivo?: string
          pasta?: string | null
          produto_id?: string | null
          produto_sugerido?: string | null
          status?: string
          storage_path?: string | null
          tamanho?: number | null
          tipo_detectado?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos: {
        Row: {
          aprovacao_nota: string | null
          aprovacao_status: string
          campanha_id: string | null
          codigo: string | null
          created_at: string
          data_lancamento: string | null
          data_prevista: string | null
          descricao: string | null
          id: string
          implantacao_nota: string | null
          implantacao_status: string
          nome: string
          pdv_ready: boolean
          prioridade: number
          producao_nota: string | null
          producao_status: string
          responsavel_id: string | null
          status: Database["public"]["Enums"]["lancamento_status"]
          updated_at: string
        }
        Insert: {
          aprovacao_nota?: string | null
          aprovacao_status?: string
          campanha_id?: string | null
          codigo?: string | null
          created_at?: string
          data_lancamento?: string | null
          data_prevista?: string | null
          descricao?: string | null
          id?: string
          implantacao_nota?: string | null
          implantacao_status?: string
          nome: string
          pdv_ready?: boolean
          prioridade?: number
          producao_nota?: string | null
          producao_status?: string
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["lancamento_status"]
          updated_at?: string
        }
        Update: {
          aprovacao_nota?: string | null
          aprovacao_status?: string
          campanha_id?: string | null
          codigo?: string | null
          created_at?: string
          data_lancamento?: string | null
          data_prevista?: string | null
          descricao?: string | null
          id?: string
          implantacao_nota?: string | null
          implantacao_status?: string
          nome?: string
          pdv_ready?: boolean
          prioridade?: number
          producao_nota?: string | null
          producao_status?: string
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
      lancamentos_checklist: {
        Row: {
          categoria: string
          created_at: string
          feito: boolean
          id: string
          lancamento_id: string
          ordem: number
          titulo: string
          updated_at: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          feito?: boolean
          id?: string
          lancamento_id: string
          ordem?: number
          titulo: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          feito?: boolean
          id?: string
          lancamento_id?: string
          ordem?: number
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_checklist_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos_materiais: {
        Row: {
          acao: string
          briefing: string | null
          categoria: string
          created_at: string
          fornecedor_id: string | null
          id: string
          lancamento_id: string
          material_id: string
          observacao: string | null
          origem: string
          prazo: string | null
          quantidade: number
          responsavel_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          acao?: string
          briefing?: string | null
          categoria?: string
          created_at?: string
          fornecedor_id?: string | null
          id?: string
          lancamento_id: string
          material_id: string
          observacao?: string | null
          origem?: string
          prazo?: string | null
          quantidade?: number
          responsavel_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          acao?: string
          briefing?: string | null
          categoria?: string
          created_at?: string
          fornecedor_id?: string | null
          id?: string
          lancamento_id?: string
          material_id?: string
          observacao?: string | null
          origem?: string
          prazo?: string | null
          quantidade?: number
          responsavel_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_materiais_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "lancamentos_materiais_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      materiais_documentos: {
        Row: {
          asset_id: string | null
          bucket: string | null
          categoria: string | null
          created_at: string
          descricao: string | null
          id: string
          material_id: string
          mime_type: string | null
          nome: string
          ordem: number
          storage_path: string
          tamanho_bytes: number | null
          updated_at: string
          versao: string | null
        }
        Insert: {
          asset_id?: string | null
          bucket?: string | null
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          material_id: string
          mime_type?: string | null
          nome: string
          ordem?: number
          storage_path: string
          tamanho_bytes?: number | null
          updated_at?: string
          versao?: string | null
        }
        Update: {
          asset_id?: string | null
          bucket?: string | null
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          material_id?: string
          mime_type?: string | null
          nome?: string
          ordem?: number
          storage_path?: string
          tamanho_bytes?: number | null
          updated_at?: string
          versao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materiais_documentos_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materiais_documentos_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais_pdv"
            referencedColumns: ["id"]
          },
        ]
      }
      materiais_especiais: {
        Row: {
          briefing: string | null
          created_at: string
          created_by: string | null
          croqui_path: string | null
          fornecedor_id: string | null
          fornecedor_sugerido: string | null
          homologado_material_id: string | null
          id: string
          imagem_referencia_path: string | null
          lancamento_id: string
          nome: string
          objetivo: string | null
          observacoes: string | null
          status: string
          updated_at: string
          valor_estimado: number | null
        }
        Insert: {
          briefing?: string | null
          created_at?: string
          created_by?: string | null
          croqui_path?: string | null
          fornecedor_id?: string | null
          fornecedor_sugerido?: string | null
          homologado_material_id?: string | null
          id?: string
          imagem_referencia_path?: string | null
          lancamento_id: string
          nome: string
          objetivo?: string | null
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor_estimado?: number | null
        }
        Update: {
          briefing?: string | null
          created_at?: string
          created_by?: string | null
          croqui_path?: string | null
          fornecedor_id?: string | null
          fornecedor_sugerido?: string | null
          homologado_material_id?: string | null
          id?: string
          imagem_referencia_path?: string | null
          lancamento_id?: string
          nome?: string
          objetivo?: string | null
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "materiais_especiais_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materiais_especiais_homologado_material_id_fkey"
            columns: ["homologado_material_id"]
            isOneToOne: false
            referencedRelation: "materiais_pdv"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materiais_especiais_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      materiais_imagens: {
        Row: {
          asset_id: string | null
          bucket: string | null
          created_at: string
          id: string
          legenda: string | null
          material_id: string
          ordem: number
          principal: boolean
          storage_path: string
          tipo: string
          updated_at: string
          url_publica: string | null
        }
        Insert: {
          asset_id?: string | null
          bucket?: string | null
          created_at?: string
          id?: string
          legenda?: string | null
          material_id: string
          ordem?: number
          principal?: boolean
          storage_path: string
          tipo?: string
          updated_at?: string
          url_publica?: string | null
        }
        Update: {
          asset_id?: string | null
          bucket?: string | null
          created_at?: string
          id?: string
          legenda?: string | null
          material_id?: string
          ordem?: number
          principal?: boolean
          storage_path?: string
          tipo?: string
          updated_at?: string
          url_publica?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materiais_imagens_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materiais_imagens_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais_pdv"
            referencedColumns: ["id"]
          },
        ]
      }
      materiais_pdv: {
        Row: {
          acabamento: string | null
          briefing: string | null
          categoria_id: string | null
          codigo: string
          created_at: string
          descricao: string | null
          dimensoes: string | null
          fornecedor_id: string | null
          id: string
          imagem_principal_url: string | null
          material_construcao: string | null
          nome: string
          observacoes: string | null
          peso: string | null
          prazo_producao: string | null
          quantidade_minima: number | null
          status: Database["public"]["Enums"]["material_status"]
          tipo: string | null
          tipo_impressao: string | null
          updated_at: string
          valor_estimado: number | null
        }
        Insert: {
          acabamento?: string | null
          briefing?: string | null
          categoria_id?: string | null
          codigo: string
          created_at?: string
          descricao?: string | null
          dimensoes?: string | null
          fornecedor_id?: string | null
          id?: string
          imagem_principal_url?: string | null
          material_construcao?: string | null
          nome: string
          observacoes?: string | null
          peso?: string | null
          prazo_producao?: string | null
          quantidade_minima?: number | null
          status?: Database["public"]["Enums"]["material_status"]
          tipo?: string | null
          tipo_impressao?: string | null
          updated_at?: string
          valor_estimado?: number | null
        }
        Update: {
          acabamento?: string | null
          briefing?: string | null
          categoria_id?: string | null
          codigo?: string
          created_at?: string
          descricao?: string | null
          dimensoes?: string | null
          fornecedor_id?: string | null
          id?: string
          imagem_principal_url?: string | null
          material_construcao?: string | null
          nome?: string
          observacoes?: string | null
          peso?: string | null
          prazo_producao?: string | null
          quantidade_minima?: number | null
          status?: Database["public"]["Enums"]["material_status"]
          tipo?: string | null
          tipo_impressao?: string | null
          updated_at?: string
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "materiais_pdv_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
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
          campanha_tamanho:
            | Database["public"]["Enums"]["campanha_tamanho"]
            | null
          categoria_id: string | null
          codigo_jbl: string | null
          created_at: string
          data_lancamento: string | null
          descricao: string | null
          descricao_curta: string | null
          diferenciais: string | null
          ean: string | null
          familia_id: string | null
          features: string[]
          hero_product: boolean
          id: string
          linha_id: string | null
          marca: string | null
          nome: string
          observacoes: string | null
          posicionamento:
            | Database["public"]["Enums"]["produto_posicionamento"]
            | null
          preco_sugerido: number | null
          sku: string
          status: Database["public"]["Enums"]["produto_status"]
          updated_at: string
          url_origem: string | null
        }
        Insert: {
          campanha_tamanho?:
            | Database["public"]["Enums"]["campanha_tamanho"]
            | null
          categoria_id?: string | null
          codigo_jbl?: string | null
          created_at?: string
          data_lancamento?: string | null
          descricao?: string | null
          descricao_curta?: string | null
          diferenciais?: string | null
          ean?: string | null
          familia_id?: string | null
          features?: string[]
          hero_product?: boolean
          id?: string
          linha_id?: string | null
          marca?: string | null
          nome: string
          observacoes?: string | null
          posicionamento?:
            | Database["public"]["Enums"]["produto_posicionamento"]
            | null
          preco_sugerido?: number | null
          sku: string
          status?: Database["public"]["Enums"]["produto_status"]
          updated_at?: string
          url_origem?: string | null
        }
        Update: {
          campanha_tamanho?:
            | Database["public"]["Enums"]["campanha_tamanho"]
            | null
          categoria_id?: string | null
          codigo_jbl?: string | null
          created_at?: string
          data_lancamento?: string | null
          descricao?: string | null
          descricao_curta?: string | null
          diferenciais?: string | null
          ean?: string | null
          familia_id?: string | null
          features?: string[]
          hero_product?: boolean
          id?: string
          linha_id?: string | null
          marca?: string | null
          nome?: string
          observacoes?: string | null
          posicionamento?:
            | Database["public"]["Enums"]["produto_posicionamento"]
            | null
          preco_sugerido?: number | null
          sku?: string
          status?: Database["public"]["Enums"]["produto_status"]
          updated_at?: string
          url_origem?: string | null
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
      produtos_documentos: {
        Row: {
          asset_id: string | null
          autor: string | null
          bucket: string | null
          categoria: string | null
          created_at: string
          data_documento: string | null
          descricao: string | null
          guideline: boolean
          id: string
          mime_type: string | null
          nome: string
          produto_id: string
          storage_path: string
          tamanho_bytes: number | null
          versao: string | null
        }
        Insert: {
          asset_id?: string | null
          autor?: string | null
          bucket?: string | null
          categoria?: string | null
          created_at?: string
          data_documento?: string | null
          descricao?: string | null
          guideline?: boolean
          id?: string
          mime_type?: string | null
          nome: string
          produto_id: string
          storage_path: string
          tamanho_bytes?: number | null
          versao?: string | null
        }
        Update: {
          asset_id?: string | null
          autor?: string | null
          bucket?: string | null
          categoria?: string | null
          created_at?: string
          data_documento?: string | null
          descricao?: string | null
          guideline?: boolean
          id?: string
          mime_type?: string | null
          nome?: string
          produto_id?: string
          storage_path?: string
          tamanho_bytes?: number | null
          versao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_documentos_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_documentos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_imagens: {
        Row: {
          asset_id: string | null
          bucket: string | null
          created_at: string
          id: string
          legenda: string | null
          ordem: number
          principal: boolean
          produto_id: string
          storage_path: string
          tipo: string | null
          url_origem: string | null
          url_publica: string
        }
        Insert: {
          asset_id?: string | null
          bucket?: string | null
          created_at?: string
          id?: string
          legenda?: string | null
          ordem?: number
          principal?: boolean
          produto_id: string
          storage_path: string
          tipo?: string | null
          url_origem?: string | null
          url_publica: string
        }
        Update: {
          asset_id?: string | null
          bucket?: string | null
          created_at?: string
          id?: string
          legenda?: string | null
          ordem?: number
          principal?: boolean
          produto_id?: string
          storage_path?: string
          tipo?: string | null
          url_origem?: string | null
          url_publica?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_imagens_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_imagens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_videos: {
        Row: {
          asset_id: string | null
          bucket: string | null
          created_at: string
          id: string
          ordem: number
          origem: string
          produto_id: string
          storage_path: string | null
          titulo: string | null
          url: string | null
        }
        Insert: {
          asset_id?: string | null
          bucket?: string | null
          created_at?: string
          id?: string
          ordem?: number
          origem: string
          produto_id: string
          storage_path?: string | null
          titulo?: string | null
          url?: string | null
        }
        Update: {
          asset_id?: string | null
          bucket?: string | null
          created_at?: string
          id?: string
          ordem?: number
          origem?: string
          produto_id?: string
          storage_path?: string | null
          titulo?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_videos_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_videos_produto_id_fkey"
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
    }
    Views: {
      biblioteca_auditoria_legado: {
        Row: {
          bucket_origem: string | null
          legado: number | null
          migrado: number | null
          tipo: string | null
          total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_write: { Args: never; Returns: boolean }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "editor" | "viewer"
      asset_entidade:
        | "produto"
        | "material"
        | "lancamento"
        | "campanha"
        | "guideline"
        | "categoria"
        | "familia"
        | "fornecedor"
      asset_status: "rascunho" | "ativo" | "arquivado" | "obsoleto"
      asset_tipo:
        | "imagem"
        | "video"
        | "pdf"
        | "brand_book"
        | "guideline"
        | "powerpoint"
        | "excel"
        | "word"
        | "ai"
        | "psd"
        | "indd"
        | "eps"
        | "stl"
        | "obj"
        | "zip"
        | "foto_loja"
        | "foto_pdv"
        | "mockup"
        | "render"
        | "outro"
      briefing_status: "rascunho" | "em_revisao" | "aprovado" | "arquivado"
      campanha_status: "planejada" | "em_andamento" | "concluida" | "cancelada"
      campanha_tamanho: "P" | "M" | "G"
      lancamento_status: "planejado" | "em_andamento" | "lancado" | "cancelado"
      material_status:
        | "rascunho"
        | "em_desenvolvimento"
        | "ativo"
        | "descontinuado"
      produto_posicionamento: "entrada" | "intermediario" | "premium" | "hero"
      produto_status:
        | "ativo"
        | "inativo"
        | "descontinuado"
        | "lancamento"
        | "em_desenvolvimento"
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
      app_role: ["admin", "editor", "viewer"],
      asset_entidade: [
        "produto",
        "material",
        "lancamento",
        "campanha",
        "guideline",
        "categoria",
        "familia",
        "fornecedor",
      ],
      asset_status: ["rascunho", "ativo", "arquivado", "obsoleto"],
      asset_tipo: [
        "imagem",
        "video",
        "pdf",
        "brand_book",
        "guideline",
        "powerpoint",
        "excel",
        "word",
        "ai",
        "psd",
        "indd",
        "eps",
        "stl",
        "obj",
        "zip",
        "foto_loja",
        "foto_pdv",
        "mockup",
        "render",
        "outro",
      ],
      briefing_status: ["rascunho", "em_revisao", "aprovado", "arquivado"],
      campanha_status: ["planejada", "em_andamento", "concluida", "cancelada"],
      campanha_tamanho: ["P", "M", "G"],
      lancamento_status: ["planejado", "em_andamento", "lancado", "cancelado"],
      material_status: [
        "rascunho",
        "em_desenvolvimento",
        "ativo",
        "descontinuado",
      ],
      produto_posicionamento: ["entrada", "intermediario", "premium", "hero"],
      produto_status: [
        "ativo",
        "inativo",
        "descontinuado",
        "lancamento",
        "em_desenvolvimento",
      ],
    },
  },
} as const
