(function () {
    'use strict';

    var script = document.currentScript;
    var citationEles = Array.from(document.querySelectorAll('.show_paper_citations'));
    var totalCitation = document.getElementById('total_cit');
    if (!citationEles.length && !totalCitation) return;

    var scholarId = new URL(script.dataset.scholarUrl).searchParams.get('user');
    var latestTotalUpdate = -Infinity;
    var citationUpdates = new WeakMap();

    function validCount(value) {
        return Number.isSafeInteger(value) && value >= 0;
    }

    function normalizeTitle(title) {
        return typeof title === 'string' ? title.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    }

    function showStats(data) {
        if (!data || data.scholar_id !== scholarId || !data.publications ||
            !Number.isFinite(Date.parse(data.updated))) return;
        var updated = Date.parse(data.updated);
        if (totalCitation && validCount(data.citedby) && updated > latestTotalUpdate) {
            latestTotalUpdate = updated;
            totalCitation.textContent = data.citedby;
        }
        citationEles.forEach(function (element) {
            var title = normalizeTitle(element.dataset.paperTitle);
            if (!title) return;
            // Only a unique full-title match may supply a paper's ID and count.
            var matches = Object.entries(data.publications).filter(function (entry) {
                return entry[1] && entry[1].bib && normalizeTitle(entry[1].bib.title) === title;
            });
            if (matches.length !== 1) return;
            var paperId = matches[0][0];
            var paper = matches[0][1];
            if (!paperId.startsWith(scholarId + ':') || paper.author_pub_id !== paperId ||
                !validCount(paper.num_citations)) return;
            if (citationUpdates.has(element) && updated <= citationUpdates.get(element)) return;
            citationUpdates.set(element, updated);

            var href = new URL('https://scholar.google.com/citations');
            href.searchParams.set('view_op', 'view_citation');
            href.searchParams.set('user', scholarId);
            href.searchParams.set('citation_for_view', paperId);
            element.href = href.toString();
            element.title = 'Google Scholar; updated ' + new Date(data.updated).toISOString().slice(0, 10) + ' (UTC)';
            element.setAttribute('aria-label', 'Google Scholar citations: ' + paper.num_citations + '. ' + element.dataset.paperTitle);
            var badge = element.querySelector('.citation-badge');
            var badgeUrl = new URL('https://img.shields.io/badge/Citations-' + paper.num_citations + '-blue');
            badgeUrl.searchParams.set('style', 'social');
            badgeUrl.searchParams.set('logo', 'googlescholar');
            badgeUrl.searchParams.set('logoColor', '333');
            badge.alt = 'Google Scholar citations: ' + paper.num_citations;
            badge.onload = function () { element.hidden = false; };
            badge.onerror = function () { element.hidden = true; };
            badge.src = badgeUrl.toString();
        });
    }

    function loadStats(url) {
        if (!url) return;
        var controller = new AbortController();
        var timeout = setTimeout(function () { controller.abort(); }, 8000);
        fetch(url, { signal: controller.signal })
            .then(function (response) {
                if (!response.ok) throw new Error('Citation data unavailable');
                return response.json();
            })
            .then(showStats)
            .catch(function () {
                // Keep verified data; a failed request must never become a zero.
            })
            .finally(function () { clearTimeout(timeout); });
    }

    // Show the checked-in snapshot without waiting for an unavailable remote cache.
    // Only a newer valid response may replace it, regardless of request order.
    loadStats(script.dataset.fallbackUrl);
    loadStats(script.dataset.statsUrl);
}());
