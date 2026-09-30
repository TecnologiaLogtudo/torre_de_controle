"""Testes unitários para o script de recuperação de vínculos motoristas-veículos."""

import unittest
from unittest.mock import MagicMock
from uuid import uuid4

from scripts.recriar_vinculos_motoristas_veiculos import processar_recriacao_vinculos
from app.motoristas.models import Motorista
from app.veiculos.models import Veiculo
from app.empresas.models import Empresa


class TestRecriarVinculos(unittest.TestCase):
    """Testes unitários para a função processar_recriacao_vinculos."""

    def test_recriar_vinculos_spot_com_sucesso(self):
        """Valida criação de vínculo SPOT relacionando motorista e veículo."""
        db_mock = MagicMock()

        mot_id = uuid4()
        veic_id = uuid4()

        mot = Motorista(nome="Carlos Silva", ativo=True)
        mot.id = mot_id
        veic = Veiculo(placa="ABC1D23", identificacao="ABC1D23", tipo_veiculo="FIORINO", especialidade="SECO", ativo=True)
        veic.id = veic_id

        # Mocks para queries iniciais de busca
        query_mock = MagicMock()
        # Retorna listas vazias para vínculos existentes, e motorista/veículo cadastrados
        def mock_query(model):
            m = MagicMock()
            if model == Motorista:
                m.all.return_value = [mot]
            elif model == Veiculo:
                m.all.return_value = [veic]
            elif model == Empresa:
                m.all.return_value = []
            else:
                filter_mock = MagicMock()
                filter_mock.all.return_value = []
                m.filter.return_value = filter_mock
            return m

        db_mock.query.side_effect = mock_query

        linhas = [
            ["Placa", "Identificação", "Tipo", "Especialidade", "Motorista", "Categoria", "Empresa", "Status"],
            ["ABC-1D23", "", "FIORINO", "Seco", "Carlos Silva", "Spot", "", "DISPONÍVEL"],
        ]

        resultado = processar_recriacao_vinculos(
            db=db_mock,
            linhas_planilha=linhas,
            criar_faltantes=False,
            dry_run=False,
        )

        self.assertEqual(resultado["vinculos_criados"], 1)
        self.assertEqual(resultado["vinculos_ignorados_ja_vinculados"], 0)
        db_mock.add.assert_called_once()
        db_mock.commit.assert_called_once()

    def test_recriar_vinculos_ignora_ja_vinculados(self):
        """Valida que motoristas já vinculados não recebem vínculo duplicado."""
        db_mock = MagicMock()
        mot_id = uuid4()
        veic_id = uuid4()

        mot = Motorista(nome="Joao Souza", ativo=True)
        mot.id = mot_id
        veic = Veiculo(placa="XYZ9K88", identificacao="XYZ9K88", tipo_veiculo="HR", especialidade="SECO", ativo=True)
        veic.id = veic_id

        # Simula que o motorista já tem vínculo ativo
        vinc_existente = MagicMock()
        vinc_existente.motorista_id = mot_id
        vinc_existente.veiculo_id = veic_id

        def mock_query(model):
            m = MagicMock()
            if model == Motorista:
                m.all.return_value = [mot]
            elif model == Veiculo:
                m.all.return_value = [veic]
            elif model == Empresa:
                m.all.return_value = []
            else:
                filter_mock = MagicMock()
                filter_mock.all.return_value = [vinc_existente]
                m.filter.return_value = filter_mock
            return m

        db_mock.query.side_effect = mock_query

        linhas = [
            ["Placa", "Identificação", "Tipo", "Especialidade", "Motorista", "Categoria", "Empresa", "Status"],
            ["XYZ9K88", "", "HR", "Seco", "Joao Souza", "Spot", "", "DISPONÍVEL"],
        ]

        resultado = processar_recriacao_vinculos(
            db=db_mock,
            linhas_planilha=linhas,
            criar_faltantes=False,
            dry_run=False,
        )

        self.assertEqual(resultado["vinculos_criados"], 0)
        self.assertEqual(resultado["vinculos_ignorados_ja_vinculados"], 1)
        db_mock.commit.assert_called_once()

    def test_recriar_vinculos_dry_run(self):
        """Valida que no modo dry_run é feito rollback."""
        db_mock = MagicMock()
        mot_id = uuid4()
        veic_id = uuid4()

        mot = Motorista(nome="Maria Lima", ativo=True)
        mot.id = mot_id
        veic = Veiculo(placa="KLL3M44", identificacao="KLL3M44", tipo_veiculo="TRUCK", especialidade="REFRIGERADO", ativo=True)
        veic.id = veic_id

        def mock_query(model):
            m = MagicMock()
            if model == Motorista:
                m.all.return_value = [mot]
            elif model == Veiculo:
                m.all.return_value = [veic]
            elif model == Empresa:
                m.all.return_value = []
            else:
                filter_mock = MagicMock()
                filter_mock.all.return_value = []
                m.filter.return_value = filter_mock
            return m

        db_mock.query.side_effect = mock_query

        linhas = [
            ["Placa", "Identificação", "Tipo", "Especialidade", "Motorista", "Categoria", "Empresa", "Status"],
            ["KLL3M44", "", "TRUCK", "Refrigerado", "Maria Lima", "Spot", "", "DISPONÍVEL"],
        ]

        resultado = processar_recriacao_vinculos(
            db=db_mock,
            linhas_planilha=linhas,
            criar_faltantes=False,
            dry_run=True,
        )

        self.assertEqual(resultado["vinculos_criados"], 1)
        db_mock.rollback.assert_called_once()
        db_mock.commit.assert_not_called()


if __name__ == "__main__":
    unittest.main()
