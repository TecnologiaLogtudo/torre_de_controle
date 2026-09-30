"""Testes unitários e de integração para o script de limpeza operacional."""

import unittest
from unittest.mock import MagicMock

from scripts.limpar_dados_operacionais import limpar_dados_operacionais


class TestLimparDadosOperacionais(unittest.TestCase):
    """Conjunto de testes unitários para a função limpar_dados_operacionais."""

    def test_limpar_dados_operacionais_fluxo_completo_mock(self):
        """Valida a execução completa de limpeza operacional com uma sessão mockada."""
        db_mock = MagicMock()

        # Configura contadores simulados para cada query
        query_mock = MagicMock()
        query_mock.count.return_value = 5
        filter_mock = MagicMock()
        filter_mock.count.return_value = 2
        query_mock.filter.return_value = filter_mock

        db_mock.query.return_value = query_mock

        resultado = limpar_dados_operacionais(
            db=db_mock,
            remover_agendamentos=True,
            remover_contratos=True,
            remover_vinculos=True,
            limpar_todos_eventos=False,
            dry_run=False,
        )

        # Verifica os contadores retornados
        self.assertEqual(resultado["eventos_operacionais"], 2)
        self.assertEqual(resultado["alocacoes_operacionais"], 5)
        self.assertEqual(resultado["historico_agendamentos"], 5)
        self.assertEqual(resultado["agendamentos"], 5)
        self.assertEqual(resultado["contratos_configuracoes"], 5)
        self.assertEqual(resultado["motoristas_dedicados_vinculos"], 5)

        # Valida que o commit foi executado
        db_mock.commit.assert_called_once()
        db_mock.rollback.assert_not_called()

    def test_limpar_dados_operacionais_dry_run_mock(self):
        """Valida que no modo dry_run as deleções não ocorrem e é feito rollback."""
        db_mock = MagicMock()

        query_mock = MagicMock()
        query_mock.count.return_value = 10
        filter_mock = MagicMock()
        filter_mock.count.return_value = 3
        query_mock.filter.return_value = filter_mock

        db_mock.query.return_value = query_mock

        resultado = limpar_dados_operacionais(
            db=db_mock,
            remover_agendamentos=True,
            remover_contratos=True,
            remover_vinculos=True,
            limpar_todos_eventos=False,
            dry_run=True,
        )

        # Contagens devem refletir os registros encontrados
        self.assertEqual(resultado["eventos_operacionais"], 3)
        self.assertEqual(resultado["agendamentos"], 10)

        # Delete não deve ter sido chamado no modo dry-run
        query_mock.delete.assert_not_called()
        filter_mock.delete.assert_not_called()

        # No dry-run, deve chamar rollback e nunca commit
        db_mock.rollback.assert_called_once()
        db_mock.commit.assert_not_called()

    def test_limpar_dados_operacionais_limpar_todos_eventos_mock(self):
        """Valida opção limpar_todos_eventos=True."""
        db_mock = MagicMock()

        query_mock = MagicMock()
        query_mock.count.return_value = 8
        db_mock.query.return_value = query_mock

        resultado = limpar_dados_operacionais(
            db=db_mock,
            remover_agendamentos=True,
            remover_contratos=False,
            remover_vinculos=False,
            limpar_todos_eventos=True,
            dry_run=False,
        )

        self.assertEqual(resultado["eventos_operacionais"], 8)
        self.assertEqual(resultado["contratos_configuracoes"], 0)
        self.assertEqual(resultado["motoristas_dedicados_vinculos"], 0)
        db_mock.commit.assert_called_once()

    def test_limpar_dados_operacionais_apenas_vinculos_mock(self):
        """Valida opção de limpar apenas vínculos."""
        db_mock = MagicMock()

        query_mock = MagicMock()
        query_mock.count.return_value = 12
        db_mock.query.return_value = query_mock

        resultado = limpar_dados_operacionais(
            db=db_mock,
            remover_agendamentos=False,
            remover_contratos=False,
            remover_vinculos=True,
            dry_run=False,
        )

        self.assertEqual(resultado["eventos_operacionais"], 0)
        self.assertEqual(resultado["agendamentos"], 0)
        self.assertEqual(resultado["contratos_configuracoes"], 0)
        self.assertEqual(resultado["motoristas_dedicados_vinculos"], 12)
        db_mock.commit.assert_called_once()


if __name__ == "__main__":
    unittest.main()
