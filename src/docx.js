// Minimal .docx -> DOM renderer (paragraphs, headings, inline formatting, links,
// lists, tables). Built with DOM APIs and textContent only, so document text can
// never become markup. Images, headers/footers, footnotes and tracked deletions
// are not rendered. Not a layout engine: it is a readable preview.
import { unzipSync, strFromU8 } from "fflate";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const MAX_PART = 25 * 1024 * 1024;
const WANTED = new Set(["word/document.xml", "word/_rels/document.xml.rels", "word/numbering.xml"]);

const kids = (n, name) => Array.from(n.childNodes).filter((c) => c.nodeType === 1 && c.namespaceURI === W && c.localName === name);
const kid = (n, name) => kids(n, name)[0] || null;
const attr = (n, name) => (n ? n.getAttributeNS(W, name) || n.getAttribute("w:" + name) : null);
const on = (n) => !!n && !/^(0|false|off|none)$/i.test(attr(n, "val") || "true");

function parseXml(u8) {
  const doc = new DOMParser().parseFromString(strFromU8(u8), "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("invalid XML in document");
  return doc;
}

function el(tag, text) {
  const n = document.createElement(tag);
  if (text != null) n.textContent = text;
  return n;
}

function numberingMap(doc) {
  // numId -> (ilvl -> "bullet" | "number")
  const out = new Map();
  if (!doc) return out;
  const abs = new Map();
  doc.documentElement.childNodes.forEach((n) => {
    if (n.localName === "abstractNum") {
      const lv = new Map();
      kids(n, "lvl").forEach((l) => lv.set(attr(l, "ilvl") || "0", attr(kid(l, "numFmt"), "val") === "bullet" ? "bullet" : "number"));
      abs.set(attr(n, "abstractNumId"), lv);
    }
  });
  doc.documentElement.childNodes.forEach((n) => {
    if (n.localName === "num") out.set(attr(n, "numId"), abs.get(attr(kid(n, "abstractNumId"), "val")) || new Map());
  });
  return out;
}

function renderRun(run, parent, state) {
  const rPr = kid(run, "rPr");
  let wrap = parent;
  if (rPr) {
    if (on(kid(rPr, "b"))) wrap = wrap.appendChild(el("strong"));
    if (on(kid(rPr, "i"))) wrap = wrap.appendChild(el("em"));
    const u = kid(rPr, "u");
    if (u && attr(u, "val") !== "none") wrap = wrap.appendChild(el("u"));
    if (on(kid(rPr, "strike"))) wrap = wrap.appendChild(el("s"));
    const va = attr(kid(rPr, "vertAlign"), "val");
    if (va === "superscript") wrap = wrap.appendChild(el("sup"));
    else if (va === "subscript") wrap = wrap.appendChild(el("sub"));
  }
  Array.from(run.childNodes).forEach((c) => {
    if (c.nodeType !== 1 || c.namespaceURI !== W) return;
    if (c.localName === "t") wrap.appendChild(document.createTextNode(c.textContent));
    else if (c.localName === "tab") wrap.appendChild(document.createTextNode("    "));
    else if (c.localName === "br" || c.localName === "cr") wrap.appendChild(el("br"));
    else if (c.localName === "drawing" || c.localName === "pict") state.images++;
  });
}

function renderInline(node, parent, state) {
  Array.from(node.childNodes).forEach((c) => {
    if (c.nodeType !== 1 || c.namespaceURI !== W) return;
    switch (c.localName) {
      case "r": renderRun(c, parent, state); break;
      case "hyperlink": {
        const target = state.rels.get(c.getAttributeNS(R, "id") || c.getAttribute("r:id"));
        if (target && /^(https?:\/\/|mailto:)/i.test(target)) {
          const a = el("a");
          a.href = target; a.target = "_blank"; a.rel = "noopener noreferrer";
          parent.appendChild(a);
          renderInline(c, a, state);
        } else renderInline(c, parent, state);
        break;
      }
      case "ins": case "smartTag": case "sdt": case "sdtContent": case "fldSimple":
        renderInline(c, parent, state); break;
      default: break; // w:del and everything else is skipped
    }
  });
}

function headingTag(pPr) {
  const s = attr(kid(pPr, "pStyle"), "val") || "";
  if (/^title$/i.test(s)) return "h1";
  const m = s.match(/^heading\s*([1-6])$/i);
  return m ? "h" + m[1] : null;
}

function renderParagraph(p, state) {
  const pPr = kid(p, "pPr");
  const h = pPr ? headingTag(pPr) : null;
  const node = el(h || "p");
  renderInline(p, node, state);
  if (!node.textContent && !node.querySelector("br")) node.appendChild(el("br"));
  return node;
}

function listKind(pPr, state) {
  const numPr = pPr && kid(pPr, "numPr");
  const numId = numPr && attr(kid(numPr, "numId"), "val");
  if (!numPr || !numId || numId === "0") return null;
  const lvl = attr(kid(numPr, "ilvl"), "val") || "0";
  const fmt = (state.numbering.get(numId) || new Map()).get(lvl) || "bullet";
  return { numId, lvl: parseInt(lvl, 10) || 0, tag: fmt === "bullet" ? "ul" : "ol" };
}

function renderBlocks(container, out, state) {
  let stack = []; // [{list, lvl, numId}]
  const closeLists = () => { stack = []; };
  Array.from(container.childNodes).forEach((c) => {
    if (c.nodeType !== 1 || c.namespaceURI !== W) return;
    if (c.localName === "sdt" || c.localName === "sdtContent") {
      closeLists();
      renderBlocks(kid(c, "sdtContent") || c, out, state);
      return;
    }
    if (c.localName === "tbl") { closeLists(); out.appendChild(renderTable(c, state)); return; }
    if (c.localName !== "p") return;
    const info = listKind(kid(c, "pPr"), state);
    if (!info) { closeLists(); out.appendChild(renderParagraph(c, state)); return; }
    while (stack.length && stack[stack.length - 1].lvl > info.lvl) stack.pop();
    let top = stack[stack.length - 1];
    if (!top || top.lvl < info.lvl || top.numId !== info.numId || top.tag !== info.tag) {
      if (top && top.lvl === info.lvl) stack.pop();
      const list = el(info.tag);
      const parentLi = stack.length ? stack[stack.length - 1].list.lastElementChild : null;
      (parentLi || out).appendChild(list);
      top = { list, lvl: info.lvl, numId: info.numId, tag: info.tag };
      stack.push(top);
    }
    const li = el("li");
    renderInline(c, li, state);
    top.list.appendChild(li);
  });
}

function renderTable(tbl, state) {
  const wrap = el("div"); wrap.className = "kap-doc-table";
  const table = wrap.appendChild(el("table"));
  kids(tbl, "tr").forEach((tr) => {
    const row = table.appendChild(el("tr"));
    kids(tr, "tc").forEach((tc) => {
      const cell = row.appendChild(el("td"));
      const span = parseInt(attr(kid(kid(tc, "tcPr") || tc, "gridSpan"), "val") || "1", 10);
      if (span > 1 && span < 64) cell.colSpan = span;
      renderBlocks(tc, cell, state);
    });
  });
  return wrap;
}

// -> { root: HTMLElement, images: number }; throws on anything that isn't a readable .docx
export function docxToElement(buf) {
  const files = unzipSync(new Uint8Array(buf), { filter: (f) => WANTED.has(f.name) && f.originalSize <= MAX_PART });
  const main = files["word/document.xml"];
  if (!main) throw new Error("not a Word document (word/document.xml missing)");
  const rels = new Map();
  if (files["word/_rels/document.xml.rels"]) {
    Array.from(parseXml(files["word/_rels/document.xml.rels"]).getElementsByTagName("Relationship")).forEach((r) => {
      if (r.getAttribute("TargetMode") === "External") rels.set(r.getAttribute("Id"), r.getAttribute("Target"));
    });
  }
  const state = { rels, numbering: numberingMap(files["word/numbering.xml"] ? parseXml(files["word/numbering.xml"]) : null), images: 0 };
  const doc = parseXml(main);
  const root = el("div");
  root.className = "kap-doc";
  const body = doc.getElementsByTagNameNS(W, "body")[0];
  if (!body) throw new Error("document has no body");
  renderBlocks(body, root, state);
  return { root, images: state.images };
}
