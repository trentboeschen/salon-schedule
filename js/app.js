
var CLIENTS = [], LOOKUP = {}, filtered = [], selectedId = null, viewMode = 'day', focusDate = new Date(), allAppointments = [], editing = false, VIEW_KEY = 'salon_view_state', serviceTypes = [], serviceTypeMap = {}, siteName = '', stylists = [], stylistMap = {}, currentStylist = 'ALL', products = [], productMap = {}, taxRate = 0;

function applySiteName(name) {
  siteName = name || '';
  var h1 = document.querySelector('header h1');
  if (h1) h1.textContent = siteName || 'Salon Appointments';
  document.title = siteName || 'Salon Appointments';
}

function saveViewState() {
  try { localStorage.setItem(VIEW_KEY, JSON.stringify({viewMode: viewMode, focusDate: toDateStr(focusDate), selectedId: selectedId})); } catch(e) {}
}
function restoreViewState() {
  try {
    var raw = localStorage.getItem(VIEW_KEY);
    if (!raw) return;
    var s = JSON.parse(raw);
    if (s.viewMode === 'day' || s.viewMode === 'week') viewMode = s.viewMode;
    if (s.focusDate) { var d = parseDate(s.focusDate); if (d) focusDate = d; }
    selectedId = s.selectedId || null;
  } catch(e) {}
}

var THEME_KEY = 'salon_theme', themePref = 'auto', themeMQ = null;
function loadThemePref() {
  try { var t = localStorage.getItem(THEME_KEY); if (t === 'auto' || t === 'light' || t === 'dark') themePref = t; } catch(e) {}
}
function saveThemePref() { try { localStorage.setItem(THEME_KEY, themePref); } catch(e) {} }
function currentTheme() {
  if (themePref !== 'auto') return themePref;
  return (themeMQ && themeMQ.matches) ? 'dark' : 'light';
}
function applyTheme() {
  var t = currentTheme();
  document.documentElement.setAttribute('data-theme', t);
  document.documentElement.style.colorScheme = t;
  var meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) meta.setAttribute('content', t === 'dark' ? 'dark' : 'light');
  var els = document.querySelectorAll('.theme-opt[data-theme-pref]');
  for (var i = 0; i < els.length; i++) {
    els[i].classList.toggle('active', els[i].getAttribute('data-theme-pref') === themePref);
  }
}
function initTheme() {
  loadThemePref();
  if (window.matchMedia) {
    themeMQ = window.matchMedia('(prefers-color-scheme: dark)');
    if (themeMQ.addEventListener) themeMQ.addEventListener('change', function(){ if (themePref === 'auto') applyTheme(); });
  }
  applyTheme();
  var toggle = document.getElementById('themeToggle');
  if (!toggle) return;
  var btns = toggle.querySelectorAll('.theme-opt[data-theme-pref]');
  for (var i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', function(){
      themePref = this.getAttribute('data-theme-pref');
      saveThemePref();
      applyTheme();
    });
  }
}

var THEME_KEY = 'salon_theme', themePref = 'auto', themeMQ = null;
function loadThemePref() {
  try { var t = localStorage.getItem(THEME_KEY); if (t === 'auto' || t === 'light' || t === 'dark') themePref = t; } catch(e) {}
}
function saveThemePref() { try { localStorage.setItem(THEME_KEY, themePref); } catch(e) {} }
function currentTheme() {
  if (themePref === 'dark') return 'dark';
  if (themePref === 'light') return 'light';
  return (themeMQ && themeMQ.matches) ? 'dark' : 'light';
}
function applyTheme() {
  var t = currentTheme();
  var root = document.documentElement;
  root.setAttribute('data-theme', t);
  var meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) meta.setAttribute('content', t);
  var btns = document.querySelectorAll('.theme-opt[data-theme-pref]');
  for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('active', btns[i].getAttribute('data-theme-pref') === themePref);
}
function initTheme() {
  loadThemePref();
  themeMQ = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  if (themeMQ && themeMQ.addEventListener) themeMQ.addEventListener('change', function(){ if (themePref === 'auto') applyTheme(); });
  applyTheme();
  var toggle = document.getElementById('themeToggle');
  if (toggle) {
    var btns = toggle.querySelectorAll('.theme-opt[data-theme-pref]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function(){
        var p = this.getAttribute('data-theme-pref');
        if (!p) return;
        themePref = p;
        saveThemePref();
        applyTheme();
      });
    }
  }
}

function to12h(s) { if (!s) return ''; var h=parseInt(s.split(':')[0],10), m=s.split(':')[1]; if (isNaN(h)) return ''; return (h===0?12:h>12?h-12:h)+':'+m+(h>=12?' PM':' AM'); }
function parseDate(s) { var m = String(s).match(/^(\d+)-(\d+)-(\d+)/); return m ? new Date(parseInt(m[1]), parseInt(m[2])-1, parseInt(m[3])) : null; }
function toDateStr(d) { return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function fmtDateHeading(d) { return d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}); }
function calcEndTime(timeStr, duration) { if (!timeStr) return ''; var p=timeStr.split(':'); var h=parseInt(p[0],10), m=parseInt(p[1],10); var t=h*60+m+parseInt(duration||0,10); return String(Math.floor(t/60)%24).padStart(2,'0')+':'+String(t%60).padStart(2,'0'); }
function timeToMinutes(s) { if (!s) return 0; var p=s.split(':'); return parseInt(p[0],10)*60+parseInt(p[1],10); }
function layoutOverlaps(appts) {
  if (!appts || !appts.length) return;
  for (var i = 0; i < appts.length; i++) { var a=appts[i]; a._sm=timeToMinutes(a.time); a._em=a._sm+(parseInt(a.duration,10)||60); }
  appts.sort(function(a,b){ return a._sm-b._sm || a._em-b._em; });
  var shiftedEnd = -1;
  for (var i = 0; i < appts.length; i++) {
    var a = appts[i], col = 0;
    if (i > 0) {
      var prev = appts[i-1];
      if (a._sm < prev._em && a._sm >= shiftedEnd) col = 1;
    }
    a._col = col;
    if (col === 1) shiftedEnd = a._em;
  }
}
function isMobile() { return window.innerWidth <= 768; }

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('active');
}
function toggleSidebar() {
  var s = document.getElementById('sidebar');
  if (s.classList.contains('open')) closeSidebar(); else openSidebar();
}

