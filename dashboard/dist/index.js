/* kanban-attachment-preview (MIT). Bundles fflate (MIT) for .docx unzip. Source: src/ */
(() => {
  // node_modules/fflate/esm/browser.js
  var u8 = Uint8Array;
  var u16 = Uint16Array;
  var i32 = Int32Array;
  var fleb = new u8([
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    2,
    2,
    2,
    2,
    3,
    3,
    3,
    3,
    4,
    4,
    4,
    4,
    5,
    5,
    5,
    5,
    0,
    /* unused */
    0,
    0,
    /* impossible */
    0
  ]);
  var fdeb = new u8([
    0,
    0,
    0,
    0,
    1,
    1,
    2,
    2,
    3,
    3,
    4,
    4,
    5,
    5,
    6,
    6,
    7,
    7,
    8,
    8,
    9,
    9,
    10,
    10,
    11,
    11,
    12,
    12,
    13,
    13,
    /* unused */
    0,
    0
  ]);
  var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
  var freb = function(eb, start) {
    var b = new u16(31);
    for (var i2 = 0; i2 < 31; ++i2) {
      b[i2] = start += 1 << eb[i2 - 1];
    }
    var r = new i32(b[30]);
    for (var i2 = 1; i2 < 30; ++i2) {
      for (var j = b[i2]; j < b[i2 + 1]; ++j) {
        r[j] = j - b[i2] << 5 | i2;
      }
    }
    return { b, r };
  };
  var _a = freb(fleb, 2);
  var fl = _a.b;
  var revfl = _a.r;
  fl[28] = 258, revfl[258] = 28;
  var _b = freb(fdeb, 0);
  var fd = _b.b;
  var revfd = _b.r;
  var rev = new u16(32768);
  for (i = 0; i < 32768; ++i) {
    x = (i & 43690) >> 1 | (i & 21845) << 1;
    x = (x & 52428) >> 2 | (x & 13107) << 2;
    x = (x & 61680) >> 4 | (x & 3855) << 4;
    rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
  }
  var x;
  var i;
  var hMap = (function(cd, mb, r) {
    var s = cd.length;
    var i2 = 0;
    var l = new u16(mb);
    for (; i2 < s; ++i2) {
      if (cd[i2])
        ++l[cd[i2] - 1];
    }
    var le = new u16(mb);
    for (i2 = 1; i2 < mb; ++i2) {
      le[i2] = le[i2 - 1] + l[i2 - 1] << 1;
    }
    var co;
    if (r) {
      co = new u16(1 << mb);
      var rvb = 15 - mb;
      for (i2 = 0; i2 < s; ++i2) {
        if (cd[i2]) {
          var sv = i2 << 4 | cd[i2];
          var r_1 = mb - cd[i2];
          var v = le[cd[i2] - 1]++ << r_1;
          for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
            co[rev[v] >> rvb] = sv;
          }
        }
      }
    } else {
      co = new u16(s);
      for (i2 = 0; i2 < s; ++i2) {
        if (cd[i2]) {
          co[i2] = rev[le[cd[i2] - 1]++] >> 15 - cd[i2];
        }
      }
    }
    return co;
  });
  var flt = new u8(288);
  for (i = 0; i < 144; ++i)
    flt[i] = 8;
  var i;
  for (i = 144; i < 256; ++i)
    flt[i] = 9;
  var i;
  for (i = 256; i < 280; ++i)
    flt[i] = 7;
  var i;
  for (i = 280; i < 288; ++i)
    flt[i] = 8;
  var i;
  var fdt = new u8(32);
  for (i = 0; i < 32; ++i)
    fdt[i] = 5;
  var i;
  var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
  var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
  var max = function(a) {
    var m = a[0];
    for (var i2 = 1; i2 < a.length; ++i2) {
      if (a[i2] > m)
        m = a[i2];
    }
    return m;
  };
  var bits = function(d, p, m) {
    var o = p / 8 | 0;
    return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
  };
  var bits16 = function(d, p) {
    var o = p / 8 | 0;
    return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
  };
  var shft = function(p) {
    return (p + 7) / 8 | 0;
  };
  var slc = function(v, s, e) {
    if (s == null || s < 0)
      s = 0;
    if (e == null || e > v.length)
      e = v.length;
    return new u8(v.subarray(s, e));
  };
  var ec = [
    "unexpected EOF",
    "invalid block type",
    "invalid length/literal",
    "invalid distance",
    "stream finished",
    "no stream handler",
    ,
    // determined by compression function
    "no callback",
    "invalid UTF-8 data",
    "extra field too long",
    "date not in range 1980-2099",
    "filename too long",
    "stream finishing",
    "invalid zip data"
    // determined by unknown compression method
  ];
  var err = function(ind, msg, nt) {
    var e = new Error(msg || ec[ind]);
    e.code = ind;
    if (Error.captureStackTrace)
      Error.captureStackTrace(e, err);
    if (!nt)
      throw e;
    return e;
  };
  var inflt = function(dat, st, buf, dict) {
    var sl = dat.length, dl = dict ? dict.length : 0;
    if (!sl || st.f && !st.l)
      return buf || new u8(0);
    var noBuf = !buf;
    var resize = noBuf || st.i != 2;
    var noSt = st.i;
    if (noBuf)
      buf = new u8(sl * 3);
    var cbuf = function(l2) {
      var bl = buf.length;
      if (l2 > bl) {
        var nbuf = new u8(Math.max(bl * 2, l2));
        nbuf.set(buf);
        buf = nbuf;
      }
    };
    var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
    var tbts = sl * 8;
    do {
      if (!lm) {
        final = bits(dat, pos, 1);
        var type = bits(dat, pos + 1, 3);
        pos += 3;
        if (!type) {
          var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
          if (t > sl) {
            if (noSt)
              err(0);
            break;
          }
          if (resize)
            cbuf(bt + l);
          buf.set(dat.subarray(s, t), bt);
          st.b = bt += l, st.p = pos = t * 8, st.f = final;
          continue;
        } else if (type == 1)
          lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
        else if (type == 2) {
          var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
          var tl = hLit + bits(dat, pos + 5, 31) + 1;
          pos += 14;
          var ldt = new u8(tl);
          var clt = new u8(19);
          for (var i2 = 0; i2 < hcLen; ++i2) {
            clt[clim[i2]] = bits(dat, pos + i2 * 3, 7);
          }
          pos += hcLen * 3;
          var clb = max(clt), clbmsk = (1 << clb) - 1;
          var clm = hMap(clt, clb, 1);
          for (var i2 = 0; i2 < tl; ) {
            var r = clm[bits(dat, pos, clbmsk)];
            pos += r & 15;
            var s = r >> 4;
            if (s < 16) {
              ldt[i2++] = s;
            } else {
              var c = 0, n = 0;
              if (s == 16)
                n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i2 - 1];
              else if (s == 17)
                n = 3 + bits(dat, pos, 7), pos += 3;
              else if (s == 18)
                n = 11 + bits(dat, pos, 127), pos += 7;
              while (n--)
                ldt[i2++] = c;
            }
          }
          var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
          lbt = max(lt);
          dbt = max(dt);
          lm = hMap(lt, lbt, 1);
          dm = hMap(dt, dbt, 1);
        } else
          err(1);
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
      }
      if (resize)
        cbuf(bt + 131072);
      var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
      var lpos = pos;
      for (; ; lpos = pos) {
        var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
        pos += c & 15;
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (!c)
          err(2);
        if (sym < 256)
          buf[bt++] = sym;
        else if (sym == 256) {
          lpos = pos, lm = null;
          break;
        } else {
          var add = sym - 254;
          if (sym > 264) {
            var i2 = sym - 257, b = fleb[i2];
            add = bits(dat, pos, (1 << b) - 1) + fl[i2];
            pos += b;
          }
          var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
          if (!d)
            err(3);
          pos += d & 15;
          var dt = fd[dsym];
          if (dsym > 3) {
            var b = fdeb[dsym];
            dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
          }
          if (pos > tbts) {
            if (noSt)
              err(0);
            break;
          }
          if (resize)
            cbuf(bt + 131072);
          var end = bt + add;
          if (bt < dt) {
            var shift = dl - dt, dend = Math.min(dt, end);
            if (shift + bt < 0)
              err(3);
            for (; bt < dend; ++bt)
              buf[bt] = dict[shift + bt];
          }
          for (; bt < end; ++bt)
            buf[bt] = buf[bt - dt];
        }
      }
      st.l = lm, st.p = lpos, st.b = bt, st.f = final;
      if (lm)
        final = 1, st.m = lbt, st.d = dm, st.n = dbt;
    } while (!final);
    return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
  };
  var et = /* @__PURE__ */ new u8(0);
  var b2 = function(d, b) {
    return d[b] | d[b + 1] << 8;
  };
  var b4 = function(d, b) {
    return (d[b] | d[b + 1] << 8 | d[b + 2] << 16 | d[b + 3] << 24) >>> 0;
  };
  var b8 = function(d, b) {
    return b4(d, b) + b4(d, b + 4) * 4294967296;
  };
  function inflateSync(data, opts) {
    return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
  }
  var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
  var tds = 0;
  try {
    td.decode(et, { stream: true });
    tds = 1;
  } catch (e) {
  }
  var dutf8 = function(d) {
    for (var r = "", i2 = 0; ; ) {
      var c = d[i2++];
      var eb = (c > 127) + (c > 223) + (c > 239);
      if (i2 + eb > d.length)
        return { s: r, r: slc(d, i2 - 1) };
      if (!eb)
        r += String.fromCharCode(c);
      else if (eb == 3) {
        c = ((c & 15) << 18 | (d[i2++] & 63) << 12 | (d[i2++] & 63) << 6 | d[i2++] & 63) - 65536, r += String.fromCharCode(55296 | c >> 10, 56320 | c & 1023);
      } else if (eb & 1)
        r += String.fromCharCode((c & 31) << 6 | d[i2++] & 63);
      else
        r += String.fromCharCode((c & 15) << 12 | (d[i2++] & 63) << 6 | d[i2++] & 63);
    }
  };
  function strFromU8(dat, latin1) {
    if (latin1) {
      var r = "";
      for (var i2 = 0; i2 < dat.length; i2 += 16384)
        r += String.fromCharCode.apply(null, dat.subarray(i2, i2 + 16384));
      return r;
    } else if (td) {
      return td.decode(dat);
    } else {
      var _a2 = dutf8(dat), s = _a2.s, r = _a2.r;
      if (r.length)
        err(8);
      return s;
    }
  }
  var slzh = function(d, b) {
    return b + 30 + b2(d, b + 26) + b2(d, b + 28);
  };
  var zh = function(d, b, z) {
    var fnl = b2(d, b + 28), efl = b2(d, b + 30), fn = strFromU8(d.subarray(b + 46, b + 46 + fnl), !(b2(d, b + 8) & 2048)), es = b + 46 + fnl;
    var _a2 = z64hs(d, es, efl, z, b4(d, b + 20), b4(d, b + 24), b4(d, b + 42)), sc = _a2[0], su = _a2[1], off = _a2[2];
    return [b2(d, b + 10), sc, su, fn, es + efl + b2(d, b + 32), off];
  };
  var z64hs = function(d, b, l, z, sc, su, off) {
    var nsc = sc == 4294967295, nsu = su == 4294967295, noff = off == 4294967295, e = b + l;
    var nf = nsc + nsu + noff;
    if (z && nf) {
      for (; b + 4 < e; b += 4 + b2(d, b + 2)) {
        if (b2(d, b) == 1) {
          return [
            nsc ? b8(d, b + 4 + 8 * nsu) : sc,
            nsu ? b8(d, b + 4) : su,
            noff ? b8(d, b + 4 + 8 * (nsu + nsc)) : off,
            1
          ];
        }
      }
      if (z < 2)
        err(13);
    }
    return [sc, su, off, 0];
  };
  function unzipSync(data, opts) {
    var files = {};
    var e = data.length - 22;
    for (; b4(data, e) != 101010256; --e) {
      if (!e || data.length - e > 65558)
        err(13);
    }
    ;
    var c = b2(data, e + 8);
    if (!c)
      return {};
    var o = b4(data, e + 16);
    var z = b4(data, e - 20) == 117853008;
    if (z) {
      var ze = b4(data, e - 12);
      z = b4(data, ze) == 101075792;
      if (z) {
        c = b4(data, ze + 32);
        o = b4(data, ze + 48);
      }
    }
    var fltr = opts && opts.filter;
    for (var i2 = 0; i2 < c; ++i2) {
      var _a2 = zh(data, o, z), c_2 = _a2[0], sc = _a2[1], su = _a2[2], fn = _a2[3], no = _a2[4], off = _a2[5], b = slzh(data, off);
      o = no;
      if (!fltr || fltr({
        name: fn,
        size: sc,
        originalSize: su,
        compression: c_2
      })) {
        if (!c_2)
          files[fn] = slc(data, b, b + sc);
        else if (c_2 == 8)
          files[fn] = inflateSync(data.subarray(b, b + sc), { out: new u8(su) });
        else
          err(14, "unknown compression type " + c_2);
      }
    }
    return files;
  }

  // src/docx.js
  var W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  var R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  var MAX_PART = 25 * 1024 * 1024;
  var A = "http://schemas.openxmlformats.org/drawingml/2006/main";
  var WP = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
  var VML = "urn:schemas-microsoft-com:vml";
  var MAX_MEDIA_TOTAL = 40 * 1024 * 1024;
  var IMG_TYPES = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", bmp: "image/bmp" };
  var WANTED = /* @__PURE__ */ new Set(["word/document.xml", "word/_rels/document.xml.rels", "word/numbering.xml"]);
  var kids = (n, name) => Array.from(n.childNodes).filter((c) => c.nodeType === 1 && c.namespaceURI === W && c.localName === name);
  var kid = (n, name) => kids(n, name)[0] || null;
  var attr = (n, name) => n ? n.getAttributeNS(W, name) || n.getAttribute("w:" + name) : null;
  var on = (n) => !!n && !/^(0|false|off|none)$/i.test(attr(n, "val") || "true");
  function parseXml(u82) {
    const doc = new DOMParser().parseFromString(strFromU8(u82), "application/xml");
    if (doc.getElementsByTagName("parsererror").length) throw new Error("invalid XML in document");
    return doc;
  }
  function el(tag, text) {
    const n = document.createElement(tag);
    if (text != null) n.textContent = text;
    return n;
  }
  function numberingMap(doc) {
    const out = /* @__PURE__ */ new Map();
    if (!doc) return out;
    const abs = /* @__PURE__ */ new Map();
    doc.documentElement.childNodes.forEach((n) => {
      if (n.localName === "abstractNum") {
        const lv = /* @__PURE__ */ new Map();
        kids(n, "lvl").forEach((l) => lv.set(attr(l, "ilvl") || "0", attr(kid(l, "numFmt"), "val") === "bullet" ? "bullet" : "number"));
        abs.set(attr(n, "abstractNumId"), lv);
      }
    });
    doc.documentElement.childNodes.forEach((n) => {
      if (n.localName === "num") out.set(attr(n, "numId"), abs.get(attr(kid(n, "abstractNumId"), "val")) || /* @__PURE__ */ new Map());
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
      else if (c.localName === "tab") wrap.appendChild(document.createTextNode("\xA0\xA0\xA0\xA0"));
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
      alt = pr && (pr.getAttribute("descr") || pr.getAttribute("title")) || "";
    } else {
      const im = node.getElementsByTagNameNS(VML, "imagedata")[0];
      if (im) {
        rid = im.getAttributeNS(R, "id") || im.getAttribute("r:id");
        alt = im.getAttribute("o:title") || "";
      }
    }
    const rel = rid && state.rels.get(rid);
    const name = rel && !rel.external ? "word/" + rel.target.replace(/^\/?(word\/)?/, "") : null;
    const data = name && state.media[name];
    const type = name && IMG_TYPES[name.split(".").pop().toLowerCase()];
    if (!data || !type) {
      state.images++;
      return;
    }
    const url = URL.createObjectURL(new Blob([data], { type }));
    state.urls.push(url);
    const img = el("img");
    img.src = url;
    img.alt = alt;
    img.loading = "lazy";
    if (width > 0 && width < 4e3) img.style.width = width + "px";
    img.style.maxWidth = "100%";
    img.style.height = "auto";
    parent.appendChild(img);
  }
  function renderInline(node, parent, state) {
    Array.from(node.childNodes).forEach((c) => {
      if (c.nodeType !== 1 || c.namespaceURI !== W) return;
      switch (c.localName) {
        case "r":
          renderRun(c, parent, state);
          break;
        case "hyperlink": {
          const rel = state.rels.get(c.getAttributeNS(R, "id") || c.getAttribute("r:id"));
          const target = rel && rel.external ? rel.target : null;
          if (target && /^(https?:\/\/|mailto:)/i.test(target)) {
            const a = el("a");
            a.href = target;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            parent.appendChild(a);
            renderInline(c, a, state);
          } else renderInline(c, parent, state);
          break;
        }
        case "ins":
        case "smartTag":
        case "sdt":
        case "sdtContent":
        case "fldSimple":
          renderInline(c, parent, state);
          break;
        default:
          break;
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
    const fmt = (state.numbering.get(numId) || /* @__PURE__ */ new Map()).get(lvl) || "bullet";
    return { numId, lvl: parseInt(lvl, 10) || 0, tag: fmt === "bullet" ? "ul" : "ol" };
  }
  function renderBlocks(container, out, state) {
    let stack = [];
    const closeLists = () => {
      stack = [];
    };
    Array.from(container.childNodes).forEach((c) => {
      if (c.nodeType !== 1 || c.namespaceURI !== W) return;
      if (c.localName === "sdt" || c.localName === "sdtContent") {
        closeLists();
        renderBlocks(kid(c, "sdtContent") || c, out, state);
        return;
      }
      if (c.localName === "tbl") {
        closeLists();
        out.appendChild(renderTable(c, state));
        return;
      }
      if (c.localName !== "p") return;
      const info = listKind(kid(c, "pPr"), state);
      if (!info) {
        closeLists();
        out.appendChild(renderParagraph(c, state));
        return;
      }
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
    const wrap = el("div");
    wrap.className = "kap-doc-table";
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
  function docxToElement(buf) {
    let mediaBudget = MAX_MEDIA_TOTAL;
    const files = unzipSync(new Uint8Array(buf), {
      filter: (f) => {
        if (WANTED.has(f.name)) return f.originalSize <= MAX_PART;
        if (f.name.startsWith("word/media/") && IMG_TYPES[f.name.split(".").pop().toLowerCase()] && f.originalSize <= mediaBudget) {
          mediaBudget -= f.originalSize;
          return true;
        }
        return false;
      }
    });
    const main = files["word/document.xml"];
    if (!main) throw new Error("not a Word document (word/document.xml missing)");
    const rels = /* @__PURE__ */ new Map();
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

  // src/index.js
  (function() {
    "use strict";
    const SDK = window.__HERMES_PLUGIN_SDK__;
    const API = "/api/plugins/kanban";
    const LS_BOARD_KEY = "hermes.kanban.selectedBoard";
    const TEXT_LIMIT = 512 * 1024;
    const TEXT_EXT = /* @__PURE__ */ new Set([
      "txt",
      "md",
      "markdown",
      "log",
      "json",
      "jsonl",
      "yaml",
      "yml",
      "toml",
      "ini",
      "cfg",
      "conf",
      "csv",
      "tsv",
      "xml",
      "html",
      "htm",
      "css",
      "js",
      "mjs",
      "ts",
      "tsx",
      "jsx",
      "py",
      "rb",
      "go",
      "rs",
      "java",
      "c",
      "h",
      "cpp",
      "sh",
      "zsh",
      "bash",
      "sql",
      "diff",
      "patch",
      "env",
      "php"
    ]);
    const BINARY_EXT = /* @__PURE__ */ new Set(["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp", "zip", "gz", "tar", "7z", "rar"]);
    const IMAGE_EXT = /* @__PURE__ */ new Set(["png", "jpg", "jpeg", "gif", "webp", "avif", "bmp", "svg", "ico"]);
    const AUDIO_EXT = /* @__PURE__ */ new Set(["mp3", "wav", "ogg", "m4a", "flac", "aac"]);
    const VIDEO_EXT = /* @__PURE__ */ new Set(["mp4", "webm", "mov", "m4v", "ogv"]);
    function ext(name) {
      const i2 = (name || "").lastIndexOf(".");
      return i2 < 0 ? "" : name.slice(i2 + 1).toLowerCase();
    }
    function kindOf(att) {
      const ct = (att.content_type || "").toLowerCase().split(";")[0].trim();
      const e = ext(att.filename);
      if (ct.startsWith("image/") || IMAGE_EXT.has(e)) return "image";
      if (ct === "application/pdf" || e === "pdf") return "pdf";
      if (ct.startsWith("audio/") || AUDIO_EXT.has(e)) return "audio";
      if (ct.startsWith("video/") || VIDEO_EXT.has(e)) return "video";
      if (e === "docx" || ct === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
      if (/officedocument|opendocument|msword|ms-excel|ms-powerpoint|zip/.test(ct) || BINARY_EXT.has(e)) return null;
      if (ct.startsWith("text/") || /json|xml|yaml|javascript|x-sh/.test(ct) || TEXT_EXT.has(e)) return "text";
      return null;
    }
    function blobType(kind, att) {
      if (kind === "pdf") return "application/pdf";
      if (kind === "image") return ext(att.filename) === "svg" ? "image/svg+xml" : att.content_type || "";
      return att.content_type || "";
    }
    function fmtBytes(n) {
      if (!(n >= 0)) return "";
      if (n < 1024) return n + " B";
      if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
      return (n / 1024 / 1024).toFixed(1) + " MB";
    }
    function board() {
      try {
        return (window.localStorage.getItem(LS_BOARD_KEY) || "").trim() || null;
      } catch (_e) {
        return null;
      }
    }
    function withBoard(url) {
      const b = board();
      return b ? url + (url.indexOf("?") >= 0 ? "&" : "?") + "board=" + encodeURIComponent(b) : url;
    }
    const listCache = /* @__PURE__ */ new Map();
    function loadList(taskId, force) {
      if (force || !listCache.has(taskId)) {
        listCache.set(taskId, SDK.fetchJSON(withBoard(API + "/tasks/" + encodeURIComponent(taskId) + "/attachments")).then(function(r) {
          return r && r.attachments || [];
        }).catch(function(e) {
          listCache.delete(taskId);
          throw e;
        }));
      }
      return listCache.get(taskId);
    }
    function findAtt(list, name, sizeText) {
      const byName = list.filter(function(a) {
        return a.filename === name;
      });
      if (byName.length <= 1) return byName[0] || null;
      return byName.find(function(a) {
        return fmtBytes(a.size) === sizeText;
      }) || byName[0];
    }
    let modal = null;
    function closeModal() {
      if (!modal) return;
      if (modal.url) URL.revokeObjectURL(modal.url);
      modal.docUrls.forEach(function(u) {
        URL.revokeObjectURL(u);
      });
      document.removeEventListener("keydown", modal.onKey, true);
      modal.shade.remove();
      modal = null;
    }
    function el2(tag, cls, text) {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    }
    function openModal(list, index) {
      closeModal();
      const shade = el2("div", "kap-shade");
      shade.setAttribute("data-testid", "kap-modal");
      const box = el2("div", "kap-modal");
      const head = el2("div", "kap-head");
      const title = el2("span", "kap-title");
      const meta = el2("span", "kap-meta");
      const prev = el2("button", "kap-btn", "\u2039");
      prev.title = "Previous attachment";
      prev.setAttribute("data-testid", "kap-prev");
      const next = el2("button", "kap-btn", "\u203A");
      next.title = "Next attachment";
      next.setAttribute("data-testid", "kap-next");
      const dl = el2("button", "kap-btn", "Download");
      dl.setAttribute("data-testid", "kap-download");
      const close = el2("button", "kap-btn", "Close");
      close.title = "Close (Esc)";
      close.setAttribute("data-testid", "kap-close");
      [prev, next, dl, close].forEach(function(b) {
        b.type = "button";
      });
      head.append(prev, title, meta, next, dl, close);
      const body = el2("div", "kap-body");
      body.setAttribute("data-testid", "kap-body");
      box.append(head, body);
      shade.append(box);
      document.body.appendChild(shade);
      const state = { shade, url: null, idx: index, seq: 0, blob: null, onKey: null, docUrls: [] };
      modal = state;
      function note(text, isErr) {
        body.replaceChildren(el2("div", "kap-note" + (isErr ? " kap-note-err" : ""), text));
      }
      function show(i2) {
        if (i2 < 0 || i2 >= list.length) return;
        state.idx = i2;
        const att = list[i2];
        const seq = ++state.seq;
        if (state.url) {
          URL.revokeObjectURL(state.url);
          state.url = null;
        }
        state.docUrls.forEach(function(u) {
          URL.revokeObjectURL(u);
        });
        state.docUrls = [];
        state.blob = null;
        title.textContent = att.filename;
        title.title = att.filename;
        meta.textContent = (att.content_type || "unknown type") + " \xB7 " + fmtBytes(att.size) + " \xB7 " + (i2 + 1) + "/" + list.length;
        prev.disabled = i2 === 0;
        next.disabled = i2 === list.length - 1;
        const kind = kindOf(att);
        note("Loading\u2026");
        SDK.authedFetch(withBoard(API + "/attachments/" + att.id)).then(function(resp) {
          if (!resp.ok) return resp.text().then(function(t) {
            throw new Error(resp.status + " " + t.slice(0, 200));
          });
          return resp.blob();
        }).then(function(raw) {
          if (modal !== state || seq !== state.seq) return;
          state.blob = raw;
          if (!kind) {
            note("No preview for this file type. Use Download.");
            return;
          }
          if (kind === "text") {
            return raw.slice(0, TEXT_LIMIT).text().then(function(txt) {
              if (modal !== state || seq !== state.seq) return;
              const pre = el2("pre", "kap-text", txt);
              pre.setAttribute("data-testid", "kap-text");
              body.replaceChildren(pre);
              if (raw.size > TEXT_LIMIT) body.appendChild(el2("div", "kap-note", "Showing the first " + fmtBytes(TEXT_LIMIT) + ". Download for the full file."));
            });
          }
          if (kind === "docx") {
            return raw.arrayBuffer().then(function(buf) {
              if (modal !== state || seq !== state.seq) return;
              let res;
              try {
                res = docxToElement(buf);
              } catch (err2) {
                note("Could not render this document (" + (err2 && err2.message || err2) + "). Use Download.", true);
                return;
              }
              state.docUrls = res.urls;
              res.root.setAttribute("data-testid", "kap-docx");
              body.replaceChildren(res.root);
              if (res.images) body.appendChild(el2("div", "kap-note", res.images + " image(s) in an unsupported format were not shown. Download for the full document."));
            });
          }
          const typed = new Blob([raw], { type: blobType(kind, att) });
          state.url = URL.createObjectURL(typed);
          let node;
          if (kind === "image") {
            node = el2("img");
            node.alt = att.filename;
            node.src = state.url;
          } else if (kind === "pdf") {
            node = el2("iframe");
            node.title = att.filename;
            node.src = state.url;
          } else if (kind === "audio") {
            node = el2("audio");
            node.controls = true;
            node.src = state.url;
          } else {
            node = el2("video");
            node.controls = true;
            node.src = state.url;
          }
          node.setAttribute("data-testid", "kap-" + kind);
          body.replaceChildren(node);
        }).catch(function(e) {
          if (modal === state && seq === state.seq) note("Could not load preview: " + (e && e.message || e), true);
        });
      }
      prev.addEventListener("click", function() {
        show(state.idx - 1);
      });
      next.addEventListener("click", function() {
        show(state.idx + 1);
      });
      close.addEventListener("click", closeModal);
      shade.addEventListener("click", function(e) {
        if (e.target === shade) closeModal();
      });
      dl.addEventListener("click", function() {
        if (!state.blob) return;
        const u = URL.createObjectURL(state.blob);
        const a = document.createElement("a");
        a.href = u;
        a.download = list[state.idx].filename || "attachment";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function() {
          URL.revokeObjectURL(u);
        }, 1e4);
      });
      state.onKey = function(e) {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          closeModal();
        } else if (e.key === "ArrowLeft") {
          e.stopPropagation();
          show(state.idx - 1);
        } else if (e.key === "ArrowRight") {
          e.stopPropagation();
          show(state.idx + 1);
        }
      };
      document.addEventListener("keydown", state.onKey, true);
      show(index);
    }
    function taskIdOf(drawer) {
      const s = drawer.querySelector(".hermes-kanban-drawer-head > span");
      return s ? s.textContent.trim() : "";
    }
    function decorate() {
      document.querySelectorAll(".hermes-kanban-drawer").forEach(function(drawer) {
        const taskId = taskIdOf(drawer);
        if (!taskId) return;
        drawer.querySelectorAll(".hermes-kanban-attachment-link").forEach(function(link) {
          const row = link.parentElement;
          if (!row || row.querySelector(":scope > .kap-btn")) return;
          const btn = el2("button", "kap-btn", "Preview");
          btn.type = "button";
          btn.setAttribute("data-testid", "kap-open");
          btn.title = "Preview attachment";
          const sizeEl = link.nextElementSibling;
          (sizeEl || link).insertAdjacentElement("afterend", btn);
          btn.addEventListener("click", function(e) {
            e.stopPropagation();
            const name = link.title || link.textContent;
            const sizeText = sizeEl ? sizeEl.textContent.trim() : "";
            btn.disabled = true;
            loadList(taskId, true).then(function(list) {
              const att = findAtt(list, name, sizeText);
              if (!att) throw new Error("attachment not found");
              openModal(list, list.indexOf(att));
            }).catch(function(err2) {
              window.alert("Could not open preview: " + (err2 && err2.message || err2));
            }).finally(function() {
              btn.disabled = false;
            });
          });
        });
      });
    }
    let scheduled = false;
    function schedule() {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(function() {
        scheduled = false;
        decorate();
      });
    }
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    schedule();
    window.__HERMES_PLUGINS__.register("kanban-attachment-preview", function() {
      return null;
    });
  })();
})();
