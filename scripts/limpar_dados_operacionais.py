"""Script utilitário para limpeza operacional do banco de dados.

Remove agendamentos, contratos e vínculos entre motoristas e empresas,
mantendo intactos os cadastros base (empresas, motoristas, veículos e usuários).

Uso:
    python scripts/limpar_dados_operacionais.py [opções]

Opções:
    --dry-run             Simula a remoção sem persistir no banco de dados.
    --force, -y           Executa sem solicitar confirmação manual no console.
    --limpar-eventos      Também remove todos os eventos operacionais históricos.
    --apenas-agendamentos Remove exclusivamente agendamentos e alocações.
    --apenas-contratos    Remove contratos de configurações (exige agendamentos limpos).
    --apenas-vinculos     Remove exclusivamente a correlação de motoristas com empresas.
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, Optional

# Garante que o diretório raiz esteja no PYTHONPATH
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Se executado fora do ambiente virtual (.venv), tenta reexecutar com o interpretador do .venv
if sys.prefix == sys.base_prefix:
    venv_python = ROOT_DIR / ".venv" / "Scripts" / "python.exe"
    if not venv_python.exists():
        venv_python = ROOT_DIR / ".venv" / "bin" / "python"

    if venv_python.exists() and os.path.abspath(sys.executable) != os.path.abspath(str(venv_python)):
        result = subprocess.run([str(venv_python)] + sys.argv)
        sys.exit(result.returncode)

from sqlalchemy.orm import Session

# Importa todos os modelos da aplicação para que o SQLAlchemy resolva os relacionamentos declarativos
import app.usuarios.models  # noqa: F401
import app.empresas.models  # noqa: F401
import app.motoristas.models  # noqa: F401
import app.veiculos.models  # noqa: F401
import app.contratos.models  # noqa: F401
import app.operacao.models  # noqa: F401
import app.agendamentos.models  # noqa: F401
import app.auditoria.models  # noqa: F401

from app.core.database import SessionLocal  # noqa: E402
from app.agendamentos.models import (  # noqa: E402
    Agendamento,
    AlocacaoOperacional,
    HistoricoAgendamento,
)
from app.contratos.models import (  # noqa: E402
    ContratoConfiguracao,
    MotoristaDedicadoVinculo,
)
from app.operacao.models import EventoOperacional  # noqa: E402



def limpar_dados_operacionais(
    db: Session,
    remover_agendamentos: bool = True,
    remover_contratos: bool = True,
    remover_vinculos: bool = True,
    limpar_todos_eventos: bool = False,
    dry_run: bool = False,
) -> Dict[str, int]:
    """Executa a limpeza das tabelas operacionais em ordem segura de dependências.

    Retorna um dicionário com a contagem de registros removidos por entidade.
    """
    contadores = {
        "eventos_operacionais": 0,
        "alocacoes_operacionais": 0,
        "historico_agendamentos": 0,
        "agendamentos": 0,
        "contratos_configuracoes": 0,
        "motoristas_dedicados_vinculos": 0,
    }

    # 1. Tratar eventos operacionais vinculados a agendamentos ou todos se solicitado
    if remover_agendamentos:
        if limpar_todos_eventos:
            qtd_eventos = db.query(EventoOperacional).count()
            if not dry_run:
                db.query(EventoOperacional).delete(synchronize_session=False)
            contadores["eventos_operacionais"] = qtd_eventos
        else:
            eventos_agendados = db.query(EventoOperacional).filter(
                EventoOperacional.agendamento_id.isnot(None)
            )
            qtd_eventos = eventos_agendados.count()
            if not dry_run:
                eventos_agendados.delete(synchronize_session=False)
            contadores["eventos_operacionais"] = qtd_eventos

        # 2. Alocações operacionais
        qtd_alocacoes = db.query(AlocacaoOperacional).count()
        if not dry_run:
            db.query(AlocacaoOperacional).delete(synchronize_session=False)
        contadores["alocacoes_operacionais"] = qtd_alocacoes

        # 3. Histórico de agendamentos
        qtd_historico = db.query(HistoricoAgendamento).count()
        if not dry_run:
            db.query(HistoricoAgendamento).delete(synchronize_session=False)
        contadores["historico_agendamentos"] = qtd_historico

        # 4. Agendamentos
        qtd_agendamentos = db.query(Agendamento).count()
        if not dry_run:
            db.query(Agendamento).delete(synchronize_session=False)
        contadores["agendamentos"] = qtd_agendamentos

    # 5. Contratos de capacidade das empresas
    if remover_contratos:
        qtd_contratos = db.query(ContratoConfiguracao).count()
        if not dry_run:
            db.query(ContratoConfiguracao).delete(synchronize_session=False)
        contadores["contratos_configuracoes"] = qtd_contratos

    # 6. Correlação / vínculos de motoristas com empresas
    if remover_vinculos:
        qtd_vinculos = db.query(MotoristaDedicadoVinculo).count()
        if not dry_run:
            db.query(MotoristaDedicadoVinculo).delete(synchronize_session=False)
        contadores["motoristas_dedicados_vinculos"] = qtd_vinculos

    if dry_run:
        db.rollback()
    else:
        db.commit()

    return contadores


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Apaga agendamentos, contratos e correlação de motoristas com empresas mantendo cadastros base."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simula a execução e mostra o que seria excluído sem persistir no banco.",
    )
    parser.add_argument(
        "-y",
        "--force",
        action="store_true",
        help="Confirma a execução automaticamente sem solicitar no terminal.",
    )
    parser.add_argument(
        "--limpar-eventos",
        action="store_true",
        help="Remove todos os eventos operacionais históricos (e não apenas os vinculados a agendamentos).",
    )
    parser.add_argument(
        "--apenas-agendamentos",
        action="store_true",
        help="Exclui apenas agendamentos, alocações e históricos.",
    )
    parser.add_argument(
        "--apenas-contratos",
        action="store_true",
        help="Exclui apenas contratos de empresas (requer agendamentos já vazios).",
    )
    parser.add_argument(
        "--apenas-vinculos",
        action="store_true",
        help="Exclui apenas vínculos entre motoristas e empresas.",
    )

    args = parser.parse_args()

    # Determina o escopo
    apenas_especifico = (
        args.apenas_agendamentos or args.apenas_contratos or args.apenas_vinculos
    )
    if apenas_especifico:
        remover_agendamentos = args.apenas_agendamentos
        remover_contratos = args.apenas_contratos
        remover_vinculos = args.apenas_vinculos
    else:
        remover_agendamentos = True
        remover_contratos = True
        remover_vinculos = True

    print("=" * 65)
    print(" TORRE DE CONTROLE - LIMPEZA OPERACIONAL DO BANCO DE DADOS")
    print("=" * 65)
    print(f"Modo Dry-Run (Simulação): {'SIM' if args.dry_run else 'NÃO'}")
    print(f"Remover Agendamentos e Alocações: {'SIM' if remover_agendamentos else 'NÃO'}")
    print(f"Remover Contratos de Empresas:    {'SIM' if remover_contratos else 'NÃO'}")
    print(f"Remover Correlação Motorista/Emp: {'SIM' if remover_vinculos else 'NÃO'}")
    print(f"Limpar Todos os Eventos Operac.:  {'SIM' if args.limpar_eventos else 'NÃO (apenas vinculados)'}")
    print("-" * 65)

    if not args.dry_run and not args.force:
        confirmacao = input(
            "ATENÇÃO: Esta ação é irreversível! Digite 'SIM' para confirmar a exclusão: "
        )
        if confirmacao.strip() != "SIM":
            print("Operação cancelada pelo usuário.")
            sys.exit(0)

    db = SessionLocal()
    try:
        contadores = limpar_dados_operacionais(
            db=db,
            remover_agendamentos=remover_agendamentos,
            remover_contratos=remover_contratos,
            remover_vinculos=remover_vinculos,
            limpar_todos_eventos=args.limpar_eventos,
            dry_run=args.dry_run,
        )

        status_prefixo = "Registros que seriam removidos" if args.dry_run else "Registros removidos"
        print(f"\n{status_prefixo}:")
        for entidade, total in contadores.items():
            print(f" - {entidade}: {total}")

        if args.dry_run:
            print("\n[DRY-RUN] Nenhuma alteração foi persistida no banco de dados.")
        else:
            print("\n[SUCESSO] Limpeza de dados concluída com sucesso!")

    except Exception as exc:
        db.rollback()
        print(f"\n[ERRO] Ocorreu uma falha durante a execução: {exc}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
