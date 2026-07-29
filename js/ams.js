// ─── AMS ──────────────────────────────────────────────────────────
function amsEntryAmount(hours,rate){if(!rate)return null;return(hours/HOURS_PER_DAY)*rate;}
function amsStatusBadge(s){const m={'Open':'bg-blue-50 text-blue-700 border-blue-200','In Progress':'bg-amber-50 text-amber-700 border-amber-200','Closed':'bg-green-50 text-green-700 border-green-200'};return`<span class="text-xs font-medium border ${m[s]||'bg-gray-50 text-gray-600 border-gray-200'} px-2 py-0.5 rounded-full">${esc(s||'Open')}</span>`;}
function entryDate(e){return e.dateRaised||e.date||''}
function entryType(e){return e.type||e.category||'—'}
function entryRaisedBy(e){return e.raisedBy||e.loggedBy||'—'}
function currencySymbol(client){return CURRENCIES[client?.currency||'INR']?.symbol||'₹';}
function parseAmsEntriesCsv(text){
  const lines=text.trim().split('\n').filter(l=>l.trim());
  if(!lines.length)return[];
  const hasHeader=lines[0].toLowerCase().includes('date_raised')||lines[0].toLowerCase().includes('date raised');
  const dataLines=hasHeader?lines.slice(1):lines;
  return dataLines.map((line,i)=>{
    const p=line.split(',').map(c=>c.trim().replace(/^"|"$/g,''));
    const [date_raised,due_date,raised_by,module,project,description,type,query_level,entry_status,mode_of_support,hours]=p;
    let error=null;
    if(!date_raised)error='date_raised required';
    else if(!hours||isNaN(parseFloat(hours)))error='hours required (number)';
    else if(!description)error='description required';
    return{dateRaised:date_raised,dueDate:due_date||'',raisedBy:raised_by||'',module:module||'',project:project||'',description:description||'',type:type||AMS_TYPES[0],queryLevel:query_level||AMS_QUERY_LEVELS[0],entryStatus:entry_status||'Open',modeOfSupport:mode_of_support||AMS_MODES[0],hours:parseFloat(hours)||0,error,row:i+(hasHeader?2:1)};
  });
}
// The single, canonical AMS health formula — used by the AMS pages AND the
// Dashboard Health Scorecard/snapshot capture. Previously these lived as two
// separate, disagreeing functions (this one, and core.js's amsRagLabel) that
// could show a client as Green here and Red on the Dashboard for identical
// underlying data. Merged: this now checks everything either version checked.
function amsClientRag(client){
  const entries=client.workLog||[];
  if(!entries.length)return null;
  const open=entries.filter(e=>(e.entryStatus||'Open')!=='Closed');
  if(open.some(e=>e.ragStatus==='Red'))return'Red';
  if(open.some(e=>(e.queryLevel||'').includes('L4')))return'Red';
  if(open.some(e=>e.dueDate&&e.dueDate<todayStr()))return'Red';
  const t=amsTotals(client,'','');
  if(t.hasBucket&&t.balanceAvailable!==null&&t.balanceAvailable<=Math.max(2,t.totalAvailableHours*0.15))return'Red';
  if(open.some(e=>e.ragStatus==='Amber'))return'Amber';
  if(open.some(e=>(e.queryLevel||'').includes('L3')))return'Amber';
  const threeDays=new Date();threeDays.setDate(threeDays.getDate()+3);const soonStr=threeDays.toISOString().slice(0,10);
  if(open.some(e=>e.dueDate&&e.dueDate<=soonStr&&e.dueDate>=todayStr()))return'Amber';
  return'Green';
}
function amsTotals(client,fromDate,toDate){
  const allLog=client.workLog||[];
  const log=allLog.filter(e=>(!fromDate||entryDate(e)>=fromDate)&&(!toDate||entryDate(e)<=toDate));
  const totalHours=log.reduce((a,e)=>a+Number(e.hours||0),0);
  const allTimeHours=allLog.reduce((a,e)=>a+Number(e.hours||0),0);
  const bucket=client.totalAvailableHours;
  const hasBucket=bucket!==undefined&&bucket!==null&&bucket>0;
  const hasRate=!!(client.manDayRate>0);
  let billableHours=totalHours,coveredHours=0,balanceAvailable=null;
  if(hasBucket){
    const hoursBeforePeriod=fromDate?allLog.filter(e=>entryDate(e)<fromDate).reduce((a,e)=>a+Number(e.hours||0),0):0;
    const remainingAtPeriodStart=Math.max(0,bucket-hoursBeforePeriod);
    coveredHours=Math.min(totalHours,remainingAtPeriodStart);
    billableHours=Math.max(0,totalHours-remainingAtPeriodStart);
    balanceAvailable=Math.max(0,bucket-allTimeHours);
  }
  const totalAmount=hasRate?(amsEntryAmount(billableHours,client.manDayRate)||0):null;
  const byType={};
  log.forEach(e=>{const tp=entryType(e);byType[tp]=(byType[tp]||0)+Number(e.hours||0);});
  return{log,totalHours,totalAmount,byType,hasRate,hasBucket,totalAvailableHours:bucket,billableHours,coveredHours,consumedAllTime:allTimeHours,balanceAvailable};
}
function renderAmsClientList(){
  const amsClients=S.clients.filter(c=>c.workLog!==undefined);
  const totalEntries=amsClients.reduce((a,c)=>a+(c.workLog?.length||0),0);
  const openEntries=amsClients.reduce((a,c)=>a+(c.workLog||[]).filter(e=>(e.entryStatus||'Open')!=='Closed').length,0);
  const atRiskEntries=amsClients.reduce((a,c)=>a+(c.workLog||[]).filter(e=>(e.entryStatus||'Open')!=='Closed'&&(e.ragStatus==='Red'||e.ragStatus==='Amber'||(e.queryLevel||'').includes('L3')||(e.queryLevel||'').includes('L4'))).length,0);
  return`<div class="k-page fade">
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    ${[['Clients',amsClients.length,'text-[#0e7490]','bg-[#0e7490]/10'],['Total Entries',totalEntries,'text-gray-700','bg-gray-100'],['Open',openEntries,'text-[#0e7490]','bg-cyan-50'],['At Risk',atRiskEntries,'text-rose-600','bg-rose-50']].map(([l,v,tc,bg])=>`<div class="${bg} rounded-2xl p-4"><div class="text-2xl font-bold ${tc}">${v}</div><div class="text-xs text-gray-500 mt-0.5">${l}</div></div>`).join('')}
  </div>
  <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
    <h1 class="text-xl font-bold text-gray-900">AMS &amp; Support Retainers</h1>
    ${can('admin')?`<button data-act="modal-open" data-modal="add-ams-client" class="btn-grad text-white text-sm font-semibold px-4 py-2 rounded-xl transition">+ Add Client</button>`:''}
  </div>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    ${(()=>{const amsClients=S.clients.filter(c=>c.workLog!==undefined);return amsClients.length?amsClients.map((c,idx)=>{
      const t=amsTotals(c,'','');
      const log=c.workLog||[];
      const open=log.filter(e=>(e.entryStatus||'Open')!=='Closed');
      const atRisk=open.filter(e=>e.ragStatus==='Red'||e.ragStatus==='Amber'||(e.queryLevel||'').includes('L3')||(e.queryLevel||'').includes('L4')).length;
      const rag=amsClientRag(c);
      const ringColor=rag?RAG_HEX[rag]:'var(--mute-2)';
      const pct=t.hasBucket&&t.totalAvailableHours?Math.min(100,t.consumedAllTime/t.totalAvailableHours*100):(log.length?(log.length-open.length)/log.length*100:0);
      return`<div data-act="open-ams-client" data-id="${esc(c.id)}" style="animation-delay:${Math.min(idx*35,400)}ms" class="row-in card-hover bg-white rounded-2xl border border-gray-100 p-5 hover:border-[#0e7490]/30 transition cursor-pointer">
        <div class="flex items-center gap-3.5">
          ${ringSvg(pct,ringColor)}
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-gray-900 truncate" title="${esc(c.name)}">${esc(c.name)}</div>
            <div class="text-xs text-gray-400 mt-0.5 truncate">${c.description?esc(c.description):`${log.length} entr${log.length!==1?'ies':'y'} logged`}</div>
          </div>
        </div>
        <div class="flex gap-5 mt-3.5 pt-3 border-t border-gray-100">
          ${miniStat(log.length,'entries')}
          ${miniStat(open.length,'open',open.length>0?'var(--teal)':undefined)}
          ${miniStat(atRisk,'at risk',atRisk>0?'var(--red)':undefined)}
        </div>
      </div>`;
    }).join(''):`<div class="col-span-3 text-center py-16 text-gray-400">${emptyIcon('hours')}No AMS clients yet.</div>`;})()}
  </div>
</div>`;
}

