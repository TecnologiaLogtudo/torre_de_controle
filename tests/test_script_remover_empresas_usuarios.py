"""Testes unitários para o script interativo de remoção de empresas e usuários."""

import unittest
from unittest.mock import MagicMock
from uuid import uuid4

from scripts.remover_empresas_usuarios import (
    verificar_dependencias_empresa,
    verificar_dependencias_usuario,
    remover_empresa_por_id,
    remover_usuario_por_id,
)


class TestRemoverEmpresasUsuarios(unittest.TestCase):
    """Testes unitários para as funções de verificação e remoção seletiva."""

    def test_verificar_dependencias_empresa(self):
        """Valida que as queries de contagem de dependências da empresa são executadas."""
        db_mock = MagicMock()
        query_mock = MagicMock()
        filter_mock = MagicMock()
        filter_mock.count.side_effect = [3, 4, 1, 2]  # ag, ev, cont, vinc
        query_mock.filter.return_value = filter_mock
        db_mock.query.return_value = query_mock

        empresa_id = uuid4()
        deps = verificar_dependencias_empresa(db_mock, empresa_id)

        self.assertEqual(deps["agendamentos"], 3)
        self.assertEqual(deps["eventos_operacionais"], 4)
        self.assertEqual(deps["contratos"], 1)
        self.assertEqual(deps["vinculos"], 2)

    def test_remover_empresa_bloqueio_sem_cascade(self):
        """Valida que ValueError é lançado se a empresa tiver agendamentos e cascade for falso."""
        db_mock = MagicMock()
        query_mock = MagicMock()
        filter_mock = MagicMock()
        filter_mock.count.side_effect = [2, 0, 0, 0]  # agendamentos > 0
        query_mock.filter.return_value = filter_mock
        db_mock.query.return_value = query_mock

        empresa_id = uuid4()
        with self.assertRaises(ValueError) as ctx:
            remover_empresa_por_id(db_mock, empresa_id, remover_dependentes=False)

        self.assertIn("RESTRICT", str(ctx.exception))

    def test_remover_empresa_com_remover_dependentes(self):
        """Valida remoção em cascata de dependentes e exclusão da empresa."""
        db_mock = MagicMock()
        query_mock = MagicMock()
        filter_mock = MagicMock()
        # count das dependências
        filter_mock.count.side_effect = [1, 1, 1, 1]

        # all de agendamentos
        ag_mock = MagicMock()
        ag_mock.id = uuid4()
        filter_mock.all.return_value = [ag_mock]

        # delete calls
        filter_mock.delete.return_value = 1
        query_mock.filter.return_value = filter_mock
        db_mock.query.return_value = query_mock

        empresa_id = uuid4()
        removidos = remover_empresa_por_id(db_mock, empresa_id, remover_dependentes=True)

        self.assertEqual(removidos["empresas"], 1)
        self.assertEqual(removidos["agendamentos"], 1)

    def test_remover_usuario_bloqueio_ultimo_usuario(self):
        """Valida que o script recusa excluir se houver apenas 1 usuário no sistema."""
        db_mock = MagicMock()
        query_mock = MagicMock()
        query_mock.count.return_value = 1  # Apenas 1 usuário cadastrado
        db_mock.query.return_value = query_mock

        usuario_id = uuid4()
        with self.assertRaises(ValueError) as ctx:
            remover_usuario_por_id(db_mock, usuario_id, remover_dependentes=False)

        self.assertIn("único usuário", str(ctx.exception))

    def test_remover_usuario_sucesso(self):
        """Valida remoção de usuário quando há mais de um usuário e sem dependências impeditivas."""
        db_mock = MagicMock()
        query_mock = MagicMock()
        # total de usuários > 1
        query_mock.count.return_value = 3

        filter_mock = MagicMock()
        # dependências zeradas
        filter_mock.count.side_effect = [0, 0, 0]
        # delete call
        filter_mock.delete.return_value = 1

        query_mock.filter.return_value = filter_mock
        db_mock.query.return_value = query_mock

        usuario_id = uuid4()
        removidos = remover_usuario_por_id(db_mock, usuario_id, remover_dependentes=False)

        self.assertEqual(removidos["usuarios"], 1)


if __name__ == "__main__":
    unittest.main()
