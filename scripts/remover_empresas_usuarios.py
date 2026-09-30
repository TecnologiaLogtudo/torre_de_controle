"""Script interativo para remoção seletiva de empresas e usuários.

Permite listar, pesquisar e selecionar quais empresas ou usuários devem ser excluídos,
verificando dependências de chave estrangeira antes da exclusão.

Uso:
    python scripts/remover_empresas_usuarios.py [opções]

Opções:
    --empresa <ID/CNPJ/NOME>   Identificador da empresa para remoção direta.
    --usuario <ID/EMAIL/NOME>  Identificador do usuário para remoção direta.
    --cascade-dependentes      Remove automaticamente agendamentos e eventos vinculados.
    --dry-run                  Simula a exclusão sem persistir no banco de dados.
    -y, --force                Confirma a exclusão sem solicitar interação no terminal.
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional
from uuid import UUID

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

# Importa todos os modelos para resolução de relacionamentos no SQLAlchemy
import app.usuarios.models  # noqa: F401
import app.empresas.models  # noqa: F401
import app.motoristas.models  # noqa: F401
import app.veiculos.models  # noqa: F401
import app.contratos.models  # noqa: F401
import app.operacao.models  # noqa: F401
import app.agendamentos.models  # noqa: F401
import app.auditoria.models  # noqa: F401

from app.core.database import SessionLocal  # noqa: E402
from app.empresas.models import Empresa  # noqa: E402
from app.usuarios.models import Usuario  # noqa: E402
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


def verificar_dependencias_empresa(db: Session, empresa_id: UUID) -> Dict[str, int]:
    """Retorna a contagem de registros dependentes da empresa."""
    return {
        "agendamentos": db.query(Agendamento).filter(Agendamento.empresa_id == empresa_id).count(),
        "eventos_operacionais": db.query(EventoOperacional).filter(EventoOperacional.empresa_id == empresa_id).count(),
        "contratos": db.query(ContratoConfiguracao).filter(ContratoConfiguracao.empresa_id == empresa_id).count(),
        "vinculos": db.query(MotoristaDedicadoVinculo).filter(MotoristaDedicadoVinculo.empresa_id == empresa_id).count(),
    }


def verificar_dependencias_usuario(db: Session, usuario_id: UUID) -> Dict[str, int]:
    """Retorna a contagem de registros dependentes do usuário."""
    return {
        "agendamentos_criados": db.query(Agendamento).filter(Agendamento.criado_por_id == usuario_id).count(),
        "eventos_gerados": db.query(EventoOperacional).filter(EventoOperacional.usuario_id == usuario_id).count(),
        "historicos_alterados": db.query(HistoricoAgendamento).filter(HistoricoAgendamento.alterado_por_id == usuario_id).count(),
    }


def remover_empresa_por_id(
    db: Session,
    empresa_id: UUID,
    remover_dependentes: bool = False,
    dry_run: bool = False,
) -> Dict[str, int]:
    """Remove uma empresa e seus dependentes se solicitado."""
    deps = verificar_dependencias_empresa(db, empresa_id)
    removidos = {"empresas": 0, "agendamentos": 0, "eventos": 0, "contratos": 0, "vinculos": 0}

    tem_bloqueios = deps["agendamentos"] > 0 or deps["eventos_operacionais"] > 0
    if tem_bloqueios and not remover_dependentes:
        raise ValueError(
            f"A empresa possui {deps['agendamentos']} agendamentos e {deps['eventos_operacionais']} "
            f"eventos que impedem a exclusão direta (RESTRICT). Utilize a opção de remover dependentes."
        )

    if remover_dependentes:
        # Busca agendamentos da empresa para limpar alocações e históricos antes
        agendamentos = db.query(Agendamento).filter(Agendamento.empresa_id == empresa_id).all()
        ag_ids = [a.id for a in agendamentos]
        if ag_ids:
            db.query(AlocacaoOperacional).filter(AlocacaoOperacional.agendamento_id.in_(ag_ids)).delete(synchronize_session=False)
            db.query(HistoricoAgendamento).filter(HistoricoAgendamento.agendamento_id.in_(ag_ids)).delete(synchronize_session=False)

        # Deleta eventos da empresa
        qtd_ev = db.query(EventoOperacional).filter(EventoOperacional.empresa_id == empresa_id).delete(synchronize_session=False)
        removidos["eventos"] = qtd_ev

        # Deleta agendamentos
        qtd_ag = db.query(Agendamento).filter(Agendamento.empresa_id == empresa_id).delete(synchronize_session=False)
        removidos["agendamentos"] = qtd_ag

    # Deleta contratos e vínculos (mesmo tendo CASCADE, limpamos explicitamente para relatório)
    removidos["contratos"] = db.query(ContratoConfiguracao).filter(ContratoConfiguracao.empresa_id == empresa_id).delete(synchronize_session=False)
    removidos["vinculos"] = db.query(MotoristaDedicadoVinculo).filter(MotoristaDedicadoVinculo.empresa_id == empresa_id).delete(synchronize_session=False)

    # Deleta a empresa
    qtd_emp = db.query(Empresa).filter(Empresa.id == empresa_id).delete(synchronize_session=False)
    removidos["empresas"] = qtd_emp

    return removidos


def remover_usuario_por_id(
    db: Session,
    usuario_id: UUID,
    remover_dependentes: bool = False,
    dry_run: bool = False,
) -> Dict[str, int]:
    """Remove um usuário e seus dependentes se solicitado."""
    total_usuarios = db.query(Usuario).count()
    if total_usuarios <= 1:
        raise ValueError("Operação abortada: Não é permitido excluir o único usuário do sistema.")

    deps = verificar_dependencias_usuario(db, usuario_id)
    removidos = {"usuarios": 0, "agendamentos": 0, "eventos": 0, "historicos": 0}

    tem_bloqueios = (
        deps["agendamentos_criados"] > 0
        or deps["eventos_gerados"] > 0
        or deps["historicos_alterados"] > 0
    )
    if tem_bloqueios and not remover_dependentes:
        raise ValueError(
            f"O usuário possui vínculos operacionais impeditivos: "
            f"{deps['agendamentos_criados']} agendamentos criados, {deps['eventos_gerados']} eventos, "
            f"{deps['historicos_alterados']} históricos de alteração. Use a opção de remover dependentes."
        )

    if remover_dependentes:
        # Se autorizado, remove agendamentos criados pelo usuário
        agendamentos = db.query(Agendamento).filter(Agendamento.criado_por_id == usuario_id).all()
        ag_ids = [a.id for a in agendamentos]
        if ag_ids:
            db.query(AlocacaoOperacional).filter(AlocacaoOperacional.agendamento_id.in_(ag_ids)).delete(synchronize_session=False)
            db.query(HistoricoAgendamento).filter(HistoricoAgendamento.agendamento_id.in_(ag_ids)).delete(synchronize_session=False)
            qtd_ag = db.query(Agendamento).filter(Agendamento.id.in_(ag_ids)).delete(synchronize_session=False)
            removidos["agendamentos"] = qtd_ag

        removidos["historicos"] = db.query(HistoricoAgendamento).filter(HistoricoAgendamento.alterado_por_id == usuario_id).delete(synchronize_session=False)
        removidos["eventos"] = db.query(EventoOperacional).filter(EventoOperacional.usuario_id == usuario_id).delete(synchronize_session=False)

    qtd_usr = db.query(Usuario).filter(Usuario.id == usuario_id).delete(synchronize_session=False)
    removidos["usuarios"] = qtd_usr

    return removidos


def fluxo_interativo_empresas(db: Session, dry_run: bool = False) -> None:
    """Interface de seleção interativa para exclusão de empresas."""
    empresas = db.query(Empresa).order_by(Empresa.nome).all()
    if not empresas:
        print("\nNenhuma empresa cadastrada no sistema.")
        return

    print("\n" + "=" * 70)
    print(" EMPRESAS CADASTRADAS")
    print("=" * 70)
    for idx, emp in enumerate(empresas, 1):
        status_txt = "Ativa" if emp.ativo else "Inativa"
        deps = verificar_dependencias_empresa(db, emp.id)
        info_deps = f"(Agendamentos: {deps['agendamentos']}, Contratos: {deps['contratos']}, Vínculos: {deps['vinculos']})"
        print(f"[{idx:2d}] {emp.nome} | CNPJ: {emp.identificacao} | {status_txt} {info_deps}")

    print("-" * 70)
    escolha = input("\nDigite os números das empresas a remover (ex: 1, 3) ou 'TODAS' ou '0' para cancelar: ").strip()
    if not escolha or escolha == "0":
        print("Operação cancelada.")
        return

    selecionadas: List[Empresa] = []
    if escolha.upper() == "TODAS":
        selecionadas = list(empresas)
    else:
        indices = [p.strip() for p in escolha.split(",") if p.strip()]
        for item in indices:
            if item.isdigit():
                num = int(item)
                if 1 <= num <= len(empresas):
                    selecionadas.append(empresas[num - 1])

    if not selecionadas:
        print("Nenhuma empresa válida selecionada.")
        return

    print("\nEmpresas que serão excluídas:")
    remover_dependentes = False
    tem_bloqueios_geral = False

    for emp in selecionadas:
        deps = verificar_dependencias_empresa(db, emp.id)
        print(f" - {emp.nome} (CNPJ: {emp.identificacao}) [Agendamentos: {deps['agendamentos']}, Eventos: {deps['eventos_operacionais']}]")
        if deps["agendamentos"] > 0 or deps["eventos_operacionais"] > 0:
            tem_bloqueios_geral = True

    if tem_bloqueios_geral:
        print("\nATENÇÃO: Uma ou mais empresas selecionadas possuem agendamentos ou eventos operacionais associados.")
        resp_deps = input("Deseja remover também os agendamentos e eventos vinculados a essas empresas? (s/N): ").strip().lower()
        remover_dependentes = resp_deps in ("s", "sim", "y", "yes")
        if not remover_dependentes:
            print("Não é possível prosseguir sem remover os registros operacionais dependentes da empresa. Operação abortada.")
            return

    confirmacao = input("\nEsta ação é irreversível! Digite 'SIM' para confirmar a exclusão: ").strip()
    if confirmacao != "SIM":
        print("Exclusão cancelada pelo usuário.")
        return

    try:
        total_removidas = 0
        for emp in selecionadas:
            res = remover_empresa_por_id(db, emp.id, remover_dependentes=remover_dependentes, dry_run=dry_run)
            total_removidas += res["empresas"]

        if dry_run:
            db.rollback()
            print(f"\n[DRY-RUN] Simulação concluída: {total_removidas} empresa(s) seriam removidas.")
        else:
            db.commit()
            print(f"\n[SUCESSO] {total_removidas} empresa(s) removida(s) com sucesso!")
    except Exception as exc:
        db.rollback()
        print(f"\n[ERRO] Falha ao remover empresa: {exc}")


def fluxo_interativo_usuarios(db: Session, dry_run: bool = False) -> None:
    """Interface de seleção interativa para exclusão de usuários."""
    usuarios = db.query(Usuario).order_by(Usuario.nome).all()
    if not usuarios:
        print("\nNenhum usuário cadastrado no sistema.")
        return

    print("\n" + "=" * 70)
    print(" USUÁRIOS CADASTRADOS")
    print("=" * 70)
    for idx, usr in enumerate(usuarios, 1):
        status_txt = "Ativo" if usr.ativo else "Inativo"
        deps = verificar_dependencias_usuario(db, usr.id)
        info_deps = f"(Agendamentos criados: {deps['agendamentos_criados']}, Eventos: {deps['eventos_gerados']})"
        print(f"[{idx:2d}] {usr.nome} <{usr.email}> | {status_txt} {info_deps}")

    print("-" * 70)
    escolha = input("\nDigite os números dos usuários a remover (ex: 1, 2) ou 'TODOS' ou '0' para cancelar: ").strip()
    if not escolha or escolha == "0":
        print("Operação cancelada.")
        return

    selecionados: List[Usuario] = []
    if escolha.upper() == "TODOS":
        selecionados = list(usuarios)
    else:
        indices = [p.strip() for p in escolha.split(",") if p.strip()]
        for item in indices:
            if item.isdigit():
                num = int(item)
                if 1 <= num <= len(usuarios):
                    selecionados.append(usuarios[num - 1])

    if not selecionados:
        print("Nenhum usuário válido selecionado.")
        return

    if len(selecionados) >= len(usuarios):
        print("\n[ERRO] Não é permitido excluir todos os usuários. O sistema necessita de ao menos 1 usuário ativo.")
        return

    print("\nUsuários que serão excluídos:")
    remover_dependentes = False
    tem_bloqueios_geral = False

    for usr in selecionados:
        deps = verificar_dependencias_usuario(db, usr.id)
        print(f" - {usr.nome} <{usr.email}> [Agendamentos: {deps['agendamentos_criados']}, Eventos: {deps['eventos_gerados']}]")
        if deps["agendamentos_criados"] > 0 or deps["eventos_gerados"] > 0 or deps["historicos_alterados"] > 0:
            tem_bloqueios_geral = True

    if tem_bloqueios_geral:
        print("\nATENÇÃO: Um ou mais usuários selecionados possuem agendamentos ou eventos criados no sistema.")
        resp_deps = input("Deseja remover também os registros operacionais vinculados a esses usuários? (s/N): ").strip().lower()
        remover_dependentes = resp_deps in ("s", "sim", "y", "yes")
        if not remover_dependentes:
            print("Não é possível prosseguir sem tratar as dependências do usuário. Operação abortada.")
            return

    confirmacao = input("\nEsta ação é irreversível! Digite 'SIM' para confirmar a exclusão: ").strip()
    if confirmacao != "SIM":
        print("Exclusão cancelada pelo usuário.")
        return

    try:
        total_removidos = 0
        for usr in selecionados:
            res = remover_usuario_por_id(db, usr.id, remover_dependentes=remover_dependentes, dry_run=dry_run)
            total_removidos += res["usuarios"]

        if dry_run:
            db.rollback()
            print(f"\n[DRY-RUN] Simulação concluída: {total_removidos} usuário(s) seriam removidos.")
        else:
            db.commit()
            print(f"\n[SUCESSO] {total_removidos} usuário(s) removido(s) com sucesso!")
    except Exception as exc:
        db.rollback()
        print(f"\n[ERRO] Falha ao remover usuário: {exc}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Utilitário para remoção seletiva de empresas e usuários do sistema."
    )
    parser.add_argument("--empresa", help="Nome, CNPJ ou UUID da empresa para remoção direta.")
    parser.add_argument("--usuario", help="Nome, E-mail ou UUID do usuário para remoção direta.")
    parser.add_argument("--cascade-dependentes", action="store_true", help="Remove agendamentos/eventos vinculados.")
    parser.add_argument("--dry-run", action="store_true", help="Simula a execução sem persistir.")
    parser.add_argument("-y", "--force", action="store_true", help="Confirma sem solicitar confirmação manual.")

    args = parser.parse_args()

    db = SessionLocal()
    try:
        # Modo linha de comando direto
        if args.empresa:
            termo = args.empresa.strip()
            empresa = (
                db.query(Empresa)
                .filter((Empresa.identificacao == termo) | (Empresa.nome.ilike(f"%{termo}%")))
                .first()
            )
            if not empresa:
                try:
                    emp_uuid = UUID(termo)
                    empresa = db.query(Empresa).filter(Empresa.id == emp_uuid).first()
                except ValueError:
                    pass

            if not empresa:
                print(f"[ERRO] Empresa não encontrada para o termo: '{termo}'")
                sys.exit(1)

            print(f"Empresa encontrada: {empresa.nome} (CNPJ: {empresa.identificacao})")
            if not args.force and not args.dry_run:
                conf = input("Confirmar exclusão? Digite 'SIM': ").strip()
                if conf != "SIM":
                    print("Operação cancelada.")
                    sys.exit(0)

            remover_empresa_por_id(db, empresa.id, remover_dependentes=args.cascade_dependentes, dry_run=args.dry_run)
            if args.dry_run:
                db.rollback()
                print("[DRY-RUN] Exclusão da empresa simulada com sucesso.")
            else:
                db.commit()
                print("[SUCESSO] Empresa removida com sucesso!")
            return

        if args.usuario:
            termo = args.usuario.strip()
            usuario = (
                db.query(Usuario)
                .filter((Usuario.email == termo) | (Usuario.nome.ilike(f"%{termo}%")))
                .first()
            )
            if not usuario:
                try:
                    usr_uuid = UUID(termo)
                    usuario = db.query(Usuario).filter(Usuario.id == usr_uuid).first()
                except ValueError:
                    pass

            if not usuario:
                print(f"[ERRO] Usuário não encontrado para o termo: '{termo}'")
                sys.exit(1)

            print(f"Usuário encontrado: {usuario.nome} <{usuario.email}>")
            if not args.force and not args.dry_run:
                conf = input("Confirmar exclusão? Digite 'SIM': ").strip()
                if conf != "SIM":
                    print("Operação cancelada.")
                    sys.exit(0)

            remover_usuario_por_id(db, usuario.id, remover_dependentes=args.cascade_dependentes, dry_run=args.dry_run)
            if args.dry_run:
                db.rollback()
                print("[DRY-RUN] Exclusão do usuário simulada com sucesso.")
            else:
                db.commit()
                print("[SUCESSO] Usuário removido com sucesso!")
            return

        # Modo Interativo via Menu
        while True:
            print("\n" + "=" * 55)
            print(" TORRE DE CONTROLE — GERENCIADOR DE EXCLUSÕES")
            print("=" * 55)
            print(" [1] Listar e selecionar Empresas para remover")
            print(" [2] Listar e selecionar Usuários para remover")
            print(" [0] Sair")
            print("-" * 55)
            opcao = input("Escolha uma opção: ").strip()

            if opcao == "1":
                fluxo_interativo_empresas(db, dry_run=args.dry_run)
            elif opcao == "2":
                fluxo_interativo_usuarios(db, dry_run=args.dry_run)
            elif opcao == "0":
                print("Saindo do gerenciador.")
                break
            else:
                print("Opção inválida. Tente novamente.")

    finally:
        db.close()


if __name__ == "__main__":
    main()