function renderAmsClientDetail(clientId){
  const c=S.clients.find(x=>x.id===clientId);
  if(!c)return`<div class="p-8 text-gray-400">Client not found</div>`;
  const t=amsTotals(c,S.amsFrom,S.amsTo);
  const sorted=[...t.log].sort((a,b)=>entryDate(b).localeCompare(entryDate(a)));
  return`<div class="max-w-full mx-auto px-6 py-7 fade">
  <div class="flex flex-wrap items-start justify-between gap-4 mb-5">
    <div>
      <div class="flex items-center gap-3 mb-0.5"><h1 class="text-xl font-bold text-gray-900">${esc(c.name)}</h1>${(()=>{const r=amsClientRag(c);return r?ragBadge(r):''})()}</div>
      ${c.description?`<p class="text-sm text-gray-400 mt-0.5">${esc(c.description)}</p>`:''}
    </div>
    ${can('admin')?`<div class="flex gap-2 flex-wrap">
      <button data-act="edit-ams-client" data-id="${esc(c.id)}" class="text-gray-400 hover:text-[#0e7490] text-xs px-2 border border-gray-200 rounded-lg py-1.5">Edit Client</button>
      <button data-act="delete-ams-client" data-id="${esc(c.id)}" class="text-rose-400 hover:text-rose-600 text-xs px-2">Delete Client</button>
    </div>`:''}
  </div>
  ${can('edit')?`<div class="mb-5"><button data-act="modal-open" data-modal="add-ams-entry" data-cid="${esc(c.id)}" class="btn-grad text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition">+ Add Entry</button></div>`:''}
  ${can('admin')&&t.hasRate?`<div class="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
    <h3 class="font-semibold text-gray-900 text-sm mb-3">Billing</h3>
    ${t.hasBucket?`<div class="grid grid-cols-3 gap-4 mb-4">
      <div class="bg-gray-50 rounded-xl p-4"><div class="text-2xl font-bold text-gray-700">${t.totalAvailableHours.toFixed(1)}</div><div class="text-xs text-gray-500">Total Available</div></div>
      <div class="bg-gray-50 rounded-xl p-4"><div class="text-2xl font-bold text-gray-700">${t.consumedAllTime.toFixed(1)}</div><div class="text-xs text-gray-500">Consumed (all-time)</div></div>
      <div class="${t.balanceAvailable>0?'bg-green-50':'bg-rose-50'} rounded-xl p-4"><div class="text-2xl font-bold ${t.balanceAvailable>0?'text-green-600':'text-rose-600'}">${t.balanceAvailable.toFixed(1)}</div><div class="text-xs text-gray-500">Balance Available</div></div>
    </div>`:''}
    <div class="flex flex-wrap items-end gap-3 mb-4">
      <div><label class="block text-xs text-gray-400 mb-1">From</label><input id="ams-from" data-act="ams-range" type="date" value="${esc(S.amsFrom)}" class="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e7490]"/></div>
      <div><label class="block text-xs text-gray-400 mb-1">To</label><input id="ams-to" data-act="ams-range" type="date" value="${esc(S.amsTo)}" class="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e7490]"/></div>
      <div class="flex gap-1.5 items-end pb-0.5">
        ${[['This Month','this-month'],['Last Month','last-month'],['This Quarter','this-quarter'],['All Time','all-time']].map(([l,k])=>`<button data-act="ams-quick" data-range="${k}" class="text-xs px-2.5 py-2 rounded-lg border transition ${S.amsQuick===k?'bg-[#0e7490] text-white border-[#0e7490]':'border-gray-200 text-gray-500 hover:border-[#0e7490] hover:text-[#0e7490]'}">${l}</button>`).join('')}
      </div>
      ${exportMenuButton(`ams-${c.id}`,[
        {label:'📋 Activity Report (PDF)',act:'exp-ams-activity',data:{cid:c.id}},
        {label:'🧾 Invoice / Billing (PDF)',act:'exp-ams-invoice',data:{cid:c.id}},
        {label:'📊 Excel',act:'exp-excel',data:{etype:'ams',cid:c.id}},
        {label:'⬆ Import (CSV)',act:'open-import-ams',data:{cid:c.id}},
      ])}
    </div>
    <div class="grid grid-cols-3 gap-4 mb-4">
      <div class="bg-gray-50 rounded-xl p-4"><div class="text-2xl font-bold text-gray-700">${t.totalHours.toFixed(1)}</div><div class="text-xs text-gray-500">Hours This Period${t.hasBucket?` (${t.coveredHours.toFixed(1)} covered)`:''}</div></div>
      <div class="bg-gray-50 rounded-xl p-4"><div class="text-2xl font-bold text-gray-700">${currencySymbol(c)}${(c.manDayRate||0).toLocaleString(c.currency==='USD'?'en-US':'en-IN')}</div><div class="text-xs text-gray-500">Day Rate</div></div>
      <div class="bg-[#0e7490]/10 rounded-xl p-4"><div class="text-2xl font-bold text-[#0e7490]">${currencySymbol(c)}${(t.totalAmount||0).toLocaleString(c.currency==='USD'?'en-US':'en-IN',{maximumFractionDigits:0})}</div><div class="text-xs text-gray-500">Billable Amount</div></div>
    </div>
    <div class="flex flex-wrap gap-2">
      ${Object.entries(t.byType).map(([tp,hrs])=>`<span class="text-xs bg-gray-50 border border-gray-200 rounded-full px-3 py-1 text-gray-600">${esc(tp)}: ${hrs.toFixed(1)}h</span>`).join('')||'<span class="text-xs text-gray-400">No entries in this range</span>'}
    </div>
  </div>`:can('admin')&&!t.hasRate?`<div class="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
    <div class="flex flex-wrap items-end gap-3 mb-4">
      <div><label class="block text-xs text-gray-400 mb-1">From</label><input id="ams-from" data-act="ams-range" type="date" value="${esc(S.amsFrom)}" class="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e7490]"/></div>
      <div><label class="block text-xs text-gray-400 mb-1">To</label><input id="ams-to" data-act="ams-range" type="date" value="${esc(S.amsTo)}" class="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e7490]"/></div>
      ${exportMenuButton(`ams-${c.id}`,[
        {label:'📋 Activity Report (PDF)',act:'exp-ams-activity',data:{cid:c.id}},
        {label:'📊 Excel',act:'exp-excel',data:{etype:'ams',cid:c.id}},
        {label:'⬆ Import (CSV)',act:'open-import-ams',data:{cid:c.id}},
      ])}
    </div>
    <div class="bg-gray-50 rounded-xl p-4 inline-block"><div class="text-2xl font-bold text-gray-700">${t.totalHours.toFixed(1)}</div><div class="text-xs text-gray-500">Total Hours (Retainer)</div></div>
  </div>`:''}
  ${(()=>{
    if(!sorted.length)return`<div class="bg-white rounded-2xl border border-gray-100 text-center py-16 text-gray-400 text-sm">${emptyIcon('hours')}No entries yet. Add one to get started.</div>`;
    const selId=S.selectedAmsEntryId&&sorted.some(e=>e.id===S.selectedAmsEntryId)?S.selectedAmsEntryId:sorted[0].id;
    const sel=sorted.find(e=>e.id===selId);
    const isOverdue=e=>e.dueDate&&e.dueDate<todayStr()&&(e.entryStatus||'Open')!=='Closed';
    const isExpanded=S.expandedAmsHistory.has(sel.id);
    const hasHistory=sel.edits&&sel.edits.length>0;
    const detailRow=(label,value,extraCls)=>`<div><span class="text-xs text-gray-400">${label}</span><div class="text-sm text-gray-700 font-medium ${extraCls||''}">${value}</div></div>`;
    return`<div class="bg-white rounded-2xl border border-gray-100 overflow-hidden grid grid-cols-5" style="min-height:420px;">
    <div class="col-span-2 border-r border-gray-100 overflow-y-auto" style="max-height:640px;">
      <div class="px-3 py-2 bg-gray-50 border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wide sticky top-0">${sorted.length} entr${sorted.length!==1?'ies':'y'}</div>
      ${sorted.map(e=>{
        const active=e.id===selId;
        return`<div data-act="select-ams-entry" data-eid="${e.id}" class="px-3 py-2.5 border-b border-gray-50 cursor-pointer transition ${active?'bg-[#0e7490]/5 border-l-2 border-l-[#0e7490]':'border-l-2 border-l-transparent hover:bg-gray-50'}">
          <div class="flex justify-between items-baseline gap-2">
            <span class="text-xs font-medium text-gray-900 truncate">${esc(e.module||e.project||'Untitled')}</span>
            <span class="text-xs shrink-0 ${isOverdue(e)?'text-rose-600 font-semibold':'text-gray-400'}">${fmtDate(entryDate(e))}</span>
          </div>
          <div class="text-xs text-gray-500 truncate mt-0.5">${esc(e.description||'—')}</div>
          <div class="flex gap-1.5 mt-1.5">${amsStatusBadge(e.entryStatus||'Open')}${e.ragStatus?`<span class="scale-90 origin-left">${ragBadge(e.ragStatus)}</span>`:''}</div>
        </div>`;
      }).join('')}
    </div>
    <div class="col-span-3 p-5 overflow-y-auto" style="max-height:640px;">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1 text-xs text-gray-600">${esc(entryType(sel))}</span>
          ${amsStatusBadge(sel.entryStatus||'Open')}
          ${sel.ragStatus?ragBadge(sel.ragStatus):''}
        </div>
        ${can('edit')?`<div class="flex gap-2 shrink-0">
          <button data-act="edit-ams-entry" data-cid="${esc(c.id)}" data-eid="${sel.id}" class="text-xs font-medium text-[#0e7490] border border-[#0e7490]/30 rounded-lg px-3 py-1.5 hover:bg-[#0e7490]/5 transition">Edit</button>
          ${can('admin')?`<button data-act="delete-ams-entry" data-cid="${esc(c.id)}" data-eid="${sel.id}" class="text-xs font-medium text-rose-500 border border-rose-200 rounded-lg px-3 py-1.5 hover:bg-rose-50 transition">Delete</button>`:''}
        </div>`:''}
      </div>
      <div class="text-sm text-gray-800 mb-4 leading-relaxed">${esc(sel.description||'—')}</div>
      ${hasHistory?`<div class="mb-4"><button data-act="toggle-ams-history" data-eid="${sel.id}" class="text-xs text-amber-600 hover:text-amber-700 font-medium">✎ edited — ${isExpanded?'hide':'view'} history</button>
        ${isExpanded?`<div class="mt-1.5 pl-2.5 border-l-2 border-amber-200 space-y-1">${[...sel.edits].reverse().map(h=>`<div class="text-xs text-gray-400">${fmtDate(h.editedAt)}: ${esc(h.description||'—')}</div>`).join('')}</div>`:''}
      </div>`:''}
      <div class="grid grid-cols-2 gap-x-6 gap-y-3 text-xs pt-4 border-t border-gray-100">
        ${detailRow('Date Raised',fmtDate(entryDate(sel)))}
        ${detailRow('Due Date',sel.dueDate?fmtDate(sel.dueDate):'—',isOverdue(sel)?'text-rose-600':'')}
        ${detailRow('Raised / Attended By',esc(entryRaisedBy(sel)))}
        ${detailRow('Project',esc(sel.project||'—'))}
        ${detailRow('Query Level',esc(sel.queryLevel||'—'))}
        ${detailRow('Mode of Support',esc(sel.modeOfSupport||'—'))}
        ${detailRow('Dependencies',esc(sel.dependencies||'—'))}
        ${detailRow('Hours',`<span class="text-gray-900 font-bold">${Number(sel.hours||0).toFixed(1)}</span>`)}
        <div class="col-span-2">${detailRow('Solution Discussed',esc(sel.solution||'—'))}</div>
      </div>
    </div>
  </div>`;
  })()}
</div>`;
}