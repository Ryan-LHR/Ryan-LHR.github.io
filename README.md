
<h1 align="center">
AcadHomepage
</h1>

<div align="center">

[![](https://img.shields.io/github/stars/RayeRen/acad-homepage.github.io)](https://github.com/RayeRen/acad-homepage.github.io)
[![](https://img.shields.io/github/forks/RayeRen/acad-homepage.github.io)](https://github.com/RayeRen/acad-homepage.github.io)
[![](https://img.shields.io/github/issues/RayeRen/acad-homepage.github.io)](https://github.com/RayeRen/acad-homepage.github.io)
[![](https://img.shields.io/github/license/RayeRen/acad-homepage.github.io)](https://github.com/RayeRen/acad-homepage.github.io/blob/main/LICENSE)  | [中文文档](./docs/README-zh.md) 
</div>

<p align="center">A Modern and Responsive Academic Personal Homepage</p>

<p align="center">
    <br>
    <img src="docs/screenshot.png" width="100%"/>
    <br>
</p>

Some examples:
- [Demo Page](https://rayeren.github.io/acad-homepage.github.io/)
- [Personal Homepage of the author](https://rayeren.github.io/)

## Key Features
- **Automatically update google scholar citations**: using the google scholar crawler and github action, this REPO can update the author citations and publication citations automatically.
- **Support Google analytics**: you can trace the traffics of your homepage by easy configuration.
- **Responsive**: this homepage automatically adjust for different screen sizes and viewports.
- **Beautiful and Simple Design**: this homepage is beautiful and simple, which is very suitable for academic personal homepage.
- **SEO**: search Engine Optimization (SEO) helps search engines find the information you publish on your homepage easily, then rank it against similar websites.

## Quick Start

1. Fork this REPO and rename to `USERNAME.github.io`, where `USERNAME` is your github USERNAME.
1. Configure the google scholar citation crawler:
    1. Find your google scholar ID in the url of your google scholar page (e.g., https://scholar.google.com/citations?user=SCHOLAR_ID), where `SCHOLAR_ID` is your google scholar ID.
    1. Set `author.googlescholar` in `_config.yml` to your public profile URL, and `repository` to the actual GitHub repository. The crawler and page use this same profile; no Google password or `GOOGLE_SCHOLAR_ID` secret is needed.
    1. Create a [SerpApi](https://serpapi.com/users/sign_up) account and add its API key as the **repository secret** `SERPAPI_API_KEY` under **Settings > Secrets and variables > Actions**. Do not put the key in the configuration, frontend, or source code. The crawler uses SerpApi's Google Scholar Author API instead of scraping Google directly; see the [setup and verification guide](docs/citation-updates.md).
    1. After reviewing and publishing the workflow, enable **Get Citation Data** in GitHub Actions and use **Run workflow** for the first run on the updated default branch. It then runs daily at 08:00 UTC (16:00 Asia/Shanghai), writing `gs_data.json` to `google-scholar-stats` without force-pushing. Failed fetches preserve the previous cache. This requires the workflow's `contents: write` permission; no separate GitHub token secret is needed.
1. Generate favicon using [favicon-generator](https://redketchup.io/favicon-generator) and download all generated files to `REPO/images`.
1. Modify the configuration of your homepage `_config.yml`:
    1. `title`: the title of your homepage
    1. `description`: the description of your homepage
    1. `repository`: USER_NAME/REPO_NAME  
    1. `google_analytics_id` (optional): google analytics ID
    1. SEO Related keys (optional): get these keys from search engine consoles (e.g. Google, Bing and Baidu) and paste here.
    1. `author`: the author information of this homepage, including some other websites, emails, city and univeristy.
    1. More configuration details are described in the comments.
1. Add your homepage content in `_pages/about.md`.
    1. You can use html+markdown syntax just same as jekyll.
    1. Add a hidden citation badge with the full paper title:
        ```html
        <a class="show_paper_citations" data-paper-title="Full paper title" hidden><img class="citation-badge" alt="" height="20" decoding="async"></a>
        ``` 
        The page matches a unique full title in the configured author's fetched publications (ignoring case and punctuation). It uses the returned Scholar ID for the link, not a guessed ID. Missing, ambiguous or invalid records stay hidden; a verified zero is displayed as `0`. Citation badges use the same Shields `social` style as GitHub stars. The page loads both the checked-in snapshot at `assets/data/google-scholar-stats.json` and the automated cache, preferring the newest valid record for each paper regardless of response order. Hover over a badge to see its actual data date. A failed workflow does not refresh the snapshot, but no longer prevents badges from appearing. For a local refresh, supply `SERPAPI_API_KEY` securely in the environment, run `python google_scholar_crawler/main.py --output /tmp/scholar-results`, copy its validated `gs_data.json` to `assets/data/google-scholar-stats.json`, then review and publish the change. Never replace missing data with made-up counts or change a snapshot's date without fetching again.
1. Your page will be published at `https://USERNAME.github.io`.

## GitHub Activity

The final Open-Source Projects section includes a numeric sidebar and contribution calendar.
`assets/js/github-activity.js` requests public data from [GitHub Contributions API](https://github.com/grubersjoe/github-contributions-api) using `?y=last` (one-hour upstream cache; no token required).
The graph and total use the same latest 365 available days, including dates across calendar years; the displayed date range makes the snapshot explicit. Missing, incomplete, or stale data hides this optional block instead of displaying a false zero. No GitHub Actions workflow is needed for this component.

## Debug Locally

1. Clone your REPO to local using `git clone`.
1. Install Jekyll building environment, including `Ruby`, `RubyGems`, `GCC` and `Make` following [the installation guide](https://jekyllrb.com/docs/installation/#requirements).
1. Run `bash run_server.sh` to start Jekyll livereload server.
1. Open http://127.0.0.1:4000 in your browser.
1. If you change the source code of the website, the livereload server will automatically refresh.
1. When you finish the modification of your homepage, `commit` your changings and `push` to your remote REPO using `git` command.

# Acknowledges

- AcadHomepage incorporates Font Awesome, which is distributed under the terms of the SIL OFL 1.1 and MIT License.
- AcadHomepage is influenced by the github repo [mmistakes/minimal-mistakes](https://github.com/mmistakes/minimal-mistakes), which is distributed under the MIT License.
- AcadHomepage is influenced by the github repo [academicpages/academicpages.github.io](https://github.com/academicpages/academicpages.github.io), which is distributed under the MIT License.
