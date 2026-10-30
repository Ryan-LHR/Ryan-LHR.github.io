import argparse
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import Request, urlopen

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
        if not isinstance(paper_id, str) or not re.fullmatch(re.escape(scholar_id) + r":[A-Za-z0-9_-]+", paper_id):
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
        "updated": author.get("updated") or datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "citedby": author["citedby"],
        "publications": publications,
    }


def fetch_serpapi_page(scholar_id, api_key, start):
    params = urlencode({
        "engine": "google_scholar_author", "author_id": scholar_id,
        "hl": "en", "num": 100, "start": start, "api_key": api_key,
    })
    request = Request("https://serpapi.com/search.json?" + params,
                      headers={"Accept": "application/json"})
    try:
        with urlopen(request, timeout=45) as response:
            data = json.load(response)
    except HTTPError as error:
        hint = {
            401: "Check the SERPAPI_API_KEY repository secret.",
            403: "Check the SerpApi account permissions.",
            429: "Check the SerpApi quota and rate limit.",
        }.get(error.code, "Check the SerpApi service status and retry later.")
        # HTTP errors and response bodies can contain the request URL and secret.
        raise RuntimeError(f"SerpApi HTTP {error.code}. {hint}") from None
    except (URLError, TimeoutError, OSError):
        raise RuntimeError("SerpApi network request failed; the existing cache is unchanged.") from None
    except (ValueError, UnicodeDecodeError):
        raise RuntimeError("SerpApi returned invalid JSON; the existing cache is unchanged.") from None
    if (not isinstance(data, dict) or data.get("error") or
            data.get("search_metadata", {}).get("status") != "Success"):
        raise RuntimeError("SerpApi search failed. Check the account dashboard and quota.")
    return data


def fetch_author(scholar_id):
    api_key = os.environ.get("SERPAPI_API_KEY", "").strip()
    if not api_key:
        raise ValueError("Missing SERPAPI_API_KEY. Add it under repository Settings > Secrets and variables > Actions.")
    author = None
    start = 0
    # Bound pagination to avoid spending the API quota on a looping response.
    for _ in range(10):
        data = fetch_serpapi_page(scholar_id, api_key, start)
        parameters = data.get("search_parameters", {})
        if parameters.get("author_id") != scholar_id or parameters.get("engine") != "google_scholar_author":
            raise ValueError("SerpApi returned an unexpected author or search engine")
        processed = data["search_metadata"].get("processed_at", "")
        try:
            updated = datetime.strptime(processed, "%Y-%m-%d %H:%M:%S UTC").replace(tzinfo=timezone.utc).isoformat()
        except (TypeError, ValueError):
            raise ValueError("SerpApi returned a missing or invalid data timestamp") from None
        if author is None:
            table = data.get("cited_by", {}).get("table", [])
            total = next((row["citations"].get("all") for row in table if "citations" in row), None)
            author = {
                "scholar_id": parameters["author_id"],
                "name": data.get("author", {}).get("name"),
                "citedby": total,
                "updated": updated,
                "publications": [],
            }
        # Use the oldest page timestamp rather than relabeling cached data as fresh.
        author["updated"] = min(author["updated"], updated)
        articles = data.get("articles")
        if not isinstance(articles, list) or not articles:
            raise ValueError("SerpApi returned a missing or empty article list")
        for article in articles:
            author["publications"].append({
                "author_pub_id": article.get("citation_id"),
                "bib": {"title": article.get("title")},
                "num_citations": article.get("cited_by", {}).get("value"),
            })
        if not data.get("serpapi_pagination", {}).get("next"):
            missing = [paper for paper in author["publications"] if paper["num_citations"] is None]
            known = [paper["num_citations"] for paper in author["publications"] if paper["num_citations"] is not None]
            # Empty counts may denote uncited papers. Confirm against the complete
            # profile total before accepting zeros; never default unknown data.
            if (missing and type(author["citedby"]) is int and author["citedby"] >= 0 and
                    all(type(count) is int and count >= 0 for count in known) and
                    sum(known) == author["citedby"]):
                for paper in missing:
                    paper["num_citations"] = 0
            return author
        start += len(articles)
    raise ValueError("SerpApi exceeded the 10-page limit; keeping the existing cache")


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
