"""Script utilitário para recuperação e recriação dos vínculos entre motoristas e veículos.

Lê a planilha mestre (ex: motoristas_3c_lactalis.xlsx ou arquivo informado) e recria
os registros na tabela 'motoristas_dedicados_vinculos', restabelecendo a amarração de
cada motorista com seu respectivo veículo, categoria (DEDICADO/SPOT) e empresa.

Uso:
    python scripts/recriar_vinculos_motoristas_veiculos.py [opções]

Opções:
    --arquivo <caminho>    Caminho da planilha (.xlsx ou .csv). Padrão: motoristas_3c_lactalis.xlsx
    --dry-run              Simula a recriação sem persistir no banco de dados.
    --criar-faltantes      Cria cadastros de motoristas ou veículos caso não existam no banco. (Padrão: True)
    -y, --force            Executa sem solicitar confirmação manual no console.
"""

import argparse
import csv
import io
import os
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

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

# Importa todos os modelos para resolução dos relacionamentos no SQLAlchemy
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
from app.motoristas.models import Motorista  # noqa: E402
from app.veiculos.models import Veiculo  # noqa: E402
from app.contratos.models import MotoristaDedicadoVinculo  # noqa: E402


def ler_linhas_planilha(caminho_arquivo: Path) -> List[List[str]]:
    """Lê arquivos .xlsx (via zip/xml nativo) ou .csv sem dependências externas."""
    if not caminho_arquivo.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {caminho_arquivo}")

    linhas_brutas: List[List[str]] = []

    if caminho_arquivo.suffix.lower() == ".csv":
        with open(caminho_arquivo, "r", encoding="utf-8-sig", errors="ignore") as f:
            reader = csv.reader(f, delimiter=",")
            for row in reader:
                if not any(row):
                    continue
                if len(row) == 1 and ";" in row[0]:
                    row = row[0].split(";")
                linhas_brutas.append([col.strip() for col in row])
    else:
        with zipfile.ZipFile(caminho_arquivo, "r") as z:
            shared_strings: List[str] = []
            if "xl/sharedStrings.xml" in z.namelist():
                tree = ET.fromstring(z.read("xl/sharedStrings.xml"))
                for si in tree.findall("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si"):
                    t = si.find(".//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")
                    shared_strings.append(t.text if t is not None and t.text else "")

            sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
            rows = sheet.findall(".//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row")
            for r in rows:
                row_vals: List[str] = []
                for c in r.findall("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c"):
                    t = c.get("t")
                    v = c.find("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v")
                    val = v.text if v is not None and v.text else ""
                    if t == "s" and val.isdigit():
                        val_idx = int(val)
                        val = shared_strings[val_idx] if val_idx < len(shared_strings) else val
                    row_vals.append(val.strip())
                if any(row_vals):
                    linhas_brutas.append(row_vals)

    return linhas_brutas


