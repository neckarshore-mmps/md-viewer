// url-resolve.test.mjs — unit test for the relative-URL resolver.
// Mirrors resolveRelativeUrl + normalizePath embedded in src/app.js (keep in sync).
function normalizePath(p){var parts=p.split("/"),out=[];for(var i=0;i<parts.length;i++){var seg=parts[i];if(seg===""||seg===".")continue;if(seg===".."){out.pop();continue;}out.push(seg);}return "/"+out.join("/");}
function resolveRelativeUrl(url,baseDir){if(!url)return url;var u=url;if(u.charAt(0)==="#")return url;if(/^[a-zA-Z][a-zA-Z0-9+.\-]*:/.test(u))return url;if(u.slice(0,2)==="//")return url;var suffix="";var h=u.indexOf("#");if(h!==-1){suffix=u.slice(h)+suffix;u=u.slice(0,h);}var q=u.indexOf("?");if(q!==-1){suffix=u.slice(q)+suffix;u=u.slice(0,q);}if(!u)return url;var raw=u;try{raw=decodeURI(u);}catch(e){raw=u;}var path=raw.charAt(0)==="/"?raw:baseDir+"/"+raw;return "file://"+encodeURI(normalizePath(path))+suffix;}

let assert=(c,m)=>{if(!c){console.error("FAIL:",m);process.exit(1);}console.log("ok  -",m);};

const BASE="/Users/x/notes";

// 1. Plain relative image
assert(resolveRelativeUrl("img.png",BASE)==="file:///Users/x/notes/img.png","bare relative → file://");
// 2. Explicit ./ prefix
assert(resolveRelativeUrl("./img.png",BASE)==="file:///Users/x/notes/img.png","./ prefix collapses");
// 3. Parent traversal
assert(resolveRelativeUrl("../assets/a.png",BASE)==="file:///Users/x/assets/a.png","../ resolves up one");
// 4. Nested subdir
assert(resolveRelativeUrl("sub/dir/b.png",BASE)==="file:///Users/x/notes/sub/dir/b.png","nested subdir");
// 5. Absolute filesystem path
assert(resolveRelativeUrl("/etc/logo.png",BASE)==="file:///etc/logo.png","absolute path kept, prefixed file://");
// 6. http(s) untouched
assert(resolveRelativeUrl("https://cdn/x.png",BASE)==="https://cdn/x.png","https untouched");
// 7. data URI untouched
assert(resolveRelativeUrl("data:image/png;base64,AAAA",BASE)==="data:image/png;base64,AAAA","data: untouched");
// 8. In-page anchor untouched
assert(resolveRelativeUrl("#section",BASE)==="#section","#anchor untouched");
// 9. mailto untouched
assert(resolveRelativeUrl("mailto:a@b.com",BASE)==="mailto:a@b.com","mailto: untouched");
// 10. Protocol-relative untouched
assert(resolveRelativeUrl("//cdn/x.png",BASE)==="//cdn/x.png","//protocol-relative untouched");
// 11. Spaces get percent-encoded
assert(resolveRelativeUrl("my image.png",BASE)==="file:///Users/x/notes/my%20image.png","spaces → %20");
// 12. Relative link keeps its fragment
assert(resolveRelativeUrl("other.md#h",BASE)==="file:///Users/x/notes/other.md#h","fragment re-appended");
// 13. Pre-encoded path is idempotent (decode then re-encode)
assert(resolveRelativeUrl("my%20image.png",BASE)==="file:///Users/x/notes/my%20image.png","pre-encoded stays stable");
// 14. Empty string passthrough
assert(resolveRelativeUrl("",BASE)==="","empty passthrough");
// 15. No baseDir means untouched (defensive; rewrite skips when dir is empty)
assert(resolveRelativeUrl("img.png","")==="file:///img.png","empty baseDir still yields root-anchored path");

console.log("ALL PASS");
