import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import main


class StatsTests(unittest.TestCase):
    def setUp(self):
        self.scholar_id = "wr2qnW0AAAAJ"
        self.config = Path(__file__).resolve().parents[1] / "_config.yml"
        self.author = {
            "scholar_id": self.scholar_id,
            "name": "Test author",
            "citedby": 3,
            "publications": [{
                "author_pub_id": self.scholar_id + ":test-paper",
                "bib": {"title": "Test publication"},
                "num_citations": 0,
            }],
        }

    def test_shared_profile_configuration(self):
        self.assertEqual(main.load_scholar_id(self.config), self.scholar_id)

    def test_valid_zero_and_timestamp(self):
        data = main.build_stats(self.author, self.scholar_id)
        self.assertEqual(data["publications"][self.scholar_id + ":test-paper"]["num_citations"], 0)
        self.assertTrue(data["updated"].endswith("+00:00"))

    def test_reject_invalid_author_and_total(self):
        for field, value in [("scholar_id", "wrong"), ("name", ""), ("citedby", -1),
                             ("citedby", None), ("citedby", True)]:
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                main.build_stats(dict(self.author, **{field: value}), self.scholar_id)

    def test_reject_invalid_publications(self):
        for field, value in [("author_pub_id", "other:paper"), ("bib", {}),
                             ("num_citations", None), ("num_citations", -1),
                             ("num_citations", True), ("num_citations", "0")]:
            author = copy.deepcopy(self.author)
            author["publications"][0][field] = value
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                main.build_stats(author, self.scholar_id)

    def test_empty_and_duplicate_publications(self):
        for papers in [[], self.author["publications"] * 2]:
            with self.subTest(papers=papers), self.assertRaises(ValueError):
                main.build_stats(dict(self.author, publications=papers), self.scholar_id)

    def test_failed_fetch_preserves_cache(self):
        with tempfile.TemporaryDirectory() as directory:
            cache = Path(directory) / "gs_data.json"
            cache.write_text("previous valid cache", encoding="utf-8")
            with patch.object(main, "fetch_author", side_effect=TimeoutError), self.assertRaises(TimeoutError):
                main.update_stats(self.config, directory)
            self.assertEqual(cache.read_text(), "previous valid cache")
            with patch.object(main, "fetch_author", return_value={}), self.assertRaises(ValueError):
                main.update_stats(self.config, directory)
            self.assertEqual(cache.read_text(), "previous valid cache")

    def test_success_writes_both_outputs(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(main, "fetch_author", return_value=self.author):
            main.update_stats(self.config, directory)
            data = json.loads((Path(directory) / "gs_data.json").read_text())
            badge = json.loads((Path(directory) / "gs_data_shieldsio.json").read_text())
            self.assertEqual(data["scholar_id"], self.scholar_id)
            self.assertEqual(badge["message"], "3")
            self.assertFalse(list(Path(directory).glob("*.tmp")))


if __name__ == "__main__":
    unittest.main()
