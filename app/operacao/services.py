from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import date, datetime, time
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.core.datetime_utils import inicio_do_dia_utc, fim_do_dia_utc, agora_local
from app.contratos.services import obter_configuracao_vigente
from app.operacao.models import MotivoIndisponibilidade, ConfiguracaoSistema, EventoOperacional
from app.operacao.schemas import (
    MotivoIndisponibilidadeCreate,
    MotivoIndisponibilidadeUpdate,
    ConfiguracaoSistemaCreate,
    ConfiguracaoSistemaUpdate,
    ResumoTorreResponse,
    ResumoEmpresaTorreResponse,
    DetalhamentoOperacionalResponse,
)
from app.agendamentos.models import Agendamento, AlocacaoOperacional
from app.empresas.models import Empresa
from app.motoristas.models import Motorista
from app.veiculos.models import Veiculo

MOTIVOS_PADRAO_INICIAIS = [
    "Avaria",
    "Manutenção",
    "Ausência do motorista",
    "Problema documental",
    "Acidente",
    "Problema mecânico",
    "Problema operacional",
    "Outro",
]

HORARIO_LIMITE_AGENDAMENTO_CHAVE = "horario_limite_agendamento_dia_atual"
HORARIO_LIMITE_AGENDAMENTO_PADRAO = "12:00"

