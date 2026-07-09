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

A perfectly normal paragraph so the document also has legitimate content.
