(function(){
  var $ = function(id){return document.getElementById(id)};
  var mode = "url", current = null;

  try { qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"]; } catch(e){}

  function wifiEsc(s){ return s.replace(/([\\;,:"])/g, "\\$1"); }

  function getValue(){
    if (mode === "url") {
      var v = $("url").value.trim();
      if (!v) return "";
      return /^[a-z][a-z0-9+.\-]*:/i.test(v) ? v : "https://" + v;
    }
    if (mode === "text") return $("txt").value;
    var ssid = $("ssid").value;
    if (!ssid) return "";
    var sec = $("sec").value;
    var pw = sec === "nopass" ? "" : $("pw").value;
    return "WIFI:T:" + sec + ";S:" + wifiEsc(ssid) + ";" + (pw ? "P:" + wifiEsc(pw) + ";" : "") + "H:" + ($("hid").checked ? "true" : "false") + ";;";
  }

  function lum(hex){
    var n = parseInt(hex.slice(1), 16), c = [n>>16&255, n>>8&255, n&255].map(function(v){
      v/=255; return v<=.03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4);
    });
    return .2126*c[0] + .7152*c[1] + .0722*c[2];
  }

  function buildSvg(qr, fg, bg){
    var n = qr.getModuleCount(), q = 4, s = n + q*2, d = "";
    for (var r=0; r<n; r++) for (var c=0; c<n; c++) if (qr.isDark(r,c)) d += "M" + (c+q) + " " + (r+q) + "h1v1h-1z";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + s + ' ' + s + '" shape-rendering="crispEdges"><rect width="' + s + '" height="' + s + '" fill="' + bg + '"/><path d="' + d + '" fill="' + fg + '"/></svg>';
  }

  function update(){
    var val = getValue(), box = $("qrbox"), fg = $("fg").value, bg = $("bg").value;
    $("status").textContent = "";
    $("warn").textContent = lum(fg) >= lum(bg) ? "QR khass ykoun a3tam mn l-khlfiya bach yt9ra mzyan." : "";
    if (!val) { current = null; box.innerHTML = '<div class="empty">Kteb chi 7aja f lisser, o QR ghadi iban hna.</div>'; box.style.background = "#fff"; $("dlpng").disabled = $("dlsvg").disabled = true; return; }
    try {
      var qr = qrcode(0, "M"); qr.addData(val); qr.make();
      current = {qr: qr, fg: fg, bg: bg};
      box.innerHTML = buildSvg(qr, fg, bg);
      box.style.background = bg;
      $("dlpng").disabled = $("dlsvg").disabled = false;
    } catch(e) {
      current = null; box.innerHTML = '<div class="empty">Texte twil bzzaf. Qssser chwiya.</div>';
      $("dlpng").disabled = $("dlsvg").disabled = true;
    }
  }

  function pngBlob(cb){
    var qr = current.qr, n = qr.getModuleCount(), q = 4, s = n + q*2, k = Math.max(1, Math.floor(1024 / s));
    var cv = document.createElement("canvas"); cv.width = cv.height = s * k;
    var x = cv.getContext("2d"); x.fillStyle = current.bg; x.fillRect(0,0,cv.width,cv.height); x.fillStyle = current.fg;
    for (var r=0; r<n; r++) for (var c=0; c<n; c++) if (qr.isDark(r,c)) x.fillRect((c+q)*k, (r+q)*k, k, k);
    cv.toBlob(cb, "image/png");
  }

  function say(m){ $("status").textContent = m; }

  async function save(name, data, type){
    var dl = null;
    try { dl = await claude.use("downloads"); } catch(e){}
    if (dl) {
      try { await dl.save({filename: name, data: data}); say("T-telecharga ✓"); }
      catch(err){ if (err && err.code === "declined") say("Tla8a l-telechargement."); else say("Ma mchatch. 3awd jarreb."); }
      return;
    }
    var blob = data instanceof Blob ? data : new Blob([data], {type: type});
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){URL.revokeObjectURL(a.href)}, 2000);
    say("T-telecharga ✓");
  }

  $("dlpng").addEventListener("click", function(){
    if (!current) return;
    pngBlob(function(b){ save("qr-code.png", b, "image/png"); });
  });
  $("dlsvg").addEventListener("click", function(){
    if (!current) return;
    save("qr-code.svg", buildSvg(current.qr, current.fg, current.bg), "image/svg+xml");
  });

  document.querySelectorAll(".tabs button").forEach(function(b){
    b.addEventListener("click", function(){
      mode = b.dataset.mode;
      document.querySelectorAll(".tabs button").forEach(function(o){ o.setAttribute("aria-selected", o === b ? "true" : "false"); });
      document.querySelectorAll("[data-panel]").forEach(function(p){ p.hidden = p.dataset.panel !== mode; });
      update();
    });
  });

  ["url","txt","ssid","pw","sec","hid","fg","bg"].forEach(function(id){
    $(id).addEventListener("input", update);
    $(id).addEventListener("change", update);
  });
  update();
})();
