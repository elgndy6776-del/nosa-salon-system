const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const money=n=>new Intl.NumberFormat("ar-EG",{maximumFractionDigits:2}).format(Number(n)||0)+" ج.م";
const today=()=>new Date().toISOString().slice(0,10);
const uid=p=>p+"_"+Date.now()+"_"+Math.random().toString(36).slice(2,7);
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
let settings=JSON.parse(localStorage.getItem("paySettings")||"null")||{start:"11:30",end:"21:00",ot:50};
let employees=JSON.parse(localStorage.getItem("payEmployees")||"null")||[];
// تنظيف الموظفين التجريبيين فقط عند أول تشغيل للنسخة البناتية الجديدة، مع الحفاظ على أي بيانات أضافها المدير.
if(localStorage.getItem("payUiVersion")!=="nosa-pink-v3"){
  const demoIds=["e1","e2","e3","e4"];
  if(employees.length && employees.every(e=>demoIds.includes(e.id))){employees=[];localStorage.removeItem("payEmployees");}
  localStorage.setItem("payUiVersion","nosa-pink-v3");
}
let attendance=JSON.parse(localStorage.getItem("payAttendance")||"null")||[];
let loans=JSON.parse(localStorage.getItem("payLoans")||"null")||[];
let adjustments=JSON.parse(localStorage.getItem("payAdjustments")||"null")||[];
let overtime=JSON.parse(localStorage.getItem("payOvertime")||"null")||[];
let expenses=JSON.parse(localStorage.getItem("payExpenses")||"null")||[];
let branchCodes=JSON.parse(localStorage.getItem("payBranchCodes")||"null")||{الحدايق:"",الدواجن:""};
let sessionEmployee=null, sessionBranch=null, loginMode="admin", lastPayroll=[];
let cloudLoaded=false, cloudWriting=false;
const savedSession=JSON.parse(sessionStorage.getItem("paySession")||"null");