def processar_recriacao_vinculos(
    db: Session,
    linhas_planilha: List[List[str]],
    criar_faltantes: bool = True,
    dry_run: bool = False,
) -> Dict[str, Any]:
    """Processa as linhas e recria os vínculos entre motorista e veículo."""
    if not linhas_planilha:
        return {"total_linhas": 0, "vinculos_criados": 0, "vinculos_existentes": 0}

    header = [str(col).strip().upper() for col in linhas_planilha[0]]

    def buscar_indice(sub_nomes: List[str]) -> int:
        for idx, col in enumerate(header):
            for sub in sub_nomes:
                if sub.upper() in col:
                    return idx
        return -1

    idx_placa = buscar_indice(["PLACA"])
    idx_motorista = buscar_indice(["MOTORISTA"])
    idx_ident = buscar_indice(["IDENTIFICAÇÃO", "IDENTIFICACAO", "PREFIXO"])
    idx_tipo = buscar_indice(["TIPO"])
    idx_especialidade = buscar_indice(["ESPECIALIDADE"])
    idx_categoria = buscar_indice(["CATEGORIA"])
    idx_empresa = buscar_indice(["EMPRESA"])
    idx_status = buscar_indice(["STATUS"])

    if idx_placa == -1 or idx_motorista == -1:
        raise ValueError("A planilha precisa conter pelo menos as colunas 'Placa' e 'Motorista'.")

    # Mapeamento em memória de cadastros existentes para performance
    motoristas_map = {m.nome.strip().lower(): m for m in db.query(Motorista).all()}
    veiculos_map = {v.placa.strip().upper(): v for v in db.query(Veiculo).all()}
    empresas_map = {e.nome.strip().lower(): e for e in db.query(Empresa).all()}

    # Identifica motoristas e veículos que já possuem vínculo ativo
    vinculos_ativos_motorista = {v.motorista_id for v in db.query(MotoristaDedicadoVinculo).filter(MotoristaDedicadoVinculo.ativo == True).all()}
    vinculos_ativos_veiculo = {v.veiculo_id for v in db.query(MotoristaDedicadoVinculo).filter(MotoristaDedicadoVinculo.ativo == True, MotoristaDedicadoVinculo.veiculo_id.isnot(None)).all()}

    stats = {
        "total_linhas": len(linhas_planilha) - 1,
        "vinculos_criados": 0,
        "vinculos_ignorados_ja_vinculados": 0,
        "veiculos_criados": 0,
        "motoristas_criados": 0,
        "empresas_criadas": 0,
    }

    for row in linhas_planilha[1:]:
        def get_val(idx: int) -> str:
            return row[idx].strip() if 0 <= idx < len(row) and row[idx] else ""

        raw_placa = get_val(idx_placa)
        placa = re.sub(r"[^A-Z0-9]", "", raw_placa.upper())
        motorista_nome = get_val(idx_motorista).strip()

        if not placa or len(placa) < 7 or not motorista_nome:
            continue

        status_text = get_val(idx_status).upper()
        ativo = "INDISPONÍVEL" not in status_text and "INDISPONIVEL" not in status_text

        # 1. Obter ou criar Veículo
        veiculo = veiculos_map.get(placa)
        if not veiculo:
            if not criar_faltantes:
                continue
            tipo_veiculo = get_val(idx_tipo) or "OUTRO"
            especialidade_raw = get_val(idx_especialidade).upper()
            especialidade = "REFRIGERADO" if "REFRIGERADO" in especialidade_raw else "SECO"
            identificacao = get_val(idx_ident) or placa

            veiculo = Veiculo(
                identificacao=identificacao,
                placa=placa,
                tipo_veiculo=tipo_veiculo,
                especialidade=especialidade,
                ativo=ativo,
            )
            db.add(veiculo)
            db.flush()
            veiculos_map[placa] = veiculo
            stats["veiculos_criados"] += 1

        # 2. Obter ou criar Motorista
        chave_mot = motorista_nome.lower()
        motorista = motoristas_map.get(chave_mot)
        if not motorista:
            if not criar_faltantes:
                continue
            motorista = Motorista(nome=motorista_nome, ativo=ativo)
            db.add(motorista)
            db.flush()
            motoristas_map[chave_mot] = motorista
            stats["motoristas_criados"] += 1

        # 3. Tratar Empresa e Categoria
        categoria_raw = get_val(idx_categoria).upper()
        categoria_op = "DEDICADO" if "DEDICADO" in categoria_raw else "SPOT"
        empresa_id = None

        if categoria_op == "DEDICADO":
            empresa_nome = get_val(idx_empresa).strip()
            if empresa_nome:
                chave_emp = empresa_nome.lower()
                empresa = empresas_map.get(chave_emp)
                if not empresa and criar_faltantes:
                    slug_ident = re.sub(r"[^A-Z0-9]", "", empresa_nome.upper())[:18] or f"EMP-{placa}"[:18]
                    # Evita colisão
                    if db.query(Empresa).filter(Empresa.identificacao == slug_ident).first():
                        slug_ident = f"EMP-{placa}"[:18]
                    empresa = Empresa(nome=empresa_nome, identificacao=slug_ident, ativo=True)
                    db.add(empresa)
                    db.flush()
                    empresas_map[chave_emp] = empresa
                    stats["empresas_criadas"] += 1
                if empresa:
                    empresa_id = empresa.id

        # 4. Validar se motorista ou veículo já possuem vínculo ativo
        if motorista.id in vinculos_ativos_motorista or veiculo.id in vinculos_ativos_veiculo:
            stats["vinculos_ignorados_ja_vinculados"] += 1
            continue

        # 5. Criar o Vínculo entre Motorista e Veículo
        tipo_final = veiculo.tipo_veiculo or get_val(idx_tipo) or "OUTRO"
        vinculo = MotoristaDedicadoVinculo(
            empresa_id=empresa_id,
            motorista_id=motorista.id,
            veiculo_id=veiculo.id,
            tipo_veiculo=tipo_final,
            categoria_operacional=categoria_op,
            ativo=ativo,
        )
        db.add(vinculo)
        stats["vinculos_criados"] += 1
        vinculos_ativos_motorista.add(motorista.id)
        if veiculo.id:
            vinculos_ativos_veiculo.add(veiculo.id)

    if dry_run:
        db.rollback()
    else:
        db.commit()

    return stats


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Recria os vínculos entre motoristas e veículos com base na planilha mestre."
    )
    parser.add_argument(
        "--arquivo",
        default="motoristas_3c_lactalis.xlsx",
        help="Caminho do arquivo .xlsx ou .csv mestre.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simula a execução sem gravar no banco de dados.",
    )
    parser.add_argument(
        "-y",
        "--force",
        action="store_true",
        help="Executa diretamente sem confirmação manual no console.",
    )
    parser.add_argument(
        "--nao-criar-faltantes",
        action="store_true",
        help="Não cria cadastros de motoristas ou veículos que não estejam no banco.",
    )

    args = parser.parse_args()
    caminho = Path(args.arquivo)
    if not caminho.is_absolute():
        caminho = ROOT_DIR / caminho

    if not caminho.exists():
        print(f"[ERRO] O arquivo especificado não foi encontrado: {caminho}")
        sys.exit(1)

    print("=" * 70)
    print(" RECUPERAÇÃO DE VÍNCULOS MOTORISTA <-> VEÍCULO")
    print("=" * 70)
    print(f"Arquivo mestre: {caminho.name}")
    print(f"Modo Dry-Run (Simulação): {'SIM' if args.dry_run else 'NÃO'}")
    print(f"Criar cadastros faltantes: {'NÃO' if args.nao_criar_faltantes else 'SIM'}")
    print("-" * 70)

    if not args.dry_run and not args.force:
        conf = input("Deseja iniciar a recriação dos vínculos? (S/n): ").strip().lower()
        if conf not in ("", "s", "sim", "y", "yes"):
            print("Operação cancelada pelo usuário.")
            sys.exit(0)

    print("\nLendo dados da planilha...")
    linhas = ler_linhas_planilha(caminho)
    print(f"Total de linhas carregadas: {len(linhas)}")

    db = SessionLocal()
    try:
        resultado = processar_recriacao_vinculos(
            db=db,
            linhas_planilha=linhas,
            criar_faltantes=not args.nao_criar_faltantes,
            dry_run=args.dry_run,
        )

        prefixo = "Simulação (Dry-Run)" if args.dry_run else "Resultado"
        print(f"\n{prefixo}:")
        print(f" - Vínculos recriados (Motorista <-> Veículo): {resultado['vinculos_criados']}")
        print(f" - Vínculos já existentes (ignorados):         {resultado['vinculos_ignorados_ja_vinculados']}")
        print(f" - Novos motoristas cadastrados:               {resultado['motoristas_criados']}")
        print(f" - Novos veículos cadastrados:                 {resultado['veiculos_criados']}")
        print(f" - Novas empresas cadastradas:                 {resultado['empresas_criadas']}")

        if args.dry_run:
            print("\n[DRY-RUN] Nenhuma alteração persistida no banco.")
        else:
            print("\n[SUCESSO] Vínculos entre motoristas e veículos recuperados com sucesso!")

    except Exception as exc:
        db.rollback()
        print(f"\n[ERRO] Falha ao processar recuperação de vínculos: {exc}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
