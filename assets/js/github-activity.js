(function () {
    'use strict';

    var root = document.querySelector('.github-activity');
    if (!root) return;
    var calendar = root.querySelector('.github-activity-calendar');
    var chart = root.querySelector('.github-activity-chart');
    var status = root.querySelector('.github-activity-status');
    var cacheKey = 'github-activity:v1:' + root.dataset.username;
    var dayMs = 86400000;
    var lastUpdate = -Infinity;
    var visibleDays;
    var observer;
    var frame = null;
    var lastWidth = 0;

    function fetchData(url) {
        var controller = new AbortController();
        var timeout = setTimeout(function () { controller.abort(); }, 8000);
        return fetch(url, { signal: controller.signal })
            .then(function (response) {
                if (!response.ok) throw new Error('Contribution data unavailable');
                return response.json();
            })
            .finally(function () { clearTimeout(timeout); });
    }

    function rollingYear(data, now) {
        if (!data || !Array.isArray(data.contributions)) throw new Error('Missing contributions');
        var today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
        var dates = new Map();
        data.contributions.forEach(function (day) {
            var timestamp = Date.parse(day.date);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Number.isFinite(timestamp) ||
                new Date(timestamp).toISOString().slice(0, 10) !== day.date ||
                !Number.isSafeInteger(day.count) || day.count < 0 ||
                !Number.isInteger(day.level) || day.level < 0 || day.level > 4 || dates.has(timestamp)) {
                throw new Error('Invalid contribution data');
            }
            if (timestamp <= today) dates.set(timestamp, day);
        });
        var end = Math.max.apply(null, Array.from(dates.keys()));
        if (!Number.isFinite(end) || today - end > 2 * dayMs) throw new Error('Stale contribution data');
        var result = [];
        // Trim GitHub's leading partial week; the count and graph cover the same 365 days.
        for (var time = end - 364 * dayMs; time <= end; time += dayMs) {
            if (!dates.has(time)) throw new Error('Incomplete contribution data');
            result.push(dates.get(time));
        }
        return result;
    }

    function svgElement(tag, attributes, text) {
        var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
        Object.keys(attributes).forEach(function (key) { node.setAttribute(key, attributes[key]); });
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function draw(days, width) {
        var fragment = document.createDocumentFragment();
        var groups = width < 450 ? [days.slice(0, 182), days.slice(182)] : [days];
        groups.forEach(function (group) {
            var offset = new Date(group[0].date).getUTCDay();
            var columns = Math.ceil((group.length + offset) / 7);
            var labelWidth = width < 450 ? 0 : 29;
            var pitch = (width - labelWidth) / columns;
            var size = Math.max(3, Math.min(11, pitch - 2));
            var step = size + 3;
            var height = 22 + step * 7;
            var svg = svgElement('svg', { width: width, height: height, viewBox: '0 0 ' + width + ' ' + height, role: 'img',
                'aria-label': 'GitHub contributions from ' + group[0].date + ' to ' + group[group.length - 1].date });
            if (labelWidth) [[1, 'Mon'], [3, 'Wed'], [5, 'Fri']].forEach(function (label) {
                svg.append(svgElement('text', { x: 0, y: 22 + label[0] * step + size - 1 }, label[1]));
            });
            var lastLabel = -40;
            group.forEach(function (day, index) {
                var date = new Date(day.date);
                var x = labelWidth + Math.floor((index + offset) / 7) * pitch;
                var labelX = Math.min(x, width - 25);
                if ((date.getUTCDate() === 1 || index === 0) && labelX - lastLabel >= 35) {
                    svg.append(svgElement('text', { x: labelX, y: 12 }, date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })));
                    lastLabel = labelX;
                }
                var rect = svgElement('rect', { x: x, y: 22 + date.getUTCDay() * step, width: size, height: size, rx: 2, 'data-level': day.level });
                rect.append(svgElement('title', {}, day.date + ': ' + day.count + ' contributions'));
                svg.append(rect);
            });
            fragment.append(svg);
        });
        calendar.replaceChildren(fragment);
    }

    function render() {
        if (frame !== null) return;
        // Never resize the observed element during ResizeObserver delivery.
        frame = requestAnimationFrame(function () {
            frame = null;
            var width = Math.floor(calendar.getBoundingClientRect().width);
            if (width < 1 || width === lastWidth) return;
            lastWidth = width;
            draw(visibleDays, width);
        });
    }

    function show(days, updated, cached) {
        var timestamp = Date.parse(updated);
        if (timestamp < lastUpdate || (timestamp === lastUpdate && cached)) return;
        lastUpdate = timestamp;
        visibleDays = days;
        var start = days[0].date;
        var end = days[days.length - 1].date;
        root.querySelector('.github-activity-total').textContent = days.reduce(function (total, day) { return total + day.count; }, 0).toLocaleString('en-US');
        root.querySelector('.github-activity-range').textContent = start.replaceAll('-', '.') + ' - ' + end.replaceAll('-', '.');
        status.textContent = (cached ? 'Cached' : 'Updated') + ': ' + updated.slice(0, 10).replaceAll('-', '.');
        status.title = 'Last successful fetch: ' + updated.slice(0, 16).replace('T', ' ') + ' UTC. The upstream service may cache its response.';
        chart.hidden = false;
        root.hidden = false;
        lastWidth = 0;
        if (!observer) {
            observer = new ResizeObserver(render);
            observer.observe(calendar);
            window.addEventListener('pagehide', function (event) {
                if (event.persisted) return;
                observer.disconnect();
                if (frame !== null) cancelAnimationFrame(frame);
            });
        }
        render();
    }

    function showSnapshot(snapshot) {
        if (!snapshot || snapshot.username !== root.dataset.username || typeof snapshot.updated !== 'string') {
            throw new Error('Invalid contribution cache');
        }
        var updated = new Date(snapshot.updated);
        if (!Number.isFinite(updated.getTime()) || updated.toISOString() !== snapshot.updated || updated > new Date()) {
            throw new Error('Invalid contribution cache date');
        }
        // Validate cached days against their fetch date, not today's rolling window.
        show(rollingYear(snapshot, updated), snapshot.updated, true);
    }

    try {
        var saved = window.localStorage.getItem(cacheKey);
        if (saved) showSnapshot(JSON.parse(saved));
    } catch (error) {
        // Storage may be blocked, full, or contain an invalid older entry.
    }

    var fallback = root.dataset.fallbackUrl ? fetchData(root.dataset.fallbackUrl)
        .then(showSnapshot)
        .catch(function () {}) : Promise.resolve();

    var live = fetchData('https://github-contributions-api.jogruber.de/v4/' + encodeURIComponent(root.dataset.username) + '?y=last')
        .then(function (data) {
            var now = new Date();
            var days = rollingYear(data, now);
            var snapshot = { username: root.dataset.username, updated: now.toISOString(), contributions: days };
            show(days, snapshot.updated, false);
            try {
                window.localStorage.setItem(cacheKey, JSON.stringify(snapshot));
            } catch (error) {
                // A cache write failure must not discard valid live data.
            }
        })
        .catch(function () {});

    Promise.all([fallback, live]).then(function () {
        if (visibleDays) return;
        root.querySelector('.github-activity-total').textContent = '\u2014';
        status.textContent = 'Contribution data temporarily unavailable';
        chart.hidden = true;
        root.hidden = false;
    });
}());
