// Minimal .docx -> DOM renderer (paragraphs, headings, inline formatting, links,
// lists, tables). Built with DOM APIs and textContent only, so document text can
// never become markup. PNG/JPEG/GIF/WebP/BMP images are shown; other image
// formats, headers/footers, footnotes and tracked deletions are not. Not a layout engine: it is a readable preview.
import { unzipSync, strFromU8 } from "fflate";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const MAX_PART = 25 * 1024 * 1024;
const A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const WP = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
const VML = "urn:schemas-microsoft-com:vml";
const MAX_MEDIA_TOTAL = 40 * 1024 * 1024;
// Only raster formats a browser renders safely; SVG/EMF/WMF are skipped.
const IMG_TYPES = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", bmp: "image/bmp" };
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
    else if (c.localName === "drawing" || c.localName === "pict") renderImage(c, wrap, state);
  });
}

function renderImage(node, parent, state) {
  let rid = null, alt = "", width = 0;
  const blip = node.getElementsByTagNameNS(A, "blip")[0];
  if (blip) {
    rid = blip.getAttributeNS(R, "embed") || blip.getAttribute("r:embed");
    const ext = node.getElementsByTagNameNS(WP, "extent")[0];
    const cx = ext ? parseInt(ext.getAttribute("cx") || "0", 10) : 0;
    width = cx > 0 ? Math.round(cx / 9525) : 0;
    const pr = node.getElementsByTagNameNS(WP, "docPr")[0];
    alt = (pr && (pr.getAttribute("descr") || pr.getAttribute("title"))) || "";
  } else {
    const im = node.getElementsByTagNameNS(VML, "imagedata")[0];
    if (im) { rid = im.getAttributeNS(R, "id") || im.getAttribute("r:id"); alt = im.getAttribute("o:title") || ""; }
  }
  const rel = rid && state.rels.get(rid);
  const name = rel && !rel.external ? "word/" + rel.target.replace(/^\/?(word\/)?/, "") : null;
  const data = name && state.media[name];
  const type = name && IMG_TYPES[name.split(".").pop().toLowerCase()];
  if (!data || !type) { state.images++; return; }
  const url = URL.createObjectURL(new Blob([data], { type }));
  state.urls.push(url);
  const img = el("img");
  img.src = url; img.alt = alt; img.loading = "lazy";
  if (width > 0 && width < 4000) img.style.width = width + "px";
  img.style.maxWidth = "100%"; img.style.height = "auto";
  parent.appendChild(img);
}

function renderInline(node, parent, state) {
  Array.from(node.childNodes).forEach((c) => {
    if (c.nodeType !== 1 || c.namespaceURI !== W) return;
    switch (c.localName) {
      case "r": renderRun(c, parent, state); break;
      case "hyperlink": {
        const rel = state.rels.get(c.getAttributeNS(R, "id") || c.getAttribute("r:id"));
        const target = rel && rel.external ? rel.target : null;
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

// -> { root: HTMLElement, images: number (skipped), urls: string[] (blob URLs to revoke) }; throws on anything that isn't a readable .docx
export function docxToElement(buf) {
  let mediaBudget = MAX_MEDIA_TOTAL;
  const files = unzipSync(new Uint8Array(buf), {
    filter: (f) => {
      if (WANTED.has(f.name)) return f.originalSize <= MAX_PART;
      if (f.name.startsWith("word/media/") && IMG_TYPES[f.name.split(".").pop().toLowerCase()] && f.originalSize <= mediaBudget) { mediaBudget -= f.originalSize; return true; }
      return false;
    },
  });
  const main = files["word/document.xml"];
  if (!main) throw new Error("not a Word document (word/document.xml missing)");
  const rels = new Map();
  if (files["word/_rels/document.xml.rels"]) {
    Array.from(parseXml(files["word/_rels/document.xml.rels"]).getElementsByTagName("Relationship")).forEach((r) => {
      rels.set(r.getAttribute("Id"), { target: r.getAttribute("Target") || "", external: r.getAttribute("TargetMode") === "External" });
    });
  }
  const state = { rels, numbering: numberingMap(files["word/numbering.xml"] ? parseXml(files["word/numbering.xml"]) : null), images: 0, media: files, urls: [] };
  const doc = parseXml(main);
  const root = el("div");
  root.className = "kap-doc";
  const body = doc.getElementsByTagNameNS(W, "body")[0];
  if (!body) throw new Error("document has no body");
  renderBlocks(body, root, state);
  return { root, images: state.images, urls: state.urls };
}