function save(){
 localStorage.setItem("payEmployees",JSON.stringify(employees));
 localStorage.setItem("payAttendance",JSON.stringify(attendance));
 localStorage.setItem("payLoans",JSON.stringify(loans));
 localStorage.setItem("payAdjustments",JSON.stringify(adjustments));
 localStorage.setItem("payOvertime",JSON.stringify(overtime));
 localStorage.setItem("payExpenses",JSON.stringify(expenses));
 localStorage.setItem("payBranchCodes",JSON.stringify(branchCodes));
 localStorage.setItem("paySettings",JSON.stringify(settings));
 if(window.nosaDB && cloudLoaded && !cloudWriting){
   cloudWriting=true;
   const state={employees,attendance,loans,adjustments,overtime,expenses,branchCodes,settings,updatedAt:Date.now()};
   window.nosaDB.ref("nosaPayroll/state").set(state).catch(err=>console.error(err)).finally(()=>cloudWriting=false);
 }
}
function applyCloudState(v){
 if(!v)return;
 employees=Array.isArray(v.employees)?v.employees:[];
 attendance=Array.isArray(v.attendance)?v.attendance:[];
 loans=Array.isArray(v.loans)?v.loans:[];
 adjustments=Array.isArray(v.adjustments)?v.adjustments:[];
 overtime=Array.isArray(v.overtime)?v.overtime:[];
 expenses=Array.isArray(v.expenses)?v.expenses:[];
 branchCodes=v.branchCodes||{الحدايق:"",الدواجن:""};
 settings=v.settings||settings;
 localStorage.setItem("payEmployees",JSON.stringify(employees));
 localStorage.setItem("payAttendance",JSON.stringify(attendance));
 localStorage.setItem("payLoans",JSON.stringify(loans));
 localStorage.setItem("payAdjustments",JSON.stringify(adjustments));
 localStorage.setItem("payOvertime",JSON.stringify(overtime));
 localStorage.setItem("payExpenses",JSON.stringify(expenses));
 localStorage.setItem("payBranchCodes",JSON.stringify(branchCodes));
 localStorage.setItem("paySettings",JSON.stringify(settings));
 prepForms();
 renderDashboard(); renderEmployees(); renderAttendance(); renderLoans(); renderAdjustments(); renderOvertime(); renderPayroll(); renderExpenses(); renderBranchPortal();
}
function initCloud(){
 if(!window.nosaDB)return;
 window.nosaDB.ref("nosaPayroll/state").on("value",snap=>{
   const v=snap.val();
   if(v){ applyCloudState(v); }
   else { cloudLoaded=true; save(); return; }
   cloudLoaded=true;
 });
}
function cloudStatus(){return window.nosaDB&&cloudLoaded}
function toast(m){let t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(window.tt);window.tt=setTimeout(()=>t.classList.remove("show"),2200)}
function emp(id){return employees.find(e=>e.id===id)}
function empByCode(code){return employees.find(e=>e.code===code&&e.active)}
function nameOf(id){return emp(id)?.name||"—"}
function dateObj(s){let [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)}
function fmtDate(s){if(!s)return"—";return dateObj(s).toLocaleDateString("ar-EG",{day:"2-digit",month:"2-digit",year:"numeric"})}
function normalizeTime(t){
 t=String(t||"").trim().replace(/صباحًا|صباحا|صباح|AM|am/gi," ص").replace(/مساءً|مساءا|مساء|PM|pm/gi," م").replace(/\s+/g," ");
 let m=t.match(/^(\d{1,2}):(\d{2})(?:\s*(ص|م))?$/);
 if(!m)return ""; let h=Number(m[1]),mi=Number(m[2]); if(mi>59)return "";
 if(m[3]==="ص" && h===12)h=0; if(m[3]==="م" && h<12)h+=12; if(h>23)return "";
 return String(h).padStart(2,"0")+":"+String(mi).padStart(2,"0");
}
function formatTimeArabic(t){let v=normalizeTime(t);if(!v)return "";let [h,m]=v.split(":").map(Number),p=h>=12?"مساءً":"صباحًا",hh=h%12||12;return `${String(hh).padStart(2,"0")}:${String(m).padStart(2,"0")} ${p}`}
function minutes(t){t=normalizeTime(t);if(!t)return null;let [h,m]=t.split(":").map(Number);return h*60+m}
function lateInfo(e,inTime){let actual=minutes(inTime),scheduled=minutes(e.start||settings.start);if(actual==null||scheduled==null||actual<=scheduled)return {minutes:0,deduction:0};let lm=actual-scheduled,days=e.cycle==="شهري"?30:e.cycle==="15 يوم"?15:7,shift=diffMin(e.start||settings.start,e.end||settings.end)||1;let perMinute=(Number(e.salary)||0)/(days*shift);return {minutes:lm,deduction:lm*perMinute};}
function diffMin(a,b){let x=minutes(a),y=minutes(b);if(x==null||y==null)return 0;if(y<x)y+=1440;return y-x}
function periodRange(end,cycle){
 let e=dateObj(end),start=new Date(e);
 if(cycle==="أسبوعي")start.setDate(e.getDate()-6);
 else if(cycle==="15 يوم")start.setDate(e.getDate()-14);
 else start=new Date(e.getFullYear(),e.getMonth(),1);
 return {start:start.toISOString().slice(0,10),end};
}
function inRange(d,r){return d>=r.start&&d<=r.end}
function salaryForPeriod(e,r){
 let days=(dateObj(r.end)-dateObj(r.start))/86400000+1;
 if(e.cycle==="شهري")return Number(e.salary)||0;
 if(e.cycle==="15 يوم")return Number(e.salary)||0;
 return Number(e.salary)||0;
}
function attendanceFor(e,r){return attendance.filter(a=>a.employeeId===e.id&&inRange(a.date,r))}
function calcPayroll(e,end=e.cycle==="شهري"?today():today(),cycle=e.cycle){
 let r=periodRange(end,cycle);
 let base=salaryForPeriod(e,r), at=attendanceFor(e,r);
 let late=0, lateDed=0;
 at.forEach(a=>{if(a.in){let scheduled=minutes(e.start||settings.start),actual=minutes(a.in);if(actual>scheduled){let lm=actual-scheduled;late+=lm;lateDed+=lm*(base/((e.cycle==="شهري"?30:e.cycle==="15 يوم"?15:7)*diffMin(e.start||settings.start,e.end||settings.end)));}}});
 let adj=adjustments.filter(x=>x.employeeId===e.id&&inRange(x.date,r));
 let deduction=adj.filter(x=>x.type!=="جزاء").reduce((s,x)=>s+Number(x.amount),0);
 let penalties=adj.filter(x=>x.type==="جزاء").reduce((s,x)=>s+Number(x.amount),0);
 let loan=loans.filter(x=>x.employeeId===e.id&&inRange(x.date,r)).reduce((s,x)=>s+Number(x.deduct),0);
 let ot=overtime.filter(x=>x.employeeId===e.id&&inRange(x.date,r)).reduce((s,x)=>s+Number(x.hours)*Number(x.rate),0);
 let net=Math.max(0,base+ot-lateDed-deduction-penalties-loan);
 return {e,r,base,late,lateDed,deduction,penalties,loan,ot,net};
}
function populateEmployeeSelect(id){
 let html=employees.map(e=>`<option value="${e.id}">${esc(e.name)} — ${esc(e.code)}</option>`).join("");
 $(id).innerHTML=html;
}
function renderDashboard(){
 let ds=today(), active=employees.filter(e=>e.active), todayAtt=attendance.filter(a=>a.date===ds);
 let present=todayAtt.filter(a=>a.in).length, late=0;
 todayAtt.forEach(a=>{let e=emp(a.employeeId);if(e&&a.in&&minutes(a.in)>minutes(e.start||settings.start))late++});
 $("#dEmployees").textContent=active.length;$("#dPresent").textContent=present;$("#dPresentPct").textContent=active.length?Math.round(present/active.length*100)+"%":"0%";
 $("#dLate").textContent=late;$("#dOvertime").textContent=overtime.reduce((s,x)=>s+(inRange(x.date,periodRange(ds,"شهري"))?Number(x.hours):0),0).toFixed(2);
 $("#dDeductions").textContent=money(adjustments.reduce((s,x)=>s+(inRange(x.date,periodRange(ds,"شهري"))?Number(x.amount):0),0));
 $("#dLoans").textContent=money(loans.reduce((s,x)=>s+(inRange(x.date,periodRange(ds,"شهري"))?Number(x.deduct):0),0));
 $("#dExpenses").textContent=money(expenses.filter(x=>x.date===ds).reduce((s,x)=>s+Number(x.amount||0),0));
 let branches=["الحدايق","الدواجن"], counts=branches.map(b=>({b,n:todayAtt.filter(a=>emp(a.employeeId)?.branch===b&&a.in).length}));
 let max=Math.max(1,...counts.map(x=>x.n));
 let alerts=[];
 if(late){let lateTotal=0;todayAtt.forEach(a=>{let e=emp(a.employeeId);if(e&&a.in)lateTotal+=lateInfo(e,a.in).deduction});alerts.push(`<div class="alert warn">يوجد <b>${late}</b> موظف متأخر اليوم — إجمالي خصم التأخير المتوقع <b>${money(lateTotal)}</b>.</div>`);}
 let absent=active.length-present;if(absent>0)alerts.push(`<div class="alert red">يوجد <b>${absent}</b> موظف لم يسجل حضوراً اليوم.</div>`);
 if(!alerts.length)alerts.push(`<div class="alert">لا توجد تنبيهات مهمة حالياً.</div>`);
 $("#alerts").innerHTML=alerts.join("");
 let recent=[...attendance].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
 $("#recentActivity").innerHTML=recent.length?recent.map(a=>`<div class="activity"><span>${fmtDate(a.date)}</span><b>${esc(nameOf(a.employeeId))}</b><span>${a.in?formatTimeArabic(a.in):"—"} / ${a.out?formatTimeArabic(a.out):"—"}</span><span class="badge ${a.in?"green":"red"}">${a.in?"حضور":"بدون حضور"}</span><button class="mini-btn danger" data-del-recent="${a.id}">حذف</button></div>`).join(""):`<div class="muted">لا توجد حركات بعد.</div>`;
 let branchHtml=counts.map(x=>`<div class="branch-count"><span>فرع ${x.b}</span><b>${x.n}</b><small>موظفة حضرت اليوم</small></div>`).join("");
 $("#branchBars").innerHTML=`<div class="branch-counts">${branchHtml}</div>`+counts.map(x=>`<div class="bar-row"><span>${x.b}</span><div class="bar"><i style="width:${x.n/max*100}%"></i></div><b>${x.n}</b></div>`).join("");
}
function renderEmployees(){
 let q=$("#employeeSearch").value.toLowerCase(),b=$("#employeeBranchFilter").value,c=$("#employeeCycleFilter").value;
 let list=employees.filter(e=>(!q||(e.name+e.code).toLowerCase().includes(q))&&(b==="all"||e.branch===b)&&(c==="all"||e.cycle===c));
 $("#employeesTable").innerHTML=list.map(e=>`<tr><td><div class="person"><div class="person-avatar">${esc(e.name[0])}</div><b>${esc(e.name)}</b></div></td><td><div class="employee-code-cell"><b class="employee-code-value">${esc(e.code)}</b><button type="button" class="mini-btn" data-copy-code="${esc(e.code)}" title="نسخ الكود">نسخ</button></div></td><td>${esc(e.branch)}</td><td>${money(e.salary)}</td><td>${e.cycle}</td><td>${formatTimeArabic(e.start)} — ${formatTimeArabic(e.end)}</td><td><span class="badge ${e.active?"green":"red"}">${e.active?"نشط":"متوقف"}</span></td><td><div class="actions"><button class="mini-btn" data-edit-emp="${e.id}">تعديل</button><button class="mini-btn danger" data-del-emp="${e.id}">حذف</button></div></td></tr>`).join("");
}
function renderAttendance(){
 let d=$("#attDate").value||"all",b=$("#attBranch").value,s=$("#attStatus").value;
 let list=attendance.filter(a=>(d==="all"||!d||a.date===d)&&(b==="all"||emp(a.employeeId)?.branch===b));
 list=list.filter(a=>{let e=emp(a.employeeId);if(s==="all")return true;if(s==="absent")return !a.in;return a.in&&minutes(a.in)>minutes(e?.start||settings.start)});
 list.sort((a,b)=>b.date.localeCompare(a.date));
 $("#attendanceTable").innerHTML=list.length?list.map(a=>{let e=emp(a.employeeId),lm=a.in?Math.max(0,minutes(a.in)-minutes(e?.start||settings.start)):0,om=a.out?Math.max(0,minutes(a.out)-minutes(e?.end||settings.end)):0;return `<tr><td>${fmtDate(a.date)}</td><td>${esc(nameOf(a.employeeId))}</td><td>${e?.branch||""}</td><td>${a.in?formatTimeArabic(a.in):"—"}</td><td>${a.out?formatTimeArabic(a.out):"—"}</td><td>${lm} د</td><td>${lm?money(lateInfo(e,a.in).deduction):money(0)}</td><td>${Math.floor(om/60)}س ${om%60}د</td><td><span class="badge ${!a.in?"red":lm?"orange":"green"}">${!a.in?"غائب":lm?"متأخر":"حاضر"}</span></td><td><button class="mini-btn" data-edit-att="${a.id}">تعديل</button> <button class="mini-btn danger" data-del-att="${a.id}">حذف</button></td></tr>`}).join(""):`<tr><td colspan="10" class="muted">لا توجد سجلات مطابقة.</td></tr>`;
}
function renderLoans(){
 $("#loansTable").innerHTML=loans.length?loans.sort((a,b)=>b.date.localeCompare(a.date)).map(x=>`<tr><td>${fmtDate(x.date)}</td><td>${esc(nameOf(x.employeeId))}</td><td>${money(x.amount)}</td><td>${money(x.deduct)}</td><td>${esc(x.reason||"—")}</td><td><span class="badge green">تخصم</span></td><td><button class="mini-btn danger" data-del-loan="${x.id}">حذف</button></td></tr>`).join(""):`<tr><td colspan="7" class="muted">لا توجد سلف.</td></tr>`;
}
function renderAdjustments(){
 $("#adjustmentsTable").innerHTML=adjustments.length?adjustments.sort((a,b)=>b.date.localeCompare(a.date)).map(x=>`<tr><td>${fmtDate(x.date)}</td><td>${esc(nameOf(x.employeeId))}</td><td><span class="badge ${x.type==="جزاء"?"red":"orange"}">${x.type}</span></td><td>${money(x.amount)}</td><td>${esc(x.reason||"—")}</td><td>${emp(x.employeeId)?.cycle||"—"}</td><td><button class="mini-btn danger" data-del-adj="${x.id}">حذف</button></td></tr>`).join(""):`<tr><td colspan="7" class="muted">لا توجد خصومات أو جزاءات.</td></tr>`;
}
function renderOvertime(){
 $("#overtimeTable").innerHTML=overtime.length?overtime.sort((a,b)=>b.date.localeCompare(a.date)).map(x=>`<tr><td>${fmtDate(x.date)}</td><td>${esc(nameOf(x.employeeId))}</td><td>${x.hours}</td><td>${money(x.rate)}</td><td>${money(x.hours*x.rate)}</td><td>${esc(x.reason||"—")}</td><td><button class="mini-btn danger" data-del-ot="${x.id}">حذف</button></td></tr>`).join(""):`<tr><td colspan="7" class="muted">لا يوجد أوفر تايم.</td></tr>`;
}
function renderPayroll(){
 let cycle=$("#payrollCycle").value,end=$("#payrollEnd").value||today();
 let list=employees.filter(e=>e.active&&e.cycle===cycle).map(e=>calcPayroll(e,end,cycle));lastPayroll=list;
 $("#payrollTable").innerHTML=list.map(x=>`<tr><td><b>${esc(x.e.name)}</b><br><span class="muted">${x.e.branch}</span></td><td>${money(x.base)}</td><td>${money(x.lateDed)}<br><span class="muted">${x.late} دقيقة</span></td><td>${money(x.deduction)}</td><td>${money(x.penalties)}</td><td>${money(x.loan)}</td><td>${money(x.ot)}</td><td><b>${money(x.net)}</b></td><td><button class="mini-btn" data-pay-report="${x.e.id}">كشف</button></td></tr>`).join("")||`<tr><td colspan="9" class="muted">لا يوجد موظفون على هذا النظام.</td></tr>`;
 let sums=list.reduce((a,x)=>{a.base+=x.base;a.d+=x.lateDed+x.deduction+x.penalties+x.loan;a.ot+=x.ot;a.net+=x.net;return a},{base:0,d:0,ot:0,net:0});
 $("#payrollSummary").innerHTML=[["إجمالي الأساسي",sums.base],["إجمالي الخصومات",sums.d],["إجمالي الأوفر تايم",sums.ot],["صافي المرتبات",sums.net]].map(x=>`<div class="sum"><span>${x[0]}</span><b>${money(x[1])}</b></div>`).join("");
}
function renderExpenses(){
 let d=$("#expenseDate")?.value||today(), b=$("#expenseBranchFilter")?.value||"all";
 let list=expenses.filter(x=>(!d||x.date===d)&&(b==="all"||x.branch===b)).sort((a,b)=>b.createdAt-a.createdAt);
 const total=(br)=>expenses.filter(x=>x.date===d&&x.branch===br).reduce((s,x)=>s+Number(x.amount||0),0);
 $("#expHadayekTotal").textContent=money(total("الحدايق"));
 $("#expDawagenTotal").textContent=money(total("الدواجن"));
 const breakdown=(br)=>{let m={};expenses.filter(x=>x.date===d&&x.branch===br).forEach(x=>m[x.type]=(m[x.type]||0)+Number(x.amount||0));return Object.entries(m).map(([k,v])=>`<div class="emp-row"><span>${esc(k)}</span><b>${money(v)}</b></div>`).join("")||`<div class="muted">لا توجد مصروفات اليوم.</div>`};
 $("#expHadayekBreakdown").innerHTML=breakdown("الحدايق");$("#expDawagenBreakdown").innerHTML=breakdown("الدواجن");
 $("#expensesTable").innerHTML=list.length?list.map(x=>`<tr><td>${fmtDate(x.date)}</td><td>${esc(x.branch)}</td><td>${esc(x.type)}</td><td><b>${money(x.amount)}</b></td><td>${esc(x.reason||"—")}</td><td><button class="mini-btn danger" data-del-exp="${x.id}">حذف</button></td></tr>`).join(""):`<tr><td colspan="6" class="muted">لا توجد مصروفات مطابقة.</td></tr>`;
}
function renderBranchPortal(){
 if(!sessionBranch)return;
 $("#branchName").textContent=`فرع ${sessionBranch}`;
 let d=today(), list=expenses.filter(x=>x.branch===sessionBranch&&x.date===d).sort((a,b)=>b.createdAt-a.createdAt);
 $("#branchTodayTotal").textContent=money(list.reduce((s,x)=>s+Number(x.amount||0),0))+" اليوم";
 $("#branchExpenseList").innerHTML=list.length?list.map(x=>`<div class="emp-row"><span><b>${esc(x.type)}</b> — ${esc(x.reason||"بدون بيان")}</span><b>${money(x.amount)}</b></div>`).join(""):`<div class="muted">لم تسجل مصروفات اليوم.</div>`;
}
function renderReport(){
 let id=$("#reportEmployee").value,end=$("#reportEnd").value||today(),cycle=$("#reportCycle").value,e=emp(id);
 if(!e){$("#reportPreview").innerHTML="";return}
 let x=calcPayroll(e,end,cycle);
 $("#reportPreview").innerHTML=`<div class="report-sheet" id="reportSheet"><div class="report-head"><div><h2>كشف مرتب موظف</h2><p>${esc(e.name)} — كود ${esc(e.code)}</p><p>${esc(e.branch)} | ${cycle} | من ${fmtDate(x.r.start)} إلى ${fmtDate(x.r.end)}</p></div><div><b>نظام المرتبات</b><p>تاريخ الإصدار: ${fmtDate(today())}</p></div></div>
 <div class="report-total"><div><span>الأساسي</span><b>${money(x.base)}</b></div><div><span>الأوفر تايم</span><b>${money(x.ot)}</b></div><div><span>التأخير</span><b>${money(x.lateDed)}</b></div><div><span>الخصومات والجزاءات</span><b>${money(x.deduction+x.penalties)}</b></div><div><span>صافي المرتب</span><b>${money(x.net)}</b></div></div>
 <table><thead><tr><th>البند</th><th>القيمة</th><th>التفاصيل</th></tr></thead><tbody>
 <tr><td>المرتب الأساسي</td><td>${money(x.base)}</td><td>${e.cycle}</td></tr><tr><td>خصم التأخير</td><td>${money(x.lateDed)}</td><td>${x.late} دقيقة</td></tr><tr><td>الخصومات</td><td>${money(x.deduction)}</td><td>حسب الفترة</td></tr><tr><td>الجزاءات</td><td>${money(x.penalties)}</td><td>${adjustments.filter(a=>a.employeeId===e.id&&a.type==="جزاء"&&inRange(a.date,x.r)).map(a=>esc(a.reason||"بدون سبب")).join("، ")||"لا يوجد"}</td></tr><tr><td>الخصومات</td><td>${money(x.deduction)}</td><td>${adjustments.filter(a=>a.employeeId===e.id&&a.type!=="جزاء"&&inRange(a.date,x.r)).map(a=>esc(a.reason||"بدون سبب")).join("، ")||"لا يوجد"}</td></tr><tr><td>السلف</td><td>${money(x.loan)}</td><td>${loans.filter(a=>a.employeeId===e.id&&inRange(a.date,x.r)).map(a=>esc(a.reason||"بدون سبب")).join("، ")||"القسط/الخصم المحدد"}</td></tr><tr><td>الأوفر تايم</td><td>${money(x.ot)}</td><td>ساعات معتمدة</td></tr><tr><th>صافي المستحق</th><th>${money(x.net)}</th><th>بعد كل التسويات</th></tr>
 </tbody></table><p class="muted">تم إعداد هذا الكشف من بيانات نظام المرتبات المتزامنة مع قاعدة البيانات السحابية.</p></div>
 <div style="display:flex;gap:8px;margin-top:10px"><button class="primary" id="printReport">طباعة / حفظ PDF</button><button class="secondary" id="jpgReport">تحميل JPG</button></div>`;
 $("#printReport").onclick=()=>printReport(x);
 $("#jpgReport").onclick=()=>downloadJPG(x);
}
function printReport(x){
 let e=x.e;
 $("#printArea").innerHTML=`<div class="print-sheet"><h1>كشف مرتب موظف</h1><p>${esc(e.name)} — ${esc(e.code)} — ${esc(e.branch)}</p><p>${x.r.start} إلى ${x.r.end} — ${e.cycle}</p><div class="print-summary"><div>الأساسي<b>${money(x.base)}</b></div><div>الأوفر تايم<b>${money(x.ot)}</b></div><div>الخصومات<b>${money(x.lateDed+x.deduction+x.penalties+x.loan)}</b></div><div>الصافي<b>${money(x.net)}</b></div></div><table><tr><th>البند</th><th>القيمة</th></tr><tr><td>المرتب الأساسي</td><td>${money(x.base)}</td></tr><tr><td>خصم التأخير</td><td>${money(x.lateDed)}</td></tr><tr><td>الخصومات</td><td>${money(x.deduction)}</td></tr><tr><td>الجزاءات</td><td>${money(x.penalties)}</td></tr><tr><td>السلف</td><td>${money(x.loan)}</td></tr><tr><td>الأوفر تايم</td><td>${money(x.ot)}</td></tr><tr><th>صافي المستحق</th><th>${money(x.net)}</th></tr></table></div>`;
 window.print();
}
function downloadJPG(x){
 // Canvas is intentionally generated locally so the image can download without a server.
 let c=document.createElement("canvas"),ctx=c.getContext("2d"),W=1100,H=760;c.width=W;c.height=H;
 ctx.fillStyle="#fff";ctx.fillRect(0,0,W,H);ctx.fillStyle="#202735";ctx.textAlign="right";ctx.direction="rtl";
 ctx.font="bold 30px Arial";ctx.fillText("كشف مرتب موظف",W-60,60);
 ctx.font="20px Arial";ctx.fillText(`${x.e.name} — كود ${x.e.code}`,W-60,98);
 ctx.font="16px Arial";ctx.fillStyle="#667085";ctx.fillText(`${x.e.branch} | ${x.e.cycle} | ${x.r.start} إلى ${x.r.end}`,W-60,128);
 ctx.fillStyle="#3155d9";ctx.fillRect(60,155,W-120,3);
 const rows=[["المرتب الأساسي",money(x.base)],["الأوفر تايم",money(x.ot)],["خصم التأخير",money(x.lateDed)],["الخصومات",money(x.deduction)],["الجزاءات",money(x.penalties)],["السلف",money(x.loan)],["صافي المستحق",money(x.net)]];
 let y=205;ctx.font="18px Arial";
 rows.forEach((r,i)=>{ctx.fillStyle=i===rows.length-1?"#eef2ff":"#f7f8fb";ctx.fillRect(60,y-28,W-120,48);ctx.fillStyle="#202735";ctx.fillText(r[0],W-85,y);ctx.textAlign="left";ctx.fillText(r[1],85,y);ctx.textAlign="right";y+=62});
 ctx.font="13px Arial";ctx.fillStyle="#8a93a3";ctx.fillText("نظام المرتبات — كشف صادر من النظام",W-60,H-35);
 let a=c.toDataURL("image/jpeg",.94),link=document.createElement("a");link.href=a;link.download=`كشف-مرتب-${x.e.name}-${x.r.end}.jpg`;link.click();
}
function showPage(page){
 $$(".page").forEach(p=>p.classList.remove("active"));$("#"+page+"Page").classList.add("active");
 $$(".nav").forEach(n=>n.classList.toggle("active",n.dataset.page===page));
 const titles={dashboard:"لوحة المؤشرات",employees:"الموظفين",attendance:"الحضور والانصراف",payroll:"المرتبات",loans:"السلف",adjustments:"الخصومات والجزاءات",overtime:"الأوفر تايم",expenses:"مصروفات الفروع",reports:"الكشوفات والتقارير",settings:"الإعدادات"};
 $("#pageTitle").textContent=titles[page];$("#sidebar").classList.remove("open");
 if(page==="dashboard")renderDashboard();if(page==="expenses")renderExpenses();if(page==="employees")renderEmployees();if(page==="attendance")renderAttendance();if(page==="loans")renderLoans();if(page==="adjustments")renderAdjustments();if(page==="overtime")renderOvertime();if(page==="payroll")renderPayroll();if(page==="reports")renderReport();
}
function openModal(id){$("#"+id).classList.add("show")}
function closeModal(id){$("#"+id).classList.remove("show")}
function prepForms(){
 populateEmployeeSelect("#aEmployee");populateEmployeeSelect("#lEmployee");populateEmployeeSelect("#xEmployee");populateEmployeeSelect("#oEmployee");
 $("#reportEmployee").innerHTML=employees.map(e=>`<option value="${e.id}">${esc(e.name)} — ${e.code}</option>`).join("");
}
function openEmployee(id=null){
 $("#employeeForm").reset();$("#eId").value="";$("#eActive").checked=true;$("#eStart").value=formatTimeArabic(settings.start);$("#eEnd").value=formatTimeArabic(settings.end);$("#eOT").value=settings.ot;
 if(id){let e=emp(id);$("#eId").value=e.id;$("#eName").value=e.name;$("#eCode").value=e.code;$("#eBranch").value=e.branch;$("#eSalary").value=e.salary;$("#eCycle").value=e.cycle;$("#eStart").value=formatTimeArabic(e.start);$("#eEnd").value=formatTimeArabic(e.end);$("#eOT").value=e.ot;$("#eActive").checked=e.active;$("#employeeModalTitle").textContent="تعديل موظف"}else $("#employeeModalTitle").textContent="إضافة موظف";
 openModal("employeeModal");
}
$("#loginForm").onsubmit=e=>{
 e.preventDefault();
 if(loginMode==="admin"){
   if($("#adminPassword").value!=="NOSA406050"){toast("كلمة المرور غير صحيحة");return}
   sessionStorage.setItem("paySession",JSON.stringify({role:"admin"}));$("#loginScreen").classList.add("hidden");$("#adminApp").classList.remove("hidden");showPage("dashboard");
 }else if(loginMode==="branch"){
   const code=$("#branchCode").value.trim(), branch=Object.keys(branchCodes).find(b=>branchCodes[b]&&branchCodes[b]===code);
   if(!branch){toast("كود الفرع غير صحيح");return}
   sessionBranch=branch;sessionStorage.setItem("paySession",JSON.stringify({role:"branch",branch}));$("#loginScreen").classList.add("hidden");$("#branchPortal").classList.remove("hidden");renderBranchPortal();
 }else{
   let e=empByCode($("#loginEmployeeCode").value.trim());if(!e){toast("كود الموظف غير صحيح أو الموظف غير نشط");return}
   sessionEmployee=e;sessionStorage.setItem("paySession",JSON.stringify({role:"employee",employeeId:e.id}));$("#loginScreen").classList.add("hidden");$("#employeePortal").classList.remove("hidden");renderEmployeePortal();
 }
};
$$(".login-tab").forEach(t=>t.onclick=()=>{loginMode=t.dataset.login;$$(".login-tab").forEach(x=>x.classList.remove("active"));t.classList.add("active");$("#employeeCodeWrap").classList.toggle("hidden",loginMode!=="employee");$("#branchCodeWrap").classList.toggle("hidden",loginMode!=="branch");$("#adminPasswordWrap").classList.toggle("hidden",loginMode!=="admin")});
$("#adminLogout").onclick=()=>{sessionStorage.removeItem("paySession");location.reload()};$("#employeeLogout").onclick=()=>{sessionStorage.removeItem("paySession");location.reload()};$("#branchLogout").onclick=()=>{sessionStorage.removeItem("paySession");location.reload()};
$("#menuBtn").onclick=()=>$("#sidebar").classList.toggle("open");
$$(".nav").forEach(n=>n.onclick=()=>showPage(n.dataset.page));$$("[data-go]").forEach(x=>x.onclick=()=>showPage(x.dataset.go));
$("#dashboardRefresh").onclick=()=>{renderDashboard();toast("تم تحديث لوحة المؤشرات")};
$("#recentActivity").onclick=e=>{let d=e.target.closest("[data-del-recent]");if(!d)return;if(confirm("حذف هذه الحركة من سجل الحضور؟")){attendance=attendance.filter(x=>x.id!==d.dataset.delRecent);save();renderDashboard();renderAttendance();toast("تم حذف الحركة")}};
$("#clearRecentActivity").onclick=()=>{let recent=[...attendance].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);if(!recent.length){toast("لا توجد حركات لحذفها");return}if(confirm("حذف آخر 6 حركات الظاهرة في لوحة المؤشرات؟")){let ids=new Set(recent.map(x=>x.id));attendance=attendance.filter(x=>!ids.has(x.id));save();renderDashboard();renderAttendance();toast("تم حذف آخر الحركات")}};
$("#addEmployee").onclick=()=>openEmployee();
$("#employeeSearch").oninput=renderEmployees;$("#employeeBranchFilter").onchange=renderEmployees;$("#employeeCycleFilter").onchange=renderEmployees;
$("#employeesTable").onclick=e=>{let a=e.target.closest("[data-edit-emp]"),d=e.target.closest("[data-del-emp]"),c=e.target.closest("[data-copy-code]");if(c){navigator.clipboard?.writeText(c.dataset.copyCode).then(()=>toast("تم نسخ كود الموظف")).catch(()=>toast("الكود: "+c.dataset.copyCode));return}if(a)openEmployee(a.dataset.editEmp);if(d&&confirm("حذف الموظف؟")){employees=employees.filter(x=>x.id!==d.dataset.delEmp);save();renderEmployees();prepForms();toast("تم حذف الموظف")}};
$("#employeeForm").onsubmit=e=>{e.preventDefault();let id=$("#eId").value||uid("e"),obj={id,name:$("#eName").value.trim(),code:$("#eCode").value.trim(),branch:$("#eBranch").value,salary:Number($("#eSalary").value),cycle:$("#eCycle").value,start:normalizeTime($("#eStart").value)||settings.start,end:normalizeTime($("#eEnd").value)||settings.end,ot:Number($("#eOT").value)||settings.ot,active:$("#eActive").checked};if(employees.some(x=>x.code===obj.code&&x.id!==id)){toast("كود الموظف مستخدم بالفعل");return}let i=employees.findIndex(x=>x.id===id);if(i>=0)employees[i]=obj;else employees.push(obj);save();closeModal("employeeModal");prepForms();renderEmployees();renderDashboard();toast(i>=0?"تم تعديل الموظف":"تمت إضافة الموظف")};
$("#addAttendance").onclick=()=>{prepForms();$("#attendanceForm").reset();$("#aId").value="";$("#aDate").value=today();openModal("attendanceModal")};
$("#attendanceForm").onsubmit=e=>{e.preventDefault();let id=$("#aId").value||uid("a"),obj={id,employeeId:$("#aEmployee").value,date:$("#aDate").value,in:normalizeTime($("#aIn").value),out:normalizeTime($("#aOut").value),note:$("#aNote").value};let i=attendance.findIndex(x=>x.id===id);if(i>=0)attendance[i]=obj;else{let same=attendance.findIndex(x=>x.employeeId===obj.employeeId&&x.date===obj.date);if(same>=0)attendance[same]=obj;else attendance.push(obj)}save();closeModal("attendanceModal");renderAttendance();renderDashboard();toast("تم حفظ وقت الحضور والانصراف")};
$("#attendanceTable").onclick=e=>{let a=e.target.closest("[data-edit-att]"),d=e.target.closest("[data-del-att]");if(a){let x=attendance.find(q=>q.id===a.dataset.editAtt);populateEmployeeSelect("#aEmployee");$("#aId").value=x.id;$("#aEmployee").value=x.employeeId;$("#aDate").value=x.date;$("#aIn").value=x.in?formatTimeArabic(x.in):"";$("#aOut").value=x.out?formatTimeArabic(x.out):"";$("#aNote").value=x.note||"";openModal("attendanceModal")}if(d&&confirm("حذف سجل الحضور؟")){attendance=attendance.filter(x=>x.id!==d.dataset.delAtt);save();renderAttendance();renderDashboard()}};
$("#attDate").value=today();$("#attDate").onchange=renderAttendance;$("#attBranch").onchange=renderAttendance;$("#attStatus").onchange=renderAttendance;
$("#addLoan").onclick=()=>{prepForms();$("#loanForm").reset();$("#lDate").value=today();openModal("loanModal")};
$("#loanForm").onsubmit=e=>{e.preventDefault();loans.push({id:uid("l"),employeeId:$("#lEmployee").value,date:$("#lDate").value,amount:Number($("#lAmount").value),deduct:Number($("#lDeduct").value),reason:$("#lReason").value});save();closeModal("loanModal");renderLoans();renderDashboard();toast("تمت إضافة السلفة وسيسمع الخصم في فترة القبض")};
$("#loansTable").onclick=e=>{let d=e.target.closest("[data-del-loan]");if(d&&confirm("حذف السلفة؟")){loans=loans.filter(x=>x.id!==d.dataset.delLoan);save();renderLoans();renderDashboard()}};
$("#addAdjustment").onclick=()=>{prepForms();$("#adjustmentForm").reset();$("#xDate").value=today();openModal("adjustmentModal")};
$("#adjustmentForm").onsubmit=e=>{e.preventDefault();let reason=$("#xReason").value.trim();if(!reason){toast("اكتب سبب الخصم أو الجزاء أولاً");$("#xReason").focus();return}adjustments.push({id:uid("x"),employeeId:$("#xEmployee").value,date:$("#xDate").value,type:$("#xType").value,amount:Number($("#xAmount").value),reason});save();closeModal("adjustmentModal");renderAdjustments();renderDashboard();toast("تم تسجيل الخصم / الجزاء بالسبب")};
$("#adjustmentsTable").onclick=e=>{let d=e.target.closest("[data-del-adj]");if(d&&confirm("حذف الخصم؟")){adjustments=adjustments.filter(x=>x.id!==d.dataset.delAdj);save();renderAdjustments();renderDashboard()}};
$("#addOvertime").onclick=()=>{prepForms();$("#overtimeForm").reset();$("#oDate").value=today();$("#oRate").value=settings.ot;openModal("overtimeModal")};
$("#overtimeForm").onsubmit=e=>{e.preventDefault();overtime.push({id:uid("o"),employeeId:$("#oEmployee").value,date:$("#oDate").value,hours:Number($("#oHours").value),rate:Number($("#oRate").value),reason:$("#oReason").value});save();closeModal("overtimeModal");renderOvertime();renderDashboard();toast("تم إضافة الأوفر تايم")};
$("#overtimeTable").onclick=e=>{let d=e.target.closest("[data-del-ot]");if(d&&confirm("حذف الأوفر تايم؟")){overtime=overtime.filter(x=>x.id!==d.dataset.delOt);save();renderOvertime();renderDashboard()}};
$("#branchExpenseForm").onsubmit=e=>{e.preventDefault();if(!sessionBranch)return;let amount=Number($("#beAmount").value);if(!(amount>0)){toast("أدخل مبلغ المصروف");return}expenses.push({id:uid("ex"),branch:sessionBranch,date:today(),type:$("#beType").value,amount,reason:$("#beReason").value.trim(),createdAt:Date.now()});save();$("#branchExpenseForm").reset();renderBranchPortal();toast("تم تسجيل المصروف وسماعه في لوحة الإدارة")};
$("#expenseDate").value=today();$("#expenseDate").onchange=renderExpenses;$("#expenseBranchFilter").onchange=renderExpenses;
$("#expensesTable").onclick=e=>{let d=e.target.closest("[data-del-exp]");if(d&&confirm("حذف هذا المصروف؟")){expenses=expenses.filter(x=>x.id!==d.dataset.delExp);save();renderExpenses();renderDashboard();toast("تم حذف المصروف")}};
$("#clearDayExpenses").onclick=()=>{let d=$("#expenseDate").value||today(), b=$("#expenseBranchFilter").value||"all";let count=expenses.filter(x=>x.date===d&&(b==="all"||x.branch===b)).length;if(!count){toast("لا توجد مصروفات للتصفير");return}if(confirm(`سيتم حذف ${count} مصروف من ${b==="all"?"كل الفروع":b} بتاريخ ${fmtDate(d)}. هل أنت متأكد؟`)){expenses=expenses.filter(x=>!(x.date===d&&(b==="all"||x.branch===b)));save();renderExpenses();renderDashboard();toast("تم تصفير المصروفات المحددة")}};
$("#saveBranchCodes").onclick=()=>{let h=$("#branchCodeHadayek").value.trim(),d=$("#branchCodeDawagen").value.trim();if(!h||!d){toast("أدخل كود الفرعين");return}if(h===d){toast("يجب أن يكون كود كل فرع مختلفاً");return}branchCodes={الحدايق:h,الدواجن:d};save();toast("تم حفظ أكواد دخول الفروع")};
$("#payrollEnd").value=today();$("#payrollCycle").onchange=renderPayroll;$("#payrollEnd").onchange=renderPayroll;$("#calculatePayroll").onclick=()=>{renderPayroll();toast("تم حساب المرتبات حسب فترة القبض")};
$("#payrollTable").onclick=e=>{let b=e.target.closest("[data-pay-report]");if(b){showPage("reports");$("#reportEmployee").value=b.dataset.payReport;$("#reportEnd").value=$("#payrollEnd").value;$("#reportCycle").value=$("#payrollCycle").value;renderReport()}};
$("#reportEnd").value=today();$("#reportEmployee").onchange=renderReport;$("#reportEnd").onchange=renderReport;$("#reportCycle").onchange=renderReport;$("#generateReport").onclick=renderReport;$("#openReport").onclick=()=>{showPage("reports");renderReport()};
$("#defaultStart").value=formatTimeArabic(settings.start);$("#defaultEnd").value=formatTimeArabic(settings.end);$("#branchCodeHadayek").value=branchCodes.الحدايق||"";$("#branchCodeDawagen").value=branchCodes.الدواجن||"";$("#defaultOT").value=settings.ot;$("#saveSettings").onclick=()=>{settings={start:normalizeTime($("#defaultStart").value)||settings.start,end:normalizeTime($("#defaultEnd").value)||settings.end,ot:Number($("#defaultOT").value)||0};save();toast("تم حفظ إعدادات الدوام");employees.forEach(e=>{if(!e.start)e.start=settings.start;if(!e.end)e.end=settings.end;if(!e.ot)e.ot=settings.ot});save()};
$$("[data-close]").forEach(b=>b.onclick=()=>closeModal(b.dataset.close));$$(".modal-bg").forEach(m=>m.onclick=e=>{if(e.target===m)m.classList.remove("show")});
function renderEmployeePortal(){
 let e=sessionEmployee, end=today(),x=calcPayroll(e,end,e.cycle),todayA=attendance.filter(a=>a.employeeId===e.id).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
 let todayRecord=attendance.find(a=>a.employeeId===e.id&&a.date===end), late=todayRecord?.in?lateInfo(e,todayRecord.in):{minutes:0,deduction:0};
 $("#empName").textContent=e.name;$("#empWelcome").textContent=e.name;$("#empBranch").textContent=`${e.branch} — مواعيد العمل ${formatTimeArabic(e.start)} إلى ${formatTimeArabic(e.end)}`;$("#empCode").textContent="";$("#empPayCycle").textContent=e.cycle;$("#empSalary").textContent=money(e.salary);$("#empLoans").textContent=money(x.loan);$("#empNet").textContent=money(x.net);
 $("#empAttendanceList").innerHTML=todayA.length?todayA.map(a=>{let li=a.in?lateInfo(e,a.in):{minutes:0,deduction:0};return `<div class="emp-row"><b>${fmtDate(a.date)}</b><span>دخول: ${a.in?formatTimeArabic(a.in):"—"} | خروج: ${a.out?formatTimeArabic(a.out):"—"}</span>${li.minutes?`<strong class="late-note">تأخير ${li.minutes} دقيقة — خصم ${money(li.deduction)}</strong>`:""}</div>`}).join(""):`<div class="muted">لا توجد سجلات.</div>`;
 let periodAdj=adjustments.filter(a=>a.employeeId===e.id&&inRange(a.date,x.r));let reasonRows=periodAdj.map(a=>`<div class="reason-item"><span>${esc(a.type)} — ${esc(a.reason||"بدون سبب")}</span><span>${money(a.amount)}</span></div>`).join("");
 $("#empPayrollDetails").innerHTML=`${late.minutes?`<div class="employee-late-alert"><b>⚠️ تأخير اليوم: ${late.minutes} دقيقة</b><span>الخصم المحسوب: ${money(late.deduction)}</span></div>`:""}<div class="emp-row"><span>الأساسي</span><b>${money(x.base)}</b></div><div class="emp-row"><span>إجمالي التأخير</span><b>${x.late} دقيقة — ${money(x.lateDed)}</b></div><div class="emp-row"><span>الخصومات والجزاءات</span><b>${money(x.deduction+x.penalties)}</b></div>${reasonRows?`<div class="reason-box"><b>تفاصيل أسباب الخصومات والجزاءات</b>${reasonRows}</div>`:""}<div class="emp-row"><span>السلف</span><b>${money(x.loan)}</b></div><div class="emp-row"><span>الأوفر تايم</span><b>${money(x.ot)}</b></div><div class="emp-row"><span>الصافي</span><b>${money(x.net)}</b></div>`;
}

