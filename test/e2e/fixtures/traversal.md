# Relative URL containment

A safe image next to this file (must resolve to a file:// URL):

![safe](./ok.png)

A path-traversal escape attempt (must NOT resolve to a live file:// URL — the
containment shipped in #18 leaves it unresolved):

![escape](../../../../../../../../etc/hosts)
