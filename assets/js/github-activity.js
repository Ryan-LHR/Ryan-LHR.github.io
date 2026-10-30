(function () {
    'use strict';

    var root = document.querySelector('.github-activity');
    if (!root) return;
    var calendar = root.querySelector('.github-activity-calendar');
    var dayMs = 86400000;
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 8000);

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

    function show(days) {
        var start = days[0].date;
        var end = days[days.length - 1].date;
        root.querySelector('.github-activity-total').textContent = days.reduce(function (total, day) { return total + day.count; }, 0).toLocaleString('en-US');
        root.querySelector('.github-activity-range').textContent = start.replaceAll('-', '.') + ' - ' + end.replaceAll('-', '.');
        root.hidden = false;
        var frame = null;
        var lastWidth = 0;
        var render = function () {
            if (frame !== null) return;
            // Never resize the observed element during ResizeObserver delivery.
            frame = requestAnimationFrame(function () {
                frame = null;
                var width = Math.floor(calendar.getBoundingClientRect().width);
                if (width < 1 || width === lastWidth) return;
                lastWidth = width;
                draw(days, width);
            });
        };
        var observer = new ResizeObserver(render);
        observer.observe(calendar);
        render();
        window.addEventListener('pagehide', function (event) {
            if (event.persisted) return;
            observer.disconnect();
            if (frame !== null) cancelAnimationFrame(frame);
        });
    }

    fetch('https://github-contributions-api.jogruber.de/v4/' + encodeURIComponent(root.dataset.username) + '?y=last', { signal: controller.signal })
        .then(function (response) {
            if (!response.ok) throw new Error('Contribution data unavailable');
            return response.json();
        })
        .then(function (data) { show(rollingYear(data, new Date())); })
        .catch(function () {
            // A failed or incomplete response must not appear as zero contributions.
            root.hidden = true;
        })
        .finally(function () { clearTimeout(timeout); });
}());
