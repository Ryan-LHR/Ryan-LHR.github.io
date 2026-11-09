const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const code = fs.readFileSync(path.join(__dirname, '../assets/js/github-activity.js'), 'utf8');
const dayMs = 86400000;
const end = Date.parse('2026-10-30');
const cacheKey = 'github-activity:v1:Ryan-LHR';

function fixture() {
    return { contributions: Array.from({ length: 370 }, (_, index) => ({
        date: new Date(end - (369 - index) * dayMs).toISOString().slice(0, 10),
        count: index < 5 ? 100 : 1,
        level: 1,
    })) };
}

function snapshot(data = fixture(), updated = end) {
    return { username: 'Ryan-LHR', updated: new Date(updated).toISOString(), contributions: data.contributions };
}

async function render(data, options = {}) {
    const frames = new Map();
    const timers = new Map();
    const storage = options.storage ?? new Map();
    if (options.cached !== undefined) storage.set(cacheKey, typeof options.cached === 'string' ? options.cached : JSON.stringify(options.cached));
    let sequence = 0;
    let resize;
    let observers = 0;
    const listeners = {};
    const node = () => ({
        children: [], attrs: {}, textContent: '',
        append(child) { this.children.push(child); },
        setAttribute(key, value) { this.attrs[key] = value; },
    });
    const total = node();
    const range = node();
    const status = node();
    const chart = node();
    const calendar = Object.assign(node(), {
        width: 800, draws: 0,
        getBoundingClientRect() { return { width: this.width }; },
        replaceChildren(fragment) { this.children = fragment.children; this.draws++; },
    });
    const root = {
        hidden: true, dataset: { username: 'Ryan-LHR', fallbackUrl: options.fallback !== undefined || options.fallbackPromise ? '/assets/data/github-activity.json' : '' },
        querySelector(selector) {
            return { '.github-activity-calendar': calendar, '.github-activity-total': total, '.github-activity-range': range,
                '.github-activity-status': status, '.github-activity-chart': chart }[selector];
        },
    };
    let requested;
    let disconnected = false;
    vm.runInNewContext(code, {
        document: { querySelector: () => root, createElementNS: node, createDocumentFragment: node },
        Date: class extends Date { constructor(...args) { super(...(args.length ? args : [options.now ?? end])); } },
        AbortController,
        setTimeout(callback) { timers.set(++sequence, callback); return sequence; },
        clearTimeout(id) { timers.delete(id); },
        requestAnimationFrame(callback) { frames.set(++sequence, callback); return sequence; },
        cancelAnimationFrame(id) { frames.delete(id); },
        ResizeObserver: class {
            constructor(callback) { resize = callback; observers++; }
            observe() {}
            disconnect() { disconnected = true; }
        },
        window: {
            addEventListener(name, callback) { listeners[name] = callback; },
            localStorage: {
                getItem(key) { if (options.storageReadError) throw new Error('Blocked storage'); return storage.get(key) ?? null; },
                setItem(key, value) { if (options.storageWriteError) throw new Error('Storage full'); storage.set(key, value); },
            },
        },
        fetch: async (url, { signal }) => {
            if (url === root.dataset.fallbackUrl) return { ok: options.fallbackOk !== false, json: async () => options.fallbackPromise ?? options.fallback };
            requested = url;
            if (options.fail) throw new Error('Network failure');
            if (options.hang) return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Aborted'))));
            return { ok: options.ok !== false, json: async () => data };
        },
    });
    await new Promise(resolve => setImmediate(resolve));
    return { root, calendar, total, range, status, chart, storage, frames, timers, listeners,
        get requested() { return requested; },
        get disconnected() { return disconnected; },
        get observers() { return observers; },
        resize() { resize(); },
        flush() { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback()); },
        async expire() { [...timers.values()].forEach(callback => callback()); await new Promise(resolve => setImmediate(resolve)); },
    };
}

test('rolling year counts only the same 365 days drawn, across calendar years', async () => {
    const view = await render(fixture());
    assert.equal(view.root.hidden, false);
    assert.match(view.requested, /Ryan-LHR\?y=last$/);
    assert.equal(view.total.textContent, '365');
    assert.equal(view.range.textContent, '2025.10.31 - 2026.10.30');
    view.flush();
    assert.equal(view.calendar.children.flatMap(svg => svg.children).filter(node => 'data-level' in node.attrs).length, 365);
});

