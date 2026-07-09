// url-resolve.test.mjs — unit test for the relative-URL resolver + containment.
// Mirrors resolveRelativeUrl + isUnder + normalizePath embedded in src/app.js (keep in sync).
function normalizePath(p){var parts=p.split("/"),out=[];for(var i=0;i<parts.length;i++){var seg=parts[i];if(seg===""||seg===".")continue;if(seg===".."){out.pop();continue;}out.push(seg);}return "/"+out.join("/");}
function isUnder(path,root){var r=root.replace(/\/+$/,"");return path===r||path.indexOf(r+"/")===0;}
function resolveRelativeUrl(url,baseDir,root){if(!url)return url;var u=url;if(u.charAt(0)==="#")return url;if(/^[a-zA-Z][a-zA-Z0-9+.\-]*:/.test(u))return url;if(u.slice(0,2)==="//")return url;var suffix="";var h=u.indexOf("#");if(h!==-1){suffix=u.slice(h)+suffix;u=u.slice(0,h);}var q=u.indexOf("?");if(q!==-1){suffix=u.slice(q)+suffix;u=u.slice(0,q);}if(!u)return url;var raw=u;try{raw=decodeURI(u);}catch(e){raw=u;}var path=normalizePath(raw.charAt(0)==="/"?raw:baseDir+"/"+raw);if(root&&!isUnder(path,root))return url;return "file://"+encodeURI(path)+suffix;}

let assert=(c,m)=>{if(!c){console.error("FAIL:",m);process.exit(1);}console.log("ok  -",m);};

const HOME="/Users/x";           // containment root
const BASE="/Users/x/notes";     // the .md's directory (under HOME)

// 1. Plain relative image
assert(resolveRelativeUrl("img.png",BASE,HOME)==="file:///Users/x/notes/img.png","bare relative → file://");
// 2. Explicit ./ prefix
assert(resolveRelativeUrl("./img.png",BASE,HOME)==="file:///Users/x/notes/img.png","./ prefix collapses");
// 3. Obsidian-style ../attachments (climbs above the note dir but stays under HOME) → allowed
assert(resolveRelativeUrl("../attachments/a.png",BASE,HOME)==="file:///Users/x/attachments/a.png","../attachments under root allowed");
// 4. Nested subdir
assert(resolveRelativeUrl("sub/dir/b.png",BASE,HOME)==="file:///Users/x/notes/sub/dir/b.png","nested subdir");
// 5. Absolute path UNDER root → allowed
assert(resolveRelativeUrl("/Users/x/shared/logo.png",BASE,HOME)==="file:///Users/x/shared/logo.png","absolute under root allowed");
// 6. http(s) untouched
assert(resolveRelativeUrl("https://cdn/x.png",BASE,HOME)==="https://cdn/x.png","https untouched");
// 7. data URI untouched
assert(resolveRelativeUrl("data:image/png;base64,AAAA",BASE,HOME)==="data:image/png;base64,AAAA","data: untouched");
// 8. In-page anchor untouched
assert(resolveRelativeUrl("#section",BASE,HOME)==="#section","#anchor untouched");
// 9. mailto untouched
assert(resolveRelativeUrl("mailto:a@b.com",BASE,HOME)==="mailto:a@b.com","mailto: untouched");
// 10. Protocol-relative untouched
assert(resolveRelativeUrl("//cdn/x.png",BASE,HOME)==="//cdn/x.png","//protocol-relative untouched");
// 11. Spaces get percent-encoded
assert(resolveRelativeUrl("my image.png",BASE,HOME)==="file:///Users/x/notes/my%20image.png","spaces → %20");
// 12. Relative link keeps its fragment
assert(resolveRelativeUrl("other.md#h",BASE,HOME)==="file:///Users/x/notes/other.md#h","fragment re-appended");
// 13. Pre-encoded path is idempotent (decode then re-encode)
assert(resolveRelativeUrl("my%20image.png",BASE,HOME)==="file:///Users/x/notes/my%20image.png","pre-encoded stays stable");
// 14. Empty string passthrough
assert(resolveRelativeUrl("",BASE,HOME)==="","empty passthrough");

// ── Containment (the CodeRabbit / Christian security finding) ──────────────
// 15. `..` traversal escaping HOME is left UNRESOLVED (never a live file:// URL)
assert(resolveRelativeUrl("../../../../etc/hosts",BASE,HOME)==="../../../../etc/hosts","traversal escape blocked (stays relative)");
// 16. Absolute path OUTSIDE root is left unresolved
assert(resolveRelativeUrl("/etc/passwd",BASE,HOME)==="/etc/passwd","absolute outside root blocked");
// 17. Sibling escape just above root is blocked
assert(resolveRelativeUrl("../secrets.png","/Users/x","/Users/x")==="../secrets.png","escape one level above root blocked");
// 18. Root boundary is a path boundary, not a string prefix (/Users/xyz ⊄ /Users/x)
assert(resolveRelativeUrl("img.png","/Users/xyz","/Users/x")==="img.png","sibling dir with shared prefix not treated as under root");
// 19. No root (empty) → containment disabled; documents that root gates the check
assert(resolveRelativeUrl("../../../../etc/hosts",BASE,"")==="file:///etc/hosts","no root → containment disabled");

console.log("ALL PASS");
