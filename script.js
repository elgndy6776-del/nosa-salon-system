// --- إعدادات الاتصال بـ Firebase Realtime Database ---
const firebaseConfig = {
    databaseURL: "https://nosa-salon-db-default-rtdb.europe-west1.firebasedatabase.app/"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let cloudData = {
    employees: [],
    attendance: [],
    advances: [],
    deductions: [],
    overtime: [], 
    salaries_paid: [],
    expenses: [],
    branch_expense_codes: { 'الدواجن': '1003', 'حدائق حلوان': '1005' },
    official_holidays: [] 
};

database.ref('/').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        cloudData.employees = data.employees || [];
        cloudData.attendance = data.attendance || [];
        cloudData.advances = data.advances || [];
        cloudData.deductions = data.deductions || [];
        cloudData.overtime = data.overtime || []; 
        cloudData.salaries_paid = data.salaries_paid || [];
        cloudData.expenses = data.expenses || [];
        cloudData.official_holidays = data.official_holidays || [];
        if (data.branch_expense_codes) {
            cloudData.branch_expense_codes = data.branch_expense_codes;
        }
    } else {
        initializeDefaultData();
    }
    render(); 
});

function initializeDefaultData() {
    const defaultEmp = [
        { id: 1, code: '101', name: 'سارة محمد', branch: 'الدواجن', salary: 5000, workStart: '12:00', workStartPeriod: 'صباحاً', workEnd: '09:00', workEndPeriod: 'مساءً', payCycle: 'monthly', active: true }
    ];
    database.ref('employees').set(defaultEmp);
    database.ref('branch_expense_codes').set({ 'الدواجن': '1003', 'حدائق حلوان': '1005' });
}

const DB = {
    get(key) { return cloudData[key] || []; },
    set(key, data) { 
        database.ref(key).set(data).catch((error) => {
            alert('خطأ في حفظ البيانات على السحابة: ' + error.message);
        });
    }
};

let currentView = sessionStorage.getItem('nosa_currentView') || 'login_portal';
let adminTab = sessionStorage.getItem('nosa_adminTab') || 'dashboard';
let activeEmployee = JSON.parse(sessionStorage.getItem('nosa_activeEmployee')) || null;
let selectedBranch = 'الدواجن'; 

function saveSession() {
    try {
        sessionStorage.setItem('nosa_currentView', currentView);
        sessionStorage.setItem('nosa_adminTab', adminTab);
        sessionStorage.setItem('nosa_activeEmployee', JSON.stringify(activeEmployee));
    } catch (e) {}
}

function render() {
    saveSession();
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = '';

    if (currentView === 'login_portal') {
        app.innerHTML = renderLoginPortal();
    } else if (currentView === 'admin_dash') {
        app.innerHTML = renderAdminDashboard();
    } else if (currentView === 'employee_portal') {
        if (!activeEmployee) {
            currentView = 'login_portal';
            render();
            return;
        }
        app.innerHTML = renderEmployeePortal();
    } else if (currentView === 'branch_expenses_portal') {
        app.innerHTML = renderBranchExpensesPortal();
    } else {
        currentView = 'login_portal';
        render();
    }
}

// --- 1. Login Portal ---
function renderLoginPortal() {
    return `
        <div class="flex-1 flex items-center justify-center p-4">
            <div class="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md text-center border space-y-6">
                <div>
                    <h1 class="text-3xl font-bold text-pink-600">صالون نوسا</h1>
                    <p class="text-gray-500 text-sm mt-2">تسجيل الدخول (كود البصمة أو باسورد الأدمن)</p>
                </div>
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs text-gray-500 mb-2 text-right">أدخل رقم البصمة أو باسورد الأدمن:</label>
                        <input type="password" id="universalInput" placeholder="أدخل الكود هنا..." class="w-full px-4 py-3 border rounded-2xl text-center focus:ring-2 focus:ring-pink-500 outline-none text-lg">
                    </div>
                    <button onclick="handleUniversalLogin()" class="w-full bg-pink-600 text-white py-3 rounded-2xl font-semibold hover:bg-pink-700 transition shadow-md">تسجيل الدخول</button>
                </div>
                <div class="border-t pt-4 space-y-2">
                    <button onclick="currentView='branch_expenses_portal'; render();" class="w-full bg-amber-600 text-white py-2.5 rounded-2xl text-sm font-semibold hover:bg-amber-700 transition">بوابة تسجيل مصاريف الفروع</button>
                </div>
            </div>
        </div>
    `;
}

function handleUniversalLogin() {
    const inputEl = document.getElementById('universalInput');
    if (!inputEl) return;
    const val = inputEl.value.trim();
    if (!val) return alert('الرجاء إدخال الكود أو كلمة المرور!');

    if (val === 'NOSA406050') {
        currentView = 'admin_dash';
        adminTab = 'dashboard';
        render();
        return;
    }

    const employees = DB.get('employees');
    const emp = employees.find(e => e.code === val && e.active);
    if (emp) {
        activeEmployee = emp;
        currentView = 'employee_portal';
        render();
        return;
    }

    alert('الكود أو كلمة المرور غير صحيحة!');
}

// --- 2. Branch Expenses Portal ---
function renderBranchExpensesPortal() {
    return `
        <header class="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
            <h2 class="text-lg font-bold text-amber-600">بوابة تسجيل مصاريف الفروع</h2>
            <button onclick="currentView='login_portal'; render();" class="text-gray-500 text-sm hover:underline">العودة لبوابة الدخول</button>
        </header>
        <div class="flex-1 flex items-center justify-center p-4">
            <div class="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border space-y-4">
                <h3 class="text-xl font-bold text-center">تسجيل مصروف فرع يومي</h3>
                <div>
                    <label class="block text-xs text-gray-500 mb-1 text-right">اختر الفرع:</label>
                    <select id="expBranchSelect" onchange="selectedBranch = this.value;" class="w-full px-4 py-3 border rounded-2xl bg-white">
                        <option value="الدواجن" ${selectedBranch==='الدواجن'?'selected':''}>فرع الدواجن</option>
                        <option value="حدائق حلوان" ${selectedBranch==='حدائق حلوان'?'selected':''}>فرع حدائق حلوان</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs text-gray-500 mb-1 text-right">كود المصروف المخصص للفرع:</label>
                    <input type="password" id="expCodeInput" placeholder="أدخل كود الفرع السري..." class="w-full px-4 py-3 border rounded-2xl text-center font-bold text-pink-600">
                </div>
                <div>
                    <label class="block text-xs text-gray-500 mb-1 text-right">خدمة / بيان المصروف (مثال: بوفيه، نظافة، كهرباء):</label>
                    <input type="text" id="expReason" placeholder="اكتب اسم الخدمة أو البند..." class="w-full px-4 py-3 border rounded-2xl text-center">
                </div>
                <div>
                    <label class="block text-xs text-gray-500 mb-1 text-right">المبلغ (ج.م):</label>
                    <input type="number" id="expAmount" placeholder="مثال: 150" class="w-full px-4 py-3 border rounded-2xl text-center">
                </div>
                <button onclick="saveBranchExpense()" class="w-full bg-amber-600 text-white py-3 rounded-2xl font-semibold hover:bg-amber-700 transition">تسجيل المصروف وتوصيله للإدارة</button>
            </div>
        </div>
    `;
}

function saveBranchExpense() {
    const branchEl = document.getElementById('expBranchSelect');
    const codeEl = document.getElementById('expCodeInput');
    const reasonEl = document.getElementById('expReason');
    const amountEl = document.getElementById('expAmount');
    if (!branchEl || !codeEl || !reasonEl || !amountEl) return;

    const branch = branchEl.value;
    const enteredCode = codeEl.value.trim();
    const defaultCodes = { 'الدواجن': '1003', 'حدائق حلوان': '1005' };
    const branchCodes = (cloudData && cloudData.branch_expense_codes) ? cloudData.branch_expense_codes : defaultCodes;
    const correctCode = branchCodes[branch] || defaultCodes[branch];

    if (enteredCode !== correctCode) return alert('كود المصروف غير صحيح لهذا الفرع!');

    const reason = reasonEl.value.trim();
    const amount = parseFloat(amountEl.value);
    if (!reason || !amount || isNaN(amount)) return alert('الرجاء إدخال اسم الخدمة والمبلغ بشكل صحيح.');

    const expenses = DB.get('expenses');
    expenses.push({ id: Date.now(), branch, code: enteredCode, reason, amount, date: new Date().toLocaleDateString('ar-EG') });
    DB.set('expenses', expenses);
    alert('تم تسجيل مصروف الفرع بنجاح.');
    reasonEl.value = ''; amountEl.value = ''; codeEl.value = '';
}