function openSettings() {
  document.getElementById('settingsPanel').classList.add('open');
  document.getElementById('settingsOverlay').classList.add('active');
  renderServiceTypes();
  renderStylists();
  renderProducts();
}
function closeSettings() {
  document.getElementById('settingsPanel').classList.remove('open');
  document.getElementById('settingsOverlay').classList.remove('active');
}
function segRowHtml(i, s, seg) {
  var w = (seg && seg.w === 'wait') ? 'wait' : 'work';
  var d = seg ? (parseInt(seg.d, 10) || '') : '';
  return '<div class="svc-seg-row"><select class="svc-seg-w"><option value="work"' + (w === 'work' ? ' selected' : '') + '>Work</option><option value="wait"' + (w === 'wait' ? ' selected' : '') + '>Wait</option></select><input type="number" class="svc-seg-d" value="' + d + '" min="1" step="5" placeholder="min" style="width:64px;padding:3px 5px;border:1px solid #d2d2d7;border-radius:4px;font-size:12px"><span class="svc-seg-x" title="Remove">&#10005;</span></div>';
}
function renderServiceTypes() {
  var snEl = document.getElementById('siteNameInput');
  if (snEl) snEl.value = siteName;
  var durOpts = '';
  for (var d = 15; d <= 240; d += 15) durOpts += '<option value="' + d + '">' + d + ' min</option>';
  var html = '';
  for (var i = 0; i < serviceTypes.length; i++) {
    var st = serviceTypes[i];
    var isNew = st.machine.indexOf('new-type-') === 0;
    var machineHtml = isNew
      ? '<input type="hidden" id="st_machine_' + i + '" value="' + st.machine.replace(/"/g,'&quot;') + '">'
      : '<span class="svc-machine" title="' + st.machine + '">' + st.machine + '</span>';
    var segs = st.segments || [];
    var row = '<div class="svc-type-row">' + machineHtml + '<div class="svc-display"><input type="text" id="st_disp_' + i + '" value="' + (st.display||'').replace(/"/g,'&quot;') + '" placeholder="Display name"></div><div class="svc-color"><input type="color" id="st_col_' + i + '" value="' + (st.color||'#cccccc') + '"></div><div class="svc-dur"><select id="st_dur_' + i + '">' + durOpts.replace('value="' + (st.defaultDuration||60) + '"', 'value="' + (st.defaultDuration||60) + '" selected') + '</select></div><button type="button" class="svc-seg-toggle" id="st_seg_toggle_' + i + '" data-i="' + i + '">&#9203; Break/Wait' + (segs.length ? ' <span class="svc-badge">' + segs.length + '</span>' : '') + '</button></div>';
    var segRows = '';
    for (var s = 0; s < segs.length; s++) segRows += segRowHtml(i, s, segs[s]);
    var editor = '<div class="svc-seg-editor" id="st_seg_editor_' + i + '" style="display:none"><div class="svc-seg-rows" id="st_seg_rows_' + i + '">' + segRows + '</div><button type="button" class="svc-seg-add" data-i="' + i + '">+ Add segment</button><div class="svc-seg-hint">Work = solid block, Wait = nearly transparent. Segment total auto-fills the appointment duration.</div></div>';
    html += '<div class="svc-type-wrap">' + row + editor + '</div>';
  }
  document.getElementById('serviceTypeList').innerHTML = html;
  document.getElementById('siteNameInput').addEventListener('input', enableSettingsSave);
  for (var i = 0; i < serviceTypes.length; i++) {
    if (document.getElementById('st_machine_' + i)) document.getElementById('st_machine_' + i).addEventListener('input', enableSettingsSave);
    document.getElementById('st_disp_' + i).addEventListener('input', enableSettingsSave);
    document.getElementById('st_col_' + i).addEventListener('input', enableSettingsSave);
    document.getElementById('st_dur_' + i).addEventListener('change', enableSettingsSave);
  }
  var listEl = document.getElementById('serviceTypeList');
  if (!listEl._segBound) {
    listEl._segBound = true;
    listEl.addEventListener('click', function(e) {
      var t = e.target;
      if (t.classList.contains('svc-seg-toggle')) {
        var ed = document.getElementById('st_seg_editor_' + t.getAttribute('data-i'));
        if (ed) ed.style.display = ed.style.display === 'none' ? '' : 'none';
      } else if (t.classList.contains('svc-seg-add')) {
        var rowsEl = document.getElementById('st_seg_rows_' + t.getAttribute('data-i'));
        if (rowsEl) rowsEl.insertAdjacentHTML('beforeend', segRowHtml(t.getAttribute('data-i'), rowsEl.children.length, null));
        enableSettingsSave();
      } else if (t.classList.contains('svc-seg-x')) {
        var rowEl = t.parentNode;
        if (rowEl && rowEl.classList.contains('svc-seg-row')) rowEl.parentNode.removeChild(rowEl);
        enableSettingsSave();
      }
    });
    listEl.addEventListener('input', function(e) {
      if (e.target.classList.contains('svc-seg-d')) enableSettingsSave();
    });
    listEl.addEventListener('change', function(e) {
      if (e.target.classList.contains('svc-seg-w')) enableSettingsSave();
    });
  }
  document.getElementById('settingsSaveBtn').style.display = 'none';
}
function enableSettingsSave() {
  document.getElementById('settingsSaveBtn').style.display = '';
}

function renderProducts() {
  var html = '';
  html += '<div class="product-tax-row">';
  html += '<label>Tax rate (%)</label>';
  html += '<input type="number" id="taxRateInput" min="0" max="100" step="0.01" value="' + (taxRate || 0) + '">';
  html += '<span>products only</span>';
  html += '</div>';
  if (!products.length) products = [{machine: 'product1', display: 'Product 1', active: true}];
  productMap = {};
  for (var i = 0; i < products.length; i++) {
    var pr = products[i];
    if (pr.active === undefined) pr.active = true;
    productMap[pr.machine] = pr;
    html += '<div class="svc-type-row"><span class="svc-machine" title="' + pr.machine + '">' + pr.machine + '</span><div class="svc-display"><input type="text" id="pr_disp_' + i + '" value="' + (pr.display||'').replace(/"/g,'&quot;') + '" placeholder="Product name"></div><div class="sty-active"><input type="checkbox" id="pr_active_' + i + '"' + (pr.active ? ' checked' : '') + '></div></div>';
  }
  html += '<div class="add-btn-wrap"><button id="addProductBtn" class="btn-add-item">+ Add product</button></div>';
  document.getElementById('productList').innerHTML = html;
  for (var i = 0; i < products.length; i++) {
    document.getElementById('pr_disp_' + i).addEventListener('input', enableSettingsSave);
    document.getElementById('pr_active_' + i).addEventListener('change', enableSettingsSave);
  }
  var taxEl = document.getElementById('taxRateInput');
  if (taxEl) taxEl.addEventListener('input', enableSettingsSave);
  document.getElementById('addProductBtn').addEventListener('click', function() {
    var n = products.length + 1;
    while (products.some(function(p){ return p.machine === 'product' + n; })) n++;
    products.push({machine: 'product' + n, display: 'Product ' + n, active: true});
    renderProducts();
    enableSettingsSave();
  });
}

function renderStylists() {
  var html = '';
  if (!stylists.length) stylists = [{machine: 'stylist1', display: 'Stylist 1', active: true}];
  stylistMap = {};
  for (var i = 0; i < stylists.length; i++) {
    var st = stylists[i];
    if (st.active === undefined) st.active = true;
    stylistMap[st.machine] = st;
    html += '<div class="svc-type-row"><span class="svc-machine" style="font-size:11px">' + st.machine + '</span><div class="svc-display"><input type="text" id="sty_disp_' + i + '" value="' + (st.display||'').replace(/"/g,'&quot;') + '" placeholder="Display name" class="sty-input"></div><div class="sty-active"><input type="checkbox" id="sty_active_' + i + '"' + (st.active ? ' checked' : '') + '></div></div>';
  }
  html += '<div class="add-btn-wrap"><button id="addStylistBtn" class="btn-add-item">+ Add stylist</button></div>';
  document.getElementById('stylistList').innerHTML = html;
  for (var i = 0; i < stylists.length; i++) {
    var inp = document.getElementById('sty_disp_' + i);
    if (inp) inp.addEventListener('input', enableSettingsSave);
    var chk = document.getElementById('sty_active_' + i);
    if (chk) chk.addEventListener('change', enableSettingsSave);
  }
  document.getElementById('addStylistBtn').addEventListener('click', function() {
    var n = stylists.length + 1;
    while (stylists.some(function(s){ return s.machine === 'stylist' + n; })) n++;
    stylists.push({machine: 'stylist' + n, display: 'Stylist ' + n, active: true});
    renderStylists();
    enableSettingsSave();
  });
}

function updateStylistFilter() {
  var sel = document.getElementById('stylistFilter');
  if (!sel) return;
  var cur = sel.value;
  var h = '<option value="ALL">All stylists</option>';
  for (var i = 0; i < stylists.length; i++) {
    if (!stylists[i].active) continue;
    h += '<option value="' + stylists[i].machine.replace(/"/g,'&quot;') + '">' + (stylists[i].display || stylists[i].machine) + '</option>';
  }
  sel.innerHTML = h;
  if (cur && sel.querySelector('option[value="' + cur.replace(/"/g,'\\"') + '"]')) sel.value = cur;
  else sel.value = 'ALL';
}

function saveServiceTypes() {
  var arr = [];
  for (var i = 0; i < serviceTypes.length; i++) {
    var dispEl = document.getElementById('st_disp_' + i);
    var colEl = document.getElementById('st_col_' + i);
    var durEl = document.getElementById('st_dur_' + i);
    var machineEl = document.getElementById('st_machine_' + i);
    var machine = machineEl ? machineEl.value : serviceTypes[i].machine;
    var obj = {machine: machine, display: dispEl ? dispEl.value : serviceTypes[i].display, color: colEl ? colEl.value : serviceTypes[i].color, defaultDuration: durEl ? parseInt(durEl.value,10) : (serviceTypes[i].defaultDuration||60)};
    var rowsEl = document.getElementById('st_seg_rows_' + i);
    var segs = [];
    if (rowsEl) {
      var segRows = rowsEl.querySelectorAll('.svc-seg-row');
      for (var s = 0; s < segRows.length; s++) {
        var wEl = segRows[s].querySelector('.svc-seg-w');
        var dEl = segRows[s].querySelector('.svc-seg-d');
        var d = parseInt(dEl ? dEl.value : '', 10);
        if (!d || d <= 0) continue;
        segs.push({d: d, w: wEl && wEl.value === 'wait' ? 'wait' : 'work'});
      }
    }
    if (segs.length) obj.segments = segs;
    arr.push(obj);
  }
  var snEl = document.getElementById('siteNameInput');
  var newSiteName = snEl ? snEl.value : siteName;
  var stylistArr = [];
  for (var i = 0; i < stylists.length; i++) {
    var dispEl = document.getElementById('sty_disp_' + i);
    var activeEl = document.getElementById('sty_active_' + i);
    stylistArr.push({machine: stylists[i].machine, display: dispEl ? dispEl.value : (stylists[i].display || stylists[i].machine), active: activeEl ? activeEl.checked : true});
  }
  var productArr = [];
  for (var i = 0; i < products.length; i++) {
    var pdispEl = document.getElementById('pr_disp_' + i);
    var pativeEl = document.getElementById('pr_active_' + i);
    productArr.push({machine: products[i].machine, display: pdispEl ? pdispEl.value : (products[i].display || products[i].machine), active: pativeEl ? pativeEl.checked : true});
  }
  var statusEl = document.getElementById('svcTypeStatus');
  statusEl.textContent = 'Saving...';
  statusEl.className = 'save-status';
  fetch('api/data.php', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({action:'update_service_types', serviceTypes: arr, siteName: newSiteName, stylists: stylistArr, products: productArr, taxRate: parseFloat((document.getElementById('taxRateInput') || {}).value) || 0})
  })
  .then(function(r){ return r.json(); })
  .then(function(result){
    if (result.success) {
      serviceTypes = arr;
      serviceTypeMap = {};
      for (var i = 0; i < serviceTypes.length; i++) serviceTypeMap[serviceTypes[i].machine] = serviceTypes[i];
      stylists = stylistArr;
      stylistMap = {};
      for (var i = 0; i < stylists.length; i++) stylistMap[stylists[i].machine] = stylists[i];
      updateStylistFilter();
      applySiteName(newSiteName);
      document.getElementById('settingsSaveBtn').style.display = 'none';
      statusEl.textContent = 'Saved!';
      statusEl.className = 'save-status';
      if (!selectedId) renderAllAppts();
      setTimeout(function(){ statusEl.textContent = ''; }, 2000);
    } else {
      statusEl.textContent = 'Error: ' + (result.error || 'Unknown');
      statusEl.className = 'save-status error';
    }
  })
  .catch(function(err){
    statusEl.textContent = 'Error: ' + err.message;
    statusEl.className = 'save-status error';
  });
}

function loadData() {
  fetch('api/data.php')
    .then(function(r) { if (!r.ok) throw new Error('Failed to load'); return r.json(); })
    .then(function(data) {
      var clients = data.clients;
      for (var i = 0; i < clients.length; i++) {
        var c = clients[i];
        c._name = (c.firstName || '') + ' ' + (c.lastName || '');
        c._name = c._name.trim() || ('Client #' + c.id);
        if (c.appointments) c.appointments.sort(function(a,b){ return (a.date||'').localeCompare(b.date||'') || (a.time||'').localeCompare(b.time||''); });
      }
      CLIENTS = clients.sort(function(a,b){ return a._name.toLowerCase().localeCompare(b._name.toLowerCase()); });
      LOOKUP = {};
      for (var i = 0; i < CLIENTS.length; i++) LOOKUP[String(CLIENTS[i].id)] = CLIENTS[i];
      serviceTypes = data.serviceTypes || [];
      serviceTypeMap = {};
      for (var i = 0; i < serviceTypes.length; i++) serviceTypeMap[serviceTypes[i].machine] = serviceTypes[i];
      stylists = data.stylists || [];
      stylistMap = {};
      for (var i = 0; i < stylists.length; i++) stylistMap[stylists[i].machine] = stylists[i];
      products = data.products || [];
      taxRate = parseFloat(data.taxRate) || 0;
      productMap = {};
      for (var i = 0; i < products.length; i++) productMap[products[i].machine] = products[i];
      updateStylistFilter();
      applySiteName(data.siteName || '');
      document.getElementById('totalCount').textContent = CLIENTS.length;
      buildApptList();
      filterClients();
      restoreViewState();
      if (selectedId && LOOKUP[String(selectedId)]) { selectClient(selectedId); }
      else { document.getElementById('dayViewBtn').className = viewMode === 'day' ? 'active' : '';
             document.getElementById('weekViewBtn').className = viewMode === 'week' ? 'active' : '';
             renderAllAppts(); }
    })
    .catch(function(err) {
      document.getElementById('calendarBody').innerHTML = '<div class="empty-state"><div class="big">&#9888;</div><div>Failed to load data: ' + err.message + '</div></div>';
    });
}

function buildApptList() {
  allAppointments = [];
  for (var i = 0; i < CLIENTS.length; i++) {
    var c = CLIENTS[i];
    if (!c.appointments) continue;
    for (var j = 0; j < c.appointments.length; j++) {
      var a = c.appointments[j];
      var ct = a.time || '';
      allAppointments.push({
        date: a.date,
        time: ct,
        timeDisplay: to12h(ct),
        duration: a.duration,
        service: a.service || '',
        price: a.price || '',
        stylist: a.stylist || 'stylist1',
        clientId: c.id,
        clientName: c._name,
        _dateObj: parseDate(a.date),
        _sortTime: ct
      });
    }
  }
}

function getDayAppts(dateStr) {
  return allAppointments.filter(function(a){ return a._dateObj && toDateStr(a._dateObj) === dateStr && (currentStylist === 'ALL' || a.stylist === currentStylist); }).sort(function(a,b){ return (a._sortTime||'').localeCompare(b._sortTime||''); });
}

function getWeekAppts(weekStart) {
  var result = [];
  for (var i = 0; i < 7; i++) { var d = new Date(weekStart); d.setDate(d.getDate()+i); result.push({date:d, dateStr:toDateStr(d), appts:getDayAppts(toDateStr(d))}); }
  return result;
}

function getMonday(d) { var r=new Date(d); var day=r.getDay(); r.setDate(r.getDate()-day+(day===0?-6:1)); r.setHours(0,0,0,0); return r; }

function buildApptBlocks(a, st, startHour, totalMin) {
  var blocks = [];
  var dur = a._em - a._sm;
  if (dur <= 0) return blocks;
  var segs = (st && st.segments && st.segments.length) ? st.segments : null;
  if (!segs) {
    blocks.push({topPct: Math.max(0, ((a._sm - startHour * 60) / totalMin) * 100), hgtPct: Math.max(0, (dur / totalMin) * 100), opaque: true});
    return blocks;
  }
  var cum = a._sm;
  for (var k = 0; k < segs.length && cum < a._em; k++) {
    var segD = parseInt(segs[k].d, 10) || 0;
    var segEnd = Math.min(cum + segD, a._em);
    if (segEnd > cum) {
      blocks.push({topPct: Math.max(0, ((cum - startHour * 60) / totalMin) * 100), hgtPct: Math.max(0, ((segEnd - cum) / totalMin) * 100), opaque: segs[k].w !== 'wait'});
      cum = segEnd;
    }
  }
  if (cum < a._em) {
    blocks.push({topPct: Math.max(0, ((cum - startHour * 60) / totalMin) * 100), hgtPct: Math.max(0, ((a._em - cum) / totalMin) * 100), opaque: false});
  }
  return blocks;
}

function renderDay() {
  var ds = toDateStr(focusDate), appts = getDayAppts(ds);
  document.getElementById('calTitle').textContent = fmtDateHeading(focusDate);
  layoutOverlaps(appts);
  var startHour = 8, endHour = 17, totalMin = (endHour - startHour) * 60;
  var html = '<div class="day-tl"><div class="tl-hours">';
  for (var h = startHour; h < endHour; h++) {
    var label = (h === 0 ? 12 : h > 12 ? h - 12 : h) + ':00 ' + (h >= 12 ? 'PM' : 'AM');
    html += '<div class="tl-h">' + label + '</div>';
  }
  html += '</div><div class="tl-grid">';
  for (var h = startHour; h < endHour; h++) html += '<div class="tl-line"></div>';
  if (!appts.length) {
    html += '<div class="tl-empty">No appointments</div>';
  } else {
    for (var i = 0; i < appts.length; i++) {
      var a = appts[i];
      var topPct = Math.max(0, ((a._sm - startHour * 60) / totalMin) * 100);
      var bottomPct = Math.min(100, ((a._em - startHour * 60) / totalMin) * 100);
      var hgtPct = Math.max(0, bottomPct - topPct);
      var wPct = 100;
      var lPct = 0;
      var st = serviceTypeMap[a.service];
      var sc = st ? st.color : '#ccc';
      var svcLabel = st ? st.display : (a.service || '');
      var endTime = calcEndTime(a.time, a.duration);
      var blocks = buildApptBlocks(a, st, startHour, totalMin);
      for (var bi = 0; bi < blocks.length; bi++) {
        var b = blocks[bi];
        var inner = b.opaque
          ? '<div class="tl-appt-inline"><span class="tl-appt-time">' + a.timeDisplay + (endTime ? '\u2013' + to12h(endTime) : '') + '</span><span class="tl-appt-client">' + (a.clientName || '') + '</span><span class="tl-appt-svc">' + svcLabel + '</span></div>'
          : '<div class="tl-appt-wait">&#8987;</div>';
        html += '<div class="tl-appt' + (b.opaque ? '' : ' tl-wait') + (a.closedOut ? ' tl-closed' : '') + '" style="top:' + b.topPct + '%;height:' + b.hgtPct + '%;left:' + lPct + '%;width:' + wPct + '%;background:' + sc + '" data-client-id="' + a.clientId + '" data-date="' + a.date + '" data-time="' + a.time + '">' + (a.closedOut ? '<span class="tl-closed-mark">✓</span>' : '') + inner + '</div>';
      }
    }
  }
  html += '</div></div>';
  document.getElementById('calendarBody').innerHTML = html;
  attachApptClicks();
}

function renderWeek() {
  var monday = getMonday(focusDate), days = getWeekAppts(monday);
  var ts = monday.toLocaleDateString('en-US',{month:'short',day:'numeric'}), te = new Date(monday); te.setDate(te.getDate()+6);
  document.getElementById('calTitle').textContent = ts + ' - ' + te.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  var todayStr = toDateStr(new Date()), startHour = 8, endHour = 20, totalMin = (endHour - startHour) * 60;
  var html = '<div class="week-tl"><div class="wtl-header"><div class="wtl-h-spacer"></div>';
  for (var di = 0; di < 7; di++) {
    var d = days[di];
    html += '<div class="wtl-h-cell' + (d.dateStr === todayStr ? ' today' : '') + '" data-date="' + d.dateStr + '">' + d.date.toLocaleDateString('en-US',{weekday:'short'}) + ' ' + d.date.getDate() + '</div>';
  }
  html += '</div><div class="wtl-body"><div class="wtl-hours-col">';
  for (var h = startHour; h < endHour; h++) {
    var label = (h === 0 ? 12 : h > 12 ? h - 12 : h) + ':00 ' + (h >= 12 ? 'PM' : 'AM');
    html += '<div class="wtl-hour">' + label + '</div>';
  }
  html += '</div>';
  for (var di = 0; di < 7; di++) {
    var day = days[di];
    html += '<div class="wtl-day-col' + (day.dateStr === todayStr ? ' today' : '') + '">';
    if (day.appts.length) {
      layoutOverlaps(day.appts);
      for (var i = 0; i < day.appts.length; i++) {
        var a = day.appts[i];
        var topPct = Math.max(0, ((a._sm - startHour * 60) / totalMin) * 100);
        var bottomPct = Math.min(100, ((a._em - startHour * 60) / totalMin) * 100);
        var hgtPct = Math.max(0, bottomPct - topPct);
        var wPct = 100;
        var lPct = 0;
        var st = serviceTypeMap[a.service];
        var sc = st ? st.color : '#ccc';
        var svcLabel = st ? st.display : (a.service || '');
        var blocks = buildApptBlocks(a, st, startHour, totalMin);
        for (var bi = 0; bi < blocks.length; bi++) {
          var b = blocks[bi];
          html += '<div class="wtl-appt' + (b.opaque ? '' : ' tl-wait') + (a.closedOut ? ' tl-closed' : '') + '" style="top:' + b.topPct + '%;height:' + b.hgtPct + '%;left:' + lPct + '%;width:' + wPct + '%;background:' + sc + '" title="' + (a.clientName||'') + ' ' + svcLabel + '" data-client-id="' + a.clientId + '" data-date="' + a.date + '" data-time="' + a.time + '">' + (a.closedOut ? '<span class="tl-closed-mark">✓</span>' : '') + '</div>';
        }
      }
    }
    html += '</div>';
  }
  html += '</div></div>';
  document.getElementById('calendarBody').innerHTML = html;
  attachApptClicks();
}

function showEditMode(c) {
  editing = true;
  document.getElementById('detailLeftActions').innerHTML = '<button class="btn-save" id="saveBtn">Save</button><button class="btn-cancel" id="cancelBtn">Cancel</button>';
  var fields = [
    {label:'First', key:'firstName'},
    {label:'Last', key:'lastName'},
    {label:'Phone 1', key:'phone1'},
    {label:'Phone 2', key:'phone2'},
    {label:'Phone 3', key:'phone3'},
    {label:'Address', key:'address1'},
    {label:'City', key:'city'},
    {label:'State', key:'state'},
    {label:'Zip', key:'zip'},
    {label:'Birthday', key:'birthday'}
  ];
  var html = '';
  for (var i = 0; i < fields.length; i++) {
    var f = fields[i];
    var val = c[f.key] || '';
    html += '<div class="edit-field"><label>' + f.label + '</label><input type="text" id="ef_' + f.key + '" value="' + val.replace(/"/g,'&quot;') + '"></div>';
  }
  html += '<div class="save-status" id="saveStatus"></div>';
  document.getElementById('detailName').textContent = '';
  document.getElementById('detailInfo').innerHTML = html;
  document.getElementById('saveBtn').addEventListener('click', function(){ saveClient(c.id, fields); });
  document.getElementById('cancelBtn').addEventListener('click', cancelEdit);
}

function cancelEdit() {
  editing = false;
  if (selectedId && LOOKUP[String(selectedId)]) {
    renderClientApptList(LOOKUP[String(selectedId)]);
  } else {
    renderAllAppts();
  }
}

function saveClient(id, fields) {
  var data = {action:'update_client', id: id, fields: {}};
  for (var i = 0; i < fields.length; i++) {
    var f = fields[i];
    var el = document.getElementById('ef_' + f.key);
    if (el) data.fields[f.key] = el.value;
  }
  var statusEl = document.getElementById('saveStatus');
  statusEl.textContent = 'Saving...';
  statusEl.className = 'save-status';
  fetch('api/data.php', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  })
  .then(function(r) { return r.json(); })
  .then(function(result) {
    if (result.success) {
      statusEl.textContent = 'Saved!';
      statusEl.className = 'save-status';
      var c = LOOKUP[String(id)];
      if (c) {
        for (var i = 0; i < fields.length; i++) {
          var f = fields[i];
          if (data.fields[f.key] !== undefined) c[f.key] = data.fields[f.key];
        }
        c._name = (c.firstName || '') + ' ' + (c.lastName || '');
        c._name = c._name.trim() || ('Client #' + c.id);
        CLIENTS.sort(function(a,b){ return a._name.toLowerCase().localeCompare(b._name.toLowerCase()); });
        filterClients();
      }
      setTimeout(function(){ cancelEdit(); }, 800);
    } else {
      statusEl.textContent = 'Error: ' + (result.error || 'Unknown');
      statusEl.className = 'save-status error';
    }
  })
  .catch(function(err) {
    statusEl.textContent = 'Error: ' + err.message;
    statusEl.className = 'save-status error';
  });
}

function renderClientApptList(c) {
  editing = false;
  var appts = c.appointments || [];
  document.getElementById('detailName').textContent = c._name;
  document.getElementById('backBtn').style.display = 'inline-block';
  document.getElementById('calHeader').style.display = 'none';
  document.getElementById('detailLeftActions').innerHTML = '<button class="btn-edit" id="editBtn">&#9998; Edit</button>';
  var info = [];
  if (c.phone1) info.push('\u{1F4DE} <a href="tel:' + c.phone1.replace(/[^0-9+]/g,'') + '" style="color:inherit;text-decoration:none">' + c.phone1 + '</a>');
  if (c.city && c.state) info.push('\u{1F4CD} ' + c.city + ', ' + c.state);
  if (c.birthday) info.push('\u{1F382} ' + c.birthday);
  document.getElementById('detailInfo').innerHTML = info.map(function(s){ return '<span>' + s + '</span>'; }).join('');
  if (!appts.length) { document.getElementById('calendarBody').innerHTML = '<div class="client-appt-list"><div class="no-appts">No appointments on record</div></div>'; return; }
  var html = '<div class="client-appt-list">', cur = null;
  for (var i = appts.length - 1; i >= 0; i--) {
    var a = appts[i];
    var st = serviceTypeMap[a.service];
    var svcLabel = st ? st.display : (a.service || '\u2014');
    var ds = a.date ? fmtDateHeading(parseDate(a.date)) : 'Unknown date';
    if (ds !== cur) { cur = ds; html += '<div class="appt-group"><div class="group-date">' + ds + '</div>'; }
    var endTime = calcEndTime(a.time, a.duration);
    var t = to12h(a.time) + (endTime ? '\u2013' + to12h(endTime) : '');
    var p = a.price ? ' <span class="svc-price">$' + a.price + '</span>' : '';
    html += '<div class="appt-row' + (a.closedOut ? ' tl-closed' : '') + '" data-client-id="' + c.id + '" data-date="' + a.date + '" data-time="' + a.time + '"><div class="row-time">' + t + '</div><div class="row-service">' + (a.closedOut ? '\u2713 ' : '') + '<span class="svc">' + svcLabel + p + (a.closedOut && apptTotal(a) !== null ? ' <span class="svc-price svc-price-total">$' + apptTotal(a) + '</span>' : '') + '</span></div></div>';
  }
  html += '</div></div>';
  document.getElementById('calendarBody').innerHTML = html;
  document.getElementById('editBtn').addEventListener('click', function(){ showEditMode(c); });
  var rows = document.querySelectorAll('.client-appt-list .appt-row[data-date]');
  for (var i = 0; i < rows.length; i++) {
    rows[i].addEventListener('click', function(){
      var date = this.dataset.date;
      var time = this.dataset.time;
      if (date) navigateToAppt(date, time);
    });
  }
}

function renderAllAppts() {
  editing = false;
  document.getElementById('detailName').textContent = 'All Appointments';
  document.getElementById('detailInfo').innerHTML = '';
  document.getElementById('backBtn').style.display = 'none';
  document.getElementById('detailLeftActions').innerHTML = '';
  document.getElementById('calHeader').style.display = 'block';
  if (viewMode === 'week') renderWeek(); else renderDay();
  saveViewState();
}

function selectClient(id) {
  if (editing) return;
  selectedId = id;
  var c = LOOKUP[String(id)];
  if (!c) return;
  if (isMobile()) closeSidebar();
  var items = document.querySelectorAll('.client-item');
  for (var i = 0; i < items.length; i++) items[i].classList.remove('active');
  var el = document.querySelector('.client-item[data-id="' + id + '"]');
  if (el) el.classList.add('active');
  renderClientApptList(c);
  document.getElementById('calendarBody').scrollTop = 0;
  saveViewState();
}

function clearSelection() { if (editing) return; selectedId = null; var items = document.querySelectorAll('.client-item'); for (var i = 0; i < items.length; i++) items[i].classList.remove('active'); renderAllAppts(); saveViewState(); }

function navigateToAppt(date, time) {
  clearSelection();
  var parts = date.split('-');
  focusDate = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
  viewMode = 'day';
  document.getElementById('dayViewBtn').classList.add('active');
  document.getElementById('weekViewBtn').classList.remove('active');
  renderDay();
  saveViewState();
  setTimeout(function(){
    var cards = document.querySelectorAll('.tl-appt');
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].dataset.date === date && cards[i].dataset.time === time) {
        cards[i].style.background = '#fff3cd';
        cards[i].style.border = '2px solid #ffc107';
        cards[i].scrollIntoView({behavior:'smooth', block:'center'});
        break;
      }
    }
  }, 50);
}

function attachApptClicks() {
  dragInit();
  var hCells = document.querySelectorAll('.wtl-h-cell[data-date]');
  for (var i = 0; i < hCells.length; i++) {
    hCells[i].addEventListener('click', function() {
      if (editing) return;
      var d = parseDate(this.dataset.date);
      if (!d) return;
      focusDate = d;
      viewMode = 'day';
      document.getElementById('dayViewBtn').classList.add('active');
      document.getElementById('weekViewBtn').classList.remove('active');
      renderAllAppts();
    });
  }
}

// --- Drag and Drop + Click to Show Details ---
var DRAG = null, dragTip = null, CLICK_DRAG = null;

function dragInit() {
  document.querySelectorAll('.tl-appt, .wtl-appt').forEach(function(el) {
    if (el._dragInit) return;
    el._dragInit = true;
    el.addEventListener('mousedown', apptMouseDown);
    el.addEventListener('touchstart', apptTouchStart, {passive: false});
  });
}

function apptMouseDown(e) {
  if (e.button !== 0 || editing) return;
  startClickOrDrag(e.currentTarget, e.clientX, e.clientY);
  document.addEventListener('mousemove', mouseMoveHandler);
  document.addEventListener('mouseup', mouseUpHandler);
  e.preventDefault();
}

function apptTouchStart(e) {
  if (editing) return;
  var t = e.touches[0];
  startClickOrDrag(e.currentTarget, t.clientX, t.clientY);
  document.addEventListener('touchmove', touchMoveHandler, {passive: false});
  document.addEventListener('touchend', touchEndHandler);
  e.preventDefault();
}

function startClickOrDrag(el, cx, cy) {
  CLICK_DRAG = {el: el, startX: cx, startY: cy, timer: setTimeout(function() {
    if (!CLICK_DRAG) return;
    var cd = CLICK_DRAG;
    CLICK_DRAG = null;
    dragBegin(cd.el, cd.startX, cd.startY);
  }, 1000)};
}

function mouseMoveHandler(e) {
  if (CLICK_DRAG) return;
  if (DRAG) dragMoveCommon(e.clientX, e.clientY);
}

function mouseUpHandler(e) {
  document.removeEventListener('mousemove', mouseMoveHandler);
  document.removeEventListener('mouseup', mouseUpHandler);
  if (CLICK_DRAG) {
    clearTimeout(CLICK_DRAG.timer);
    var el = CLICK_DRAG.el;
    CLICK_DRAG = null;
    showApptModal(el.dataset.clientId, el.dataset.date, el.dataset.time);
    e.preventDefault();
    return;
  }
  dragEndCommon();
}

function touchMoveHandler(e) {
  if (CLICK_DRAG) return;
  if (DRAG) dragMoveCommon(e.touches[0].clientX, e.touches[0].clientY);
}

function touchEndHandler(e) {
  document.removeEventListener('touchmove', touchMoveHandler);
  document.removeEventListener('touchend', touchEndHandler);
  if (CLICK_DRAG) {
    clearTimeout(CLICK_DRAG.timer);
    var el = CLICK_DRAG.el;
    CLICK_DRAG = null;
    showApptModal(el.dataset.clientId, el.dataset.date, el.dataset.time);
    e.preventDefault();
    return;
  }
  dragEndCommon();
}

function dragBegin(el, cx, cy) {
  var rect = el.getBoundingClientRect();
  DRAG = { el: el, clientId: el.dataset.clientId, oldDate: el.dataset.date, oldTime: el.dataset.time, isDay: el.classList.contains('tl-appt'), offsetY: cy - rect.top, offsetX: cx - rect.left, moved: false, newDate: el.dataset.date, newTime: el.dataset.time, origCss: el.style.cssText };
  el.style.position = 'fixed';
  el.style.left = rect.left + 'px';
  el.style.top = rect.top + 'px';
  el.style.width = rect.width + 'px';
  el.style.height = rect.height + 'px';
  el.style.margin = '0';
  el.style.zIndex = '100';
  el.classList.add('dragging');
  if (!dragTip) { dragTip = document.createElement('div'); dragTip.className = 'drag-tip'; document.body.appendChild(dragTip); }
  dragTip.textContent = to12h(DRAG.newTime) + ' ' + DRAG.newDate;
  dragTip.style.display = 'block';
}

function dragMoveCommon(cx, cy) {
  DRAG.moved = true;
  DRAG.el.style.left = (cx - DRAG.offsetX) + 'px';
  DRAG.el.style.top = (cy - DRAG.offsetY) + 'px';
  dragTip.style.left = (cx + 12) + 'px';
  dragTip.style.top = (cy - 20) + 'px';
  var grid, dayIdx = -1;
  if (DRAG.isDay) { grid = document.querySelector('.tl-grid'); }
  else {
    var body = document.querySelector('.wtl-body');
    if (body) {
      grid = body;
      var bodyRect = body.getBoundingClientRect();
      var relX = cx - bodyRect.left - 45;
      var colW = (bodyRect.width - 45) / 7;
      dayIdx = Math.max(0, Math.min(6, Math.floor(relX / colW)));
    }
  }
  if (!grid) return;
  var gridRect = grid.getBoundingClientRect();
  var relY = Math.max(0, Math.min(gridRect.height, cy - gridRect.top - DRAG.offsetY));
  var pct = relY / gridRect.height;
  var mins = 480 + pct * 720;
  mins = Math.round(mins / 15) * 15;
  DRAG.newTime = String(Math.floor(mins / 60) % 24).padStart(2,'0') + ':' + String(mins % 60).padStart(2,'0');
  if (!DRAG.isDay) {
    var monday = getMonday(focusDate), nd = new Date(monday);
    nd.setDate(monday.getDate() + dayIdx);
    DRAG.newDate = toDateStr(nd);
  }
  dragTip.textContent = to12h(DRAG.newTime) + ' ' + DRAG.newDate;
}

function dragEndCommon() {
  if (dragTip) dragTip.style.display = 'none';
  if (!DRAG) return;
  var changed = (DRAG.newTime !== DRAG.oldTime) || (DRAG.newDate !== DRAG.oldDate);
  var clientId = DRAG.clientId, oldDate = DRAG.oldDate, oldTime = DRAG.oldTime, newDate = DRAG.newDate, newTime = DRAG.newTime, el = DRAG.el, origCss = DRAG.origCss;
  DRAG = null;
  if (changed && clientId && oldDate && oldTime && newDate && newTime) {
    fetch('api/data.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({action:'move_appointment', clientId: clientId, oldDate: oldDate, oldTime: oldTime, newDate: newDate, newTime: newTime})
    })
    .then(function(r){ return r.json(); })
    .then(function(result){
      if (result.success) {
        for (var i = 0; i < allAppointments.length; i++) {
          var a = allAppointments[i];
          if (String(a.clientId) === String(clientId) && a.date === oldDate && a.time === oldTime) {
            a.date = newDate; a.time = newTime; a.timeDisplay = to12h(newTime); a._sortTime = newTime;
            if (a._dateObj) a._dateObj = parseDate(newDate);
            break;
          }
        }
        var c = LOOKUP[String(clientId)];
        if (c && c.appointments) {
          for (var i = 0; i < c.appointments.length; i++) {
            if (c.appointments[i].date === oldDate && c.appointments[i].time === oldTime) {
              c.appointments[i].date = newDate; c.appointments[i].time = newTime;
              break;
            }
          }
        }
        renderAllAppts(); return;
      }
      el.style.cssText = origCss;
    })
    .catch(function(){ el.style.cssText = origCss; });
  } else {
    el.style.cssText = origCss;
  }
}

var _modalData = null;

var _modalCloseOutItems = [];

function apptTotal(a) {
  if (!a) return null;
  var t = 0;
  var fp = (a.finalPrice !== undefined && a.finalPrice !== null && a.finalPrice !== '') ? a.finalPrice : a.price;
  t += parseFloat(fp) || 0;
  if (a.closeOutItems && a.closeOutItems.length) {
    for (var i = 0; i < a.closeOutItems.length; i++) {
      t += parseFloat(a.closeOutItems[i].price) || 0;
    }
  }
  if (a.closedOut && a.closeOutTax) {
    t += parseFloat(a.closeOutTax) || 0;
  }
  return isFinite(t) ? t.toFixed(2) : null;
}

function openCloseOutModal() {
  if (!_modalData) return;
  var appt = _modalData.appt;
  var st = serviceTypeMap[appt.service];
  var svcDisp = st ? st.display : (appt.service || '\u2014');
  var basePrice = (appt.price !== undefined && appt.price !== null && appt.price !== '') ? appt.price : '';
  _modalCloseOutItems = [];
  if (appt.closeOutItems && appt.closeOutItems.length) {
    for (var i = 0; i < appt.closeOutItems.length; i++) _modalCloseOutItems.push(cloneOf(appt.closeOutItems[i]));
  }
  var html = '';
  html += '<div class="modal-section"><p class="big-name">' + _modalData.appt.clientName + '</p></div>';
  html += '<div class="modal-section"><h3>Close Out</h3><p style="color:#86868b;font-size:12px">Adjust the final service price and add products sold at close-out. Product prices are set at time of close out.</p></div>';
  html += '<div class="modal-section"><div class="modal-edit-row"><label>Service</label><span style="font-size:14px;font-weight:500">' + svcDisp + '</span></div>';
  html += '<div class="modal-edit-row"><label>Service Price $</label><input type="text" id="coServicePrice" value="' + basePrice + '" oninput="recalcCloseOut()"></div></div>';
  html += '<div class="modal-section"><h3>Products</h3><div id="coProductRows"></div><button class="btn-edit" id="coAddProductBtn" style="margin-top:6px;font-size:12px;padding:5px 12px">+ Add product</button></div>';
  html += '<div class="modal-section" style="background:#f6f8fa;border:1px solid #e0e4e8;border-radius:8px;padding:10px 12px"><p style="font-weight:700;margin:0;color:#666;font-size:12px">Products subtotal: $<span id="coProdSubtotal">0.00</span></p><p style="font-weight:600;margin:2px 0 6px 0" id="coTaxLine"></p><p style="font-weight:700;margin:0">Total: $<span id="coTotal">0.00</span></p></div>';
  html += '<div class="modal-section" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn-save" id="coConfirmBtn">Confirm Close Out</button><button class="btn-cancel" id="coCancelBtn">Cancel</button><span class="save-status modal-status" id="coStatus"></span></div>';
  document.getElementById('modalBody').innerHTML = html;
  renderCloseOutProductRows();
  document.getElementById('coAddProductBtn').addEventListener('click', function(){ _modalCloseOutItems.push({machine:'', display:'', price:''}); renderCloseOutProductRows(); });
  document.getElementById('coCancelBtn').addEventListener('click', renderApptModalReadOnly);
  document.getElementById('coConfirmBtn').addEventListener('click', confirmCloseOut);
  recalcCloseOut();
}

function renderCloseOutProductRows() {
  var html = '';
  for (var i = 0; i < _modalCloseOutItems.length; i++) {
    var item = _modalCloseOutItems[i];
    var opts = '<option value="">-- Select product --</option>';
    for (var pi = 0; pi < products.length; pi++) {
      var pr = products[pi];
      if (pr.active === false) continue;
      opts += '<option value="' + (pr.machine||'').replace(/"/g,'&quot;') + '"' + (item.machine === pr.machine ? ' selected' : '') + '>' + (pr.display || pr.machine) + '</option>';
    }
    html += '<div class="modal-edit-row co-prod-row" data-idx="' + i + '"><select class="co-prod-select" data-idx="' + i + '">' + opts + '</select><input type="text" class="co-prod-price" data-idx="' + i + '" value="' + item.price + '" placeholder="Price $"><button class="btn-cancel" data-idx="' + i + '" style="font-size:12px;padding:2px 8px;flex-shrink:0">Remove</button></div>';
  }
  if (!_modalCloseOutItems.length) html = '<p style="color:#86868b;font-size:13px">No products added</p>';
  document.getElementById('coProductRows').innerHTML = html;
  var rows = document.querySelectorAll('.co-prod-row');
  for (var i = 0; i < rows.length; i++) {
    rows[i].querySelector('.co-prod-select').addEventListener('change', function(){
      var idx = parseInt(this.dataset.idx,10);
      _modalCloseOutItems[idx].machine = this.value;
      var pr = productMap[this.value];
      _modalCloseOutItems[idx].display = pr ? (pr.display || pr.machine) : '';
      recalcCloseOut();
    });
    rows[i].querySelector('.co-prod-price').addEventListener('input', function(){
      _modalCloseOutItems[parseInt(this.dataset.idx,10)].price = this.value;
      recalcCloseOut();
    });
    recalcCloseOut();
    rows[i].querySelector('button').addEventListener('click', function(){
      _modalCloseOutItems.splice(parseInt(this.dataset.idx,10),1);
      renderCloseOutProductRows();
      recalcCloseOut();
    });
  }
}

function recalcCloseOut() {
  var sp = document.getElementById('coServicePrice');
  var svcPrice = sp ? (parseFloat(sp.value) || 0) : 0;
  var prodTot = 0;
  for (var i = 0; i < _modalCloseOutItems.length; i++) {
    prodTot += parseFloat(_modalCloseOutItems[i].price) || 0;
  }
  var rate = (typeof taxRate === 'number' && isFinite(taxRate)) ? taxRate : 0;
  var tax = Math.round(prodTot * rate) / 100;
  tax = Math.round(tax * 100) / 100;
  var tot = svcPrice + prodTot + tax;
  var psEl = document.getElementById('coProdSubtotal');
  if (psEl) psEl.textContent = prodTot.toFixed(2);
  var taxEl = document.getElementById('coTaxLine');
  if (taxEl) {
    taxEl.textContent = rate ? ('Tax (' + rate + '%): $' + tax.toFixed(2)) : '';
  }
  var el = document.getElementById('coTotal');
  if (el) el.textContent = tot.toFixed(2);
  return {svcPrice: svcPrice, prodSubtotal: prodTot, taxRate: rate, tax: tax, total: tot};
}

function confirmCloseOut() {
  if (!_modalData) return;
  var statusEl = document.getElementById('coStatus');
  var calc = recalcCloseOut();
  var items = [];
  for (var i = 0; i < _modalCloseOutItems.length; i++) {
    var it = _modalCloseOutItems[i];
    if (!it.machine) continue;
    items.push({machine: it.machine, display: it.display || it.machine, price: parseFloat(it.price) || 0});
  }
  statusEl.textContent = 'Saving...';
  statusEl.className = 'save-status modal-status';
  fetch('api/data.php', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({action:'update_appointment', clientId: _modalData.clientId, date: _modalData.date, time: _modalData.time, fields: {
      closedOut: true, finalPrice: calc.svcPrice, closeOutItems: items, closeOutSubtotal: calc.prodSubtotal, closeOutTaxRate: calc.taxRate, closeOutTax: calc.tax, closeOutTotal: calc.total, closedOutAt: new Date().toISOString()
    }})
  })
  .then(function(r){ return r.json(); })
  .then(function(result){
    if (result.success) {
      var appt = _modalData.appt;
      appt.closedOut = true;
      appt.finalPrice = calc.svcPrice;
      appt.closeOutItems = items;
      appt.closeOutSubtotal = calc.prodSubtotal;
      appt.closeOutTaxRate = calc.taxRate;
      appt.closeOutTax = calc.tax;
      appt.closeOutTotal = calc.total;
      appt.closedOutAt = new Date().toISOString();
      syncApptInMemory(appt);
      renderApptModalReadOnly();
      if (viewMode === 'week') renderWeek(); else renderDay();
      if (selectedId) renderClientApptList(LOOKUP[String(selectedId)]);
      renderAllAppts();
    } else {
      statusEl.textContent = 'Error: ' + (result.error || 'Unknown');
      statusEl.className = 'save-status error modal-status';
    }
  })
  .catch(function(err){
    statusEl.textContent = 'Error: ' + err.message;
    statusEl.className = 'save-status error modal-status';
  });
}

function reopenAppt() {
  if (!_modalData) return;
  fetch('api/data.php', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({action:'update_appointment', clientId: _modalData.clientId, date: _modalData.date, time: _modalData.time, fields: {
      closedOut: false, finalPrice: '', closeOutItems: [], closeOutTotal: ''
    }})
  })
  .then(function(r){ return r.json(); })
  .then(function(result){
    if (result.success) {
      var appt = _modalData.appt;
      appt.closedOut = false;
      delete appt.finalPrice; delete appt.closeOutItems; delete appt.closeOutTotal; delete appt.closedOutAt;
      syncApptInMemory(appt);
      renderApptModalReadOnly();
      if (viewMode === 'week') renderWeek(); else renderDay();
      if (selectedId) renderClientApptList(LOOKUP[String(selectedId)]);
      renderAllAppts();
    } else {
      alert('Error: ' + (result.error || 'Unknown') + (result.message ? ': ' + result.message:''));
    }
  })
  .catch(function(err){ alert('Error: ' + err.message); });
}

function cloneOf(o) {
  return JSON.parse(JSON.stringify(o));
}

function syncApptInMemory(updated) {
  var cid = String(updated.clientId), d = updated.date, t = updated.time;
  for (var i = 0; i < allAppointments.length; i++) {
    var a = allAppointments[i];
    if (String(a.clientId) === cid && a.date === d && a.time === t) {
      allAppointments[i] = updated;
      break;
    }
  }
  var c = LOOKUP[cid];
  if (c && c.appointments) {
    for (var i = 0; i < c.appointments.length; i++) {
      if (c.appointments[i].date === d && c.appointments[i].time === t) {
        c.appointments[i] = updated; break;
      }
    }
  }
}

function showApptModal(clientId, date, time) {
  var c = LOOKUP[String(clientId)];
  if (!c) return;
  var appt = null;
  if (c.appointments) {
    for (var i = 0; i < c.appointments.length; i++) {
      if (c.appointments[i].date === date && c.appointments[i].time === time) {
        appt = c.appointments[i];
        break;
      }
    }
  }
  if (!appt) return;
  _modalData = {clientId: clientId, date: date, time: time, appt: appt};
  renderApptModalReadOnly();
  document.getElementById('apptModalOverlay').classList.add('active');
  document.getElementById('apptModal').classList.add('open');
}

function renderApptModalReadOnly() {
  if (!_modalData) return;
  var c = LOOKUP[String(_modalData.clientId)];
  var appt = _modalData.appt;
  var date = _modalData.date;
  var time = _modalData.time;
  if (!c || !appt) return;
  var st = serviceTypeMap[appt.service];
  var svcLabel = st ? st.display : (appt.service || '\u2014');
  var endTime = calcEndTime(time, appt.duration);
  var html = '';
  html += '<div class="modal-section"><p class="big-name">' + c._name + '</p></div>';
  html += '<div class="modal-section"><h3>Appointment</h3>';
  html += '<p>' + fmtDateHeading(parseDate(date)) + '</p>';
  html += '<p>' + to12h(time) + (endTime ? ' \u2013 ' + to12h(endTime) : '') + (appt.price ? ' <span style="color:#86868b">$' + appt.price + '</span>' : '') + '</p>';
  html += '<p>' + svcLabel + (appt.duration ? ' \u00b7 ' + appt.duration + ' min' : '') + '</p>';
  var apptStylist = appt.stylist || 'stylist1';
  var apptStylistDisp = (stylistMap[apptStylist] && stylistMap[apptStylist].display) || apptStylist;
  html += '<p style="color:#86868b;font-size:12px">' + apptStylistDisp + '</p></div>';
  if (appt.closedOut) {
    html += '<div class="modal-section" style="background:#eaf7e6;border:1px solid #c5e3bb;border-radius:8px;padding:10px 12px"><p style="font-weight:700;color:#2e7d32;margin:0 0 6px 0">\u2713 Closed Out</p>';
    var coTot = apptTotal(appt);
    html += '<p style="margin:2px 0;color:#333">Final service price: <strong>$' + appt.finalPrice + '</strong></p>';
    if (appt.closeOutItems && appt.closeOutItems.length) {
      html += '<p style="margin:6px 0 2px 0;font-weight:600;color:#444">Products</p>';
      for (var ci = 0; ci < appt.closeOutItems.length; ci++) {
        var co = appt.closeOutItems[ci];
        html += '<p style="margin:1px 0 1px 8px;color:#444">\u2022 ' + (co.display || co.machine || 'Product') + ' <span style="color:#666">$' + co.price + '</span></p>';
      }
    }
    if (appt.closeOutSubtotal && appt.closeOutTax) {
      html += '<p style="margin:2px 0;color:#555">Products subtotal: <strong>$' + appt.closeOutSubtotal + '</strong>' + (appt.closeOutTaxRate ? ' + tax ' + appt.closeOutTaxRate + '%' : '') + ' = $' + appt.closeOutTax + ' tax</p>';
    }
    html += '<p style="margin:6px 0 0 0;font-weight:700;color:#2e7d32;border-top:1px solid #c5e3bb;padding-top:6px">Total: $' + coTot + '</p></div>';
  }
  var info = [];
  if (c.phone1) info.push('\u{1F4DE} ' + c.phone1);
  if (c.phone2) info.push('\u{1F4DE} ' + c.phone2);
  if (c.phone3) info.push('\u{1F4DE} ' + c.phone3);
  if (c.city && c.state) info.push('\u{1F4CD} ' + c.city + ', ' + c.state);
  if (c.address1) info.push('\u{1F3E0} ' + c.address1);
  if (c.birthday) info.push('\u{1F382} ' + c.birthday);
  if (info.length) {
    html += '<div class="modal-section"><h3>Client</h3>';
    for (var i = 0; i < info.length; i++) html += '<p>' + info[i] + '</p>';
    html += '</div>';
  }
  html += '<div class="modal-section" style="display:flex;gap:8px;flex-wrap:wrap">' + (appt.closedOut ? '<button class="btn-edit" id="modalReopenBtn">Reopen</button>' : '<button class="btn-save" id="modalCloseOutBtn">Close Out</button>') + '<button class="btn-edit" id="modalEditBtn">Edit</button><button class="btn-cancel" id="modalDeleteBtn" style="color:#e34a2f;border-color:#e34a2f">Delete</button></div>';
  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('modalViewAll').setAttribute('data-client-id', String(_modalData.clientId));
  if (!document.getElementById('modalViewAll')._viewAllWired) {
    document.getElementById('modalViewAll')._viewAllWired = true;
    document.getElementById('modalViewAll').addEventListener('click', function() {
      closeApptModal();
      selectClient(parseInt(this.dataset.clientId));
    });
  }
  var coBtn = document.getElementById('modalCloseOutBtn');
  if (coBtn) coBtn.addEventListener('click', openCloseOutModal);
  var roBtn = document.getElementById('modalReopenBtn');
  if (roBtn) roBtn.addEventListener('click', function() {
    if (!confirm('Reopen this appointment (undo close-out)?')) return;
    reopenAppt();
  });
  document.getElementById('modalEditBtn').addEventListener('click', editApptModal);
  document.getElementById('modalDeleteBtn').addEventListener('click', function() {
    if (!confirm('Delete this appointment?')) return;
    var cid = _modalData.clientId, od = _modalData.date, ot = _modalData.time;
    fetch('api/data.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({action:'delete_appointment', clientId: cid, date: od, time: ot})
    })
    .then(function(r){ return r.json(); })
    .then(function(result){
      if (result.success) {
        for (var i = 0; i < allAppointments.length; i++) {
          if (String(allAppointments[i].clientId) === String(cid) && allAppointments[i].date === od && allAppointments[i].time === ot) {
            allAppointments.splice(i,1); break;
          }
        }
        var c = LOOKUP[String(cid)];
        if (c && c.appointments) {
          for (var i = 0; i < c.appointments.length; i++) {
            if (c.appointments[i].date === od && c.appointments[i].time === ot) {
              c.appointments.splice(i,1); break;
            }
          }
        }
        closeApptModal();
        if (selectedId && String(selectedId) === String(cid)) selectClient(selectedId);
        else renderAllAppts();
      } else { alert('Error: ' + (result.error || 'Delete failed')); }
    })
    .catch(function(err){ alert('Error: ' + err.message); });
  });
}

function durOptionHtml(selected) {
  var h = '';
  var maxD = 240;
  selected = parseInt(selected, 10) || 60;
  for (var d = 15; d <= maxD; d += 15) h += '<option value="' + d + '"' + (selected === d ? ' selected' : '') + '>' + d + ' min</option>';
  if (selected > maxD) h += '<option value="' + selected + '" selected>' + selected + ' min</option>';
  return h;
}
function segTotalOf(machine) {
  var st = serviceTypeMap[machine];
  if (!st || !st.segments || !st.segments.length) return null;
  var sum = 0;
  for (var i = 0; i < st.segments.length; i++) sum += (parseInt(st.segments[i].d, 10) || 0);
  return sum > 0 ? sum : null;
}
function editApptModal() {
  if (!_modalData) return;
  var appt = _modalData.appt;
  var date = _modalData.date;
  var time = _modalData.time;
  var durOpts = durOptionHtml(parseInt(appt.duration||60,10));
  var svcOpts = '';
  for (var i = 0; i < serviceTypes.length; i++) {
    var st = serviceTypes[i];
    svcOpts += '<option value="' + st.machine.replace(/"/g,'&quot;') + '"' + (appt.service === st.machine ? ' selected' : '') + '>' + (st.display || st.machine) + '</option>';
  }
  var html = '';
  html += '<div class="modal-section"><p class="big-name">Edit Appointment</p></div>';
  html += '<div class="modal-section">';
  html += '<div class="modal-edit-row"><label>Date</label><input type="date" id="editApptDate" value="' + date + '"></div>';
  html += '<div class="modal-edit-row"><label>Time</label><input type="time" id="editApptTime" value="' + time + '"></div>';
  html += '<div class="modal-edit-row"><label>Service</label><select id="editApptSvc">' + svcOpts + '</select></div>';
  html += '<div class="modal-edit-row"><label>Price</label><input type="text" id="editApptPrice" value="' + (appt.price||'') + '"></div>';
  html += '<div class="modal-edit-row"><label>Duration</label><select id="editApptDur">' + durOpts + '</select></div>';
  var apptStylist = appt.stylist || 'stylist1';
  var styOpts = '';
  for (var i = 0; i < stylists.length; i++) {
    if (!stylists[i].active && apptStylist !== stylists[i].machine) continue;
    styOpts += '<option value="' + stylists[i].machine.replace(/"/g,'&quot;') + '"' + (apptStylist === stylists[i].machine ? ' selected' : '') + '>' + (stylists[i].display || stylists[i].machine) + '</option>';
  }
  html += '<div class="modal-edit-row"><label>Stylist</label><select id="editApptStylist">' + styOpts + '</select></div>';
  html += '</div>';
  html += '<div class="modal-section" style="display:flex;gap:8px;align-items:center"><button class="btn-save" id="modalSaveBtn">Save</button><button class="btn-cancel" id="modalCancelBtn">Cancel</button><span class="save-status modal-status" id="modalEditStatus"></span></div>';
  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('editApptSvc').addEventListener('change', function(){
    var t = segTotalOf(this.value);
    if (t !== null) document.getElementById('editApptDur').value = String(t);
  });
  document.getElementById('modalSaveBtn').addEventListener('click', saveApptModal);
  document.getElementById('modalCancelBtn').addEventListener('click', function(){ renderApptModalReadOnly(); });
}

function saveApptModal() {
  if (!_modalData) return;
  var statusEl = document.getElementById('modalEditStatus');
  var newDate = document.getElementById('editApptDate').value;
  var newTime = document.getElementById('editApptTime').value;
  var newSvc = document.getElementById('editApptSvc').value;
  var newPrice = document.getElementById('editApptPrice').value;
  var newDur = document.getElementById('editApptDur').value;
  var newStylist = document.getElementById('editApptStylist').value;
  if (!newDate || !newTime) { statusEl.textContent = 'Date and time required'; statusEl.className = 'save-status error modal-status'; return; }
  statusEl.textContent = 'Saving...'; statusEl.className = 'save-status modal-status';
  var fields = {service: newSvc, price: newPrice, duration: newDur, date: newDate, time: newTime, stylist: newStylist};
  fetch('api/data.php', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({action:'update_appointment', clientId: _modalData.clientId, date: _modalData.date, time: _modalData.time, fields: fields})
  })
  .then(function(r){ return r.json(); })
  .then(function(result){
    if (result.success) {
      for (var i = 0; i < allAppointments.length; i++) {
        var a = allAppointments[i];
        if (String(a.clientId) === String(_modalData.clientId) && a.date === _modalData.date && a.time === _modalData.time) {
          a.date = newDate; a.time = newTime; a.timeDisplay = to12h(newTime); a._sortTime = newTime;
          a.service = newSvc; a.price = newPrice; a.duration = newDur; a.stylist = newStylist;
          if (a._dateObj) a._dateObj = parseDate(newDate);
          break;
        }
      }
      var c = LOOKUP[String(_modalData.clientId)];
      if (c && c.appointments) {
        for (var i = 0; i < c.appointments.length; i++) {
          if (c.appointments[i].date === _modalData.date && c.appointments[i].time === _modalData.time) {
            c.appointments[i].date = newDate; c.appointments[i].time = newTime;
            c.appointments[i].service = newSvc; c.appointments[i].price = newPrice; c.appointments[i].duration = newDur; c.appointments[i].stylist = newStylist;
            break;
          }
        }
        c.appointments.sort(function(a,b){ return (a.date||'').localeCompare(b.date||'') || (a.time||'').localeCompare(b.time||''); });
      }
      showApptModal(_modalData.clientId, newDate, newTime);
      if (!selectedId) renderAllAppts();
    } else {
      statusEl.textContent = 'Error: ' + (result.error || 'Unknown');
      statusEl.className = 'save-status error modal-status';
    }
  })
  .catch(function(err){
    statusEl.textContent = 'Error: ' + err.message;
    statusEl.className = 'save-status error modal-status';
  });
}

function closeApptModal() {
  _modalData = null;
  document.getElementById('apptModalOverlay').classList.remove('active');
  document.getElementById('apptModal').classList.remove('open');
}

function showNewApptModal() {
  var html = '';
  html += '<div class="modal-section"><p class="big-name">New Appointment</p></div>';
  html += '<div class="modal-section">';
  if (selectedId && LOOKUP[String(selectedId)]) {
    var cc = LOOKUP[String(selectedId)];
    html += '<div class="modal-edit-row"><label>Client</label><span style="font-size:14px;font-weight:500">' + cc._name + '</span></div>';
    html += '<input type="hidden" id="newApptClientId" value="' + selectedId + '">';
  } else {
    html += '<div class="modal-edit-row" style="flex-direction:column;align-items:stretch">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">';
    html += '<label style="margin:0">Client</label>';
    html += '<button id="newClientBtn" type="button" style="padding:3px 10px;border:1px solid #d2d2d7;border-radius:4px;background:#fff;cursor:pointer;font-size:12px">+ New Client</button>';
    html += '</div>';
    html += '<div id="newApptClientArea"><input type="text" id="newApptClientSearch" placeholder="Type to search..." style="width:100%;padding:6px 8px;border:1px solid #d2d2d7;border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box">';
    html += '<input type="hidden" id="newApptClientId" value="">';
    html += '<div id="newApptClientResults" style="max-height:150px;overflow-y:auto;border:1px solid #d2d2d7;border-radius:4px;margin-top:4px;display:none"></div></div>';
    html += '</div>';
  }
  html += '<div class="modal-edit-row"><label>Date</label><input type="date" id="newApptDate" value="' + toDateStr(focusDate) + '"></div>';
  var timeOpts = '';
  for (var h = 8; h <= 19; h++) {
    for (var m = 0; m < 60; m += 15) {
      if (h === 19 && m > 0) continue;
      var val = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
      timeOpts += '<option value="' + val + '">' + val + '</option>';
    }
  }
  html += '<div class="modal-edit-row"><label>Time</label><select id="newApptTime">' + timeOpts + '</select></div>';
  var svcOpts = '';
  for (var i = 0; i < serviceTypes.length; i++) {
    var st = serviceTypes[i];
    svcOpts += '<option value="' + st.machine.replace(/"/g,'&quot;') + '">' + (st.display || st.machine) + '</option>';
  }
  html += '<div class="modal-edit-row"><label>Service</label><select id="newApptSvc">' + svcOpts + '</select></div>';
  html += '<div class="modal-edit-row"><label>Price</label><input type="text" id="newApptPrice"></div>';
  html += '<div class="modal-edit-row"><label>Duration</label><select id="newApptDur">' + durOptionHtml(60) + '</select></div>';
  var styOpts = '';
  for (var i = 0; i < stylists.length; i++) {
    if (!stylists[i].active) continue;
    styOpts += '<option value="' + stylists[i].machine.replace(/"/g,'&quot;') + '">' + (stylists[i].display || stylists[i].machine) + '</option>';
  }
  html += '<div class="modal-edit-row"><label>Stylist</label><select id="newApptStylist">' + styOpts + '</select></div>';
  html += '</div>';
  html += '<div class="modal-section" style="display:flex;gap:8px;align-items:center"><button class="btn-save" id="newApptSaveBtn">Save</button><button class="btn-cancel" id="newApptCancelBtn">Cancel</button><span class="save-status modal-status" id="newApptStatus"></span></div>';
  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('newApptSvc').addEventListener('change', function(){
    var t = segTotalOf(this.value);
    if (t !== null) document.getElementById('newApptDur').value = String(t);
  });
  document.getElementById('apptModalOverlay').classList.add('active');
  document.getElementById('apptModal').classList.add('open');
  var searchEl = document.getElementById('newApptClientSearch');
  if (searchEl) {
    searchEl.addEventListener('input', function() {
      var q = this.value.toLowerCase().trim();
      var resultsEl = document.getElementById('newApptClientResults');
      var hid = document.getElementById('newApptClientId');
      if (!q) { resultsEl.style.display = 'none'; resultsEl.innerHTML = ''; if (hid) hid.value = ''; return; }
      if (hid) hid.value = '';
      var matches = CLIENTS.filter(function(c){ return c._name.toLowerCase().includes(q); });
      var h = '';
      for (var i = 0; i < Math.min(matches.length, 20); i++) {
        h += '<div class="client-search-result" data-id="' + matches[i].id + '" style="padding:6px 8px;cursor:pointer;font-size:13px;border-bottom:1px solid #f0f0f0">' + matches[i]._name + '</div>';
      }
      resultsEl.innerHTML = h;
      resultsEl.style.display = matches.length ? '' : 'none';
      var items = resultsEl.querySelectorAll('.client-search-result');
      for (var i = 0; i < items.length; i++) {
        items[i].addEventListener('click', function() {
          var id = this.dataset.id;
          document.getElementById('newApptClientSearch').value = this.textContent;
          document.getElementById('newApptClientId').value = id;
          document.getElementById('newApptClientResults').style.display = 'none';
        });
      }
    });
  }
  document.getElementById('newApptSaveBtn').addEventListener('click', saveNewAppt);
  document.getElementById('newApptCancelBtn').addEventListener('click', function(){ closeApptModal(); });
  var newClientBtn = document.getElementById('newClientBtn');
  if (newClientBtn) newClientBtn.addEventListener('click', showNewClientForm);
}

function saveNewAppt() {
  var statusEl = document.getElementById('newApptStatus');
  var clientId = document.getElementById('newApptClientId').value;
  var date = document.getElementById('newApptDate').value;
  var time = document.getElementById('newApptTime').value;
  if (!clientId || !date || !time) {
    statusEl.textContent = clientId ? 'Date and time required' : 'Select a client';
    statusEl.className = 'save-status error modal-status'; return;
  }
  var service = document.getElementById('newApptSvc').value;
  var price = document.getElementById('newApptPrice').value;
  var duration = document.getElementById('newApptDur').value;
  var stylist = document.getElementById('newApptStylist').value;
  statusEl.textContent = 'Saving...'; statusEl.className = 'save-status modal-status';
  fetch('api/data.php', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({action:'create_appointment', clientId: clientId, date: date, time: time, service: service, price: price, duration: duration, stylist: stylist})
  })
  .then(function(r){ return r.json(); })
  .then(function(result){
    if (result.success) {
      var c = LOOKUP[String(clientId)];
      if (c) {
        if (!c.appointments) c.appointments = [];
        c.appointments.push({date: date, time: time, service: service, price: price, duration: duration, stylist: stylist});
        c.appointments.sort(function(a,b){ return (a.date||'').localeCompare(b.date||'') || (a.time||'').localeCompare(b.time||''); });
        buildApptList();
      }
      closeApptModal();
      if (selectedId && String(selectedId) === String(clientId)) selectClient(selectedId);
      else renderAllAppts();
    } else {
      statusEl.textContent = 'Error: ' + (result.error || 'Unknown');
      statusEl.className = 'save-status error modal-status';
    }
  })
  .catch(function(err){
    statusEl.textContent = 'Error: ' + err.message;
    statusEl.className = 'save-status error modal-status';
  });
}

function showNewClientForm() {
  var area = document.getElementById('newApptClientArea');
  if (!area) return;
  area.innerHTML = '<input type="text" id="newClientFirstName" placeholder="First Name" style="width:100%;padding:6px 8px;border:1px solid #d2d2d7;border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box;margin-bottom:4px">' +
    '<input type="text" id="newClientLastName" placeholder="Last Name" style="width:100%;padding:6px 8px;border:1px solid #d2d2d7;border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box;margin-bottom:4px">' +
    '<input type="text" id="newClientPhone" placeholder="Phone" style="width:100%;padding:6px 8px;border:1px solid #d2d2d7;border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box;margin-bottom:4px">' +
    '<div style="display:flex;gap:6px;align-items:center"><button id="saveNewClientBtn" style="padding:6px 14px;border:none;border-radius:6px;background:#0071e3;color:#fff;cursor:pointer;font-size:13px">Save Client</button><button id="cancelNewClientBtn" style="padding:6px 14px;border:1px solid #d2d2d7;border-radius:6px;background:#fff;cursor:pointer;font-size:13px">Cancel</button><span class="save-status modal-status" id="newClientStatus"></span></div>';
  document.getElementById('saveNewClientBtn').addEventListener('click', saveNewClient);
  document.getElementById('cancelNewClientBtn').addEventListener('click', function(){
    var area = document.getElementById('newApptClientArea');
    if (!area) return;
    area.innerHTML = '<input type="text" id="newApptClientSearch" placeholder="Type to search..." style="width:100%;padding:6px 8px;border:1px solid #d2d2d7;border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box">' +
      '<input type="hidden" id="newApptClientId" value="">' +
      '<div id="newApptClientResults" style="max-height:150px;overflow-y:auto;border:1px solid #d2d2d7;border-radius:4px;margin-top:4px;display:none"></div>';
    document.getElementById('newApptClientSearch').addEventListener('input', function() {
      var q = this.value.toLowerCase().trim();
      var resultsEl = document.getElementById('newApptClientResults');
      var hid = document.getElementById('newApptClientId');
      if (!q) { resultsEl.style.display = 'none'; resultsEl.innerHTML = ''; if (hid) hid.value = ''; return; }
      if (hid) hid.value = '';
      var matches = CLIENTS.filter(function(c){ return c._name.toLowerCase().includes(q); });
      var h = '';
      for (var i = 0; i < Math.min(matches.length, 20); i++) {
        h += '<div class="client-search-result" data-id="' + matches[i].id + '" style="padding:6px 8px;cursor:pointer;font-size:13px;border-bottom:1px solid #f0f0f0">' + matches[i]._name + '</div>';
      }
      resultsEl.innerHTML = h;
      resultsEl.style.display = matches.length ? '' : 'none';
      var items = resultsEl.querySelectorAll('.client-search-result');
      for (var i2 = 0; i2 < items.length; i2++) {
        items[i2].addEventListener('click', function() {
          var id = this.dataset.id;
          document.getElementById('newApptClientSearch').value = this.textContent;
          document.getElementById('newApptClientId').value = id;
          document.getElementById('newApptClientResults').style.display = 'none';
        });
      }
    });
  });
}

function saveNewClient() {
  var statusEl = document.getElementById('newClientStatus');
  var firstName = document.getElementById('newClientFirstName').value.trim();
  var lastName = document.getElementById('newClientLastName').value.trim();
  var phone = document.getElementById('newClientPhone').value.trim();
  if (!firstName && !lastName) { statusEl.textContent = 'Name required'; statusEl.className = 'save-status error modal-status'; return; }
  statusEl.textContent = 'Saving...'; statusEl.className = 'save-status modal-status';
  fetch('api/data.php', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({action:'create_client', firstName: firstName, lastName: lastName, phone: phone})
  })
  .then(function(r){ return r.json(); })
  .then(function(result){
    if (result.success && result.clientId) {
      var newId = String(result.clientId);
      var c = {id: result.clientId, firstName: firstName, lastName: lastName, phone1: phone, _name: (firstName + ' ' + lastName).trim() || ('Client #' + result.clientId), appointments: []};
      CLIENTS.push(c);
      CLIENTS.sort(function(a,b){ return a._name.toLowerCase().localeCompare(b._name.toLowerCase()); });
      LOOKUP[newId] = c;
      filterClients();
      var area = document.getElementById('newApptClientArea');
      if (area) {
        area.innerHTML = '<div style="font-size:14px;font-weight:500">' + c._name + '</div><input type="hidden" id="newApptClientId" value="' + newId + '">';
      }
      statusEl.textContent = '';
    } else {
      statusEl.textContent = 'Error: ' + (result.error || 'Save failed');
      statusEl.className = 'save-status error modal-status';
    }
  })
  .catch(function(err){
    statusEl.textContent = 'Error: ' + err.message;
    statusEl.className = 'save-status error modal-status';
  });
}

function filterClients() {
  var q = document.getElementById('searchInput').value.toLowerCase().trim();
  filtered = q === '' ? CLIENTS.slice() : CLIENTS.filter(function(c){ return c._name.toLowerCase().includes(q); });
  renderList();
}

function renderList() {
  var el = document.getElementById('clientList');
  document.getElementById('visibleCount').textContent = filtered.length;
  var html = '';
  for (var i = 0; i < filtered.length; i++) {
    var c = filtered[i];
    var cnt = c.appointments ? c.appointments.length : 0;
    var active = String(c.id) === String(selectedId) ? ' active' : '';
    html += '<div class="client-item' + active + '" data-id="' + c.id + '"><span class="name">' + c._name + '</span>' + (cnt ? ' <span class="appt-count">' + cnt + ' appt' + (cnt > 1 ? 's' : '') + '</span>' : '') + '</div>';
  }
  el.innerHTML = html;
  var items = el.querySelectorAll('.client-item');
  for (var i = 0; i < items.length; i++) {
    items[i].addEventListener('click', function(){ if (!editing) selectClient(this.dataset.id); });
  }
}

document.getElementById('searchInput').addEventListener('input', filterClients);
document.getElementById('menuBtn').addEventListener('click', toggleSidebar);
document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
document.getElementById('weekViewBtn').addEventListener('click', function(){ if (editing) return; viewMode='week'; document.getElementById('weekViewBtn').classList.add('active'); document.getElementById('dayViewBtn').classList.remove('active'); if (!selectedId) renderAllAppts(); });
document.getElementById('dayViewBtn').addEventListener('click', function(){ if (editing) return; viewMode='day'; document.getElementById('dayViewBtn').classList.add('active'); document.getElementById('weekViewBtn').classList.remove('active'); if (!selectedId) renderAllAppts(); });
document.getElementById('prevBtn').addEventListener('click', function(){ if (editing) return; if (viewMode==='day') focusDate.setDate(focusDate.getDate()-1); else focusDate.setDate(focusDate.getDate()-7); renderAllAppts(); });
document.getElementById('nextBtn').addEventListener('click', function(){ if (editing) return; if (viewMode==='day') focusDate.setDate(focusDate.getDate()+1); else focusDate.setDate(focusDate.getDate()+7); renderAllAppts(); });
document.getElementById('todayBtn').addEventListener('click', function(){ if (editing) return; focusDate=new Date(); renderAllAppts(); });
document.getElementById('datePicker').addEventListener('change', function(){
  if (editing) return;
  if (this.value) {
    var parts = this.value.split('-');
    focusDate = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
    viewMode = 'day';
    document.getElementById('dayViewBtn').classList.add('active');
    document.getElementById('weekViewBtn').classList.remove('active');
    if (!selectedId) renderAllAppts();
    this.value = '';
  }
});
document.getElementById('backBtn').addEventListener('click', function(){ if (!editing) clearSelection(); });
document.getElementById('settingsBtn').addEventListener('click', openSettings);
document.getElementById('settingsClose').addEventListener('click', closeSettings);
document.getElementById('settingsOverlay').addEventListener('click', closeSettings);
document.getElementById('settingsSaveBtn').addEventListener('click', saveServiceTypes);
document.getElementById('backupBtn').addEventListener('click', function(){
  var btn = this, orig = this.textContent;
  btn.disabled = true; btn.textContent = '⏳ Backing up...';
  fetch('api/data.php', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'create_backup'}) })
    .then(function(r){ return r.json(); })
    .then(function(d){
      btn.textContent = d.success ? '✅ Done' : '❌ Failed';
      setTimeout(function(){ btn.disabled = false; btn.textContent = orig; }, 2000);
    })
    .catch(function(){
      btn.textContent = '❌ Error';
      setTimeout(function(){ btn.disabled = false; btn.textContent = orig; }, 2000);
    });
});
document.getElementById('svcTypeAccordionToggle').addEventListener('click', function(){
  var c = document.getElementById('svcTypeAccordionContent');
  var h = c.style.display === 'none';
  c.style.display = h ? '' : 'none';
  this.innerHTML = (h ? '\u25BC' : '\u25B6') + ' Service Types';
});
document.getElementById('addSvcTypeBtn').addEventListener('click', function(){
  var suffix = 1;
  while (serviceTypes.some(function(s){ return s.machine === 'new-type-' + suffix; })) suffix++;
  var machine = 'new-type-' + suffix;
  serviceTypes.push({machine: machine, display: '', color: '#cccccc', defaultDuration: 60});
  renderServiceTypes();
  enableSettingsSave();
  var content = document.getElementById('svcTypeAccordionContent');
  content.style.display = '';
  document.getElementById('svcTypeAccordionToggle').innerHTML = '\u25BC Service Types';
  setTimeout(function(){ var el = document.getElementById('st_disp_' + (serviceTypes.length - 1)); if (el) el.focus(); }, 50);
});
document.getElementById('stylistAccordionToggle').addEventListener('click', function(){
  var c = document.getElementById('stylistAccordionContent');
  var h = c.style.display === 'none';
  c.style.display = h ? '' : 'none';
  this.innerHTML = (h ? '\u25BC' : '\u25B6') + ' Stylists';
});
document.getElementById('productAccordionToggle').addEventListener('click', function(){
  var c = document.getElementById('productAccordionContent');
  var h = c.style.display === 'none';
  c.style.display = h ? '' : 'none';
  this.innerHTML = (h ? '\u25BC' : '\u25B6') + ' Products';
});
document.getElementById('stylistFilter').addEventListener('change', function(){
  currentStylist = this.value;
  renderAllAppts();
});
document.getElementById('modalClose').addEventListener('click', closeApptModal);