$("#punchIn").onclick=()=>employeePunch("in");$("#punchOut").onclick=()=>employeePunch("out");
function employeePunch(type){
 let e=sessionEmployee,d=today(),a=attendance.find(x=>x.employeeId===e.id&&x.date===d);
 if(!a){a={id:uid("a"),employeeId:e.id,date:d,in:"",out:""};attendance.push(a)}
 let now=new Date().toTimeString().slice(0,5);
 if(type==="in"){
   if(a.in){toast("تم تسجيل الحضور بالفعل اليوم");return}
   a.in=now; save(); renderEmployeePortal();
   let li=lateInfo(e,now);
   if(li.minutes){toast(`⚠️ اتأخرت ${li.minutes} دقيقة — الخصم ${money(li.deduction)}`)}else toast("تم تسجيل الحضور في الموعد ✓");
 }else{
   if(a.out){toast("تم تسجيل الانصراف بالفعل اليوم");return}
   a.out=now; save(); renderEmployeePortal();
   let scheduled=minutes(e.end||settings.end),actual=minutes(now),extra=actual>scheduled?actual-scheduled:0;
   toast(extra?`تم تسجيل الانصراف — وقت إضافي ${extra} دقيقة`:"تم تسجيل الانصراف بنجاح");
 }
 renderDashboard();
}