// --- 3. Admin Dashboard ---
function renderAdminDashboard() {
    const advances = DB.get('advances');
    return `
        <div class="flex flex-col md:flex-row flex-1">
            <aside class="w-full md:w-72 bg-white border-l p-6 flex flex-col justify-between shadow-sm">
                <div class="space-y-6">
                    <div>
                        <h2 class="text-xl font-bold text-pink-600">صالون نوسا</h2>
                        <p class="text-xs text-gray-400 mt-1">لوحة التحكم الرئيسية</p>
                    </div>
                    <nav class="space-y-2">
                        <button onclick="adminTab='dashboard'; render();" class="w-full text-right px-4 py-2.5 rounded-xl font-semibold transition ${adminTab==='dashboard'?'bg-pink-50 text-pink-600':'text-gray-600 hover:bg-gray-50'}">لوحة المؤشرات والحسابات</button>
                        <button onclick="adminTab='branch_codes_config'; render();" class="w-full text-right px-4 py-2.5 rounded-xl font-semibold transition ${adminTab==='branch_codes_config'?'bg-pink-50 text-pink-600':'text-gray-600 hover:bg-gray-50'}">تعديل أكواد مصاريف الفروع</button>
                        <button onclick="adminTab='employees'; render();" class="w-full text-right px-4 py-2.5 rounded-xl font-semibold transition ${adminTab==='employees'?'bg-pink-50 text-pink-600':'text-gray-600 hover:bg-gray-50'}">إضافة موظفة جديدة</button>
                        <button onclick="adminTab='salaries'; render();" class="w-full text-right px-4 py-2.5 rounded-xl font-semibold transition ${adminTab==='salaries'?'bg-pink-50 text-pink-600':'text-gray-600 hover:bg-gray-50'}">إدارة المرتبات الأساسية والمواعيد</button>
                        <button onclick="adminTab='deductions'; render();" class="w-full text-right px-4 py-2.5 rounded-xl font-semibold transition ${adminTab==='deductions'?'bg-pink-50 text-pink-600':'text-gray-600 hover:bg-gray-50'}">إضافة الخصومات</button>
                        <button onclick="adminTab='overtime'; render();" class="w-full text-right px-4 py-2.5 rounded-xl font-semibold transition ${adminTab==='overtime'?'bg-pink-50 text-pink-600':'text-gray-600 hover:bg-gray-50'}">إضافة وإدارة الأوفر تايم</button>
                        <button onclick="adminTab='advances'; render();" class="w-full text-right px-4 py-2.5 rounded-xl font-semibold transition ${adminTab==='advances'?'bg-pink-50 text-pink-600':'text-gray-600 hover:bg-gray-50'}">إدارة وإضافة السلف (${advances.length})</button>
                        <button onclick="adminTab='inquiry'; render();" class="w-full text-right px-4 py-2.5 rounded-xl font-semibold transition ${adminTab==='inquiry'?'bg-pink-50 text-pink-600':'text-gray-600 hover:bg-gray-50'}">قائمة الاستعلام والرواتب والطباعة</button>
                        <hr class="my-2">
                        <button onclick="adminTab='report_doujan'; render();" class="w-full text-right px-4 py-2.5 rounded-xl font-semibold transition ${adminTab==='report_doujan'?'bg-pink-50 text-pink-600':'text-gray-600 hover:bg-gray-50'}">فرع الدواجن (حضور وإجازات)</button>
                        <button onclick="adminTab='report_hadayek'; render();" class="w-full text-right px-4 py-2.5 rounded-xl font-semibold transition ${adminTab==='report_hadayek'?'bg-pink-50 text-pink-600':'text-gray-600 hover:bg-gray-50'}">فرع حدائق حلوان (حضور وإجازات)</button>
                    </nav>
                </div>
                <button onclick="currentView='login_portal'; sessionStorage.clear(); render();" class="mt-6 w-full bg-gray-100 text-red-600 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition text-sm">تسجيل خروج الأدمن</button>
            </aside>

            <main class="flex-1 p-8 overflow-y-auto">
                ${adminTab === 'dashboard' ? renderAdminAnalyticsDashboard() : ''}
                ${adminTab === 'branch_codes_config' ? renderBranchCodesConfigTab() : ''}
                ${adminTab === 'employees' ? renderAdminEmployeesTab() : ''}
                ${adminTab === 'salaries' ? renderAdminSalariesTab() : ''}
                ${adminTab === 'deductions' ? renderAdminDeductionsTab() : ''}
                ${adminTab === 'overtime' ? renderAdminOvertimeTab() : ''}
                ${adminTab === 'advances' ? renderAdminAdvancesTab() : ''}
                ${adminTab === 'inquiry' ? renderAdminInquiryTab() : ''}
                ${adminTab === 'report_doujan' ? renderUnifiedBranchControlPanel('الدواجن') : ''}
                ${adminTab === 'report_hadayek' ? renderUnifiedBranchControlPanel('حدائق حلوان') : ''}
            </main>
        </div>
    `;
}

function renderAdminAnalyticsDashboard() {
    const employees = DB.get('employees');
    const advances = DB.get('advances').filter(a => a.status === 'موافق');
    const deductions = DB.get('deductions');
    const overtime = DB.get('overtime');
    const expenses = DB.get('expenses');

    const totalSalaries = employees.reduce((s, e) => s + e.salary, 0);
    const totalAdvances = advances.reduce((s, a) => s + a.amount, 0);
    const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
    const totalOvertime = overtime.reduce((s, o) => s + o.amount, 0);
    const expDoujan = expenses.filter(x => x.branch === 'الدواجن').reduce((s, x) => s + x.amount, 0);
    const expHadayek = expenses.filter(x => x.branch === 'حدائق حلوان').reduce((s, x) => s + x.amount, 0);

    return `
        <div class="space-y-6 max-w-5xl">
            <h3 class="text-2xl font-bold text-gray-800">لوحة المؤشرات والحسابات الشاملة</h3>
            <div class="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div class="bg-white p-5 rounded-2xl shadow-sm border"><p class="text-gray-400 text-xs">إجمالي المرتبات الأساسية</p><h3 class="text-xl font-bold mt-1 text-pink-600">${totalSalaries} ج.م</h3></div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border"><p class="text-gray-400 text-xs">إجمالي السلف المعتمدة</p><h3 class="text-xl font-bold mt-1 text-amber-600">${totalAdvances} ج.م</h3></div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border"><p class="text-gray-400 text-xs">إجمالي الخصومات</p><h3 class="text-xl font-bold mt-1 text-red-600">${totalDeductions} ج.م</h3></div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border"><p class="text-gray-400 text-xs">إجمالي الأوفر تايم</p><h3 class="text-xl font-bold mt-1 text-green-600">${totalOvertime} ج.م</h3></div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border"><p class="text-gray-400 text-xs">مصاريف الدواجن</p><h3 class="text-xl font-bold mt-1 text-blue-600">${expDoujan} ج.م</h3></div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border"><p class="text-gray-400 text-xs">مصاريف حدائق حلوان</p><h3 class="text-xl font-bold mt-1 text-purple-600">${expHadayek} ج.م</h3></div>
            </div>

            <!-- بند الاستعلام السريع بكود الموظف في الصفحة الرئيسية للأدمن -->
            <div class="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
                <h4 class="font-bold text-lg text-pink-600">استعلام سريع عن مستحقات موظفة بكود البصمة</h4>
                <div class="flex gap-2">
                    <select id="quickInquiryEmpCode" class="flex-1 px-4 py-3 border rounded-xl bg-white text-sm">
                        <option value="">-- اختر الموظفة أو اكتب الكود --</option>
                        ${employees.map(e => `<option value="${e.code}">${e.name} (كود: ${e.code} - أساسي: ${e.salary} ج.م)</option>`).join('')}
                    </select>
                    <button onclick="runQuickInquiry()" class="bg-pink-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-pink-700 transition">استعلام</button>
                </div>
                <div id="quickInquiryResult" class="mt-4"></div>
            </div>

            <div class="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
                <h4 class="font-bold text-lg text-gray-800">سجل المصروفات المسجلة من الفروع</h4>
                <div class="divide-y overflow-hidden max-h-80 overflow-y-auto">
                    ${expenses.map(ex => `
                        <div class="py-3 flex justify-between items-center text-sm">
                            <div>
                                <span class="font-bold text-gray-800">${ex.branch}</span> - <span>${ex.reason}</span>
                                <span class="text-xs text-gray-400 block">${ex.date}</span>
                            </div>
                            <span class="font-bold text-amber-600">${ex.amount} ج.م</span>
                        </div>
                    `).join('') || '<p class="text-gray-400 text-sm">لا توجد مصروفات مسجلة حتى الآن</p>'}
                </div>
            </div>
        </div>
    `;
}