var callListDate = null;
function openCallList() {
  if (!callListDate) callListDate = (viewMode === 'week') ? getMonday(new Date(focusDate)) : new Date(focusDate);
  var t = callListDate;
  var ts = toDateStr(t);
  var appts = [];
  for (var k = 0; k < allAppointments.length; k++) {
    var aa = allAppointments[k];
    if (aa.date === ts && (!currentStylist || currentStylist === 'ALL' || aa.stylist === currentStylist)) appts.push(aa);
  }
  appts.sort(function(x, y){ return (x.time || '') < (y.time || '') ? -1 : (x.time || '') > (y.time || '') ? 1 : 0; });
  document.getElementById('callListTitle').textContent = 'Call List \u2013 ' + t.toLocaleDateString('en-US', {weekday:'long', month:'short', day:'numeric'});
  var html = '';
  if (!appts.length) {
    html = '<div class="call-empty">No appointments on this day.</div>';
  } else {
    for (var i = 0; i < appts.length; i++) {
      var a = appts[i];
      var c = LOOKUP[String(a.clientId)];
      var baseTime = a.time || '';
      var st = serviceTypeMap[a.service];
      var svcLabel = st ? st.display : (a.service || '\u2014');
      html += '<div class="call-row" data-client-id="' + a.clientId + '" data-date="' + a.date + '" data-time="' + a.time + '" style="cursor:pointer"><span class="call-time">' + to12h(baseTime) + '</span><span class="call-name" data-name-nav="1" style="cursor:pointer;text-decoration:underline">' + (a.clientName || (c ? c._name : '') || '') + '</span>' + (c && c.phone1 ? '<span class="call-phone" data-no-nav="1">' + c.phone1 + '</span>' : '<span class="call-phone" style="color:#86868b">no phone</span>') + '<span class="call-svc">' + svcLabel + '</span></div>';
    }
  }
  document.getElementById('callListBody').innerHTML = html;
  var rows = document.querySelectorAll('#callListBody .call-row');
  for (var ri = 0; ri < rows.length; ri++) {
    rows[ri].addEventListener('click', function(ev){
      if (ev.target && ev.target.getAttribute && ev.target.getAttribute('data-no-nav') === '1') return;
      if (ev.target && ev.target.getAttribute && ev.target.getAttribute('data-name-nav') === '1') {
        var ncid = this.getAttribute('data-client-id');
        closeCallList();
        selectClient(parseInt(ncid));
        return;
      }
      if (editing) return;
      var dte = this.getAttribute('data-date'), tme = this.getAttribute('data-time'), cid = this.getAttribute('data-client-id');
      closeCallList();
      openApptModal(cid, dte, tme);
    });
  }
  document.getElementById('callListOverlay').classList.add('active');
  document.getElementById('callListModal').classList.add('open');
}
function closeCallList() {
  document.getElementById('callListOverlay').classList.remove('active');
  document.getElementById('callListModal').classList.remove('open');
  callListDate = null;
}
document.getElementById('callListBtn').addEventListener('click', function(){ if (editing) return; openCallList(); });
document.getElementById('callListClose').addEventListener('click', closeCallList);
function navCallList(dir) {
  if (editing) return;
  if (!callListDate) callListDate = new Date(focusDate);
  callListDate.setDate(callListDate.getDate() + dir);
  openCallList();
}
document.getElementById('callListPrev').addEventListener('click', function(){ navCallList(-1); });
document.getElementById('callListNext').addEventListener('click', function(){ navCallList(1); });
document.getElementById('callListOverlay').addEventListener('click', closeCallList);
document.getElementById('apptModalOverlay').addEventListener('click', closeApptModal);
document.getElementById('newApptBtn').addEventListener('click', showNewApptModal);

