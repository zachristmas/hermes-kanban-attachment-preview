// kanban-attachment-preview: add a Preview button to each attachment row in the
// kanban task drawer and open it in a modal (images, PDF, audio, video, text).
//
// The built-in drawer has no plugin slots and its rows carry no attachment id,
// so rows are matched to the task's attachment list by filename + size. Files
// are fetched with SDK.authedFetch (the dashboard needs auth on every request)
// and shown from blob URLs. Nothing is ever rendered as HTML: text goes in via
// textContent, SVG goes through <img>, and the blob type is forced from a
// fixed allow-list.
import { docxToElement } from "./docx.js";

(function () {
  "use strict";

  const SDK = window.__HERMES_PLUGIN_SDK__;
  const API = "/api/plugins/kanban";
  const LS_BOARD_KEY = "hermes.kanban.selectedBoard"; // same key the kanban plugin writes
  const TEXT_LIMIT = 512 * 1024;

  const TEXT_EXT = new Set([
    "txt", "md", "markdown", "log", "json", "jsonl", "yaml", "yml", "toml", "ini", "cfg", "conf",
    "csv", "tsv", "xml", "html", "htm", "css", "js", "mjs", "ts", "tsx", "jsx", "py", "rb", "go",
    "rs", "java", "c", "h", "cpp", "sh", "zsh", "bash", "sql", "diff", "patch", "env", "php",
  ]);
  const BINARY_EXT = new Set(["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp", "zip", "gz", "tar", "7z", "rar"]);
  const IMAGE_EXT =new Set(["png", "jpg", "jpeg", "gif", "webp", "avif", "bmp", "svg", "ico"]);
  const AUDIO_EXT = new Set(["mp3", "wav", "ogg", "m4a", "flac", "aac"]);
  const VIDEO_EXT = new Set(["mp4", "webm", "mov", "m4v", "ogv"]);

  function ext(name) {
    const i = (name || "").lastIndexOf(".");
    return i < 0 ? "" : name.slice(i + 1).toLowerCase();
  }

  // -> "image" | "pdf" | "audio" | "video" | "text" | "docx" | null
  function kindOf(att) {
    const ct = (att.content_type || "").toLowerCase().split(";")[0].trim();
    const e = ext(att.filename);
    if (ct.startsWith("image/") || IMAGE_EXT.has(e)) return "image";
    if (ct === "application/pdf" || e === "pdf") return "pdf";
    if (ct.startsWith("audio/") || AUDIO_EXT.has(e)) return "audio";
    if (ct.startsWith("video/") || VIDEO_EXT.has(e)) return "video";
    if (e === "docx" || ct === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
    // Office/zip formats (docx, xlsx, pptx, odt...) have "xml" in their MIME type but are binary.
    if (/officedocument|opendocument|msword|ms-excel|ms-powerpoint|zip/.test(ct) || BINARY_EXT.has(e)) return null;
    if (ct.startsWith("text/") || /json|xml|yaml|javascript|x-sh/.test(ct) || TEXT_EXT.has(e)) return "text";
    return null;
  }

  function blobType(kind, att) {
    // Force a safe, known type; never trust a stored type into a renderable one.
    if (kind === "pdf") return "application/pdf";
    if (kind === "image") return ext(att.filename) === "svg" ? "image/svg+xml" : (att.content_type || "");
    return att.content_type || "";
  }

  // Short, human type label for the modal header (Office MIME types are very long).
  function typeLabel(att, kind) {
    if (kind === "docx") return "Word document";
    const ct = att.content_type || "";
    if (ct && ct.length <= 32) return ct;
    const e = ext(att.filename);
    return e ? e.toUpperCase() + " file" : "unknown type";
  }

  function fmtBytes(n) {
    if (!(n >= 0)) return "";
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / 1024 / 1024).toFixed(1) + " MB";
  }

  // Word-document zoom: 1 = the base size; the default is deliberately smaller so a page fits comfortably.
  const ZOOM_KEY = "hermes.kanban.docZoom";
  const ZOOM_STEPS = [0.5, 0.625, 0.75, 0.875, 1, 1.25, 1.5, 1.75];
  const ZOOM_DEFAULT = 0.75;
  function readZoom() {
    try { const v = parseFloat(window.localStorage.getItem(ZOOM_KEY)); if (ZOOM_STEPS.indexOf(v) >= 0) return v; } catch (_e) { /* ignore */ }
    return ZOOM_DEFAULT;
  }
  function writeZoom(v) { try { window.localStorage.setItem(ZOOM_KEY, String(v)); } catch (_e) { /* ignore */ } }

  function board() {
    try { return (window.localStorage.getItem(LS_BOARD_KEY) || "").trim() || null; } catch (_e) { return null; }
  }

  function withBoard(url) {
    const b = board();
    return b ? url + (url.indexOf("?") >= 0 ? "&" : "?") + "board=" + encodeURIComponent(b) : url;
  }

  // --- attachment list per task (id lookup) --------------------------------
  const listCache = new Map(); // taskId -> Promise<attachment[]>

  function loadList(taskId, force) {
    if (force || !listCache.has(taskId)) {
      listCache.set(taskId, SDK.fetchJSON(withBoard(API + "/tasks/" + encodeURIComponent(taskId) + "/attachments"))
        .then(function (r) { return (r && r.attachments) || []; })
        .catch(function (e) { listCache.delete(taskId); throw e; }));
    }
    return listCache.get(taskId);
  }

  function findAtt(list, name, sizeText) {
    const byName = list.filter(function (a) { return a.filename === name; });
    if (byName.length <= 1) return byName[0] || null;
    return byName.find(function (a) { return fmtBytes(a.size) === sizeText; }) || byName[0];
  }

  // --- modal ---------------------------------------------------------------
  let modal = null;

  function closeModal() {
    if (!modal) return;
    if (modal.url) URL.revokeObjectURL(modal.url);
    modal.docUrls.forEach(function (u) { URL.revokeObjectURL(u); });
    document.removeEventListener("keydown", modal.onKey, true);
    modal.shade.remove();
    modal = null;
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function openModal(list, index) {
    closeModal();
    const shade = el("div", "kap-shade");
    shade.setAttribute("data-testid", "kap-modal");
    const box = el("div", "kap-modal");
    const head = el("div", "kap-head");
    const title = el("span", "kap-title");
    const meta = el("span", "kap-meta");
    const prev = el("button", "kap-btn", "‹"); prev.title = "Previous attachment"; prev.setAttribute("data-testid", "kap-prev");
    const next = el("button", "kap-btn", "›"); next.title = "Next attachment"; next.setAttribute("data-testid", "kap-next");
    const dl = el("button", "kap-btn", "Download"); dl.setAttribute("data-testid", "kap-download");
    const close = el("button", "kap-btn", "Close"); close.title = "Close (Esc)"; close.setAttribute("data-testid", "kap-close");
    const zoomOut = el("button", "kap-btn", "−"); zoomOut.title = "Zoom out (-)"; zoomOut.setAttribute("data-testid", "kap-zoom-out");
    const zoomVal = el("button", "kap-btn kap-zoom-val", ""); zoomVal.title = "Reset zoom (0)"; zoomVal.setAttribute("data-testid", "kap-zoom-reset");
    const zoomIn = el("button", "kap-btn", "+"); zoomIn.title = "Zoom in (+)"; zoomIn.setAttribute("data-testid", "kap-zoom-in");
    const zoomBox = el("span", "kap-zoom");
    zoomBox.hidden = true;
    zoomBox.append(zoomOut, zoomVal, zoomIn);
    [prev, next, dl, close, zoomOut, zoomVal, zoomIn].forEach(function (b) { b.type = "button"; });
    head.append(prev, title, meta, zoomBox, next, dl, close);
    const body = el("div", "kap-body");
    body.setAttribute("data-testid", "kap-body");
    box.append(head, body);
    shade.append(box);
    document.body.appendChild(shade);

    const state = { shade: shade, url: null, idx: index, seq: 0, blob: null, onKey: null, docUrls: [] };
    modal = state;

    function note(text, isErr) {
      body.replaceChildren(el("div", "kap-note" + (isErr ? " kap-note-err" : ""), text));
    }

    let zoom = readZoom();
    function applyZoom(z) {
      zoom = z; writeZoom(z);
      body.style.setProperty("--kap-zoom", String(z));
      zoomVal.textContent = Math.round(z * 100) + "%";
      zoomOut.disabled = z <= ZOOM_STEPS[0];
      zoomIn.disabled = z >= ZOOM_STEPS[ZOOM_STEPS.length - 1];
    }
    function stepZoom(dir) {
      const i = ZOOM_STEPS.indexOf(zoom);
      const n = ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, i + dir))];
      applyZoom(n);
    }
    zoomOut.addEventListener("click", function () { stepZoom(-1); });
    zoomIn.addEventListener("click", function () { stepZoom(1); });
    zoomVal.addEventListener("click", function () { applyZoom(ZOOM_DEFAULT); });
    applyZoom(zoom);

    function show(i) {
      if (i < 0 || i >= list.length) return;
      state.idx = i;
      const att = list[i];
      const seq = ++state.seq;
      if (state.url) { URL.revokeObjectURL(state.url); state.url = null; }
      state.docUrls.forEach(function (u) { URL.revokeObjectURL(u); });
      state.docUrls = [];
      state.blob = null;
      title.textContent = att.filename;
      title.title = att.filename;
      meta.textContent = typeLabel(att, kindOf(att)) + " · " + fmtBytes(att.size) + " · " + (i + 1) + "/" + list.length;
      prev.disabled = i === 0;
      next.disabled = i === list.length - 1;
      const kind = kindOf(att);
      zoomBox.hidden = kind !== "docx";
      note("Loading…");
      SDK.authedFetch(withBoard(API + "/attachments/" + att.id))
        .then(function (resp) {
          if (!resp.ok) return resp.text().then(function (t) { throw new Error(resp.status + " " + t.slice(0, 200)); });
          return resp.blob();
        })
        .then(function (raw) {
          if (modal !== state || seq !== state.seq) return; // closed or navigated away
          state.blob = raw;
          if (!kind) { note("No preview for this file type. Use Download."); return; }
          if (kind === "text") {
            return raw.slice(0, TEXT_LIMIT).text().then(function (txt) {
              if (modal !== state || seq !== state.seq) return;
              const pre = el("pre", "kap-text", txt);
              pre.setAttribute("data-testid", "kap-text");
              body.replaceChildren(pre);
              if (raw.size > TEXT_LIMIT) body.appendChild(el("div", "kap-note", "Showing the first " + fmtBytes(TEXT_LIMIT) + ". Download for the full file."));
            });
          }
          if (kind === "docx") {
            return raw.arrayBuffer().then(function (buf) {
              if (modal !== state || seq !== state.seq) return;
              let res;
              try { res = docxToElement(buf); } catch (err) { note("Could not render this document (" + (err && err.message || err) + "). Use Download.", true); return; }
              state.docUrls = res.urls;
              res.root.setAttribute("data-testid", "kap-docx");
              body.replaceChildren(res.root);
              if (res.images) body.appendChild(el("div", "kap-note", res.images + " image(s) in an unsupported format were not shown. Download for the full document."));
            });
          }
          const typed = new Blob([raw], { type: blobType(kind, att) });
          state.url = URL.createObjectURL(typed);
          let node;
          if (kind === "image") { node = el("img"); node.alt = att.filename; node.src = state.url; }
          else if (kind === "pdf") { node = el("iframe"); node.title = att.filename; node.src = state.url; }
          else if (kind === "audio") { node = el("audio"); node.controls = true; node.src = state.url; }
          else { node = el("video"); node.controls = true; node.src = state.url; }
          node.setAttribute("data-testid", "kap-" + kind);
          body.replaceChildren(node);
        })
        .catch(function (e) {
          if (modal === state && seq === state.seq) note("Could not load preview: " + (e && e.message || e), true);
        });
    }

    prev.addEventListener("click", function () { show(state.idx - 1); });
    next.addEventListener("click", function () { show(state.idx + 1); });
    close.addEventListener("click", closeModal);
    shade.addEventListener("click", function (e) { if (e.target === shade) closeModal(); });
    dl.addEventListener("click", function () {
      if (!state.blob) return;
      const u = URL.createObjectURL(state.blob);
      const a = document.createElement("a");
      a.href = u; a.download = list[state.idx].filename || "attachment";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 10000);
    });
    state.onKey = function (e) {
      // Capture phase + stopPropagation so Esc closes only the preview, not the drawer behind it.
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeModal(); }
      else if (!zoomBox.hidden && (e.key === "+" || e.key === "=")) { e.preventDefault(); stepZoom(1); }
      else if (!zoomBox.hidden && (e.key === "-" || e.key === "_")) { e.preventDefault(); stepZoom(-1); }
      else if (!zoomBox.hidden && e.key === "0") { e.preventDefault(); applyZoom(ZOOM_DEFAULT); }
      else if (e.key === "ArrowLeft") { e.stopPropagation(); show(state.idx - 1); }
      else if (e.key === "ArrowRight") { e.stopPropagation(); show(state.idx + 1); }
    };
    document.addEventListener("keydown", state.onKey, true);
    show(index);
  }

  // --- drawer decoration ---------------------------------------------------
  function taskIdOf(drawer) {
    const s = drawer.querySelector(".hermes-kanban-drawer-head > span");
    return s ? s.textContent.trim() : "";
  }

  function decorate() {
    document.querySelectorAll(".hermes-kanban-drawer").forEach(function (drawer) {
      const taskId = taskIdOf(drawer);
      if (!taskId) return;
      drawer.querySelectorAll(".hermes-kanban-attachment-link").forEach(function (link) {
        const row = link.parentElement;
        if (!row || row.querySelector(":scope > .kap-btn")) return;
        const btn = el("button", "kap-btn", "Preview");
        btn.type = "button";
        btn.setAttribute("data-testid", "kap-open");
        btn.title = "Preview attachment";
        // Sit right after the size label so buttons line up down the list.
        const sizeEl = link.nextElementSibling;
        (sizeEl || link).insertAdjacentElement("afterend", btn);
        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          const name = link.title || link.textContent;
          const sizeText = sizeEl ? sizeEl.textContent.trim() : "";
          btn.disabled = true;
          // Always refetch: uploads/deletes change the list and the click is rare.
          loadList(taskId, true).then(function (list) {
            const att = findAtt(list, name, sizeText);
            if (!att) throw new Error("attachment not found");
            openModal(list, list.indexOf(att));
          }).catch(function (err) {
            window.alert("Could not open preview: " + (err && err.message || err));
          }).finally(function () { btn.disabled = false; });
        });
      });
    });
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(function () { scheduled = false; decorate(); });
  }

  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  schedule();

  window.__HERMES_PLUGINS__.register("kanban-attachment-preview", function () { return null; });
})();