function runQuickInquiry() {
    const selectEl = document.getElementById('quickInquiryEmpCode');
    const resultDiv = document.getElementById('quickInquiryResult');
    if (!selectEl || !resultDiv) return;

    const code = selectEl.value.trim();
    if (!code) {
        resultDiv.innerHTML = '<p class="text-red-500 text-sm">الرجاء اختيار الموظفة أولاً!</p>';
        return;
    }

    const employees = DB.get('employees');
    const emp = employees.find(e => e.code === code);
    if (!emp) {
        resultDiv.innerHTML = '<p class="text-red-500 text-sm">لم يتم العثور على موظفة بهذا الكود.</p>';
        return;
    }

    const attendance = DB.get('attendance').filter(a => a.code === emp.code);
    const uniqueDaysPresent = [...new Set(attendance.map(a => a.date))].length;

    const salary = emp.salary || 0;
    let cycleDaysDivisor = 30;
    let cycleLabelName = 'شهري';
    if (emp.payCycle === 'weekly') {
        cycleDaysDivisor = 7;
        cycleLabelName = 'أسبوعي';
    } else if (emp.payCycle === 'biweekly') {
        cycleDaysDivisor = 15;
        cycleLabelName = 'كل 15 يوم';
    }

    const cycleBaseRate = Math.round((salary / 30 * cycleDaysDivisor) * 100) / 100;
    const earnedByAttendance = Math.round((salary / 30) * uniqueDaysPresent * 100) / 100;

    const advances = DB.get('advances').filter(a => a.code === emp.code && a.status === 'موافق');
    const totalAdvances = advances.reduce((s, a) => s + a.amount, 0);

    const netAfterAdvances = Math.round((earnedByAttendance - totalAdvances) * 100) / 100;

    resultDiv.innerHTML = `
        <div class="bg-pink-50 border border-pink-200 p-5 rounded-2xl space-y-3 text-sm">
            <div class="flex justify-between items-center border-b pb-2">
                <span class="font-bold text-gray-800">اسم الموظفة: <span class="text-pink-600">${emp.name}</span> (${cycleLabelName})</span>
                <span class="text-gray-500 text-xs">المرتب الأساسي بالشهر: <strong>${salary} ج.م</strong></span>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div class="bg-white p-3 rounded-xl border">
                    <span class="text-gray-400 text-xs block">عدد أيام الحضور</span>
                    <strong class="text-blue-600 text-lg">${uniqueDaysPresent} يوم</strong>
                </div>
                <div class="bg-white p-3 rounded-xl border">
                    <span class="text-gray-400 text-xs block">مستحق الفترة (${cycleLabelName})</span>
                    <strong class="text-gray-700 text-lg">${cycleBaseRate} ج.م</strong>
                </div>
                <div class="bg-white p-3 rounded-xl border">
                    <span class="text-gray-400 text-xs block">القبض حسب الحضور</span>
                    <strong class="text-green-600 text-lg">${earnedByAttendance} ج.م</strong>
                </div>
                <div class="bg-white p-3 rounded-xl border">
                    <span class="text-gray-400 text-xs block">السلف المسحوبة</span>
                    <strong class="text-red-600 text-lg">-${totalAdvances} ج.م</strong>
                </div>
            </div>
            <div class="bg-white p-3 rounded-xl border flex justify-between items-center">
                <span class="font-bold text-gray-700">المستحق النهائي (حسب الحضور الفعلي ونظام القبض):</span>
                <strong class="text-pink-600 text-xl">${netAfterAdvances} ج.م</strong>
            </div>
        </div>
    `;
}

function renderBranchCodesConfigTab() {
    const branchCodes = cloudData.branch_expense_codes || {};
    return `
        <div class="space-y-6 max-w-3xl">
            <h3 class="text-xl font-bold">تعديل وتخصيص كود المصاريف لكل فرع</h3>
            <div class="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
                <div>
                    <label class="block text-xs text-gray-500 mb-1">كود فرع الدواجن:</label>
                    <input type="text" id="codeDoujan" value="${branchCodes['الدواجن'] || '1003'}" class="w-full px-4 py-2.5 border rounded-xl">
                </div>
                <div>
                    <label class="block text-xs text-gray-500 mb-1">كود فرع حدائق حلوان:</label>
                    <input type="text" id="codeHadayek" value="${branchCodes['حدائق حلوان'] || '1005'}" class="w-full px-4 py-2.5 border rounded-xl">
                </div>
                <button onclick="saveBranchCodesConfig()" class="bg-pink-600 text-white px-6 py-2.5 rounded-xl font-semibold">حفظ التعديلات</button>
            </div>
        </div>
    `;
}

function saveBranchCodesConfig() {
    const dEl = document.getElementById('codeDoujan');
    const hEl = document.getElementById('codeHadayek');
    if (!dEl || !hEl) return;
    const codeDoujan = dEl.value.trim();
    const codeHadayek = hEl.value.trim();
    if (!codeDoujan || !codeHadayek) return alert('الرجاء إدخال الأكواد للفرعين.');

    database.ref('branch_expense_codes').set({ 'الدواجن': codeDoujan, 'حدائق حلوان': codeHadayek }).then(() => {
        alert('تم تحديث أكواد مصاريف الفروع بنجاح.');
    });
}

