const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const code = fs.readFileSync(path.join(__dirname, '../assets/js/github-activity.js'), 'utf8');
const dayMs = 86400000;
const end = Date.parse('2026-10-30');

function fixture() {
    return { contributions: Array.from({ length: 370 }, (_, index) => ({
        date: new Date(end - (369 - index) * dayMs).toISOString().slice(0, 10),
        count: index < 5 ? 100 : 1,
        level: 1,
    })) };
}

async function render(data, options = {}) {
    const frames = new Map();
    let sequence = 0;
    let resize;
    const listeners = {};
    const node = () => ({
        children: [], attrs: {}, textContent: '',
        append(child) { this.children.push(child); },
        setAttribute(key, value) { this.attrs[key] = value; },
    });
    const total = node();
    const range = node();
    const calendar = Object.assign(node(), {
        width: 800, draws: 0,
        getBoundingClientRect() { return { width: this.width }; },
        replaceChildren(fragment) { this.children = fragment.children; this.draws++; },
    });
    const root = {
        hidden: true, dataset: { username: 'Ryan-LHR' },
        querySelector(selector) {
            return { '.github-activity-calendar': calendar, '.github-activity-total': total, '.github-activity-range': range }[selector];
        },
    };
    let requested;
    let disconnected = false;
    vm.runInNewContext(code, {
        document: { querySelector: () => root, createElementNS: node, createDocumentFragment: node },
        Date: class extends Date { constructor(...args) { super(...(args.length ? args : [options.now ?? end])); } },
        AbortController, setTimeout, clearTimeout,
        requestAnimationFrame(callback) { frames.set(++sequence, callback); return sequence; },
        cancelAnimationFrame(id) { frames.delete(id); },
        ResizeObserver: class {
            constructor(callback) { resize = callback; }
            observe() {}
            disconnect() { disconnected = true; }
        },
        window: { addEventListener(name, callback) { listeners[name] = callback; } },
        fetch: async url => {
            requested = url;
            if (options.fail) throw new Error('Network failure');
            return { ok: options.ok !== false, json: async () => data };
        },
    });
    await new Promise(resolve => setImmediate(resolve));
    return { root, calendar, total, range, frames, listeners,
        get requested() { return requested; },
        get disconnected() { return disconnected; },
        resize() { resize(); },
        flush() { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback()); },
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

test('incomplete, malformed, duplicate, stale and failed data stay hidden', async () => {
    for (const modify of [
        data => data.contributions.splice(20, 1),
        data => { data.contributions[20].count = -1; },
        data => { data.contributions[20].date = '2026-02-30'; },
        data => { data.contributions[20].level = 5; },
        data => data.contributions.push(data.contributions[20]),
        data => { data.contributions = data.contributions.slice(0, -3); },
    ]) {
        const data = fixture(); modify(data);
        assert.equal((await render(data)).root.hidden, true);
    }
    for (const options of [{ fail: true }, { ok: false }]) assert.equal((await render(fixture(), options)).root.hidden, true);
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
