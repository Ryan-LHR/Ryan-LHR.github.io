import copy
from io import BytesIO
import json
import os
from pathlib import Path
import tempfile
import traceback
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlparse

import main


class SerpApiTests(unittest.TestCase):
    def setUp(self):
        self.scholar_id = "wr2qnW0AAAAJ"
        self.key = "test-only-not-a-real-key"
        self.environment = patch.dict(os.environ, {"SERPAPI_API_KEY": self.key}, clear=True)
        self.environment.start()
        self.addCleanup(self.environment.stop)
        self.page = {
            "search_metadata": {"status": "Success", "processed_at": "2026-10-30 08:15:41 UTC"},
            "search_parameters": {"engine": "google_scholar_author", "author_id": self.scholar_id},
            "author": {"name": "Test author"},
            "cited_by": {"table": [{"citations": {"all": 3, "since_2021": 2}}]},
            "articles": [{"citation_id": self.scholar_id + ":paper-1", "title": "Test publication",
                          "cited_by": {"value": 0}}],
        }

    def response(self, data):
        return BytesIO(json.dumps(data).encode())

    def test_single_page_maps_to_existing_schema_and_explicit_zero(self):
        with patch.object(main, "urlopen", return_value=self.response(self.page)) as request:
            stats = main.build_stats(main.fetch_author(self.scholar_id), self.scholar_id)
        self.assertEqual(stats["name"], "Test author")
        self.assertEqual(stats["citedby"], 3)
        self.assertEqual(stats["updated"], "2026-10-30T08:15:41+00:00")
        self.assertEqual(stats["publications"][self.scholar_id + ":paper-1"]["num_citations"], 0)
        params = parse_qs(urlparse(request.call_args.args[0].full_url).query)
        self.assertEqual(params["author_id"], [self.scholar_id])
        self.assertEqual(params["engine"], ["google_scholar_author"])
        self.assertEqual(params["num"], ["100"])
        self.assertEqual(params["api_key"], [self.key])
        self.assertEqual(request.call_args.kwargs["timeout"], 45)
        self.assertNotIn(self.key, json.dumps(stats))

    def test_missing_key_fails_without_a_network_request(self):
        for key in ["", " \t\n"]:
            with self.subTest(key=key), patch.dict(os.environ, {"SERPAPI_API_KEY": key}), \
                    patch.object(main, "urlopen") as request, self.assertRaisesRegex(ValueError, "Missing SERPAPI_API_KEY"):
                main.fetch_author(self.scholar_id)
            request.assert_not_called()

    def test_pagination_uses_fixed_endpoint_and_conservative_timestamp(self):
        first = copy.deepcopy(self.page)
        first["serpapi_pagination"] = {"next": "https://untrusted.example/never-follow-this?api_key=secret"}
        second = copy.deepcopy(self.page)
        second["search_metadata"]["processed_at"] = "2026-10-30 07:00:00 UTC"
        second["articles"][0]["citation_id"] = self.scholar_id + ":paper-2"
        with patch.object(main, "urlopen", side_effect=[self.response(first), self.response(second)]) as request:
            stats = main.build_stats(main.fetch_author(self.scholar_id), self.scholar_id)
        self.assertEqual(len(stats["publications"]), 2)
        self.assertEqual(stats["updated"], "2026-10-30T07:00:00+00:00")
        for index, call in enumerate(request.call_args_list):
            url = urlparse(call.args[0].full_url)
            self.assertEqual(url.netloc, "serpapi.com")
            self.assertEqual(parse_qs(url.query)["start"], [str(index)])

    def test_bounded_pagination(self):
        page = copy.deepcopy(self.page)
        page["serpapi_pagination"] = {"next": "more"}
        with patch.object(main, "fetch_serpapi_page", return_value=page) as request, \
                self.assertRaisesRegex(ValueError, "10-page limit"):
            main.fetch_author(self.scholar_id)
        self.assertEqual(request.call_count, 10)

    def test_service_and_transport_errors_do_not_expose_the_secret(self):
        failures = [
            HTTPError("https://serpapi.com/search?api_key=" + self.key, code, self.key, {}, None)
            for code in [400, 401, 403, 429, 500]
        ] + [URLError(self.key), TimeoutError(self.key), OSError(self.key)]
        for failure in failures:
            with self.subTest(failure=type(failure).__name__), patch.object(main, "urlopen", side_effect=failure):
                try:
                    main.fetch_author(self.scholar_id)
                    self.fail("Expected a sanitized error")
                except RuntimeError:
                    error = traceback.format_exc()
                    self.assertIn("SerpApi", error)
                    self.assertNotIn(self.key, error)
        for response in [b"not JSON", b"\xff"]:
            with patch.object(main, "urlopen", return_value=BytesIO(response)), \
                    self.assertRaisesRegex(RuntimeError, "invalid JSON"):
                main.fetch_author(self.scholar_id)
        for data in [None, {"error": self.key}, {"search_metadata": {"status": "Error"}}]:
            with patch.object(main, "urlopen", return_value=self.response(data)), \
                    self.assertRaisesRegex(RuntimeError, "SerpApi search failed") as error:
                main.fetch_author(self.scholar_id)
            self.assertNotIn(self.key, str(error.exception))

    def test_reject_wrong_profile_incomplete_and_invalid_data(self):
        changes = [
            lambda page: page["search_parameters"].update(author_id="wrong"),
            lambda page: page["search_parameters"].update(engine="google"),
            lambda page: page["search_metadata"].update(processed_at="invalid"),
            lambda page: page.update(articles=[]),
            lambda page: page.update(articles=None),
            lambda page: page["author"].update(name=""),
            lambda page: page["cited_by"].update(table=[]),
            lambda page: page["articles"][0].update(citation_id=None),
            lambda page: page["articles"][0].update(citation_id="another:paper"),
            lambda page: page["articles"][0].update(cited_by={}),
            lambda page: page["articles"][0]["cited_by"].update(value=True),
            lambda page: page["articles"].append(page["articles"][0]),
        ]
        for change in changes:
            page = copy.deepcopy(self.page)
            change(page)
            with patch.object(main, "urlopen", return_value=self.response(page)), self.assertRaises(ValueError):
                main.build_stats(main.fetch_author(self.scholar_id), self.scholar_id)

    def test_failed_second_page_does_not_publish_a_partial_cache(self):
        first = copy.deepcopy(self.page)
        first["serpapi_pagination"] = {"next": "more"}
        config = Path(__file__).resolve().parents[1] / "_config.yml"
        with tempfile.TemporaryDirectory() as directory:
            cache = Path(directory) / "gs_data.json"
            cache.write_text("previous valid cache", encoding="utf-8")
            with patch.object(main, "fetch_serpapi_page", side_effect=[first, RuntimeError("Network error")]), \
                    self.assertRaises(RuntimeError):
                main.update_stats(config, directory)
            self.assertEqual(cache.read_text(), "previous valid cache")


if __name__ == "__main__":
    unittest.main()