test('the date window advances with fresh data, but does not invent a cached day', async () => {
    const tomorrow = end + dayMs;
    const cached = await render(fixture(), { now: tomorrow });
    assert.equal(cached.range.textContent, '2025.10.31 - 2026.10.30');
    const fresh = fixture();
    fresh.contributions.push({ date: '2026-10-31', count: 2, level: 1 });
    const updated = await render(fresh, { now: tomorrow });
    assert.equal(updated.range.textContent, '2025.11.01 - 2026.10.31');
    assert.equal(updated.total.textContent, '366');
});

test('invalid or failed data without any cache keeps the profile visible without a false zero', async () => {
    for (const modify of [
        data => data.contributions.splice(20, 1),
        data => { data.contributions[20].count = -1; },
        data => { data.contributions[20].date = '2026-02-30'; },
        data => { data.contributions[20].level = 5; },
        data => data.contributions.push(data.contributions[20]),
        data => { data.contributions = data.contributions.slice(0, -3); },
    ]) {
        const data = fixture(); modify(data);
        const view = await render(data);
        assert.equal(view.root.hidden, false);
        assert.equal(view.total.textContent, '\u2014');
        assert.equal(view.chart.hidden, true);
        assert.match(view.status.textContent, /temporarily unavailable/);
    }
    for (const options of [{ fail: true }, { ok: false }]) {
        const view = await render(fixture(), options);
        assert.equal(view.root.hidden, false);
        assert.equal(view.total.textContent, '\u2014');
    }
});

test('valid zero contributions are not confused with missing data', async () => {
    const data = fixture(); data.contributions.forEach(day => { day.count = 0; day.level = 0; });
    const view = await render(data);
    assert.equal(view.root.hidden, false);
    assert.equal(view.total.textContent, '0');
});

test('resize callbacks defer writes, coalesce, ignore height-only events, and clean up', async () => {
    const view = await render(fixture());
    view.resize(); view.resize();
    assert.equal(view.calendar.draws, 0);
    assert.equal(view.frames.size, 1);
    view.flush();
    for (let index = 0; index < 100; index++) { view.resize(); view.flush(); }
    assert.equal(view.calendar.draws, 1);
    view.calendar.width = 250;
    view.resize(); view.flush();
    assert.equal(view.calendar.children.length, 2);
    assert.equal(view.calendar.children.flatMap(svg => svg.children).filter(node => 'data-level' in node.attrs).length, 365);
    view.listeners.pagehide({ persisted: true });
    assert.equal(view.disconnected, false);
    view.resize(); view.listeners.pagehide({ persisted: false });
    assert.equal(view.disconnected, true);
    assert.equal(view.frames.size, 0);
});

test('successful live data saves a validated per-user cache and displays its fetch time', async () => {
    const view = await render(fixture());
    const saved = JSON.parse(view.storage.get(cacheKey));
    assert.equal(saved.username, 'Ryan-LHR');
    assert.equal(saved.updated, '2026-10-30T00:00:00.000Z');
    assert.equal(saved.contributions.length, 365);
    assert.equal(view.status.textContent, 'Updated: 2026.10.30');
    assert.match(view.status.title, /2026-10-30 00:00 UTC/);
    assert.equal(view.timers.size, 0);
});

test('a returning visitor keeps old cached days, totals and the original fetch date during a network failure', async () => {
    const saved = snapshot();
    const view = await render(null, { cached: saved, fail: true, now: end + 14 * dayMs });
    assert.equal(view.root.hidden, false);
    assert.equal(view.total.textContent, '365');
    assert.equal(view.range.textContent, '2025.10.31 - 2026.10.30');
    assert.equal(view.status.textContent, 'Cached: 2026.10.30');
    assert.match(view.status.title, /2026-10-30 00:00 UTC/);
    assert.deepEqual(JSON.parse(view.storage.get(cacheKey)), saved);
    view.flush();
    assert.equal(view.calendar.children.flatMap(svg => svg.children).filter(node => 'data-level' in node.attrs).length, 365);
});

