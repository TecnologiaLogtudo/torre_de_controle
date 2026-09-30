import os
import unittest
from app.core.config import Settings


class TestConfig(unittest.TestCase):
    def test_cors_origins_empty_string(self):
        os.environ["BACKEND_CORS_ORIGINS"] = ""
        s = Settings()
        self.assertEqual(s.BACKEND_CORS_ORIGINS, [])

    def test_cors_origins_single_url(self):
        os.environ["BACKEND_CORS_ORIGINS"] = "https://www.logtudo.com.br"
        s = Settings()
        self.assertEqual(s.BACKEND_CORS_ORIGINS, ["https://www.logtudo.com.br"])

    def test_cors_origins_comma_separated(self):
        os.environ["BACKEND_CORS_ORIGINS"] = "https://a.com, https://b.com"
        s = Settings()
        self.assertEqual(s.BACKEND_CORS_ORIGINS, ["https://a.com", "https://b.com"])

    def test_cors_origins_json_array(self):
        os.environ["BACKEND_CORS_ORIGINS"] = '["https://a.com", "https://b.com"]'
        s = Settings()
        self.assertEqual(s.BACKEND_CORS_ORIGINS, ["https://a.com", "https://b.com"])

    def test_cors_origins_with_path_normalizes_to_origin(self):
        os.environ["BACKEND_CORS_ORIGINS"] = "https://www.logtudo.com.br/api"
        s = Settings()
        self.assertIn("https://www.logtudo.com.br", s.BACKEND_CORS_ORIGINS)

    def tearDown(self):
        os.environ.pop("BACKEND_CORS_ORIGINS", None)