initTheme();

loadData();

function getQueryParam(name) {
  var m = location.search.match(new RegExp('[?&]' + name + '=([^&]*)'));
  return m ? decodeURIComponent(m[1].replace(/\+/g,' ')) : null;
}

if (location.search.indexOf('revisions') !== -1 || location.search.indexOf('history') !== -1) {
  document.querySelector('.sidebar').style.display = 'none';
  document.querySelector('.container .main').innerHTML = '<div style="padding:16px;max-width:1000px;margin:0 auto"><h2 style="font-size:18px;margin-bottom:12px">Revision History</h2><div id="revLog"></div></div>';
  fetch('api/data.php?action=get_revisions')
    .then(function(r){ return r.json(); })
    .then(function(data){
      var revs = data.revisions || [];
      var h = '';
      if (!revs.length) { h = '<p style="color:#86868b">No revisions recorded yet.</p>'; }
      else {
        h += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
        h += '<thead><tr style="background:#f5f5f7"><th style="text-align:left;padding:8px 10px;border-bottom:1px solid #d2d2d7;font-weight:600">Time</th><th style="text-align:left;padding:8px 10px;border-bottom:1px solid #d2d2d7;font-weight:600">Type</th><th style="text-align:left;padding:8px 10px;border-bottom:1px solid #d2d2d7;font-weight:600">Description</th></tr></thead><tbody>';
        for (var i = revs.length - 1; i >= 0; i--) {
          var r = revs[i];
          var ts = r.timestamp ? r.timestamp.replace('T',' ').replace(/\.\d+/,'').substr(0,19) : '';
          h += '<tr style="border-bottom:1px solid #f0f0f0"><td style="padding:8px 10px;white-space:nowrap;color:#86868b;font-size:12px;font-family:monospace">' + ts + '</td><td style="padding:8px 10px">' + r.type + '</td><td style="padding:8px 10px">' + (r.description||'') + '</td></tr>';
        }
        h += '</tbody></table>';
      }
      document.getElementById('revLog').innerHTML = h;
    })
    .catch(function(err){
      document.getElementById('revLog').innerHTML = '<p style="color:#e34a2f">Failed to load revisions: ' + err.message + '</p>';
    });
}