test('a first-time visitor gets the bundled snapshot even if the live API fails', async () => {
    const view = await render(null, { fail: true, fallback: snapshot(), now: end + 14 * dayMs });
    assert.equal(view.root.hidden, false);
    assert.equal(view.total.textContent, '365');
    assert.match(view.status.textContent, /^Cached:/);
    assert.equal(view.chart.hidden, false);
});

test('late older snapshots never replace live data or create another resize observer', async () => {
    let finishFallback;
    const fallbackPromise = new Promise(resolve => { finishFallback = resolve; });
    const fresh = fixture();
    fresh.contributions.at(-1).count = 5;
    const view = await render(fresh, { cached: snapshot(), fallbackPromise, now: end + 3600000 });
    assert.equal(view.total.textContent, '369');
    assert.match(view.status.textContent, /^Updated:/);
    assert.equal(view.observers, 1);
    finishFallback(snapshot());
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(view.total.textContent, '369');
    assert.match(view.status.textContent, /^Updated:/);
    assert.equal(view.observers, 1);
    view.flush();
    assert.equal(view.calendar.draws, 1);
});

test('an older bundled snapshot does not replace a newer browser cache', async () => {
    const newer = fixture();
    newer.contributions.at(-1).count = 3;
    const view = await render(null, { fail: true, cached: snapshot(newer, end + 3600000), fallback: snapshot(), now: end + dayMs });
    assert.equal(view.total.textContent, '367');
    assert.equal(view.status.textContent, 'Cached: 2026.10.30');
    assert.match(view.status.title, /2026-10-30 01:00 UTC/);
});

test('invalid, incomplete and stale live responses cannot erase a valid browser cache', async () => {
    for (const modify of [
        data => data.contributions.splice(20, 1),
        data => { data.contributions.at(-1).count = null; },
        data => { data.contributions = data.contributions.slice(0, -3); },
    ]) {
        const data = fixture(); modify(data);
        const view = await render(data, { cached: snapshot() });
        assert.equal(view.total.textContent, '365');
        assert.match(view.status.textContent, /^Cached:/);
        assert.equal(JSON.parse(view.storage.get(cacheKey)).updated, snapshot().updated);
    }
});

test('corrupt, wrong-user and future-dated caches are rejected without inventing counts', async () => {
    const invalid = snapshot(); invalid.contributions[20].count = -1;
    for (const cached of ['{broken', { ...snapshot(), username: 'SomeoneElse' }, snapshot(fixture(), end + dayMs),
        { ...snapshot(), updated: 'not-a-date' }, invalid]) {
        const view = await render(null, { fail: true, cached });
        assert.equal(view.total.textContent, '\u2014');
        assert.equal(view.chart.hidden, true);
    }
    const view = await render(null, { fail: true, cached: '{broken', fallback: snapshot() });
    assert.equal(view.total.textContent, '365');
});

test('blocked or full browser storage does not discard live data or prevent the bundled fallback', async () => {
    const live = await render(fixture(), { storageReadError: true, storageWriteError: true });
    assert.equal(live.total.textContent, '365');
    assert.match(live.status.textContent, /^Updated:/);
    const fallback = await render(null, { storageReadError: true, fail: true, fallback: snapshot() });
    assert.equal(fallback.total.textContent, '365');
    assert.match(fallback.status.textContent, /^Cached:/);
});

test('an API timeout leaves the cached graph and original timestamp visible', async () => {
    const view = await render(null, { cached: snapshot(), hang: true });
    assert.equal(view.total.textContent, '365');
    assert.equal(view.timers.size, 1);
    await view.expire();
    assert.equal(view.root.hidden, false);
    assert.equal(view.total.textContent, '365');
    assert.equal(view.status.textContent, 'Cached: 2026.10.30');
    assert.equal(view.timers.size, 0);
});

test('the checked-in real snapshot is valid and can render offline', async () => {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/data/github-activity.json'), 'utf8'));
    const view = await render(null, { fail: true, fallback: data, now: Date.parse(data.updated) + 14 * dayMs });
    assert.equal(view.root.hidden, false);
    assert.equal(view.total.textContent, data.contributions.reduce((sum, day) => sum + day.count, 0).toLocaleString('en-US'));
    assert.match(view.status.textContent, /^Cached:/);
    view.flush();
    assert.equal(view.calendar.children.flatMap(svg => svg.children).filter(node => 'data-level' in node.attrs).length, 365);
});
