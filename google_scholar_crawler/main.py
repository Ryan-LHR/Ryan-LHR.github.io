import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import yaml


def load_scholar_id(config_path):
    with open(config_path, encoding="utf-8") as source:
        config = yaml.safe_load(source)
    url = config["author"]["googlescholar"]
    scholar_id = parse_qs(urlparse(url).query).get("user", [""])[0]
    if not re.fullmatch(r"[A-Za-z0-9_-]{12}", scholar_id):
        raise ValueError("Set a valid author.googlescholar URL in _config.yml")
    return scholar_id


def build_stats(author, scholar_id):
    if author.get("scholar_id") != scholar_id or not author.get("name"):
        raise ValueError("Scholar returned an unexpected author")
    if type(author.get("citedby")) is not int or author["citedby"] < 0:
        raise ValueError("Missing or invalid total citation count")
    publications = {}
    for paper in author.get("publications", []):
        paper_id = paper.get("author_pub_id", "")
        if not re.fullmatch(re.escape(scholar_id) + r":[A-Za-z0-9_-]+", paper_id):
            raise ValueError("Invalid publication ID")
        if paper_id in publications or not paper.get("bib", {}).get("title"):
            raise ValueError("Duplicate publication ID or missing title")
        if type(paper.get("num_citations")) is not int or paper["num_citations"] < 0:
            raise ValueError("Missing or invalid publication citation count")
        publications[paper_id] = {
            "author_pub_id": paper_id,
            "bib": {"title": paper["bib"]["title"]},
            "num_citations": paper["num_citations"],
        }
    if not publications:
        raise ValueError("Empty publication list; keeping the last valid cache")
    return {
        "scholar_id": scholar_id,
        "name": author["name"],
        "updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "citedby": author["citedby"],
        "publications": publications,
    }


def fetch_author(scholar_id):
    from scholarly import scholarly

    scholarly.set_timeout(15)
    scholarly.set_retries(1)
    author = scholarly.search_author_id(scholar_id)
    scholarly.fill(author, sections=["basics", "indices", "publications"])
    return author


def update_stats(config_path, output_dir):
    scholar_id = load_scholar_id(config_path)
    author = build_stats(fetch_author(scholar_id), scholar_id)
    shieldio_data = {"schemaVersion": 1, "label": "citations", "message": str(author["citedby"])}
    # Validate the entire response before touching the last successful snapshot.
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    for name, data in [("gs_data.json", author), ("gs_data_shieldsio.json", shieldio_data)]:
        temporary = output_dir / (name + ".tmp")
        temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temporary.replace(output_dir / name)
    print(f"Updated {len(author['publications'])} publications for {author['name']} at {author['updated']}")


if __name__ == "__main__":
    directory = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=directory / "results")
    args = parser.parse_args()
    update_stats(directory.parent / "_config.yml", args.output)