function renderAdminEmployeesTab() {
    const employees = DB.get('employees');
    return `
        <div class="space-y-6 max-w-3xl">
            <h3 class="text-xl font-bold">إضافة موظفة جديدة مع تحديد مواعيد (صباحاً / مساءً)</h3>
            <div class="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" id="empName" placeholder="اسم الموظفة" class="px-4 py-2.5 border rounded-xl">
                    <input type="text" id="empCode" placeholder="كود الموظفة (رقم البصمة)" class="px-4 py-2.5 border rounded-xl">
                    <select id="empBranch" class="px-4 py-2.5 border rounded-xl bg-white">
                        <option value="الدواجن">فرع الدواجن</option>
                        <option value="حدائق حلوان">فرع حدائق حلوان</option>
                    </select>
                    <input type="number" id="empSalary" placeholder="المرتب الأساسي" class="px-4 py-2.5 border rounded-xl">
                    
                    <div>
                        <label class="block text-xs text-gray-500 mb-1">موعد الحضور:</label>
                        <div class="flex gap-2">
                            <input type="time" id="empWorkStart" value="12:00" class="flex-1 px-3 py-2 border rounded-xl bg-white">
                            <select id="empStartPeriod" class="px-3 py-2 border rounded-xl bg-white">
                                <option value="صباحاً">صباحاً</option>
                                <option value="مساءً" selected>مساءً</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs text-gray-500 mb-1">موعد الانصراف:</label>
                        <div class="flex gap-2">
                            <input type="time" id="empWorkEnd" value="09:00" class="flex-1 px-3 py-2 border rounded-xl bg-white">
                            <select id="empEndPeriod" class="px-3 py-2 border rounded-xl bg-white">
                                <option value="صباحاً">صباحاً</option>
                                <option value="مساءً" selected>مساءً</option>
                            </select>
                        </div>
                    </div>

                    <div class="md:col-span-2">
                        <label class="block text-xs text-gray-500 mb-1">نظام القبض:</label>
                        <select id="empPayCycle" class="w-full px-4 py-2.5 border rounded-xl bg-white">
                            <option value="weekly">كل أسبوع</option>
                            <option value="biweekly" selected>كل 15 يوم</option>
                            <option value="monthly">كل شهر</option>
                        </select>
                    </div>
                </div>
                <button onclick="saveNewEmployee()" class="bg-pink-600 text-white px-6 py-2.5 rounded-xl font-semibold">حفظ الموظفة</button>
            </div>

            <h4 class="text-lg font-bold mt-6">قائمة الموظفات</h4>
            <div class="bg-white rounded-2xl shadow-sm border overflow-hidden divide-y">
                ${employees.map(e => `
                    <div class="p-4 flex justify-between items-center">
                        <div>
                            <p class="font-bold">${e.name} <span class="text-xs text-pink-600">(${e.branch})</span></p>
                            <p class="text-xs text-gray-500">الكود: ${e.code} | المرتب: ${e.salary} ج.م | القبض: ${e.payCycle==='weekly'?'أسبوعي':e.payCycle==='biweekly'?'كل 15 يوم':'شهري'}</p>
                        </div>
                        <button onclick="deleteRecord('employees', ${e.id})" class="text-red-500 text-xs hover:underline">حذف</button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function saveNewEmployee() {
    const nameEl = document.getElementById('empName');
    const codeEl = document.getElementById('empCode');
    const branchEl = document.getElementById('empBranch');
    const salaryEl = document.getElementById('empSalary');
    const startEl = document.getElementById('empWorkStart');
    const startPerEl = document.getElementById('empStartPeriod');
    const endEl = document.getElementById('empWorkEnd');
    const endPerEl = document.getElementById('empEndPeriod');
    const cycleEl = document.getElementById('empPayCycle');

    if (!nameEl || !codeEl || !branchEl || !salaryEl) return;
    const name = nameEl.value.trim();
    const code = codeEl.value.trim();
    const branch = branchEl.value;
    const salary = parseFloat(salaryEl.value);
    const workStart = startEl ? startEl.value : '12:00';
    const workStartPeriod = startPerEl ? startPerEl.value : 'صباحاً';
    const workEnd = endEl ? endEl.value : '09:00';
    const workEndPeriod = endPerEl ? endPerEl.value : 'مساءً';
    const payCycle = cycleEl ? cycleEl.value : 'biweekly';

    if (!name || !code || isNaN(salary)) return alert('الرجاء إكمال بيانات الموظفة بشكل صحيح.');
    
    const employees = DB.get('employees');
    employees.push({ id: Date.now(), name, code, branch, salary, workStart, workStartPeriod, workEnd, workEndPeriod, payCycle, active: true });
    DB.set('employees', employees);
    alert('تمت إضافة الموظفة ومواعيد عملها بنجاح.');
}

function renderAdminSalariesTab() {
    const employees = DB.get('employees');
    return `
        <div class="space-y-6 max-w-3xl">
            <h3 class="text-xl font-bold">إدارة وتعديل المرتبات والمواعيد ونظام القبض</h3>
            <div class="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
                ${employees.map(e => `
                    <div class="p-4 bg-gray-50 rounded-xl space-y-3">
                        <div class="flex justify-between items-center">
                            <p class="font-bold">${e.name} <span class="text-xs text-gray-500">(${e.branch} - كود: ${e.code})</span></p>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-5 gap-2">
                            <div>
                                <label class="block text-[10px] text-gray-400">المرتب الأساسي</label>
                                <input type="number" id="sal_${e.id}" value="${e.salary}" class="w-full px-3 py-1.5 border rounded-lg bg-white text-xs">
                            </div>
                            <div>
                                <label class="block text-[10px] text-gray-400">حضور</label>
                                <div class="flex gap-1">
                                    <input type="time" id="start_${e.id}" value="${e.workStart || '12:00'}" class="w-2/3 px-2 py-1.5 border rounded-lg bg-white text-xs">
                                    <select id="startPer_${e.id}" class="w-1/3 px-1 py-1.5 border rounded-lg bg-white text-[10px]">
                                        <option value="صباحاً" ${e.workStartPeriod==='صباحاً'?'selected':''}>صباحاً</option>
                                        <option value="مساءً" ${e.workStartPeriod==='مساءً'||!e.workStartPeriod?'selected':''}>مساءً</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label class="block text-[10px] text-gray-400">انصراف</label>
                                <div class="flex gap-1">
                                    <input type="time" id="end_${e.id}" value="${e.workEnd || '09:00'}" class="w-2/3 px-2 py-1.5 border rounded-lg bg-white text-xs">
                                    <select id="endPer_${e.id}" class="w-1/3 px-1 py-1.5 border rounded-lg bg-white text-[10px]">
                                        <option value="صباحاً" ${e.workEndPeriod==='صباحاً'?'selected':''}>صباحاً</option>
                                        <option value="مساءً" ${e.workEndPeriod==='مساءً'||!e.workEndPeriod?'selected':''}>مساءً</option>
                                    </select>
                                </div>
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-[10px] text-gray-400">نظام القبض (يؤثر على الحسابات والخصومات)</label>
                                <select id="cycle_${e.id}" class="w-full px-3 py-1.5 border rounded-lg bg-white text-xs">
                                    <option value="weekly" ${e.payCycle==='weekly'?'selected':''}>أسبوعي</option>
                                    <option value="biweekly" ${e.payCycle==='biweekly'||!e.payCycle?'selected':''}>كل 15 يوم</option>
                                    <option value="monthly" ${e.payCycle==='monthly'?'selected':''}>شهري</option>
                                </select>
                            </div>
                        </div>
                        <button onclick="updateEmployeeFull(${e.id})" class="bg-gray-800 text-white px-4 py-1.5 rounded-lg text-xs font-semibold">حفظ التعديلات</button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function updateEmployeeFull(id) {
    const salEl = document.getElementById(`sal_${id}`);
    const startEl = document.getElementById(`start_${id}`);
    const startPerEl = document.getElementById(`startPer_${id}`);
    const endEl = document.getElementById(`end_${id}`);
    const endPerEl = document.getElementById(`endPer_${id}`);
    const cycleEl = document.getElementById(`cycle_${id}`);
    if (!salEl || !startEl || !endEl || !cycleEl) return;

    const newSalary = parseFloat(salEl.value);
    const workStart = startEl.value;
    const workStartPeriod = startPerEl ? startPerEl.value : 'صباحاً';
    const workEnd = endEl.value;
    const workEndPeriod = endPerEl ? endPerEl.value : 'مساءً';
    const payCycle = cycleEl.value;

    let employees = DB.get('employees');
    employees = employees.map(e => e.id === id ? { ...e, salary: newSalary, workStart, workStartPeriod, workEnd, workEndPeriod, payCycle } : e);
    DB.set('employees', employees);
    alert('تم تحديث بيانات الموظفة ومواعيدها بنجاح.');
}

function renderAdminDeductionsTab() {
    const employees = DB.get('employees');
    const deductions = DB.get('deductions');
    const manualDeductions = deductions.filter(d => !d.isSystem);
    return `
        <div class="space-y-6 max-w-3xl">
            <h3 class="text-xl font-bold">إضافة خصم يدوي (مستقل عن التأخيرات)</h3>
            <div class="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
                <select id="dedEmpCode" class="w-full px-4 py-2.5 border rounded-xl bg-white">
                    ${employees.map(e => `<option value="${e.code}">${e.name} (${e.branch} - ${e.code})</option>`).join('')}
                </select>
                <input type="number" id="dedAmount" placeholder="قيمة الخصم" class="w-full px-4 py-2.5 border rounded-xl">
                <input type="text" id="dedReason" placeholder="سبب الخصم (مثال: عجز درج، خطأ في الخدمة...)" class="w-full px-4 py-2.5 border rounded-xl">
                <button onclick="saveDeduction()" class="bg-pink-600 text-white px-6 py-2.5 rounded-xl font-semibold">تسجيل الخصم اليدوي</button>
            </div>

            <h4 class="text-lg font-bold mt-6">الخصومات اليدوية المسجلة</h4>
            <div class="bg-white rounded-2xl shadow-sm border p-4 space-y-2">
                ${manualDeductions.map(d => `
                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded-xl text-sm">
                        <span>كود: <strong>${d.code}</strong> | مبلغ: <strong class="text-red-600">-${d.amount} ج.م</strong> (السبب: ${d.reason}) <span class="text-xs text-gray-400">[${d.date}]</span></span>
                        <button onclick="deleteRecord('deductions', ${d.id})" class="text-red-500 text-xs hover:underline">حذف</button>
                    </div>
                `).join('') || '<p class="text-gray-400 text-sm">لا توجد خصومات يدوية مسجلة</p>'}
            </div>
        </div>
    `;
}

function saveDeduction() {
    const codeEl = document.getElementById('dedEmpCode');
    const amountEl = document.getElementById('dedAmount');
    const reasonEl = document.getElementById('dedReason');
    if (!codeEl || !amountEl || !reasonEl) return;

    const code = codeEl.value;
    const amount = parseFloat(amountEl.value);
    const reason = reasonEl.value.trim();
    if (!amount || !reason) return alert('أدخل المبلغ والسبب بشكل صحيح.');
    
    const deductions = DB.get('deductions');
    deductions.push({ id: Date.now(), code, amount, reason, isSystem: false, date: new Date().toLocaleDateString('ar-EG') });
    DB.set('deductions', deductions);
    alert('تم تسجيل الخصم اليدوي بنجاح.');
    amountEl.value = ''; reasonEl.value = '';
}

function renderAdminOvertimeTab() {
    const employees = DB.get('employees');
    const overtimeList = DB.get('overtime');
    return `
        <div class="space-y-6 max-w-3xl">
            <h3 class="text-xl font-bold">إضافة وتعديل ساعات الأوفر تايم (الوقت الإضافي)</h3>
            <div class="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
                <select id="ovEmpCode" class="w-full px-4 py-2.5 border rounded-xl bg-white">
                    ${employees.map(e => `<option value="${e.code}">${e.name} (${e.branch} - ${e.code})</option>`).join('')}
                </select>
                <input type="number" id="ovHours" placeholder="عدد ساعات الأوفر تايم (مثال: 2)" class="w-full px-4 py-2.5 border rounded-xl">
                <input type="number" id="ovAmount" placeholder="أو اكتب المبلغ المالي مباشرة (اختياري)" class="w-full px-4 py-2.5 border rounded-xl">
                <input type="text" id="ovReason" placeholder="سبب الأوفر تايم (مثال: شغل إضافي بعد الوردية...)" class="w-full px-4 py-2.5 border rounded-xl">
                <button onclick="saveOvertime()" class="bg-pink-600 text-white px-6 py-2.5 rounded-xl font-semibold">تسجيل الأوفر تايم وتسميعه في حساب الموظفة</button>
            </div>

            <h4 class="text-lg font-bold mt-6">سجل الأوفر تايم المسجل</h4>
            <div class="bg-white rounded-2xl shadow-sm border p-4 space-y-2">
                ${overtimeList.map(o => `
                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded-xl text-sm">
                        <span>كود: <strong>${o.code}</strong> | مبلغ: <strong class="text-green-600">+${o.amount} ج.م</strong> (${o.hours ? o.hours + ' ساعات' : ''} - السبب: ${o.reason}) <span class="text-xs text-gray-400">[${o.date}]</span></span>
                        <button onclick="deleteRecord('overtime', ${o.id})" class="text-red-500 text-xs hover:underline">حذف</button>
                    </div>
                `).join('') || '<p class="text-gray-400 text-sm">لا توجد سجلات أوفر تايم مسجلة</p>'}
            </div>
        </div>
    `;
}

function saveOvertime() {
    const codeEl = document.getElementById('ovEmpCode');
    const hoursEl = document.getElementById('ovHours');
    const amountEl = document.getElementById('ovAmount');
    const reasonEl = document.getElementById('ovReason');
    if (!codeEl || !hoursEl || !amountEl || !reasonEl) return;

    const code = codeEl.value;
    const hours = parseFloat(hoursEl.value) || 0;
    let amount = parseFloat(amountEl.value);
    const reason = reasonEl.value.trim();

    const employees = DB.get('employees');
    const emp = employees.find(e => e.code === code);
    if (!emp) return alert('الموظفة غير موجودة.');

    if (!amount || isNaN(amount)) {
        if (hours <= 0) return alert('الرجاء إدخال عدد ساعات الأوفر تايم أو المبلغ المالي بشكل صحيح.');
        const minuteRate = calculateDynamicMinuteRate(emp);
        amount = Math.round(hours * 60 * minuteRate * 100) / 100;
    }

    if (!reason) return alert('الرجاء كتابة سبب الأوفر تايم.');

    const overtimeList = DB.get('overtime');
    overtimeList.push({ id: Date.now(), code, hours, amount, reason, date: new Date().toLocaleDateString('ar-EG') });
    DB.set('overtime', overtimeList);
    alert('تم تسجيل الأوفر تايم وتسميعه في حساب الموظفة بنجاح.');
    hoursEl.value = ''; amountEl.value = ''; reasonEl.value = '';
}

function renderAdminAdvancesTab() {
    const employees = DB.get('employees');
    const advances = DB.get('advances');
    return `
        <div class="space-y-6 max-w-4xl">
            <h3 class="text-xl font-bold">إضافة وإدارة السلف للموظفات</h3>
            <div class="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
                <h4 class="font-bold text-sm text-pink-600">إضافة سلفة جديدة بمعرفة الأدمن الرئيسي (تسمع فوراً بصفحة الموظفة):</h4>
                <select id="advEmpCode" class="w-full px-4 py-2.5 border rounded-xl bg-white">
                    ${employees.map(e => `<option value="${e.code}">${e.name} (${e.branch} - ${e.code})</option>`).join('')}
                </select>
                <input type="number" id="adminAdvAmount" placeholder="مبلغ السلفة" class="w-full px-4 py-2.5 border rounded-xl">
                <input type="text" id="adminAdvReason" placeholder="سبب السلفة" class="w-full px-4 py-2.5 border rounded-xl">
                <button onclick="adminAddAdvance()" class="bg-pink-600 text-white px-6 py-2.5 rounded-xl font-semibold">إضافة السلفة وتسميعها في الحسابات</button>
            </div>

            <h4 class="text-lg font-bold mt-6">سجل السلف المضافة</h4>
            <div class="bg-white rounded-2xl shadow-sm border p-4 space-y-3">
                ${advances.map(a => `
                    <div class="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                        <div>
                            <p class="font-bold">${a.empName} (${a.branch}) - سلفة: <strong class="text-amber-600">${a.amount} ج.م</strong></p>
                            <p class="text-xs text-gray-500">السبب: ${a.reason} | الحالة: <span class="text-green-600 font-bold">${a.status}</span></p>
                        </div>
                        <div class="flex items-center gap-2">
                            ${a.status === 'قيد المراجعة' ? `
                                <button onclick="updateAdvance(${a.id}, 'موافق')" class="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs">موافقة</button>
                                <button onclick="updateAdvance(${a.id}, 'مرفوض')" class="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs">رفض</button>
                            ` : ''}
                            <button onclick="deleteRecord('advances', ${a.id})" class="text-red-500 text-xs hover:underline">حذف</button>
                        </div>
                    </div>
                `).join('') || '<p class="text-gray-400 text-sm">لا توجد سلف مسجلة</p>'}
            </div>
        </div>
    `;
}

function adminAddAdvance() {
    const selectEl = document.getElementById('advEmpCode');
    const amountEl = document.getElementById('adminAdvAmount');
    const reasonEl = document.getElementById('adminAdvReason');
    if (!selectEl || !amountEl || !reasonEl) return;

    const code = selectEl.value;
    const amount = parseFloat(amountEl.value);
    const reason = reasonEl.value.trim();
    if (!amount || !reason) return alert('الرجاء إدخال مبلغ السلفة والسبب.');

    const employees = DB.get('employees');
    const emp = employees.find(e => e.code === code);
    if (!emp) return alert('الموظفة غير موجودة.');

    const advances = DB.get('advances');
    advances.push({
        id: Date.now(),
        code: emp.code,
        empName: emp.name,
        branch: emp.branch,
        amount,
        reason,
        status: 'موافق', 
        date: new Date().toLocaleDateString('ar-EG')
    });
    DB.set('advances', advances);
    alert('تم إضافة السلفة وتسميعها في صفحة الموظفة وحساباتها بنجاح.');
    amountEl.value = ''; reasonEl.value = '';
}

function updateAdvance(id, status) {
    let advances = DB.get('advances');
    advances = advances.map(a => a.id === id ? { ...a, status } : a);
    DB.set('advances', advances);
}

function renderAdminInquiryTab() {
    const employees = DB.get('employees');
    const deductions = DB.get('deductions');
    const advances = DB.get('advances');
    const overtimeList = DB.get('overtime');
    const salariesPaid = DB.get('salaries_paid');

    return `
        <div class="space-y-6 max-w-5xl">
            <h3 class="text-xl font-bold">قائمة الاستعلام المالي وقبض المرتبات وإدارة وحذف إشعارات القبض</h3>
            <div class="space-y-4">
                ${employees.map(e => {
                    const empDed = deductions.filter(d => d.code === e.code).reduce((s, d) => s + d.amount, 0);
                    const empAdv = advances.filter(a => a.code === e.code && a.status === 'موافق').reduce((s, a) => s + a.amount, 0);
                    const empOv = overtimeList.filter(o => o.code === e.code).reduce((s, o) => s + o.amount, 0);
                    const net = e.salary - empDed - empAdv + empOv;
                    const cycleName = e.payCycle === 'weekly' ? 'أسبوعي' : e.payCycle === 'biweekly' ? 'كل 15 يوم' : 'شهري';
                    const empPaidNotices = salariesPaid.filter(p => p.code === e.code);

                    return `
                        <div class="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
                            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h4 class="font-bold text-lg text-pink-600">${e.name} <span class="text-xs text-gray-500">(${e.branch} - كود: ${e.code})</span></h4>
                                    <p class="text-xs text-gray-500 mt-1">نظام القبض: <span class="font-bold text-gray-700">${cycleName}</span> | الأساسي: ${e.salary} | الخصومات: -${empDed} | السلف: -${empAdv} | أوفر تايم: <span class="text-green-600 font-bold">+${empOv}</span> | <strong>الصافي: ${net} ج.م</strong></p>
                                </div>
                                <div class="flex items-center gap-2 flex-wrap">
                                    <button onclick="markAsPaidCycle('${e.code}', '${e.name}', '${e.payCycle || 'biweekly'}')" class="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-green-700 transition">تأكيد القبض (${cycleName})</button>
                                    <button onclick="printInvoice('${e.code}')" class="bg-gray-800 text-white px-4 py-2 rounded-xl text-xs font-semibold">طباعة الكشف</button>
                                    <button onclick="downloadInvoiceImage('${e.code}')" class="bg-pink-600 text-white px-4 py-2 rounded-xl text-xs font-semibold">حفظ كصورة</button>
                                </div>
                            </div>

                            ${empPaidNotices.length ? `
                                <div class="bg-gray-50 border p-3 rounded-xl space-y-2">
                                    <p class="text-xs font-bold text-gray-600">إشعارات القبض المرسلة للموظفة (يمكنك حذف أي إشعار):</p>
                                    <div class="space-y-1.5">
                                        ${empPaidNotices.map(p => `
                                            <div class="flex justify-between items-center bg-white p-2.5 rounded-lg border text-xs">
                                                <span class="text-green-700 font-semibold">🎉 ${p.period} <span class="text-gray-400 font-normal">(${p.date})</span></span>
                                                <button onclick="deleteRecord('salaries_paid', ${p.id})" class="text-red-500 hover:underline font-bold px-2 py-1 bg-red-50 rounded">حذف الإشعار</button>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
        <div id="printArea" style="display:none;"></div>
    `;
}

function markAsPaidCycle(code, name, cycle) {
    let periodName = 'دفعة مرتب جديدة';
    if (cycle === 'weekly') {
        periodName = 'دفعة أسبوعية جديدة';
    } else if (cycle === 'biweekly') {
        periodName = 'دفعة فترة الـ 15 يوم الحالية';
    } else {
        periodName = 'دفعة المرتب الشهري';
    }

    const paidList = DB.get('salaries_paid');
    paidList.push({ id: Date.now(), code, period: periodName, date: new Date().toLocaleDateString('ar-EG') });
    DB.set('salaries_paid', paidList);
    alert(`تم تأكيد وإرسال إشعار القبض للموظفة (${name}) بنجاح.`);
}

function prepareInvoiceHTML(code) {
    const employees = DB.get('employees');
    const e = employees.find(x => x.code === code);
    if (!e) return '';
    const deductions = DB.get('deductions').filter(d => d.code === code);
    const manualDeductions = deductions.filter(d => !d.isSystem);
    const systemDeductions = deductions.filter(d => d.isSystem);

    const totalDed = deductions.reduce((s, d) => s + d.amount, 0);
    const advances = DB.get('advances').filter(a => a.code === code && a.status === 'موافق');
    const totalAdv = advances.reduce((s, a) => s + a.amount, 0);
    const overtimeList = DB.get('overtime').filter(o => o.code === code);
    const totalOv = overtimeList.reduce((s, o) => s + o.amount, 0);

    const net = e.salary - totalDed - totalAdv + totalOv;
    const cycleName = e.payCycle === 'weekly' ? 'أسبوعي' : e.payCycle === 'biweekly' ? 'كل 15 يوم' : 'شهري';

    return `
        <div id="invoiceCard" style="direction: rtl; font-family: Arial, sans-serif; padding: 40px; background: #ffffff; color: #000000; width: 700px; margin: 0 auto; border-radius: 20px; border: 2px solid #f3e8ff; box-sizing: border-box;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #db2777; margin: 0; font-size: 24px;">صالون نوسا</h2>
                <p style="color: #6b7280; font-size: 14px; margin: 5px 0 0 0;">كشف حساب المرتب (${cycleName})</p>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; font-size: 15px; margin-bottom: 20px;">
                <p style="margin: 0;"><strong>اسم الموظفة:</strong> ${e.name}</p>
                <p style="margin: 0;"><strong>الفرع:</strong> ${e.branch}</p>
                <p style="margin: 0;"><strong>كود البصمة:</strong> ${e.code}</p>
            </div>
            <table border="1" cellpadding="12" cellspacing="0" style="width: 100%; border-collapse: collapse; text-align: right; border-color: #e5e7eb; font-size: 14px;">
                <tr style="background: #fdf2f8;"><th style="color: #374151;">البند المالي</th><th style="text-align: left; color: #374151;">القيمة</th></tr>
                <tr><td>المرتب الأساسي (${cycleName})</td><td style="text-align: left;">${e.salary} ج.م</td></tr>
                <tr><td>خصومات التأخير والانصراف المبكر</td><td style="text-align: left; color: #dc2626;">-${systemDeductions.reduce((s,d)=>s+d.amount,0)} ج.م</td></tr>
                <tr>
                    <td>
                        الخصومات اليدوية الإضافية:
                        ${manualDeductions.length ? `<ul style="margin:5px 0 0 15px; padding:0; font-size:12px; color:#555;">${manualDeductions.map(d=>`<li>${d.reason}: -${d.amount} ج.م</li>`).join('')}</ul>` : '<span style="color:#888; font-size:12px;"> (لا توجد)</span>'}
                    </td>
                    <td style="text-align: left; color: #dc2626; vertical-align: top;">-${manualDeductions.reduce((s,d)=>s+d.amount,0)} ج.م</td>
                </tr>
                <tr>
                    <td>
                        مستحقات الأوفر تايم (الوقت الإضافي):
                        ${overtimeList.length ? `<ul style="margin:5px 0 0 15px; padding:0; font-size:12px; color:#555;">${overtimeList.map(o=>`<li>${o.reason}: +${o.amount} ج.م</li>`).join('')}</ul>` : '<span style="color:#888; font-size:12px;"> (لا توجد)</span>'}
                    </td>
                    <td style="text-align: left; color: #16a34a; vertical-align: top;">+${totalOv} ج.م</td>
                </tr>
                <tr><td>إجمالي السلف المعتمدة</td><td style="text-align: left; color: #dc2626;">-${totalAdv} ج.م</td></tr>
                <tr style="background: #fdf2f8; font-weight: bold;"><td>صافي المستحق النهائي</td><td style="text-align: left; color: #db2777; font-size: 16px;">${net} ج.م</td></tr>
            </table>
        </div>
    `;
}

function printInvoice(code) {
    const printDiv = document.getElementById('printArea');
    if (!printDiv) return;
    printDiv.innerHTML = prepareInvoiceHTML(code);
    const win = window.open('', '', 'height=700,width=800');
    if (!win) return alert('الرجاء السماح للمتصفح بفتح النوافذ المنبثقة');
    win.document.write('<html><head><title>طباعة الكشف</title></head><body style="margin:0; padding:20px; display:flex; justify-content:center; align-items:center;">');
    win.document.write(printDiv.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
}

function downloadInvoiceImage(code) {
    const printDiv = document.getElementById('printArea');
    if (!printDiv) return;
    printDiv.innerHTML = prepareInvoiceHTML(code);
    printDiv.style.display = 'block';
    const card = document.getElementById('invoiceCard');
    if (!card) return;
    html2canvas(card, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }).then(canvas => {
        printDiv.style.display = 'none';
        const link = document.createElement('a');
        link.download = `كشف_مرتب_${code}_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }).catch(err => {
        printDiv.style.display = 'none';
        alert('حدث خطأ في الحفظ.');
    });
}

function renderUnifiedBranchControlPanel(branchName) {
    const today = new Date().toLocaleDateString('ar-EG');
    const employees = DB.get('employees').filter(e => e.branch === branchName && e.active);
    const attendance = DB.get('attendance').filter(a => a.branch === branchName && a.date === today);
    const holidays = DB.get('official_holidays');
    const deductions = DB.get('deductions');
    const expenses = DB.get('expenses').filter(x => x.branch === branchName);
    const totalBranchExp = expenses.reduce((s, x) => s + x.amount, 0);

    const reportData = employees.map(emp => {
        const records = attendance.filter(a => a.code === emp.code);
        const hasCheckIn = records.some(a => a.type === 'حضور');
        const hasCheckOut = records.some(a => a.type === 'انصراف');
        const isHolidayToday = holidays.some(h => h.code === emp.code && h.date === today);
        const empDedToday = deductions.filter(d => d.code === emp.code && d.date === today);
        
        let status = 'غياب بدون إذن (يخصم اليوم)';
        let badgeColor = 'bg-red-100 text-red-700';

        if (isHolidayToday) {
            status = 'إجازة رسمية / مرخصة (لا يخصم شيء)';
            badgeColor = 'bg-amber-100 text-amber-700';
        } else if (hasCheckIn && hasCheckOut) { 
            status = 'حاضرة (وانصرفت)'; 
            badgeColor = 'bg-blue-100 text-blue-700'; 
        } else if (hasCheckIn) { 
            status = 'حاضرة الآن في الفرع'; 
            badgeColor = 'bg-green-100 text-green-700'; 
        }

        return { ...emp, status, badgeColor, records, isHolidayToday, empDedToday };
    });

    const totalCount = employees.length;
    const presentCount = reportData.filter(r => r.status.includes('حاضرة')).length;
    const holidayCount = reportData.filter(r => r.isHolidayToday).length;

    return `
        <div class="space-y-6 max-w-5xl">
            <div class="flex justify-between items-center flex-wrap gap-2">
                <h3 class="text-xl font-bold text-gray-800">لوحة متابعة وإجازات ومصروفات فرع ${branchName} (اليوم: ${today})</h3>
                <div class="flex gap-2">
                    <button onclick="clearBranchExpenses('${branchName}')" class="bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-amber-700 transition">تصفير مصروفات الفرع</button>
                    <button onclick="clearTodayAttendance('${branchName}')" class="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-red-700 transition">تصفير سجل حضور اليوم</button>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="bg-white p-5 rounded-2xl shadow-sm border"><p class="text-gray-400 text-xs">إجمالي موظفات الفرع</p><h3 class="text-2xl font-bold mt-1 text-gray-800">${totalCount}</h3></div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border"><p class="text-gray-400 text-xs">الحاضرات الآن</p><h3 class="text-2xl font-bold mt-1 text-green-600">${presentCount}</h3></div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border"><p class="text-gray-400 text-xs">في إجازة مرخصة اليوم</p><h3 class="text-2xl font-bold mt-1 text-amber-600">${holidayCount}</h3></div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border"><p class="text-gray-400 text-xs">إجمالي مصاريف الفرع</p><h3 class="text-2xl font-bold mt-1 text-blue-600">${totalBranchExp} ج.م</h3></div>
            </div>

            <div class="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
                <h4 class="font-bold text-md text-gray-800">تفاصيل ومصاريف فرع ${branchName} المسجلة:</h4>
                <div class="divide-y max-h-60 overflow-y-auto">
                    ${expenses.map(ex => `
                        <div class="py-2.5 flex justify-between items-center text-sm">
                            <span>الخدمة / البند: <strong>${ex.reason}</strong> <span class="text-xs text-gray-400">[${ex.date}]</span></span>
                            <span class="font-bold text-amber-600">${ex.amount} ج.م</span>
                        </div>
                    `).join('') || '<p class="text-gray-400 text-sm">لا توجد مصروفات مسجلة لهذا الفرع</p>'}
                </div>
            </div>

            <div class="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div class="p-4 bg-gray-50 border-b font-bold text-sm text-gray-700">متابعة الحضور، وتعديل أوقات الدخول والخصومات، وإدارة الإجازات</div>
                <div class="divide-y">
                    ${reportData.map(r => `
                        <div class="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                            <div>
                                <p class="font-bold text-gray-800">${r.name} <span class="text-xs text-gray-400">(كود: ${r.code})</span></p>
                                <div class="mt-1 space-y-1">
                                    ${r.records.map(rec => `
                                        <div class="flex items-center gap-2 text-xs bg-gray-50 p-2 rounded-lg border flex-wrap">
                                            <span class="font-bold text-pink-600">${rec.type}:</span> <span>${rec.time} (${rec.period || ''})</span>
                                            ${rec.delayMinutes ? `<span class="text-red-500">(تأخير: ${rec.delayMinutes}د)</span>` : ''}
                                            <div class="mr-auto flex items-center gap-1.5">
                                                <button onclick="editAttendanceTimePrompt(${rec.id})" class="text-blue-600 hover:underline font-bold px-2.5 py-1 bg-blue-50 rounded">تعديل الوقت</button>
                                                <button onclick="deleteAttendanceRecord(${rec.id})" class="text-red-600 hover:underline font-bold px-2.5 py-1 bg-red-50 rounded">حذف</button>
                                            </div>
                                        </div>
                                    `).join('') || '<p class="text-xs text-gray-400">لا توجد تسجيلات حضور بعد اليوم</p>'}
                                </div>
                                ${r.empDedToday.length ? `
                                    <div class="mt-1 text-[11px] text-red-600 font-semibold">
                                        أسباب الخصومات اليوم: ${r.empDedToday.map(d => `${d.reason} (- ${d.amount} ج.م)`).join(' | ')}
                                    </div>
                                ` : ''}
                            </div>
                            <div class="flex items-center gap-3 flex-wrap">
                                <span class="px-3 py-1 rounded-xl text-xs font-bold ${r.badgeColor}">${r.status}</span>
                                <button onclick="toggleEmployeeHoliday('${r.code}', '${today}')" class="px-3 py-1.5 rounded-xl text-xs font-semibold ${r.isHolidayToday ? 'bg-gray-200 text-gray-700' : 'bg-amber-600 text-white'}">
                                    ${r.isHolidayToday ? 'إلغاء الإجازة' : 'جعل اليوم إجازة'}
                                </button>
                            </div>
                        </div>
                    `).join('') || '<p class="p-4 text-gray-400 text-sm">لا توجد موظفات مسجلات.</p>'}
                </div>
            </div>
        </div>
    `;
}

function editAttendanceTimePrompt(recId) {
    let attendance = DB.get('attendance');
    const rec = attendance.find(a => a.id === recId);
    if (!rec) return;

    const employees = DB.get('employees');
    const emp = employees.find(e => e.code === rec.code);
    if (!emp) return alert('الموظفة غير موجودة.');

    const newTimeInput = prompt(`أدخل الوقت الجديد لـ (${rec.type}) بصيغة 12 ساعة مع تحديد (صباحاً / مساءً)\nمثال: 01:00 مساءً أو 12:30 ظهراً:`, rec.time + ' ' + (rec.period || ''));
    if (!newTimeInput) return;

    // استخلاص الساعات والدقائق والفترة
    const isPM = newTimeInput.includes('مساء') || newTimeInput.includes('PM') || newTimeInput.includes('م');
    const isAM = newTimeInput.includes('صباح') || newTimeInput.includes('AM') || newTimeInput.includes('ص');
    let period = isPM ? 'مساءً' : (isAM ? 'صباحاً' : (rec.period || 'مساءً'));

    // تنظيف النص لاستخراج الوقت HH:MM
    const timeClean = newTimeInput.replace(/[^\d:]/g, '');
    let parts = timeClean.split(':');
    if (parts.length < 2) return alert('صيغة الوقت غير صحيحة. الرجاء إدخال الوقت بشكل صحيح.');

    let hours = parseInt(parts[0]);
    let minutes = parseInt(parts[1]);
    if (isNaN(hours) || isNaN(minutes)) return alert('أرقام الوقت غير صالحة.');

    // إعادة حساب التأخير أو الانصراف المبكر الجديد بناءً على وقت الموظفة المحدد
    let targetTimeStr = (rec.type === 'حضور') ? (emp.workStart || '12:00') : (emp.workEnd || '09:00');
    let targetPeriodStr = (rec.type === 'حضور') ? (emp.workStartPeriod || 'صباحاً') : (emp.workEndPeriod || 'مساءً');

    let targetTotalMins = convertTo24Hour(targetTimeStr, targetPeriodStr);
    
    // تحويل الوقت المدخل الجديد لـ 24 ساعة
    let tempH = hours;
    if (period === 'مساءً' && tempH < 12) tempH += 12;
    if (period === 'صباحاً' && tempH === 12) tempH = 0;
    let newTotalMins = tempH * 60 + minutes;

    const minuteRate = calculateDynamicMinuteRate(emp);

    // تحديث السجل في قاعدة البيانات
    attendance = attendance.map(item => {
        if (item.id === recId) {
            let updatedItem = { ...item, time: `${hours < 10 ? '0' + hours : hours}:${minutes < 10 ? '0' + minutes : minutes}`, period };
            if (rec.type === 'حضور') {
                let delayMinutes = 0;
                let holidays = DB.get('official_holidays');
                let isHolidayToday = holidays.some(h => h.code === emp.code && h.date === item.date);
                
                if (!isHolidayToday && newTotalMins > targetTotalMins) {
                    delayMinutes = newTotalMins - targetTotalMins;
                    updatedItem.delayMinutes = delayMinutes;
                    
                    // إضافة خصم التأخير الجديد
                    let deductions = DB.get('deductions').filter(d => !(d.code === emp.code && d.date === item.date && d.reason.includes('تأخير حضور')));
                    let deductionAmount = Math.round(delayMinutes * minuteRate * 100) / 100;
                    deductions.push({ id: Date.now(), code: emp.code, amount: deductionAmount, reason: `تأخير حضور يوم ${item.date} (${delayMinutes} دقيقة - بعد التعديل)`, isSystem: true, date: item.date });
                    DB.set('deductions', deductions);
                } else {
                    updatedItem.delayMinutes = 0;
                    // إزالة خصم التأخير القديم لو أصبح ليس متأخراً
                    let deductions = DB.get('deductions').filter(d => !(d.code === emp.code && d.date === item.date && d.reason.includes('تأخير حضور')));
                    DB.set('deductions', deductions);
                }
            }
            return updatedItem;
        }
        return item;
    });

    DB.set('attendance', attendance);
    alert('تم تعديل الوقت بنجاح وتحديث الحسابات والخصومات على السحابة.');
}

function deleteAttendanceRecord(recId) {
    if (!confirm('هل أنت متأكد من حذف سجل الحضور/الانصراف هذا وتعديل حالة الموظفة بالسيستم؟')) return;
    let attendance = DB.get('attendance');
    attendance = attendance.filter(item => item.id !== recId);
    DB.set('attendance', attendance);
    alert('تم حذف السجل وتحديث السيستم بنجاح.');
}

function clearBranchExpenses(branchName) {
    if (!confirm(`هل أنت متأكد من تصفير ومسح جميع مصروفات فرع ${branchName}؟`)) return;
    let expenses = DB.get('expenses').filter(x => x.branch !== branchName);
    DB.set('expenses', expenses);
    alert(`تم تصفير ومسح مصروفات فرع ${branchName} بنجاح.`);
}

function toggleEmployeeHoliday(code, today) {
    let holidays = DB.get('official_holidays');
    const exists = holidays.find(h => h.code === code && h.date === today);
    
    if (exists) {
        holidays = holidays.filter(h => !(h.code === code && h.date === today));
        alert('تم إلغاء حالة الإجازة لهذا اليوم.');
    } else {
        holidays.push({ id: Date.now(), code, date: today });
        alert('تم تسجيل هذا اليوم كـ "إجازة مرخصة" ولن يتم خصم أي تأخير أو غياب منها.');
    }
    DB.set('official_holidays', holidays);
}

function clearTodayAttendance(branchName) {
    if (!confirm(`هل أنت متأكد من تصفير حضور فرع ${branchName}؟`)) return;
    const today = new Date().toLocaleDateString('ar-EG');
    let attendance = DB.get('attendance').filter(a => !(a.branch === branchName && a.date === today));
    DB.set('attendance', attendance);
    let deductions = DB.get('deductions').filter(d => !d.isSystem); 
    DB.set('deductions', deductions);
    alert('تم تصفير السجل وخصومات التأخير والانصراف المبكر بنجاح.');
}

function deleteRecord(key, id) {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    let data = DB.get(key);
    data = data.filter(item => item.id !== id);
    DB.set(key, data);
}

// --- 4. Employee Portal ---
function renderEmployeePortal() {
    const emp = activeEmployee;
    if (!emp) return '';
    
    const attendance = DB.get('attendance').filter(a => a.code === emp.code);
    const uniqueDaysPresent = [...new Set(attendance.map(a => a.date))].length;
    const totalDelayMin = attendance.reduce((sum, a) => sum + (a.delayMinutes || 0), 0);

    const advances = DB.get('advances').filter(a => a.code === emp.code);
    const deductions = DB.get('deductions').filter(d => d.code === emp.code);
    const manualDeductions = deductions.filter(d => !d.isSystem);
    const overtimeList = DB.get('overtime').filter(o => o.code === emp.code);
    
    const paidList = DB.get('salaries_paid').filter(p => p.code === emp.code);

    const totalDed = deductions.reduce((sum, d) => sum + d.amount, 0);
    const totalAdv = advances.filter(a => a.status === 'موافق').reduce((sum, a) => sum + a.amount, 0);
    const totalOv = overtimeList.reduce((sum, o) => sum + o.amount, 0);
    const net = emp.salary - totalDed - totalAdv + totalOv;
    const cycleName = emp.payCycle === 'weekly' ? 'أسبوعي' : emp.payCycle === 'biweekly' ? 'كل 15 يوم' : 'شهري';

    return `
        <header class="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
            <div>
                <h2 class="text-xl font-bold text-gray-800">مرحباً بك، ${emp.name}</h2>
                <div class="mt-1 text-xs bg-pink-50 text-pink-700 px-3 py-1.5 rounded-xl border border-pink-100 flex items-center gap-2 flex-wrap shadow-2xs">
                    <span>🏢 الفرع: <strong>${emp.branch}</strong></span>
                    <span>•</span>
                    <span>🆔 كود البصمة: <strong>${emp.code}</strong></span>
                    <span>•</span>
                    <span>💰 نظام القبض: <strong class="text-gray-900">${cycleName}</strong></span>
                    <span>•</span>
                    <span>⏰ المواعيد: من <strong class="text-gray-900">${emp.workStart || '12:00'} ${emp.workStartPeriod || 'صباحاً'}</strong> إلى <strong class="text-gray-900">${emp.workEnd || '09:00'} ${emp.workEndPeriod || 'مساءً'}</strong></span>
                </div>
            </div>
            <button onclick="currentView='login_portal'; activeEmployee=null; sessionStorage.clear(); render();" class="text-red-600 font-semibold hover:underline text-sm">تسجيل الخروج</button>
        </header>
        <main class="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6">
            ${paidList.length ? `
                <div class="space-y-2">
                    ${paidList.map(p => `
                        <div class="bg-green-100 border border-green-400 text-green-700 px-6 py-3 rounded-2xl flex items-center justify-between text-sm">
                            <span>🎉 تم تأكيد وإرسال إشعار قبض لفترة: <strong>${p.period}</strong> بتاريخ (${p.date})</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${advances.filter(a => a.status === 'موافق').length ? `
                <div class="space-y-2">
                    ${advances.filter(a => a.status === 'موافق').map(a => `
                        <div class="bg-amber-50 border border-amber-300 text-amber-800 px-6 py-3 rounded-2xl flex items-center justify-between text-sm">
                            <span>💡 تمت الموافقة على سلفة بقيمة: <strong>${a.amount} ج.م</strong> (السبب: ${a.reason}) وتم خصمها من الصافي فوراً.</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${overtimeList.length ? `
                <div class="bg-green-50 border border-green-200 p-5 rounded-3xl space-y-2">
                    <h4 class="font-bold text-green-700 text-sm">🌟 تمت إضافة مستحقات أوفر تايم (وقت إضافي) لحسابك:</h4>
                    <div class="space-y-1.5">
                        ${overtimeList.map(o => `
                            <div class="bg-white p-3 rounded-xl border border-green-100 flex justify-between items-center text-xs">
                                <span class="text-gray-800">السبب: <strong>${o.reason}</strong> ${o.hours ? `(${o.hours} ساعات)` : ''} <span class="text-gray-400">(${o.date})</span></span>
                                <span class="font-bold text-green-600">+${o.amount} ج.م</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${manualDeductions.length ? `
                <div class="bg-red-50 border border-red-200 p-5 rounded-3xl space-y-2">
                    <h4 class="font-bold text-red-700 text-sm">⚠️ تم تسجيل خصومات إضافية على حسابك:</h4>
                    <div class="space-y-1.5">
                        ${manualDeductions.map(d => `
                            <div class="bg-white p-3 rounded-xl border border-red-100 flex justify-between items-center text-xs">
                                <span class="text-gray-800">السبب: <strong>${d.reason}</strong> <span class="text-gray-400">(${d.date})</span></span>
                                <span class="font-bold text-red-600">-${d.amount} ج.م</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <div class="bg-white p-6 rounded-3xl shadow-sm border text-center space-y-4">
                <h3 class="text-lg font-bold">تسجيل الحضور والانصراف</h3>
                <p class="text-xs text-gray-500">التأخير أو الانصراف المبكر يحسب يوم بيومه تلقائياً بناءً على مواعيد عملك المحددة وتظهر تفاصيلها في لوحة الإدارة.</p>
                <div class="space-x-4 space-x-reverse">
                    <button onclick="recordAttendance('حضور')" class="bg-green-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-green-700">تسجيل حضور</button>
                    <button onclick="recordAttendance('انصراف')" class="bg-amber-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-amber-700">تسجيل انصراف</button>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="bg-white p-5 rounded-2xl shadow-sm border"><p class="text-gray-400 text-sm">أيام الحضور</p><h3 class="text-2xl font-bold mt-1 text-blue-600">${uniqueDaysPresent} يوم</h3></div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border"><p class="text-gray-400 text-sm">إجمالي التأخيرات</p><h3 class="text-2xl font-bold mt-1 text-red-600">${totalDelayMin} دقيقة</h3></div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border"><p class="text-gray-400 text-sm">أوفر تايم مضاف</p><h3 class="text-2xl font-bold mt-1 text-green-600">+${totalOv} ج.م</h3></div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border"><p class="text-gray-400 text-sm">إجمالي الخصومات</p><h3 class="text-2xl font-bold mt-1 text-red-600">-${totalDed} ج.م</h3></div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-white p-5 rounded-2xl shadow-sm border"><p class="text-gray-400 text-sm">المرتب الأساسي</p><h3 class="text-2xl font-bold mt-1">${emp.salary} ج.م</h3></div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border"><p class="text-gray-400 text-sm">الصافي المستحق النهائي (${cycleName})</p><h3 class="text-2xl font-bold mt-1 text-pink-600">${net} ج.م</h3></div>
            </div>
        </main>
    `;
}

function convertTo24Hour(timeStr, period) {
    let [hours, minutes] = timeStr.split(':').map(Number);
    if (period === 'مساءً' && hours < 12) {
        hours += 12;
    } else if (period === 'صباحاً' && hours === 12) {
        hours = 0;
    }
    return hours * 60 + minutes;
}

function calculateDynamicMinuteRate(emp) {
    const startMins = convertTo24Hour(emp.workStart || '12:00', emp.workStartPeriod || 'صباحاً');
    const endMins = convertTo24Hour(emp.workEnd || '09:00', emp.workEndPeriod || 'مساءً');
    
    let shiftDurationMins = endMins - startMins;
    if (shiftDurationMins <= 0) {
        shiftDurationMins += 24 * 60;
    }
    
    const shiftHours = shiftDurationMins / 60;
    const effectiveHours = shiftHours > 0 ? shiftHours : 8;
    
    const dailyRate = emp.salary / 30;
    const minuteRate = (dailyRate / effectiveHours) / 60;
    return minuteRate;
}

function recordAttendance(type) {
    if (!activeEmployee) return;
    const emp = activeEmployee;
    const now = new Date();
    const todayStr = now.toLocaleDateString('ar-EG');
    
    const holidays = DB.get('official_holidays');
    const isHolidayToday = holidays.some(h => h.code === emp.code && h.date === todayStr);

    let attendance = DB.get('attendance');
    const minuteRate = calculateDynamicMinuteRate(emp);

    if (type === 'حضور') {
        if (attendance.some(a => a.code === emp.code && a.date === todayStr && a.type === 'حضور')) {
            return alert('لقد قمت بتسجيل الحضور مسبقاً اليوم!');
        }

        const workStart = emp.workStart || '12:00';
        const startPeriod = emp.workStartPeriod || 'مساءً';
        const targetTotalMinutes = convertTo24Hour(workStart, startPeriod);
        const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
        
        let delayMinutes = 0;
        if (!isHolidayToday && currentTotalMinutes > targetTotalMinutes) {
            delayMinutes = currentTotalMinutes - targetTotalMinutes;
            const deduction = Math.round(delayMinutes * minuteRate * 100) / 100;
            
            const deductions = DB.get('deductions');
            deductions.push({ id: Date.now(), code: emp.code, amount: deduction, reason: `تأخير حضور يوم ${todayStr} (${delayMinutes} دقيقة)`, isSystem: true, date: todayStr });
            DB.set('deductions', deductions);
        }

        attendance.push({ id: Date.now(), code: emp.code, name: emp.name, branch: emp.branch, type: 'حضور', time: now.toLocaleTimeString('ar-EG'), period: now.getHours() >= 12 ? 'مساءً' : 'صباحاً', delayMinutes: delayMinutes, date: todayStr });
        DB.set('attendance', attendance);
        alert(`تم تسجيل الحضور ${delayMinutes > 0 ? `(رصد تأخير ${delayMinutes} دقيقة وخصم ${Math.round(delayMinutes * minuteRate * 100) / 100} ج.م)` : ''}`);

    } else if (type === 'انصراف') {
        if (attendance.some(a => a.code === emp.code && a.date === todayStr && a.type === 'انصراف')) {
            return alert('لقد قمت بتسجيل الانصراف مسبقاً اليوم!');
        }

        const workEnd = emp.workEnd || '09:00';
        const endPeriod = emp.workEndPeriod || 'مساءً';
        const endTotalMinutes = convertTo24Hour(workEnd, endPeriod);
        const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
        
        let earlyMinutes = 0;
        if (!isHolidayToday && currentTotalMinutes < endTotalMinutes) {
            earlyMinutes = endTotalMinutes - currentTotalMinutes;
            const deduction = Math.round(earlyMinutes * minuteRate * 100) / 100;
            
            const deductions = DB.get('deductions');
            deductions.push({ id: Date.now(), code: emp.code, amount: deduction, reason: `انصراف مبكر يوم ${todayStr} (${earlyMinutes} دقيقة)`, isSystem: true, date: todayStr });
            DB.set('deductions', deductions);
            
            alert(`تم تسجيل الانصراف! (انصراف مبكر قبل الموعد بـ ${earlyMinutes} دقيقة، تم خصم ${deduction} ج.م)`);
        } else {
            alert('تم تسجيل الانصراف بنجاح.');
        }

        attendance.push({ id: Date.now(), code: emp.code, name: emp.name, branch: emp.branch, type: 'انصراف', time: now.toLocaleTimeString('ar-EG'), period: now.getHours() >= 12 ? 'مساءً' : 'صباحاً', date: todayStr });
        DB.set('attendance', attendance);
    }
}

render();