class OperacaoService:
    @staticmethod
    def inicializar_dados_padrao(db: Session) -> None:
        """Garante que os motivos de indisponibilidade e configurações padrão existam."""
        for nome_motivo in MOTIVOS_PADRAO_INICIAIS:
            existente = db.query(MotivoIndisponibilidade).filter(MotivoIndisponibilidade.nome == nome_motivo).first()
            if not existente:
                db.add(MotivoIndisponibilidade(nome=nome_motivo, ativo=True))
        
        config_horario = db.query(ConfiguracaoSistema).filter(ConfiguracaoSistema.chave == HORARIO_LIMITE_AGENDAMENTO_CHAVE).first()
        if not config_horario:
            db.add(ConfiguracaoSistema(chave=HORARIO_LIMITE_AGENDAMENTO_CHAVE, valor=HORARIO_LIMITE_AGENDAMENTO_PADRAO))

        db.commit()

    # --- Motivos de Indisponibilidade ---
    @staticmethod
    def listar_motivos(db: Session, apenas_ativos: bool = False) -> List[MotivoIndisponibilidade]:
        query = db.query(MotivoIndisponibilidade)
        if apenas_ativos:
            query = query.filter(MotivoIndisponibilidade.ativo == True)
        return query.order_by(MotivoIndisponibilidade.nome).all()

    @staticmethod
    def buscar_motivo_por_id(db: Session, motivo_id: UUID) -> MotivoIndisponibilidade:
        motivo = db.query(MotivoIndisponibilidade).filter(MotivoIndisponibilidade.id == motivo_id).first()
        if not motivo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Motivo de indisponibilidade não encontrado.",
            )
        return motivo

    @staticmethod
    def criar_motivo(db: Session, dados: MotivoIndisponibilidadeCreate) -> MotivoIndisponibilidade:
        existente = db.query(MotivoIndisponibilidade).filter(MotivoIndisponibilidade.nome == dados.nome).first()
        if existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Já existe um motivo de indisponibilidade com esse nome.",
            )
        motivo = MotivoIndisponibilidade(**dados.model_dump())
        db.add(motivo)
        db.commit()
        db.refresh(motivo)
        return motivo

    @staticmethod
    def atualizar_motivo(db: Session, motivo_id: UUID, dados: MotivoIndisponibilidadeUpdate) -> MotivoIndisponibilidade:
        motivo = OperacaoService.buscar_motivo_por_id(db, motivo_id)
        
        if dados.nome is not None and dados.nome != motivo.nome:
            existente = db.query(MotivoIndisponibilidade).filter(MotivoIndisponibilidade.nome == dados.nome).first()
            if existente:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Já existe um motivo de indisponibilidade com esse nome.",
                )
            motivo.nome = dados.nome

        if dados.ativo is not None:
            motivo.ativo = dados.ativo

        db.commit()
        db.refresh(motivo)
        return motivo

    # --- Configurações do Sistema ---
    @staticmethod
    def obter_configuracao(db: Session, chave: str) -> str:
        config = OperacaoService.obter_configuracao_objeto(db, chave)
        return config.valor

    @staticmethod
    def obter_configuracao_objeto(db: Session, chave: str) -> ConfiguracaoSistema:
        config = db.query(ConfiguracaoSistema).filter(ConfiguracaoSistema.chave == chave).first()
        if not config:
            if chave == HORARIO_LIMITE_AGENDAMENTO_CHAVE:
                config = ConfiguracaoSistema(chave=chave, valor=HORARIO_LIMITE_AGENDAMENTO_PADRAO)
                db.add(config)
                db.commit()
                db.refresh(config)
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Configuração '{chave}' não encontrada.",
                )
        return config

    @staticmethod
    def listar_configuracoes(db: Session) -> List[ConfiguracaoSistema]:
        return db.query(ConfiguracaoSistema).all()

    @staticmethod
    def atualizar_configuracao(db: Session, chave: str, valor: str) -> ConfiguracaoSistema:
        config = db.query(ConfiguracaoSistema).filter(ConfiguracaoSistema.chave == chave).first()
        if not config:
            config = ConfiguracaoSistema(chave=chave, valor=valor)
            db.add(config)
        else:
            config.valor = valor
        db.commit()
        db.refresh(config)
        return config

    # --- Torre de Controle (Painel & Indicadores) ---
    @staticmethod
    def obter_resumo_geral(
        db: Session,
        data_filtro: Optional[date] = None,
        empresa_id: Optional[UUID] = None,
    ) -> ResumoTorreResponse:
        data_ref = data_filtro or agora_local().date()
        resumo_empresas = OperacaoService.obter_resumo_por_empresa(db, data_ref)

        if empresa_id:
            resumo_empresas = [r for r in resumo_empresas if r.empresa_id == empresa_id]

        contratados = sum(r.contratados for r in resumo_empresas)
        total = sum(r.total for r in resumo_empresas)
        disponiveis = sum(r.disponiveis for r in resumo_empresas)
        programados = sum(r.programados for r in resumo_empresas)
        em_rota = sum(r.em_rota for r in resumo_empresas)
        indisponiveis = sum(r.indisponiveis for r in resumo_empresas)
        vagas_nao_preenchidas = sum(r.vagas_nao_preenchidas for r in resumo_empresas)

        return ResumoTorreResponse(
            contratados=contratados,
            total=total,
            disponiveis=disponiveis,
            programados=programados,
            em_rota=em_rota,
            indisponiveis=indisponiveis,
            vagas_nao_preenchidas=vagas_nao_preenchidas,
        )

    @staticmethod
    def obter_resumo_por_empresa(db: Session, data_filtro: Optional[date] = None) -> List[ResumoEmpresaTorreResponse]:
        data_ref = data_filtro or agora_local().date()
        empresas = db.query(Empresa).filter(Empresa.ativo == True).all()
        resultado = []

        for emp in empresas:
            # Obtém a configuração de capacidade contratual vigente na data
            dt_ref = datetime.combine(data_ref, time(0, 0, 0))
            config_vigente = obter_configuracao_vigente(db, emp.id, dt_ref)
            regras = config_vigente.regras if config_vigente and config_vigente.regras else {}
            contratados = sum(int(v) for v in regras.values()) if regras else 0

            query = db.query(AlocacaoOperacional).join(Agendamento).filter(
                Agendamento.empresa_id == emp.id,
                Agendamento.data == data_ref,
                Agendamento.status != "CANCELADO",
            )

            alocacoes = query.all()
            total = len(alocacoes)
            disponiveis = sum(1 for a in alocacoes if a.status_operacional == "DISPONIVEL")
            programados = sum(1 for a in alocacoes if a.status_operacional == "PROGRAMADO")
            em_rota = sum(1 for a in alocacoes if a.status_operacional == "EM_ROTA")
            indisponiveis = sum(1 for a in alocacoes if a.status_operacional == "INDISPONIVEL")
            vagas_nao_preenchidas = max(0, contratados - total)

            resultado.append(
                ResumoEmpresaTorreResponse(
                    empresa_id=emp.id,
                    empresa_nome=emp.nome,
                    contratados=contratados,
                    total=total,
                    disponiveis=disponiveis,
                    programados=programados,
                    em_rota=em_rota,
                    indisponiveis=indisponiveis,
                    vagas_nao_preenchidas=vagas_nao_preenchidas,
                    regras_capacidade=regras,
                )
            )

        return resultado

    @staticmethod
    def obter_detalhamento_operacional(
        db: Session,
        data_filtro: Optional[date] = None,
        empresa_id: Optional[UUID] = None,
        status_filtro: Optional[str] = None,
        categoria: Optional[str] = None,
        tipo_veiculo: Optional[str] = None,
        especialidade: Optional[str] = None,
        placa: Optional[str] = None,
        motorista_nome: Optional[str] = None,
        motorista_id: Optional[UUID] = None,
        limite: int = 50,
        offset: int = 0,
    ) -> List[DetalhamentoOperacionalResponse]:
        query = (
            db.query(AlocacaoOperacional)
            .join(Agendamento)
            .join(Motorista)
            .join(Veiculo)
            .join(Empresa, Agendamento.empresa_id == Empresa.id)
            .filter(Agendamento.status != "CANCELADO")
        )

        if data_filtro:
            query = query.filter(Agendamento.data == data_filtro)
        if empresa_id:
            query = query.filter(Agendamento.empresa_id == empresa_id)
        if status_filtro:
            query = query.filter(AlocacaoOperacional.status_operacional == status_filtro)
        if categoria:
            query = query.filter(AlocacaoOperacional.categoria == categoria)
        if tipo_veiculo:
            query = query.filter(Veiculo.tipo_veiculo == tipo_veiculo)
        if especialidade:
            query = query.filter(Veiculo.especialidade == especialidade)
        if placa:
            query = query.filter(Veiculo.placa.ilike(f"%{placa}%"))
        if motorista_nome:
            query = query.filter(Motorista.nome.ilike(f"%{motorista_nome}%"))
        if motorista_id:
            query = query.filter(AlocacaoOperacional.motorista_id == motorista_id)

        alocacoes = query.offset(offset).limit(limite).all()
        resultado = []

        for a in alocacoes:
            motivo_nome = a.motivo_indisponibilidade.nome if a.motivo_indisponibilidade else None
            resultado.append(
                DetalhamentoOperacionalResponse(
                    empresa_id=a.agendamento.empresa_id,
                    empresa_nome=a.agendamento.empresa.nome,
                    motorista_id=a.motorista_id,
                    motorista_nome=a.motorista.nome,
                    veiculo_id=a.veiculo_id,
                    veiculo_identificacao=a.veiculo.identificacao,
                    placa=a.veiculo.placa,
                    tipo_veiculo=a.veiculo.tipo_veiculo,
                    especialidade=a.veiculo.especialidade,
                    categoria=a.categoria,
                    status_operacional=a.status_operacional,
                    motivo_indisponibilidade=motivo_nome,
                    agendamento_id=a.agendamento_id,
                )
            )

        return resultado

    # --- Histórico de Eventos Operacionais ---
    @staticmethod
    def listar_eventos_operacionais(
        db: Session,
        empresa_id: Optional[UUID] = None,
        data_inicio: Optional[date] = None,
        data_fim: Optional[date] = None,
        motorista_id: Optional[UUID] = None,
        veiculo_id: Optional[UUID] = None,
        categoria: Optional[str] = None,
        novo_status: Optional[str] = None,
        motivo: Optional[str] = None,
        usuario_id: Optional[UUID] = None,
        limite: int = 50,
        offset: int = 0,
    ) -> List[EventoOperacional]:
        query = db.query(EventoOperacional)

        if empresa_id:
            query = query.filter(EventoOperacional.empresa_id == empresa_id)
        if data_inicio:
            query = query.filter(EventoOperacional.criado_em >= inicio_do_dia_utc(data_inicio))
        if data_fim:
            query = query.filter(EventoOperacional.criado_em <= fim_do_dia_utc(data_fim))
        if motorista_id:
            query = query.filter(EventoOperacional.motorista_id == motorista_id)
        if veiculo_id:
            query = query.filter(EventoOperacional.veiculo_id == veiculo_id)
        if categoria:
            query = query.filter(EventoOperacional.categoria == categoria)
        if novo_status:
            query = query.filter(EventoOperacional.novo_status == novo_status)
        if motivo:
            query = query.filter(EventoOperacional.motivo_indisponibilidade == motivo)
        if usuario_id:
            query = query.filter(EventoOperacional.usuario_id == usuario_id)

        return query.order_by(EventoOperacional.criado_em.desc()).offset(offset).limit(limite).all()

    # --- Importação de Planilha Operacional ---
    @staticmethod
    def importar_planilha_operacional(
        db: Session, conteudo_arquivo: bytes, nome_arquivo: str, autor_id: UUID
    ) -> Dict[str, Any]:
        import csv
        import io
        import re
        import zipfile
        import xml.etree.ElementTree as ET
        from app.contratos.models import MotoristaDedicadoVinculo

        linhas_brutas = []

        if nome_arquivo.lower().endswith(".csv"):
            texto = conteudo_arquivo.decode("utf-8-sig", errors="ignore")
            reader = csv.reader(io.StringIO(texto), delimiter=",")
            for row in reader:
                if not any(row):
                    continue
                if len(row) == 1 and ";" in row[0]:
                    row = row[0].split(";")
                linhas_brutas.append([col.strip() for col in row])
        else:
            try:
                z = zipfile.ZipFile(io.BytesIO(conteudo_arquivo))
                shared_strings = []
                if "xl/sharedStrings.xml" in z.namelist():
                    tree = ET.fromstring(z.read("xl/sharedStrings.xml"))
                    for si in tree.findall("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si"):
                        t = si.find(".//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")
                        shared_strings.append(t.text if t is not None else "")

                sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
                rows = sheet.findall(".//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row")
                for r in rows:
                    row_vals = []
                    for c in r.findall("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c"):
                        t = c.get("t")
                        v = c.find("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v")
                        val = v.text if v is not None else ""
                        if t == "s" and val != "":
                            val_idx = int(val)
                            val = shared_strings[val_idx] if val_idx < len(shared_strings) else val
                        row_vals.append(val.strip())
                    if any(row_vals):
                        linhas_brutas.append(row_vals)
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Erro ao processar arquivo Excel (.xlsx): {str(e)}"
                )

        if not linhas_brutas:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A planilha enviada não contém dados."
            )

        header = [str(col).strip().upper() for col in linhas_brutas[0]]

        def buscar_indice(sub_nomes: List[str]) -> int:
            for idx, col in enumerate(header):
                for sub in sub_nomes:
                    if sub.upper() in col:
                        return idx
            return -1

        idx_placa = buscar_indice(["PLACA"])
        idx_ident = buscar_indice(["IDENTIFICAÇÃO", "IDENTIFICACAO", "PREFIXO"])
        idx_tipo = buscar_indice(["TIPO"])
        idx_especialidade = buscar_indice(["ESPECIALIDADE"])
        idx_motorista = buscar_indice(["MOTORISTA"])
        idx_categoria = buscar_indice(["CATEGORIA"])
        idx_empresa = buscar_indice(["EMPRESA"])
        idx_status = buscar_indice(["STATUS"])

        if idx_placa == -1 or idx_motorista == -1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A planilha precisa conter pelo menos as colunas 'Placa' e 'Motorista'."
            )

        total_linhas = len(linhas_brutas) - 1
        criados_veiculos = 0
        criados_motoristas = 0
        criadas_empresas = 0
        vinculos_dedicados_criados = 0
        ignorados_placa_existente = 0
        itens_ignorados = []

        placas_existentes_db = {v.placa for v in db.query(Veiculo.placa).all()}
        placas_processadas = set()

        for line_num, row in enumerate(linhas_brutas[1:], start=2):
            def get_val(idx: int) -> str:
                return row[idx].strip() if 0 <= idx < len(row) and row[idx] else ""

            raw_placa = get_val(idx_placa)
            placa = re.sub(r"[^A-Z0-9]", "", raw_placa.upper())
            motorista_nome = get_val(idx_motorista)

            if not placa:
                itens_ignorados.append({
                    "linha": line_num,
                    "placa": raw_placa or "-",
                    "motorista": motorista_nome or "-",
                    "motivo": "Linha ignorada: campo de placa em branco."
                })
                continue

            if len(placa) < 7:
                itens_ignorados.append({
                    "linha": line_num,
                    "placa": raw_placa,
                    "motorista": motorista_nome or "-",
                    "motivo": f"Placa '{raw_placa}' inválida (menos de 7 caracteres)."
                })
                continue

            if placa in placas_existentes_db or placa in placas_processadas:
                ignorados_placa_existente += 1
                itens_ignorados.append({
                    "linha": line_num,
                    "placa": placa,
                    "motorista": motorista_nome or "-",
                    "motivo": "Placa já cadastrada no sistema (ignorada conforme regra)."
                })
                continue

            if not motorista_nome:
                itens_ignorados.append({
                    "linha": line_num,
                    "placa": placa,
                    "motorista": "-",
                    "motivo": "Nome do motorista em branco."
                })
                continue

            status_text = get_val(idx_status).upper()
            ativo = "INDISPONÍVEL" not in status_text and "INDISPONIVEL" not in status_text

            identificacao = get_val(idx_ident) or placa
            tipo_veiculo = get_val(idx_tipo) or "OUTRO"
            especialidade_raw = get_val(idx_especialidade).upper()
            especialidade = "REFRIGERADO" if "REFRIGERADO" in especialidade_raw else "SECO"

            # 1. Veículo
            veiculo = Veiculo(
                identificacao=identificacao,
                placa=placa,
                tipo_veiculo=tipo_veiculo,
                especialidade=especialidade,
                ativo=ativo,
            )
            db.add(veiculo)
            db.flush()
            criados_veiculos += 1
            placas_processadas.add(placa)

            # 2. Motorista
            motorista = Motorista(
                nome=motorista_nome,
                ativo=ativo,
            )
            db.add(motorista)
            db.flush()
            criados_motoristas += 1

            # 3. Empresa (Cria automaticamente se não existir - Regra A1)
            empresa_nome = get_val(idx_empresa)
            empresa_id = None
            if empresa_nome:
                empresa = db.query(Empresa).filter(Empresa.nome.ilike(empresa_nome)).first()
                if not empresa:
                    slug_ident = re.sub(r"[^A-Z0-9]", "", empresa_nome.upper())[:18] or f"EMP-{placa}"
                    # Evita colisão de identificação
                    if db.query(Empresa).filter(Empresa.identificacao == slug_ident).first():
                        slug_ident = f"EMP-{placa}"[:18]
                    empresa = Empresa(
                        nome=empresa_nome,
                        identificacao=slug_ident,
                        ativo=True,
                    )
                    db.add(empresa)
                    db.flush()
                    criadas_empresas += 1
                empresa_id = empresa.id

            # 4. Vínculo Dedicado (se categoria for DEDICADO - Regra A3)
            categoria = get_val(idx_categoria).upper()
            if categoria == "DEDICADO" and empresa_id:
                vinculo = MotoristaDedicadoVinculo(
                    empresa_id=empresa_id,
                    motorista_id=motorista.id,
                    veiculo_id=veiculo.id,
                    tipo_veiculo=tipo_veiculo,
                    categoria_operacional="DEDICADO",
                    ativo=ativo,
                )
                db.add(vinculo)
                vinculos_dedicados_criados += 1

        db.commit()

        return {
            "total_linhas": total_linhas,
            "criados_veiculos": criados_veiculos,
            "criados_motoristas": criados_motoristas,
            "criadas_empresas": criadas_empresas,
            "vinculos_dedicados_criados": vinculos_dedicados_criados,
            "ignorados_placa_existente": ignorados_placa_existente,
            "itens_ignorados": itens_ignorados,
        }
