#!/usr/bin/env python3
"""Recompile web/index.html from the design source (design/Clove iOS v5.dc.html).

web/index.html is a self-contained bundle: fonts, React, Babel and ios-frame.jsx are
embedded as resources, and the page itself is stored as a JSON "template". This script
only regenerates that template from the source, reusing everything else as-is:

  - head of the template (inlined fonts) is kept from the current bundle;
  - the rest of the page comes from the source, with the bundler's attribute encoding
    (camelCase attributes such as onClick → sc-camel-on-click) and resource ids.

Running it on an unmodified source reproduces web/index.html byte for byte (checked by --check).

Usage:  python3 scripts/build-front.py          # rebuild web/index.html
        python3 scripts/build-front.py --check  # exit 1 if index.html is out of date
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'design' / 'Clove iOS v5.dc.html'
OUT = ROOT / 'web' / 'index.html'
TAG = '<script type="__bundler/template">'
FRAME_ID = 'eb37f493-1ca4-45cf-808c-9da939948204'


def kebab(name):
    return re.sub(r'([A-Z])', lambda m: '-' + m.group(1).lower(), name)


def encode_attrs(tag):
    # HTML attributes are case-insensitive: the bundler stores camelCase ones as sc-camel-*.
    return re.sub(r'(\s)([a-zA-Z][\w-]*[A-Z][\w-]*)(=)',
                  lambda m: m.group(1) + 'sc-camel-' + kebab(m.group(2)) + m.group(3), tag)


def build(bundle, source):
    a = bundle.index(TAG) + len(TAG)
    b = bundle.index('</script>', a)
    raw = bundle[a:b]
    template = json.loads(raw)

    # Template head (with inlined fonts) is kept; it ends with the fonts <style>.
    head_end = template.index('</style>', template.index("font-family: 'Archivo'"))
    head_end = template.index('\n', head_end) + 1
    tail = template.rsplit('</script>', 1)[1]

    start = source.index('<link rel="stylesheet" href="https://fonts.googleapis.com')
    start = source.index('\n', start) + 1
    body = source[start:]
    k = body.index('<script type="text/x-dc"')
    markup, script = body[:k], body[k:]
    markup = re.sub(r'<[a-zA-Z][^<>]*>', lambda m: encode_attrs(m.group(0)), markup)
    markup = markup.replace('from="./ios-frame.jsx"', 'from="' + FRAME_ID + '#/ios-frame.jsx"')
    script = script.replace('data-dc-script data-props', 'data-dc-script="" data-props')
    script = script.rsplit('</script>', 1)[0] + '</script>'

    new_template = template[:head_end] + markup + script + tail
    encoded = json.dumps(new_template, ensure_ascii=False).replace('</', '<\\u002F')
    lead = raw[:len(raw) - len(raw.lstrip())]
    trail = raw[len(raw.rstrip()):]
    return bundle[:a] + lead + encoded + trail + bundle[b:]


def main():
    bundle = OUT.read_text(encoding='utf-8')
    out = build(bundle, SRC.read_text(encoding='utf-8'))
    if '--check' in sys.argv:
        if out != bundle:
            print('web/index.html est en retard sur le source : lance python3 scripts/build-front.py')
            sys.exit(1)
        print('web/index.html est à jour.')
        return
    OUT.write_text(out, encoding='utf-8')
    print('web/index.html recompilé (%d octets).' % len(out.encode('utf-8')))


if __name__ == '__main__':
    main()