function clock(){let n=new Date();$("#liveClock").textContent=n.toLocaleTimeString("ar-EG",{hour12:false});$("#liveDate").textContent=n.toLocaleDateString("ar-EG",{weekday:"long",year:"numeric",month:"long",day:"numeric"});$("#todayLabel").textContent=n.toLocaleDateString("ar-EG",{day:"2-digit",month:"long",year:"numeric"})}
setInterval(clock,1000);clock();prepForms();$("#branchExpenseForm").onsubmit=e=>{e.preventDefault();if(!sessionBranch)return;let amount=Number($("#beAmount").value);if(!(amount>0)){toast("أدخل مبلغ المصروف");return}expenses.push({id:uid("ex"),branch:sessionBranch,date:today(),type:$("#beType").value,amount,reason:$("#beReason").value.trim(),createdAt:Date.now()});save();$("#branchExpenseForm").reset();renderBranchPortal();toast("تم تسجيل المصروف وسماعه في لوحة الإدارة")};
$("#expenseDate").value=today();$("#expenseDate").onchange=renderExpenses;$("#expenseBranchFilter").onchange=renderExpenses;
$("#expensesTable").onclick=e=>{let d=e.target.closest("[data-del-exp]");if(d&&confirm("حذف هذا المصروف؟")){expenses=expenses.filter(x=>x.id!==d.dataset.delExp);save();renderExpenses();renderDashboard();toast("تم حذف المصروف")}};
$("#clearDayExpenses").onclick=()=>{let d=$("#expenseDate").value||today(), b=$("#expenseBranchFilter").value||"all";let count=expenses.filter(x=>x.date===d&&(b==="all"||x.branch===b)).length;if(!count){toast("لا توجد مصروفات للتصفير");return}if(confirm(`سيتم حذف ${count} مصروف من ${b==="all"?"كل الفروع":b} بتاريخ ${fmtDate(d)}. هل أنت متأكد؟`)){expenses=expenses.filter(x=>!(x.date===d&&(b==="all"||x.branch===b)));save();renderExpenses();renderDashboard();toast("تم تصفير المصروفات المحددة")}};
$("#saveBranchCodes").onclick=()=>{let h=$("#branchCodeHadayek").value.trim(),d=$("#branchCodeDawagen").value.trim();if(!h||!d){toast("أدخل كود الفرعين");return}if(h===d){toast("يجب أن يكون كود كل فرع مختلفاً");return}branchCodes={الحدايق:h,الدواجن:d};save();toast("تم حفظ أكواد دخول الفروع")};
$("#payrollEnd").value=today();$("#reportEnd").value=today();
function restoreSession(){
  if(!savedSession) return;
  if(savedSession.role==="admin"){
    $("#loginScreen").classList.add("hidden");
    $("#adminApp").classList.remove("hidden");
    showPage("dashboard");
  }else if(savedSession.role==="branch"){
    if(savedSession.branch && branchCodes[savedSession.branch]){
      sessionBranch=savedSession.branch;$("#loginScreen").classList.add("hidden");$("#branchPortal").classList.remove("hidden");renderBranchPortal();
    }else sessionStorage.removeItem("paySession");
  }else if(savedSession.role==="employee"){
    const e=emp(savedSession.employeeId);
    if(e && e.active){
      sessionEmployee=e;
      $("#loginScreen").classList.add("hidden");
      $("#employeePortal").classList.remove("hidden");
      renderEmployeePortal();
    }else sessionStorage.removeItem("paySession");
  }
}
initCloud();
renderDashboard();
restoreSession();
