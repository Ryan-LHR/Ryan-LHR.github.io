const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'assets/js/scholar-citations.js'), 'utf8');
const about = fs.readFileSync(path.join(root, '_pages/about.md'), 'utf8');
const titles = [...about.matchAll(/class="show_paper_citations" data-paper-title="([^"]+)" hidden/g)].map(match => match[1]);
const scholarId = 'wr2qnW0AAAAJ';

function fixture() {
    return {
        scholar_id: scholarId,
        updated: '2026-10-30T00:00:00+00:00',
        citedby: 7,
        publications: Object.fromEntries(titles.map((title, index) => {
            const id = scholarId + ':test-' + index;
            return [id, { author_pub_id: id, bib: { title }, num_citations: index ? 0 : 7 }];
        })),
    };
}

async function render(data, options = {}) {
    const elements = titles.map(paperTitle => ({
        dataset: { paperTitle }, hidden: true, attrs: {},
        badge: {
            alt: '',
            get src() { return this.url; },
            set src(value) {
                this.url = value;
                if (options.badgeFails) this.onerror();
                else if (!options.badgePending) this.onload();
            },
        },
        querySelector() { return this.badge; },
        setAttribute(key, value) { this.attrs[key] = value; },
    }));
    const total = options.total ? { textContent: '' } : null;
    const context = {
        URL, AbortController, setTimeout, clearTimeout,
        document: {
            currentScript: { dataset: { statsUrl: 'https://example.test/gs_data.json', fallbackUrl: options.fallback ? '/assets/data/google-scholar-stats.json' : undefined, scholarUrl: 'https://scholar.google.com/citations?user=' + scholarId } },
            querySelectorAll: () => elements,
            getElementById: () => total,
        },
        fetch: async url => {
            if (url.startsWith('/assets/')) {
                if (options.fallbackLast) await new Promise(resolve => setImmediate(resolve));
                return { ok: true, json: async () => options.fallback };
            }
            if (options.fail) throw new Error('Network unavailable');
            return { ok: options.ok !== false, json: async () => {
                if (options.invalidJson) throw new SyntaxError('Invalid JSON');
                return data;
            } };
        },
    };
    vm.runInNewContext(code, context);
    await new Promise(resolve => setImmediate(resolve));
    return { elements, total };
}

test('two real title selectors; counts work without the optional total element', async () => {
    assert.equal(titles.length, 2);
    const { elements } = await render(fixture());
    assert.equal(elements[0].hidden, false);
    assert.equal(new URL(elements[0].badge.src).pathname, '/badge/Citations-7-blue');
    assert.equal(new URL(elements[1].badge.src).pathname, '/badge/Citations-0-blue');
    assert.equal(new URL(elements[0].badge.src).searchParams.get('style'), 'social');
    assert.equal(new URL(elements[0].badge.src).searchParams.get('logo'), 'googlescholar');
    assert.equal(new URL(elements[0].href).searchParams.get('citation_for_view'), scholarId + ':test-0');
    assert.match(elements[0].title, /updated 2026-10-30/);
});

test('optional total is safe', async () => {
    const { total } = await render(fixture(), { total: true });
    assert.equal(total.textContent, 7);
});

test('a pending or failed badge image stays hidden', async () => {
    for (const options of [{ badgeFails: true }, { badgePending: true }]) {
        const { elements } = await render(fixture(), options);
        assert.ok(elements.every(element => element.hidden));
    }
});

test('punctuation and case do not prevent a unique full-title match', async () => {
    const data = fixture();
    data.publications[scholarId + ':test-0'].bib.title = titles[0].toUpperCase().replaceAll('-', ' ');
    assert.equal((await render(data)).elements[0].hidden, false);
});

test('a missing or duplicate paper hides only that badge', async () => {
    const data = fixture();
    delete data.publications[scholarId + ':test-1'];
    let result = await render(data);
    assert.equal(result.elements[0].hidden, false);
    assert.equal(result.elements[1].hidden, true);
    data.publications[scholarId + ':duplicate'] = data.publications[scholarId + ':test-0'];
    result = await render(data);
    assert.equal(result.elements[0].hidden, true);
});

test('unknown counts never become zero', async () => {
    for (const count of [undefined, null, -1, '0', true, 1.5]) {
        const data = fixture();
        data.publications[scholarId + ':test-0'].num_citations = count;
        assert.equal((await render(data)).elements[0].hidden, true);
    }
});

test('wrong profile, wrong paper ID, or invalid timestamp stay hidden', async () => {
    for (const change of [
        data => { data.scholar_id = 'wrong'; },
        data => { data.updated = 'invalid'; },
        data => { data.publications[scholarId + ':test-0'].author_pub_id = 'wrong:paper'; },
    ]) {
        const data = fixture();
        change(data);
        assert.equal((await render(data)).elements[0].hidden, true);
    }
});

test('HTTP errors, invalid JSON, and network failures keep both badges hidden', async () => {
    for (const options of [{ ok: false }, { fail: true }, { invalidJson: true }]) {
        const { elements } = await render(fixture(), options);
        assert.ok(elements.every(element => element.hidden));
    }
});

test('a verified bundled snapshot supplies badges when the remote cache is unavailable', async () => {
    for (const options of [{ ok: false }, { fail: true }, { invalidJson: true }]) {
        const { elements } = await render(null, { ...options, fallback: fixture() });
        assert.ok(elements.every(element => !element.hidden));
        assert.match(elements[0].badge.src, /Citations-7-blue/);
        assert.match(elements[1].badge.src, /Citations-0-blue/);
    }
});

test('only newer valid per-paper data replaces the fallback, in either arrival order', async () => {
    for (const fallbackLast of [false, true]) {
        const remote = fixture();
        remote.updated = '2026-10-30T10:00:00Z';
        remote.publications[scholarId + ':test-0'].num_citations = 8;
        remote.publications[scholarId + ':test-1'].num_citations = null;
        const { elements } = await render(remote, { fallback: fixture(), fallbackLast });
        assert.match(elements[0].badge.src, /Citations-8-blue/);
        assert.match(elements[1].badge.src, /Citations-0-blue/);
        assert.ok(elements.every(element => !element.hidden));
    }
    const older = fixture();
    older.updated = '2026-10-29T00:00:00Z';
    older.publications[scholarId + ':test-0'].num_citations = 2;
    const { elements } = await render(older, { fallback: fixture() });
    assert.match(elements[0].badge.src, /Citations-7-blue/);
});

test('the checked-in snapshot resolves both real paper titles and IDs', async () => {
    const snapshot = JSON.parse(fs.readFileSync(path.join(root, 'assets/data/google-scholar-stats.json'), 'utf8'));
    const { elements } = await render(null, { fail: true, fallback: snapshot });
    assert.ok(elements.every(element => !element.hidden));
    assert.equal(new URL(elements[0].href).searchParams.get('citation_for_view'), scholarId + ':qjMakFHDy7sC');
    assert.equal(new URL(elements[1].href).searchParams.get('citation_for_view'), scholarId + ':Tyk-4Ss8FVUC');
});
