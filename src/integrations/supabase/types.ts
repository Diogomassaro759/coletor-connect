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
      accounting_books: {
        Row: {
          assessment_id: string
          atualizado: boolean
          created_at: string
          id: string
          implantado: boolean
          nao_possui: boolean
          nao_sabe: boolean
          observacao: string | null
          tipo: string
        }
        Insert: {
          assessment_id: string
          atualizado?: boolean
          created_at?: string
          id?: string
          implantado?: boolean
          nao_possui?: boolean
          nao_sabe?: boolean
          observacao?: string | null
          tipo: string
        }
        Update: {
          assessment_id?: string
          atualizado?: boolean
          created_at?: string
          id?: string
          implantado?: boolean
          nao_possui?: boolean
          nao_sabe?: boolean
          observacao?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_books_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "association_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      association_assessments: {
        Row: {
          acidentes_tipo: string | null
          acidentes_ultimo_ano: boolean | null
          alvara_funcionamento: string | null
          ano_ultimo_balanco: number | null
          apoio_instituicoes: boolean | null
          apoio_instituicoes_quais: string | null
          apoio_poder_publico: string | null
          assessoria_juridica: boolean | null
          association_id: string
          ata_registrada_cartorio: string | null
          aumento_trabalho_festividades: boolean | null
          autodeclaracao_racial: string | null
          autonomos: number
          avcb: string | null
          capacitacoes_interesse: string | null
          cargos_por_eleicao: string | null
          classificacao_contabil: string | null
          classificacao_juridica: string | null
          conselho_fiscal: string | null
          consentimento_dados: boolean
          consultant_id: string
          consultant_name: string
          contabilidade_regular: string | null
          contador_email: string | null
          contador_nome: string | null
          contador_telefone: string | null
          contador_tipo: string | null
          contrato_detalhes: string | null
          contrato_instituicoes_privadas: string | null
          contrato_instituicoes_publicas: string | null
          contrato_remunerado: boolean | null
          contrato_sst: string | null
          contrato_sst_responsavel: string | null
          contrato_tipo: string | null
          contribuicao_inss: string | null
          controle_estoque: string | null
          controle_frequencia: string | null
          controle_frequencia_tipo: string | null
          controle_jornada: boolean | null
          cooperativa_fornece_epis: string | null
          coordenacao_gerencia: string | null
          created_at: string
          created_by: string | null
          criancas_adolescentes_dependentes: boolean | null
          data_ultima_eleicao: string | null
          data_visita: string
          declaracao_veracidade: boolean
          destino_venda: string | null
          diretoria_conselho: boolean | null
          diretoria_nomes: string | null
          divisao_resultados_criterio: string | null
          divisao_resultados_procedimento: string | null
          divisao_tarefas: string | null
          divisao_tarefas_gerencia: boolean | null
          documentos_necessarios: string | null
          emite_notas_fiscais: string | null
          empregados_registrados: number
          empregados_sem_registro: number
          equipamentos_outros: string | null
          escolaridade_predominante: string | null
          estatuto_registrado: string | null
          evidence_validated: boolean
          evidencia_administrativo_confirmada: boolean
          evidencia_entrevista_confirmada: boolean
          evidencia_frente_confirmada: boolean
          evidencia_livro_trabalho_confirmada: boolean
          evidencia_reuniao_confirmada: boolean
          extintores: string | null
          faixa_etaria_predominante: string | null
          filiacao_sindical: boolean | null
          filiacao_sindical_qual: string | null
          fluxo_trabalho_diario: string | null
          frequencia_assembleias: string | null
          historico_trabalho_infantil: boolean | null
          homens: number
          horario_visita: string
          id: string
          inscritos_cadunico: string | null
          interesse_capacitacao: boolean | null
          licenca_ambiental_status: string | null
          lista_cooperados_atualizada: string | null
          lista_nao_cooperados_atualizada: string | null
          livro_ficha_trabalho: boolean | null
          livro_ficha_trabalho_qual: string | null
          livro_inspecao_trabalho: boolean | null
          mandato_em_dia: string | null
          materiais_coletados: string[]
          media_horas_trabalhadas: string | null
          media_moradores_casa: number | null
          melhorias_juridicas_necessarias: string | null
          metodo_divisao_descricao: string | null
          metodo_divisao_dinheiro: string | null
          motivos_entrada_reciclagem: string | null
          movimento_qual: string | null
          mulheres: number
          necessita_documentos: boolean | null
          orientacao_documentos_aceita: boolean
          orientacao_regularizacao_aceita: boolean
          pagamento_fixo_mensal: boolean | null
          parcerias_detalhes: string | null
          participa_coleta_seletiva_municipal: boolean | null
          participa_movimentos: boolean | null
          pendencias_contabeis: string | null
          pendencias_juridicas: string | null
          pessoas_trans_detalhes: string | null
          possui_conta_bancaria: string | null
          possui_contador: string | null
          possui_maquineta: string | null
          possui_parcerias: string | null
          possui_pessoas_trans: boolean
          possui_registro_atas: string | null
          possui_veiculos_maquinas: boolean | null
          preconceito_detalhes: string | null
          presidente_email: string | null
          presidente_nome: string | null
          presidente_telefone: string | null
          problemas_juridicos_atuais: string | null
          problemas_melhorias_juridico: string | null
          problemas_saude: string | null
          processed_at: string | null
          processos_judiciais: boolean | null
          processos_judiciais_quais: string | null
          quantidade_beneficiarios: number | null
          quantidade_trabalho_infantil: number | null
          realiza_assembleias: string | null
          realiza_triagem: boolean | null
          recebe_beneficios: boolean | null
          recebeu_apoio_programas: boolean | null
          reconhecimento_sociedade: string | null
          registro_ocb: string | null
          regras_entrada: string | null
          regras_entrada_exclusao: boolean | null
          regras_saida_exclusao: string | null
          regularity_compliant_count: number
          regularity_index: number
          regularity_total_count: number
          relatos_preconceito: boolean | null
          renda_media_cooperado: number | null
          renda_media_mensal: number | null
          representative_name: string | null
          representative_signature: string | null
          signed_at: string | null
          sistema_financeiro: string | null
          sistema_financeiro_qual: string | null
          status: Database["public"]["Enums"]["diagnostic_status"]
          tipo_coleta: string | null
          tipo_galpao: string | null
          todos_sao_cooperados: boolean | null
          updated_at: string
          updated_by: string | null
          uso_epis: string | null
          vice_presidente_email: string | null
          vice_presidente_nome: string | null
          vice_presidente_telefone: string | null
          volumetria_toneladas_mes: number | null
        }
        Insert: {
          acidentes_tipo?: string | null
          acidentes_ultimo_ano?: boolean | null
          alvara_funcionamento?: string | null
          ano_ultimo_balanco?: number | null
          apoio_instituicoes?: boolean | null
          apoio_instituicoes_quais?: string | null
          apoio_poder_publico?: string | null
          assessoria_juridica?: boolean | null
          association_id: string
          ata_registrada_cartorio?: string | null
          aumento_trabalho_festividades?: boolean | null
          autodeclaracao_racial?: string | null
          autonomos?: number
          avcb?: string | null
          capacitacoes_interesse?: string | null
          cargos_por_eleicao?: string | null
          classificacao_contabil?: string | null
          classificacao_juridica?: string | null
          conselho_fiscal?: string | null
          consentimento_dados?: boolean
          consultant_id: string
          consultant_name: string
          contabilidade_regular?: string | null
          contador_email?: string | null
          contador_nome?: string | null
          contador_telefone?: string | null
          contador_tipo?: string | null
          contrato_detalhes?: string | null
          contrato_instituicoes_privadas?: string | null
          contrato_instituicoes_publicas?: string | null
          contrato_remunerado?: boolean | null
          contrato_sst?: string | null
          contrato_sst_responsavel?: string | null
          contrato_tipo?: string | null
          contribuicao_inss?: string | null
          controle_estoque?: string | null
          controle_frequencia?: string | null
          controle_frequencia_tipo?: string | null
          controle_jornada?: boolean | null
          cooperativa_fornece_epis?: string | null
          coordenacao_gerencia?: string | null
          created_at?: string
          created_by?: string | null
          criancas_adolescentes_dependentes?: boolean | null
          data_ultima_eleicao?: string | null
          data_visita: string
          declaracao_veracidade?: boolean
          destino_venda?: string | null
          diretoria_conselho?: boolean | null
          diretoria_nomes?: string | null
          divisao_resultados_criterio?: string | null
          divisao_resultados_procedimento?: string | null
          divisao_tarefas?: string | null
          divisao_tarefas_gerencia?: boolean | null
          documentos_necessarios?: string | null
          emite_notas_fiscais?: string | null
          empregados_registrados?: number
          empregados_sem_registro?: number
          equipamentos_outros?: string | null
          escolaridade_predominante?: string | null
          estatuto_registrado?: string | null
          evidence_validated?: boolean
          evidencia_administrativo_confirmada?: boolean
          evidencia_entrevista_confirmada?: boolean
          evidencia_frente_confirmada?: boolean
          evidencia_livro_trabalho_confirmada?: boolean
          evidencia_reuniao_confirmada?: boolean
          extintores?: string | null
          faixa_etaria_predominante?: string | null
          filiacao_sindical?: boolean | null
          filiacao_sindical_qual?: string | null
          fluxo_trabalho_diario?: string | null
          frequencia_assembleias?: string | null
          historico_trabalho_infantil?: boolean | null
          homens?: number
          horario_visita: string
          id?: string
          inscritos_cadunico?: string | null
          interesse_capacitacao?: boolean | null
          licenca_ambiental_status?: string | null
          lista_cooperados_atualizada?: string | null
          lista_nao_cooperados_atualizada?: string | null
          livro_ficha_trabalho?: boolean | null
          livro_ficha_trabalho_qual?: string | null
          livro_inspecao_trabalho?: boolean | null
          mandato_em_dia?: string | null
          materiais_coletados?: string[]
          media_horas_trabalhadas?: string | null
          media_moradores_casa?: number | null
          melhorias_juridicas_necessarias?: string | null
          metodo_divisao_descricao?: string | null
          metodo_divisao_dinheiro?: string | null
          motivos_entrada_reciclagem?: string | null
          movimento_qual?: string | null
          mulheres?: number
          necessita_documentos?: boolean | null
          orientacao_documentos_aceita?: boolean
          orientacao_regularizacao_aceita?: boolean
          pagamento_fixo_mensal?: boolean | null
          parcerias_detalhes?: string | null
          participa_coleta_seletiva_municipal?: boolean | null
          participa_movimentos?: boolean | null
          pendencias_contabeis?: string | null
          pendencias_juridicas?: string | null
          pessoas_trans_detalhes?: string | null
          possui_conta_bancaria?: string | null
          possui_contador?: string | null
          possui_maquineta?: string | null
          possui_parcerias?: string | null
          possui_pessoas_trans?: boolean
          possui_registro_atas?: string | null
          possui_veiculos_maquinas?: boolean | null
          preconceito_detalhes?: string | null
          presidente_email?: string | null
          presidente_nome?: string | null
          presidente_telefone?: string | null
          problemas_juridicos_atuais?: string | null
          problemas_melhorias_juridico?: string | null
          problemas_saude?: string | null
          processed_at?: string | null
          processos_judiciais?: boolean | null
          processos_judiciais_quais?: string | null
          quantidade_beneficiarios?: number | null
          quantidade_trabalho_infantil?: number | null
          realiza_assembleias?: string | null
          realiza_triagem?: boolean | null
          recebe_beneficios?: boolean | null
          recebeu_apoio_programas?: boolean | null
          reconhecimento_sociedade?: string | null
          registro_ocb?: string | null
          regras_entrada?: string | null
          regras_entrada_exclusao?: boolean | null
          regras_saida_exclusao?: string | null
          regularity_compliant_count?: number
          regularity_index?: number
          regularity_total_count?: number
          relatos_preconceito?: boolean | null
          renda_media_cooperado?: number | null
          renda_media_mensal?: number | null
          representative_name?: string | null
          representative_signature?: string | null
          signed_at?: string | null
          sistema_financeiro?: string | null
          sistema_financeiro_qual?: string | null
          status?: Database["public"]["Enums"]["diagnostic_status"]
          tipo_coleta?: string | null
          tipo_galpao?: string | null
          todos_sao_cooperados?: boolean | null
          updated_at?: string
          updated_by?: string | null
          uso_epis?: string | null
          vice_presidente_email?: string | null
          vice_presidente_nome?: string | null
          vice_presidente_telefone?: string | null
          volumetria_toneladas_mes?: number | null
        }
        Update: {
          acidentes_tipo?: string | null
          acidentes_ultimo_ano?: boolean | null
          alvara_funcionamento?: string | null
          ano_ultimo_balanco?: number | null
          apoio_instituicoes?: boolean | null
          apoio_instituicoes_quais?: string | null
          apoio_poder_publico?: string | null
          assessoria_juridica?: boolean | null
          association_id?: string
          ata_registrada_cartorio?: string | null
          aumento_trabalho_festividades?: boolean | null
          autodeclaracao_racial?: string | null
          autonomos?: number
          avcb?: string | null
          capacitacoes_interesse?: string | null
          cargos_por_eleicao?: string | null
          classificacao_contabil?: string | null
          classificacao_juridica?: string | null
          conselho_fiscal?: string | null
          consentimento_dados?: boolean
          consultant_id?: string
          consultant_name?: string
          contabilidade_regular?: string | null
          contador_email?: string | null
          contador_nome?: string | null
          contador_telefone?: string | null
          contador_tipo?: string | null
          contrato_detalhes?: string | null
          contrato_instituicoes_privadas?: string | null
          contrato_instituicoes_publicas?: string | null
          contrato_remunerado?: boolean | null
          contrato_sst?: string | null
          contrato_sst_responsavel?: string | null
          contrato_tipo?: string | null
          contribuicao_inss?: string | null
          controle_estoque?: string | null
          controle_frequencia?: string | null
          controle_frequencia_tipo?: string | null
          controle_jornada?: boolean | null
          cooperativa_fornece_epis?: string | null
          coordenacao_gerencia?: string | null
          created_at?: string
          created_by?: string | null
          criancas_adolescentes_dependentes?: boolean | null
          data_ultima_eleicao?: string | null
          data_visita?: string
          declaracao_veracidade?: boolean
          destino_venda?: string | null
          diretoria_conselho?: boolean | null
          diretoria_nomes?: string | null
          divisao_resultados_criterio?: string | null
          divisao_resultados_procedimento?: string | null
          divisao_tarefas?: string | null
          divisao_tarefas_gerencia?: boolean | null
          documentos_necessarios?: string | null
          emite_notas_fiscais?: string | null
          empregados_registrados?: number
          empregados_sem_registro?: number
          equipamentos_outros?: string | null
          escolaridade_predominante?: string | null
          estatuto_registrado?: string | null
          evidence_validated?: boolean
          evidencia_administrativo_confirmada?: boolean
          evidencia_entrevista_confirmada?: boolean
          evidencia_frente_confirmada?: boolean
          evidencia_livro_trabalho_confirmada?: boolean
          evidencia_reuniao_confirmada?: boolean
          extintores?: string | null
          faixa_etaria_predominante?: string | null
          filiacao_sindical?: boolean | null
          filiacao_sindical_qual?: string | null
          fluxo_trabalho_diario?: string | null
          frequencia_assembleias?: string | null
          historico_trabalho_infantil?: boolean | null
          homens?: number
          horario_visita?: string
          id?: string
          inscritos_cadunico?: string | null
          interesse_capacitacao?: boolean | null
          licenca_ambiental_status?: string | null
          lista_cooperados_atualizada?: string | null
          lista_nao_cooperados_atualizada?: string | null
          livro_ficha_trabalho?: boolean | null
          livro_ficha_trabalho_qual?: string | null
          livro_inspecao_trabalho?: boolean | null
          mandato_em_dia?: string | null
          materiais_coletados?: string[]
          media_horas_trabalhadas?: string | null
          media_moradores_casa?: number | null
          melhorias_juridicas_necessarias?: string | null
          metodo_divisao_descricao?: string | null
          metodo_divisao_dinheiro?: string | null
          motivos_entrada_reciclagem?: string | null
          movimento_qual?: string | null
          mulheres?: number
          necessita_documentos?: boolean | null
          orientacao_documentos_aceita?: boolean
          orientacao_regularizacao_aceita?: boolean
          pagamento_fixo_mensal?: boolean | null
          parcerias_detalhes?: string | null
          participa_coleta_seletiva_municipal?: boolean | null
          participa_movimentos?: boolean | null
          pendencias_contabeis?: string | null
          pendencias_juridicas?: string | null
          pessoas_trans_detalhes?: string | null
          possui_conta_bancaria?: string | null
          possui_contador?: string | null
          possui_maquineta?: string | null
          possui_parcerias?: string | null
          possui_pessoas_trans?: boolean
          possui_registro_atas?: string | null
          possui_veiculos_maquinas?: boolean | null
          preconceito_detalhes?: string | null
          presidente_email?: string | null
          presidente_nome?: string | null
          presidente_telefone?: string | null
          problemas_juridicos_atuais?: string | null
          problemas_melhorias_juridico?: string | null
          problemas_saude?: string | null
          processed_at?: string | null
          processos_judiciais?: boolean | null
          processos_judiciais_quais?: string | null
          quantidade_beneficiarios?: number | null
          quantidade_trabalho_infantil?: number | null
          realiza_assembleias?: string | null
          realiza_triagem?: boolean | null
          recebe_beneficios?: boolean | null
          recebeu_apoio_programas?: boolean | null
          reconhecimento_sociedade?: string | null
          registro_ocb?: string | null
          regras_entrada?: string | null
          regras_entrada_exclusao?: boolean | null
          regras_saida_exclusao?: string | null
          regularity_compliant_count?: number
          regularity_index?: number
          regularity_total_count?: number
          relatos_preconceito?: boolean | null
          renda_media_cooperado?: number | null
          renda_media_mensal?: number | null
          representative_name?: string | null
          representative_signature?: string | null
          signed_at?: string | null
          sistema_financeiro?: string | null
          sistema_financeiro_qual?: string | null
          status?: Database["public"]["Enums"]["diagnostic_status"]
          tipo_coleta?: string | null
          tipo_galpao?: string | null
          todos_sao_cooperados?: boolean | null
          updated_at?: string
          updated_by?: string | null
          uso_epis?: string | null
          vice_presidente_email?: string | null
          vice_presidente_nome?: string | null
          vice_presidente_telefone?: string | null
          volumetria_toneladas_mes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "association_assessments_association_id_fkey"
            columns: ["association_id"]
            isOneToOne: false
            referencedRelation: "associations"
            referencedColumns: ["id"]
          },
        ]
      }
      association_documents: {
        Row: {
          association_id: string
          category: Database["public"]["Enums"]["association_document_category"]
          created_at: string
          description: string | null
          expires_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          issued_at: string | null
          mime_type: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          association_id: string
          category?: Database["public"]["Enums"]["association_document_category"]
          created_at?: string
          description?: string | null
          expires_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          issued_at?: string | null
          mime_type?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          association_id?: string
          category?: Database["public"]["Enums"]["association_document_category"]
          created_at?: string
          description?: string | null
          expires_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          issued_at?: string | null
          mime_type?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "association_documents_association_id_fkey"
            columns: ["association_id"]
            isOneToOne: false
            referencedRelation: "associations"
            referencedColumns: ["id"]
          },
        ]
      }
      association_equipment: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          quantidade: number
          tipo: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          quantidade?: number
          tipo: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          quantidade?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "association_equipment_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "association_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      association_evidence: {
        Row: {
          assessment_id: string | null
          association_id: string
          category: string
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          module: Database["public"]["Enums"]["assessment_module"]
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          assessment_id?: string | null
          association_id: string
          category: string
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          module: Database["public"]["Enums"]["assessment_module"]
          storage_path: string
          uploaded_by: string
        }
        Update: {
          assessment_id?: string | null
          association_id?: string
          category?: string
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          module?: Database["public"]["Enums"]["assessment_module"]
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "association_evidence_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "association_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "association_evidence_association_id_fkey"
            columns: ["association_id"]
            isOneToOne: false
            referencedRelation: "associations"
            referencedColumns: ["id"]
          },
        ]
      }
      associations: {
        Row: {
          ativa: boolean
          cnpj: string | null
          consultor_nome: string | null
          created_at: string
          created_by: string | null
          data_visita: string | null
          email: string | null
          endereco_sede: string
          horario_visita: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          municipio: string
          nome: string
          numero_associados_atual: number
          numero_associados_inicial: number
          telefone: string | null
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativa?: boolean
          cnpj?: string | null
          consultor_nome?: string | null
          created_at?: string
          created_by?: string | null
          data_visita?: string | null
          email?: string | null
          endereco_sede: string
          horario_visita?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          municipio: string
          nome: string
          numero_associados_atual?: number
          numero_associados_inicial?: number
          telefone?: string | null
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativa?: boolean
          cnpj?: string | null
          consultor_nome?: string | null
          created_at?: string
          created_by?: string | null
          data_visita?: string | null
          email?: string | null
          endereco_sede?: string
          horario_visita?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          municipio?: string
          nome?: string
          numero_associados_atual?: number
          numero_associados_inicial?: number
          telefone?: string | null
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      catadores: {
        Row: {
          area_atuacao: string | null
          association_id: string | null
          autodeclaracao_racial: string | null
          cadastro_gov_br: boolean | null
          comprovante_residencia_url: string | null
          conta_bancaria_digital: string | null
          contribui_inss: boolean | null
          cpf: string | null
          cpf_foto_url: string | null
          created_by: string | null
          ctps: string | null
          ctps_foto_url: string | null
          data_cadastro: string
          email: string | null
          endereco_completo: string | null
          escolaridade: string | null
          genero: Database["public"]["Enums"]["catador_genero"] | null
          id: string
          inscrito_cadunico: boolean | null
          materiais_coletados: string[] | null
          nis: string | null
          nis_foto_url: string | null
          nivel_cadastro_gov_br: string | null
          nome_completo: string | null
          nome_cooperativa: string | null
          possui_bolsa_familia: boolean | null
          possui_carroca: boolean | null
          renda_media_mensal: number | null
          rg_cin: string | null
          rg_cin_foto_url: string | null
          status: Database["public"]["Enums"]["catador_status"]
          telefone: string | null
          tipo_carroca: string | null
          titulo_eleitor: string | null
          titulo_eleitor_foto_url: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          area_atuacao?: string | null
          association_id?: string | null
          autodeclaracao_racial?: string | null
          cadastro_gov_br?: boolean | null
          comprovante_residencia_url?: string | null
          conta_bancaria_digital?: string | null
          contribui_inss?: boolean | null
          cpf?: string | null
          cpf_foto_url?: string | null
          created_by?: string | null
          ctps?: string | null
          ctps_foto_url?: string | null
          data_cadastro?: string
          email?: string | null
          endereco_completo?: string | null
          escolaridade?: string | null
          genero?: Database["public"]["Enums"]["catador_genero"] | null
          id?: string
          inscrito_cadunico?: boolean | null
          materiais_coletados?: string[] | null
          nis?: string | null
          nis_foto_url?: string | null
          nivel_cadastro_gov_br?: string | null
          nome_completo?: string | null
          nome_cooperativa?: string | null
          possui_bolsa_familia?: boolean | null
          possui_carroca?: boolean | null
          renda_media_mensal?: number | null
          rg_cin?: string | null
          rg_cin_foto_url?: string | null
          status?: Database["public"]["Enums"]["catador_status"]
          telefone?: string | null
          tipo_carroca?: string | null
          titulo_eleitor?: string | null
          titulo_eleitor_foto_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          area_atuacao?: string | null
          association_id?: string | null
          autodeclaracao_racial?: string | null
          cadastro_gov_br?: boolean | null
          comprovante_residencia_url?: string | null
          conta_bancaria_digital?: string | null
          contribui_inss?: boolean | null
          cpf?: string | null
          cpf_foto_url?: string | null
          created_by?: string | null
          ctps?: string | null
          ctps_foto_url?: string | null
          data_cadastro?: string
          email?: string | null
          endereco_completo?: string | null
          escolaridade?: string | null
          genero?: Database["public"]["Enums"]["catador_genero"] | null
          id?: string
          inscrito_cadunico?: boolean | null
          materiais_coletados?: string[] | null
          nis?: string | null
          nis_foto_url?: string | null
          nivel_cadastro_gov_br?: string | null
          nome_completo?: string | null
          nome_cooperativa?: string | null
          possui_bolsa_familia?: boolean | null
          possui_carroca?: boolean | null
          renda_media_mensal?: number | null
          rg_cin?: string | null
          rg_cin_foto_url?: string | null
          status?: Database["public"]["Enums"]["catador_status"]
          telefone?: string | null
          tipo_carroca?: string | null
          titulo_eleitor?: string | null
          titulo_eleitor_foto_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catadores_association_id_fkey"
            columns: ["association_id"]
            isOneToOne: false
            referencedRelation: "associations"
            referencedColumns: ["id"]
          },
        ]
      }
      infrastructure_assessments: {
        Row: {
          association_id: string
          cidade: string | null
          consultant_id: string
          consultant_name: string
          created_at: string
          data_visita: string
          endereco_sede: string | null
          entrevistador: string | null
          horario_visita: string
          id: string
          organizacao_nome: string | null
          payload: Json
          pessoas_especifique: string | null
          pessoas_homens: number | null
          pessoas_mulheres: number | null
          pessoas_total: number | null
          regime_ocupacao: string | null
          updated_at: string
        }
        Insert: {
          association_id: string
          cidade?: string | null
          consultant_id: string
          consultant_name: string
          created_at?: string
          data_visita: string
          endereco_sede?: string | null
          entrevistador?: string | null
          horario_visita: string
          id?: string
          organizacao_nome?: string | null
          payload?: Json
          pessoas_especifique?: string | null
          pessoas_homens?: number | null
          pessoas_mulheres?: number | null
          pessoas_total?: number | null
          regime_ocupacao?: string | null
          updated_at?: string
        }
        Update: {
          association_id?: string
          cidade?: string | null
          consultant_id?: string
          consultant_name?: string
          created_at?: string
          data_visita?: string
          endereco_sede?: string | null
          entrevistador?: string | null
          horario_visita?: string
          id?: string
          organizacao_nome?: string | null
          payload?: Json
          pessoas_especifique?: string | null
          pessoas_homens?: number | null
          pessoas_mulheres?: number | null
          pessoas_total?: number | null
          regime_ocupacao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "infrastructure_assessments_association_id_fkey"
            columns: ["association_id"]
            isOneToOne: false
            referencedRelation: "associations"
            referencedColumns: ["id"]
          },
        ]
      }
      material_prices: {
        Row: {
          assessment_id: string
          comprador: string | null
          created_at: string
          id: string
          material: string
          preco_por_kg: number
        }
        Insert: {
          assessment_id: string
          comprador?: string | null
          created_at?: string
          id?: string
          material: string
          preco_por_kg?: number
        }
        Update: {
          assessment_id?: string
          comprador?: string | null
          created_at?: string
          id?: string
          material?: string
          preco_por_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "material_prices_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "association_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          id: string
          notification_key: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_key: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_key?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          identificacao_profissional: string | null
          municipio_referencia: string | null
          must_change_password: boolean
          photo_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          full_name: string
          identificacao_profissional?: string | null
          municipio_referencia?: string | null
          must_change_password?: boolean
          photo_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string
          identificacao_profissional?: string | null
          municipio_referencia?: string | null
          must_change_password?: boolean
          photo_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          area: Database["public"]["Enums"]["operational_area"] | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          area?: Database["public"]["Enums"]["operational_area"] | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          area?: Database["public"]["Enums"]["operational_area"] | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_area: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["operational_area"]
      }
      has_area: {
        Args: {
          _area: Database["public"]["Enums"]["operational_area"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_coordenador: { Args: { _user_id: string }; Returns: boolean }
      is_coordenador_recenseador: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_field_consultant: { Args: { _user_id: string }; Returns: boolean }
      is_recenseador: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "atendente"
        | "consultor"
        | "recenseador"
        | "coordenador"
        | "coordenador_recenseador"
      assessment_module: "social" | "juridico" | "contabil"
      association_document_category:
        | "estatuto"
        | "ata"
        | "alvara"
        | "licenca_ambiental"
        | "balanco"
        | "comprovante"
        | "outros"
      catador_genero: "feminino" | "masculino" | "lgbtqia" | "nao_responder"
      catador_status: "pendente" | "ativo" | "inativo"
      diagnostic_status: "regular" | "parcialmente_regular" | "irregular"
      operational_area: "social" | "juridico" | "contabil" | "infraestrutura"
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
      app_role: [
        "admin",
        "atendente",
        "consultor",
        "recenseador",
        "coordenador",
        "coordenador_recenseador",
      ],
      assessment_module: ["social", "juridico", "contabil"],
      association_document_category: [
        "estatuto",
        "ata",
        "alvara",
        "licenca_ambiental",
        "balanco",
        "comprovante",
        "outros",
      ],
      catador_genero: ["feminino", "masculino", "lgbtqia", "nao_responder"],
      catador_status: ["pendente", "ativo", "inativo"],
      diagnostic_status: ["regular", "parcialmente_regular", "irregular"],
      operational_area: ["social", "juridico", "contabil", "infraestrutura"],
    },
  },
} as const
