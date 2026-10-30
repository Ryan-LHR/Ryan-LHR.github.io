import os
from pathlib import Path
import subprocess
import tempfile
import unittest

import yaml


class WorkflowTests(unittest.TestCase):
    def test_serpapi_secret_is_scoped_and_schedule_is_preserved(self):
        workflow = Path(__file__).resolve().parents[1] / ".github/workflows/google_scholar_crawler.yaml"
        definition = yaml.safe_load(workflow.read_text())
        triggers = definition.get("on", definition.get(True))
        self.assertEqual(triggers["schedule"][0]["cron"], "0 8 * * *")
        self.assertIn("workflow_dispatch", triggers)
        steps = definition["jobs"]["build"]["steps"]
        fetch = next(step for step in steps if step.get("name") == "Fetch Google Scholar citations via SerpApi")
        self.assertEqual(fetch["env"]["SERPAPI_API_KEY"], "${{ secrets.SERPAPI_API_KEY }}")
        check = next(step for step in steps if step.get("name") == "Check SerpApi secret")
        self.assertIn("SERPAPI_API_KEY", check["run"])
        for step in steps:
            if step not in (check, fetch):
                self.assertNotIn("SERPAPI_API_KEY", step.get("env", {}))

    def test_secret_check_rejects_blank_values_without_logging_the_key(self):
        workflow = Path(__file__).resolve().parents[1] / ".github/workflows/google_scholar_crawler.yaml"
        definition = yaml.safe_load(workflow.read_text())
        check = next(step["run"] for step in definition["jobs"]["build"]["steps"]
                     if step.get("name") == "Check SerpApi secret")
        for key in ["", " \t\n", "test-only-key-not-real"]:
            result = subprocess.run(["bash", "-c", check], capture_output=True, text=True,
                                    env=dict(os.environ, SERPAPI_API_KEY=key))
            self.assertEqual(result.returncode, 0 if key.strip() else 1)
            if key.strip():
                self.assertNotIn(key, result.stdout + result.stderr)

    def test_cache_creation_incremental_update_and_no_change(self):
        workflow = Path(__file__).resolve().parents[1] / ".github/workflows/google_scholar_crawler.yaml"
        definition = yaml.safe_load(workflow.read_text())
        publish = next(step["run"] for step in definition["jobs"]["build"]["steps"]
                       if step.get("name") == "Publish citation cache")

        # Exercise only temporary local repositories, never the real GitHub remote.
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source"
            source.mkdir()
            remote = root / "origin.git"

            def git(*args, cwd=source):
                return subprocess.check_output(["git", *args], cwd=cwd, stderr=subprocess.STDOUT, text=True).strip()

            git("init", "--bare", str(remote))
            git("init", "-b", "main")
            git("config", "user.name", "Local test")
            git("config", "user.email", "test@example.invalid")
            (source / "README.md").write_text("Source worktree must remain unchanged.\n")
            git("add", "README.md")
            git("commit", "-m", "Test fixture")
            git("remote", "add", "origin", str(remote))
            original = git("rev-parse", "HEAD")
            previous = None
            for index, count in enumerate([1, 2, 2]):
                runner = root / f"runner-{index}"
                results = runner / "scholar-results"
                results.mkdir(parents=True)
                (results / "gs_data.json").write_text('{"citedby":' + str(count) + '}\n')
                (results / "gs_data_shieldsio.json").write_text('{"message":"' + str(count) + '"}\n')
                subprocess.run(["bash", "-c", publish], cwd=source,
                               env=dict(os.environ, RUNNER_TEMP=str(runner)),
                               check=True, capture_output=True, text=True)
                current = git("rev-parse", "google-scholar-stats", cwd=remote)
                if index == 1:
                    self.assertEqual(git("rev-parse", current + "^", cwd=remote), previous)
                if index == 2:
                    self.assertEqual(current, previous)
                self.assertEqual(git("rev-parse", "HEAD"), original)
                self.assertEqual(git("status", "--porcelain"), "")
                self.assertEqual(git("ls-tree", "--name-only", current, cwd=remote).splitlines(),
                                 ["gs_data.json", "gs_data_shieldsio.json"])
                previous = current


if __name__ == "__main__":
    unittest.main()
