# Malicious input corpus

Every payload below tries to set `window.__pwned`. If sanitisation works, none of
them run and the flag stays undefined. Do NOT "clean up" this file — it is an
attack corpus on purpose.

Raw script block:

<script>window.__pwned = true;</script>

Image error handler:

<img src="does-not-exist-x" onerror="window.__pwned = true;">

SVG load handler:

<svg width="1" height="1" onload="window.__pwned = true;"></svg>

Inline event handler on a div:

<div onmouseover="window.__pwned = true;" onclick="window.__pwned = true;">hover or click me</div>

Iframe with a data: document:

<iframe src="data:text/html,<script>parent.window.__pwned = true;</script>"></iframe>

javascript: URLs (raw HTML and Markdown link):

<a href="javascript:window.__pwned = true;">raw anchor</a>

[markdown link](javascript:window.__pwned=true)

Body handler injection attempt:

<body onload="window.__pwned = true;">

Iframe srcdoc (executes markup in an inline frame):

<iframe srcdoc="&lt;script&gt;parent.window.__pwned = true;&lt;/script&gt;"></iframe>

object / embed with a javascript: resource:

<object data="javascript:window.__pwned = true;"></object>

<embed src="javascript:window.__pwned = true;">

SVG with a nested script and an xlink:href use:

<svg><script>window.__pwned = true;</script></svg>

<svg><use href="data:image/svg+xml,&lt;svg id='x' xmlns='http://www.w3.org/2000/svg'&gt;&lt;script&gt;window.__pwned=true&lt;/script&gt;&lt;/svg&gt;#x"></use></svg>

Image with a javascript: src:

<img src="javascript:window.__pwned = true;" alt="js-src">

data:text/html link (raw HTML and Markdown link):

<a href="data:text/html,&lt;script&gt;window.__pwned=true&lt;/script&gt;">raw data anchor</a>

[markdown data link](data:text/html,<script>window.__pwned=true</script>)

vbscript: link (legacy IE vector, kept for completeness):

<a href="vbscript:window.__pwned = true;">vbscript anchor</a>

base-tag hijack (would repoint every relative URL):

<base href="javascript:window.__pwned = true;//">

meta refresh redirect to a script URL:

<meta http-equiv="refresh" content="0;url=javascript:window.__pwned = true;">

style block + inline style with a javascript url:

<style>body { background: url("javascript:window.__pwned = true;"); }</style>

<div style="background:url(javascript:window.__pwned = true;)">styled</div>

details ontoggle + autofocus input onfocus (fire without a click):

<details open ontoggle="window.__pwned = true;"><summary>x</summary></details>

<input autofocus onfocus="window.__pwned = true;">

Scheme obfuscation (tab/newline/entity inside the scheme):

<a href="java&#09;script:window.__pwned = true;">obfuscated scheme</a>

[entity-encoded scheme](javascript&colon;window.__pwned=true)

A perfectly normal paragraph so the document also has legitimate content.
