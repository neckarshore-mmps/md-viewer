// frontmatter.test.mjs — unit test for the YAML-frontmatter splitter/parser.
// Mirrors the logic embedded in src/app.js + src/web-app.js (keep in sync).
function stripQuotes(s){if(s.length>=2){var a=s.charAt(0),b=s.charAt(s.length-1);if((a==='"'&&b==='"')||(a==="'"&&b==="'"))return s.slice(1,-1);}return s;}
function splitFrontmatter(md){var m=/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(md);if(!m)return{props:null,body:md};return{props:parseFlatYaml(m[1]),body:md.slice(m[0].length)};}
function parseFlatYaml(src){var lines=src.split(/\r?\n/),out=[],cur=null;for(var i=0;i<lines.length;i++){var line=lines[i];if(!line.trim())continue;var li=/^[ \t]*-[ \t]+(.*)$/.exec(line);if(li&&cur&&cur.items){cur.items.push(stripQuotes(li[1].trim()));continue;}var kv=/^([^:\s][^:]*):[ \t]*(.*)$/.exec(line);if(!kv)continue;var key=kv[1].trim(),val=kv[2].trim();if(val===""){cur={key:key,value:null,items:[]};out.push(cur);continue;}cur=null;var inline=/^\[(.*)\]$/.exec(val);if(inline){out.push({key:key,value:null,items:inline[1].split(",").map(s=>stripQuotes(s.trim())).filter(Boolean)});}else{out.push({key:key,value:stripQuotes(val),items:null});}}out.forEach(e=>{if(e.items&&e.items.length===0){e.items=null;e.value="";}});return out;}

let assert=(c,m)=>{if(!c){console.error("FAIL:",m);process.exit(1);}console.log("ok  -",m);};

// 1. Screenshot case: block list tags
const doc=`---
title: OPS – Claude Desktop vs. Claude.ai Web – Setup-Empfehlung
type: evaluation
status: active
tags:
  - Claude/ClaudeCode
  - MCP
---

# Claude Desktop vs. Claude.ai Web
Body here.`;
let r=splitFrontmatter(doc);
assert(r.props.length===4,"4 props parsed");
assert(r.props[0].key==="title"&&r.props[0].value.startsWith("OPS"),"title scalar");
assert(r.props[3].key==="tags"&&r.props[3].items.length===2&&r.props[3].items[0]==="Claude/ClaudeCode","tags block-list");
assert(r.body.startsWith("\n# Claude"),"body starts after frontmatter");

// 2. No frontmatter -> untouched
let n=splitFrontmatter("# Just a heading\ntext");
assert(n.props===null&&n.body==="# Just a heading\ntext","no-frontmatter passthrough");

// 3. Inline list + quotes
let q=splitFrontmatter(`---\naliases: ["A", 'B', C]\nempty:\n---\nx`);
assert(q.props[0].items.join(",")==="A,B,C","inline list + quote strip");
assert(q.props[1].value===""&&q.props[1].items===null,"empty scalar collapses");

// 4. A --- not on line 1 must NOT trigger
let mid=splitFrontmatter("text\n---\nkey: v\n---");
assert(mid.props===null,"mid-doc --- ignored");
console.log("ALL PASS");
