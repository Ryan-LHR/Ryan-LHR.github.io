const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function scrollOptions(file, width, inNavigation) {
  const source = readFileSync(path.join(__dirname, '..', 'assets/js', file), 'utf8');
  const marker = '$("a").smoothScroll(';
  const start = source.indexOf(marker) + marker.length;
  assert.ok(start >= marker.length, 'Smooth-scroll configuration must exist');
  let depth = 1;
  let quote = '';
  let end = start;
  for (; depth > 0 && end < source.length; end++) {
    const char = source[end];
    if (quote) {
      if (char === '\\') end++;
      else if (char === quote) quote = '';
    } else if (char === '"' || char === "'") quote = char;
    else if (char === '(') depth++;
    else if (char === ')') depth--;
  }
  const clicks = [];
  const options = vm.runInNewContext(`(${source.slice(start, end - 1)})`, {
    window: {
      matchMedia(query) {
        assert.equal(query, '(max-width: 767px)');
        return { matches: width <= 767 };
      }
    },
    $(selector) {
      if (selector === '.masthead') return { outerHeight: () => 53.5 };
      if (selector === '#site-nav button.close') return { trigger: event => clicks.push(event) };
      return { closest: () => ({ length: inNavigation ? 1 : 0 }) };
    }
  });
  return { options, clicks };
}

for (const file of ['_main.js', 'main.min.js']) {
  test(`${file}: mobile navigation clears the sticky header and closes the menu`, () => {
    for (const width of [320, 390, 600, 640, 767]) {
      const { options, clicks } = scrollOptions(file, width, true);
      const navigation = { link: {}, offset: options.offset };
      options.beforeScroll(navigation);
      assert.equal(navigation.offset, -65.5);
      assert.deepEqual(clicks, ['click']);
    }
  });

  test(`${file}: desktop navigation retains the original offset`, () => {
    const { options, clicks } = scrollOptions(file, 768, true);
    const navigation = { link: {}, offset: options.offset };
    options.beforeScroll(navigation);
    assert.equal(navigation.offset, -20);
    assert.deepEqual(clicks, []);
  });

  test(`${file}: mobile content links do not change navigation state`, () => {
    const { options, clicks } = scrollOptions(file, 390, false);
    const content = { link: {}, offset: options.offset };
    options.beforeScroll(content);
    assert.equal(content.offset, -20);
    assert.deepEqual(clicks, []);
  });
}
