// --- إعدادات الاتصال بـ Firebase Realtime Database ---
const firebaseConfig = {
    databaseURL: "https://nosa-salon-db-default-rtdb.europe-west1.firebasedatabase.app/"
};

// تهيئة تطبيق فايربيس
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// تخزين مؤقت محلي لتحديث واجهة المستخدم بسرعة فائقة
let cloudData = {
    employees: [],
    attendance: [],
    advances: [],
    deductions: [],
    salaries_paid: [],
    expenses: [],
    branch_expense_codes: { 'الدواجن': '1003', 'حدائق حلوان': '1005' }
};

// الاستماع للتغييرات لحظياً من السحابة (Real-time Listener)
database.ref('/').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        cloudData.employees = data.employees || [];
        cloudData.attendance = data.attendance || [];
        cloudData.advances = data.advances || [];
        cloudData.deductions = data.deductions || [];
        cloudData.salaries_paid = data.salaries_paid || [];
        cloudData.expenses = data.expenses || [];
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
        { id: 1, code: '101', name: 'سارة محمد', branch: 'الدواجن', salary: 5000, active: true },
        { id: 2, code: '102', name: 'مريم أحمد', branch: 'حدائق حلوان', salary: 5500, active: true }
    ];
    database.ref('employees').set(defaultEmp);
    database.ref('branch_expense_codes').set({ 'الدواجن': '1003', 'حدائق حلوان': '1005' });
}

// كائن الـ DB للتعامل المباشر مع السحابة
const DB = {
    get(key) { 
        return cloudData[key] || []; 
    },
    set(key, data) { 
        database.ref(key).set(data).catch((error) => {
            alert('خطأ في حفظ البيانات على السحابة: ' + error.message);
        });
    }
};

// --- Session State ---
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
    
    // الأكواد الافتراضية المضمونة تماماً على الموبايل واللاب
    const defaultCodes = { 'الدواجن': '1003', 'حدائق حلوان': '1005' };
    const branchCodes = (cloudData && cloudData.branch_expense_codes) ? cloudData.branch_expense_codes : defaultCodes;
    const correctCode = branchCodes[branch] || defaultCodes[branch];

    if (enteredCode !== correctCode) {
        return alert('كود المصروف غير صحيح لهذا الفرع! تأكد من الكود المخصص لفرعك.');
    }

    const reason = reasonEl.value.trim();
    const amount = parseFloat(amountEl.value);

    if (!reason || !amount || isNaN(amount)) {
        return alert('الرجاء إدخال اسم الخدمة والمبلغ بشكل صحيح.');
    }

    const expenses = DB.get('expenses');
    expenses.push({
        id: Date.now(),
        branch,
        code: enteredCode,
        reason,
        amount,
        date: new Date().toLocaleDateString('ar-EG')
    });
    DB.set('expenses', expenses);
    alert('تم تسجيل مصروف الفرع بنجاح ووصل للإدارة فوراً.');
    reasonEl.value = '';
    amountEl.value = '';
    codeEl.value = '';
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
                        <p class="text-xs text-gray-400 mt-1">لوحة التحكم الرئيسية (نوسا)</p>
                    </div>
                    <nav class="space-y-2">
                        <button onclick="adminTab='dashboard'; render();" class="w-full text-right px-4 py-2.5 rounded-xl font-semibold transition ${adminTab==='dashboard'?'bg-pink-50 text-pink-600':'text-gray-600 hover:bg-gray-50'}">لوحة المؤشرات والحسابات</button>
                        <button onclick="adminTab='branch_codes_config'; render();" class="w-full text-right px-4 py-2.5 rounded-xl font-semibold transition ${adminTab==='branch_codes_config'?'bg-pink-50 text-pink-600':'text-gray-600 hover:bg-gray-50'}">تعديل أكواد مصاريف الفروع</button>
                        <button onclick="adminTab='employees'; render();" class="w-full text-right px-4 py-2.5 rounded-xl font-semibold transition ${adminTab==='employees'?'bg-pink-50 text-pink-600':'text-gray-600 hover:bg-gray-50'}">إضافة موظفة جديدة</button>
                        <button onclick="adminTab='salaries'; render();" class="w-full text-right px-4 py-2.5 rounded-xl font-semibold transition ${adminTab==='salaries'?'bg-pink-50 text-pink-600':'text-gray-600 hover:bg-gray-50'}">إدارة المرتبات الأساسية</button>
                        <button onclick="adminTab='deductions'; render();" class="w-full text-right px-4 py-2.5 rounded-xl font-semibold transition ${adminTab==='deductions'?'bg-pink-50 text-pink-600':'text-gray-600 hover:bg-gray-50'}">إضافة الخصومات</button>
                        <button onclick="adminTab='advances'; render();" class="w-full text-right px-4 py-2.5 rounded-xl font-semibold transition ${adminTab==='advances'?'bg-pink-50 text-pink-600':'text-gray-600 hover:bg-gray-50'}">طلبات السلف (${advances.filter(a=>a.status==='قيد المراجعة').length})</button>
                        <button onclick="adminTab='inquiry'; render();" class="w-full text-right px-4 py-2.5 rounded-xl font-semibold transition ${adminTab==='inquiry'?'bg-pink-50 text-pink-600':'text-gray-600 hover:bg-gray-50'}">قائمة الاستعلام والرواتب والطباعة</button>
                        <hr class="my-2">
                        <button onclick="adminTab='report_doujan'; render();" class="w-full text-right px-4 py-2.5 rounded-xl font-semibold transition ${adminTab==='report_doujan'?'bg-pink-50 text-pink-600':'text-gray-600 hover:bg-gray-50'}">فرع الدواجن (حضور ومصاريف)</button>
                        <button onclick="adminTab='report_hadayek'; render();" class="w-full text-right px-4 py-2.5 rounded-xl font-semibold transition ${adminTab==='report_hadayek'?'bg-pink-50 text-pink-600':'text-gray-600 hover:bg-gray-50'}">فرع حدائق حلوان (حضور ومصاريف)</button>
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
    const expenses = DB.get('expenses');

    const totalSalaries = employees.reduce((s, e) => s + e.salary, 0);
    const totalAdvances = advances.reduce((s, a) => s + a.amount, 0);
    const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
    const expDoujan = expenses.filter(x => x.branch === 'الدواجن').reduce((s, x) => s + x.amount, 0);
    const expHadayek = expenses.filter(x => x.branch === 'حدائق حلوان').reduce((s, x) => s + x.amount, 0);

    return `
        <div class="space-y-6 max-w-5xl">
            <h3 class="text-2xl font-bold text-gray-800">لوحة المؤشرات والحسابات الشاملة</h3>
            <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div class="bg-white p-5 rounded-2xl shadow-sm border"><p class="text-gray-400 text-xs">إجمالي المرتبات الأساسية</p><h3 class="text-xl font-bold mt-1 text-pink-600">${totalSalaries} ج.م</h3></div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border"><p class="text-gray-400 text-xs">إجمالي السلف المعتمدة</p><h3 class="text-xl font-bold mt-1 text-amber-600">${totalAdvances} ج.م</h3></div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border"><p class="text-gray-400 text-xs">إجمالي الخصومات</p><h3 class="text-xl font-bold mt-1 text-red-600">${totalDeductions} ج.م</h3></div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border"><p class="text-gray-400 text-xs">مصاريف فرع الدواجن</p><h3 class="text-xl font-bold mt-1 text-blue-600">${expDoujan} ج.م</h3></div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border"><p class="text-gray-400 text-xs">مصاريف حدائق حلوان</p><h3 class="text-xl font-bold mt-1 text-purple-600">${expHadayek} ج.م</h3></div>
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

    const newCodes = {
        'الدواجن': codeDoujan,
        'حدائق حلوان': codeHadayek
    };
    database.ref('branch_expense_codes').set(newCodes).then(() => {
        alert('تم تحديث أكواد مصاريف الفروع بنجاح.');
    });
}

function renderAdminEmployeesTab() {
    const employees = DB.get('employees');
    return `
        <div class="space-y-6 max-w-3xl">
            <h3 class="text-xl font-bold">إضافة موظفة جديدة</h3>
            <div class="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" id="empName" placeholder="اسم الموظفة" class="px-4 py-2.5 border rounded-xl">
                    <input type="text" id="empCode" placeholder="كود الموظفة (رقم البصمة)" class="px-4 py-2.5 border rounded-xl">
                    <select id="empBranch" class="px-4 py-2.5 border rounded-xl bg-white">
                        <option value="الدواجن">فرع الدواجن</option>
                        <option value="حدائق حلوان">فرع حدائق حلوان</option>
                    </select>
                    <input type="number" id="empSalary" placeholder="المرتب الأساسي" class="px-4 py-2.5 border rounded-xl">
                </div>
                <button onclick="saveNewEmployee()" class="bg-pink-600 text-white px-6 py-2.5 rounded-xl font-semibold">حفظ الموظفة</button>
            </div>

            <h4 class="text-lg font-bold mt-6">قائمة الموظفات</h4>
            <div class="bg-white rounded-2xl shadow-sm border overflow-hidden divide-y">
                ${employees.map(e => `
                    <div class="p-4 flex justify-between items-center">
                        <div>
                            <p class="font-bold">${e.name} <span class="text-xs text-pink-600">(${e.branch})</span></p>
                            <p class="text-xs text-gray-400">الكود: ${e.code} | المرتب: ${e.salary} ج.م</p>
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

    if (!nameEl || !codeEl || !branchEl || !salaryEl) return;
    const name = nameEl.value;
    const code = codeEl.value;
    const branch = branchEl.value;
    const salary = parseFloat(salaryEl.value);
    if (!name || !code || !salary) return alert('الرجاء إكمال البيانات');
    const employees = DB.get('employees');
    employees.push({ id: Date.now(), name, code, branch, salary, active: true });
    DB.set('employees', employees);
    alert('تمت الإضافة بنجاح');
}

function renderAdminSalariesTab() {
    const employees = DB.get('employees');
    return `
        <div class="space-y-6 max-w-3xl">
            <h3 class="text-xl font-bold">إدارة وتعديل المرتبات الأساسية</h3>
            <div class="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
                ${employees.map(e => `
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div>
                            <p class="font-bold">${e.name} <span class="text-xs text-gray-500">(${e.branch})</span></p>
                            <p class="text-xs text-gray-400">الكود: ${e.code}</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <input type="number" id="sal_${e.id}" value="${e.salary}" class="w-32 px-3 py-1.5 border rounded-lg bg-white">
                            <button onclick="updateSalary(${e.id})" class="bg-gray-800 text-white px-4 py-1.5 rounded-lg text-xs">تحديث</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function updateSalary(id) {
    const inputField = document.getElementById(`sal_${id}`);
    if (!inputField) return;
    const newSal = parseFloat(inputField.value);
    let employees = DB.get('employees');
    employees = employees.map(e => e.id === id ? { ...e, salary: newSal } : e);
    DB.set('employees', employees);
    alert('تم التحديث بنجاح');
}

function renderAdminDeductionsTab() {
    const employees = DB.get('employees');
    const deductions = DB.get('deductions');
    return `
        <div class="space-y-6 max-w-3xl">
            <h3 class="text-xl font-bold">إضافة خصم</h3>
            <div class="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
                <select id="dedEmpCode" class="w-full px-4 py-2.5 border rounded-xl bg-white">
                    ${employees.map(e => `<option value="${e.code}">${e.name} (${e.branch} - ${e.code})</option>`).join('')}
                </select>
                <input type="number" id="dedAmount" placeholder="قيمة الخصم" class="w-full px-4 py-2.5 border rounded-xl">
                <input type="text" id="dedReason" placeholder="سبب الخصم" class="w-full px-4 py-2.5 border rounded-xl">
                <button onclick="saveDeduction()" class="bg-pink-600 text-white px-6 py-2.5 rounded-xl font-semibold">تسجيل الخصم</button>
            </div>

            <h4 class="text-lg font-bold mt-6">الخصومات المسجلة</h4>
            <div class="bg-white rounded-2xl shadow-sm border p-4 space-y-2">
                ${deductions.map(d => `
                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded-xl text-sm">
                        <span>كود: <strong>${d.code}</strong> | مبلغ: <strong class="text-red-600">-${d.amount} ج.م</strong> (${d.reason})</span>
                        <button onclick="deleteRecord('deductions', ${d.id})" class="text-red-500 text-xs hover:underline">حذف</button>
                    </div>
                `).join('') || '<p class="text-gray-400 text-sm">لا توجد خصومات</p>'}
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
    const reason = reasonEl.value;
    if (!amount || !reason) return alert('أدخل المبلغ والسبب');
    const deductions = DB.get('deductions');
    deductions.push({ id: Date.now(), code, amount, reason, date: new Date().toLocaleDateString('ar-EG') });
    DB.set('deductions', deductions);
    alert('تم التسجيل');
}

function renderAdminAdvancesTab() {
    const advances = DB.get('advances');
    return `
        <div class="space-y-6 max-w-4xl">
            <h3 class="text-xl font-bold">متابعة السلف</h3>
            <div class="bg-white rounded-2xl shadow-sm border p-4 space-y-3">
                ${advances.map(a => `
                    <div class="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                        <div>
                            <p class="font-bold">${a.empName} (${a.branch}) - سلفة: <strong>${a.amount} ج.م</strong></p>
                            <p class="text-xs text-gray-400">السبب: ${a.reason}</p>
                        </div>
                        <div class="space-x-2 space-x-reverse flex items-center">
                            ${a.status === 'قيد المراجعة' ? `
                                <button onclick="updateAdvance(${a.id}, 'موافق')" class="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs">موافقة</button>
                                <button onclick="updateAdvance(${a.id}, 'مرفوض')" class="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs">رفض</button>
                            ` : `<span class="text-xs font-bold ${a.status==='موافق'?'text-green-600':'text-red-600'}">${a.status}</span>`}
                            <button onclick="deleteRecord('advances', ${a.id})" class="text-red-500 text-xs hover:underline mr-2">حذف</button>
                        </div>
                    </div>
                `).join('') || '<p class="text-gray-400 text-sm">لا توجد طلبات</p>'}
            </div>
        </div>
    `;
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
    const paidList = DB.get('salaries_paid');

    return `
        <div class="space-y-6 max-w-5xl">
            <h3 class="text-xl font-bold">قائمة الاستعلام المالي وحالة القبض والطباعة</h3>
            <div class="space-y-4">
                ${employees.map(e => {
                    const empDed = deductions.filter(d => d.code === e.code).reduce((s, d) => s + d.amount, 0);
                    const empAdv = advances.filter(a => a.code === e.code && a.status === 'موافق').reduce((s, a) => s + a.amount, 0);
                    const net = e.salary - empDed - empAdv;
                    const isPaid = paidList.find(p => p.code === e.code);

                    return `
                        <div class="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
                            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h4 class="font-bold text-lg text-pink-600">${e.name} <span class="text-xs text-gray-500">(${e.branch} - كود: ${e.code})</span></h4>
                                    <p class="text-xs text-gray-500 mt-1">الأساسي: ${e.salary} | الخصومات: -${empDed} | السلف: -${empAdv} | <strong>الصافي: ${net} ج.م</strong></p>
                                </div>
                                <div class="flex items-center gap-2">
                                    ${isPaid ? `<span class="bg-green-100 text-green-700 px-3 py-1 rounded-xl text-xs font-bold">تم إرسال إشعار القبض (${isPaid.month})</span>` : `
                                        <button onclick="markAsPaid('${e.code}', '${e.name}')" class="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-semibold">إرسال إشعار القبض</button>
                                    `}
                                    <button onclick="printInvoice('${e.code}')" class="bg-gray-800 text-white px-4 py-2 rounded-xl text-xs font-semibold">طباعة الكشف</button>
                                    <button onclick="downloadInvoiceImage('${e.code}')" class="bg-pink-600 text-white px-4 py-2 rounded-xl text-xs font-semibold">حفظ كصورة</button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
        <div id="printArea" style="display:none;"></div>
    `;
}

function markAsPaid(code, name) {
    const month = prompt('أدخل اسم الشهر الذي تم قبضه (مثال: أغسطس 2026):', 'أغسطس 2026');
    if (!month) return;
    const paidList = DB.get('salaries_paid');
    paidList.push({ code, month, date: new Date().toLocaleDateString('ar-EG') });
    DB.set('salaries_paid', paidList);
    alert(`تم إرسال إشعار القبض لشهر ${month} إلى الموظفة ${name} بنجاح.`);
}

function prepareInvoiceHTML(code) {
    const employees = DB.get('employees');
    const e = employees.find(x => x.code === code);
    if (!e) return '';
    const deductions = DB.get('deductions').filter(d => d.code === code);
    const advances = DB.get('advances').filter(a => a.code === code && a.status === 'موافق');

    const totalDed = deductions.reduce((s, d) => s + d.amount, 0);
    const totalAdv = advances.reduce((s, a) => s + a.amount, 0);
    const net = e.salary - totalDed - totalAdv;

    return `
        <div id="invoiceCard" style="direction: rtl; font-family: Arial, sans-serif; padding: 40px; background: #ffffff; color: #000000; width: 700px; margin: 0 auto; border-radius: 20px; border: 2px solid #f3e8ff; box-sizing: border-box;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #db2777; margin: 0; font-size: 24px;">صالون نوسا</h2>
                <p style="color: #6b7280; font-size: 14px; margin: 5px 0 0 0;">كشف حساب المرتب الشهري</p>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; font-size: 15px; margin-bottom: 20px;">
                <p style="margin: 0;"><strong>اسم الموظفة:</strong> ${e.name}</p>
                <p style="margin: 0;"><strong>الفرع:</strong> ${e.branch}</p>
                <p style="margin: 0;"><strong>كود البصمة:</strong> ${e.code}</p>
            </div>
            <table border="1" cellpadding="12" cellspacing="0" style="width: 100%; border-collapse: collapse; text-align: right; border-color: #e5e7eb; font-size: 14px;">
                <tr style="background: #fdf2f8;"><th style="color: #374151;">البند المالي</th><th style="text-align: left; color: #374151;">القيمة</th></tr>
                <tr><td>المرتب الأساسي</td><td style="text-align: left;">${e.salary} ج.م</td></tr>
                <tr><td>إجمالي الخصومات</td><td style="text-align: left; color: #dc2626;">-${totalDed} ج.م</td></tr>
                <tr><td>إجمالي السلف المعتمدة</td><td style="text-align: left; color: #dc2626;">-${totalAdv} ج.م</td></tr>
                <tr style="background: #fdf2f8; font-weight: bold;"><td>صافي المستحق النهائي</td><td style="text-align: left; color: #db2777; font-size: 16px;">${net} ج.م</td></tr>
            </table>
            <br><br>
            <div style="display: flex; justify-content: space-between; font-size: 14px; margin-top: 40px;">
                <p>توقيع الإدارة: ....................................</p>
                <p>توقيع الموظفة: ....................................</p>
            </div>
        </div>
    `;
}

function printInvoice(code) {
    const printDiv = document.getElementById('printArea');
    if (!printDiv) return;
    printDiv.innerHTML = prepareInvoiceHTML(code);
    
    const win = window.open('', '', 'height=700,width=800');
    if (!win) return alert('الرجاء السماح للمتصفح بفتح النوافذ المنبثقة للطباعة');
    win.document.write('<html><head><title>طباعة الكشف</title></head><body style="margin:0; padding:20px; display:flex; justify-content:center; align-items:center;">');
    win.document.write(printDiv.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => {
        win.print();
        win.close();
    }, 500);
}

function downloadInvoiceImage(code) {
    const printDiv = document.getElementById('printArea');
    if (!printDiv) return;
    printDiv.innerHTML = prepareInvoiceHTML(code);
    printDiv.style.display = 'block';
    
    const card = document.getElementById('invoiceCard');
    if (!card) return;
    
    html2canvas(card, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff' 
    }).then(canvas => {
        printDiv.style.display = 'none';
        
        const link = document.createElement('a');
        link.download = `كشف_مرتب_${code}_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }).catch(err => {
        printDiv.style.display = 'none';
        alert('حدث خطأ في الحفظ، يمكنك أخذ لقطة شاشة (Screenshot) مباشرة للكشف.');
    });
}

// --- شاشة موحدة لمتابعة حضور ومصاريف الفرع ---
function renderUnifiedBranchControlPanel(branchName) {
    const today = new Date().toLocaleDateString('ar-EG');
    const employees = DB.get('employees').filter(e => e.branch === branchName && e.active);
    const attendance = DB.get('attendance').filter(a => a.branch === branchName && a.date === today);
    const expenses = DB.get('expenses').filter(x => x.branch === branchName);

    const reportData = employees.map(emp => {
        const records = attendance.filter(a => a.code === emp.code);
        const hasCheckIn = records.some(a => a.type === 'حضور');
        const hasCheckOut = records.some(a => a.type === 'انصراف');
        
        let status = 'غياب (لم تسجل حضور)';
        let badgeColor = 'bg-red-100 text-red-700';
        
        if (hasCheckIn && hasCheckOut) {
            status = 'حاضرة (وانصرفت)';
            badgeColor = 'bg-blue-100 text-blue-700';
        } else if (hasCheckIn) {
            status = 'حاضرة الآن في الفرع';
            badgeColor = 'bg-green-100 text-green-700';
        }

        return { ...emp, status, badgeColor, records };
    });

    const totalCount = employees.length;
    const presentCount = reportData.filter(r => r.status.includes('حاضرة')).length;
    const absentCount = totalCount - presentCount;
    const totalExpensesAmount = expenses.reduce((s, x) => s + x.amount, 0);

    return `
        <div class="space-y-6 max-w-5xl">
            <div class="flex justify-between items-center">
                <h3 class="text-xl font-bold text-gray-800">لوحة متابعة فرع ${branchName} (اليوم: ${today})</h3>
                <button onclick="clearTodayAttendance('${branchName}')" class="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-semibold">تصفير سجل حضور اليوم</button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-white p-5 rounded-2xl shadow-sm border"><p class="text-gray-400 text-xs">إجمالي موظفات الفرع</p><h3 class="text-2xl font-bold mt-1 text-gray-800">${totalCount}</h3></div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border"><p class="text-gray-400 text-xs">الحاضرات الآن</p><h3 class="text-2xl font-bold mt-1 text-green-600">${presentCount}</h3></div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border"><p class="text-gray-400 text-xs">الغائبات</p><h3 class="text-2xl font-bold mt-1 text-red-600">${absentCount}</h3></div>
            </div>

            <div class="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div class="p-4 bg-gray-50 border-b font-bold text-sm text-gray-700">متابعة حضور وانصراف الموظفات لحظةً بلحظة</div>
                <div class="divide-y">
                    ${reportData.map(r => `
                        <div class="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                            <div>
                                <p class="font-bold text-gray-800">${r.name} <span class="text-xs text-gray-400">(كود: ${r.code})</span></p>
                                <p class="text-xs text-gray-500 mt-1">
                                    ${r.records.map(rec => `${rec.type}: ${rec.time}`).join(' | ') || 'لا توجد تسجيلات بعد'}
                                </p>
                            </div>
                            <span class="px-3 py-1 rounded-xl text-xs font-bold ${r.badgeColor}">${r.status}</span>
                        </div>
                    `).join('') || '<p class="p-4 text-gray-400 text-sm">لا توجد موظفات مسجلات في هذا الفرع.</p>'}
                </div>
            </div>

            <div class="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
                <div class="flex justify-between items-center">
                    <div>
                        <h4 class="font-bold text-amber-600">مصاريف فرع ${branchName} المسجلة</h4>
                        <p class="text-xs text-gray-400 mt-0.5">الإجمالي الكلي لمصاريف الفرع: <strong class="text-pink-600">${totalExpensesAmount} ج.م</strong></p>
                    </div>
                    <button onclick="clearBranchExpenses('${branchName}')" class="bg-red-600 text-white px-4 py-1.5 rounded-xl text-xs font-semibold">تصفير مصاريف الفرع</button>
                </div>
                <div class="divide-y">
                    ${expenses.map(x => `
                        <div class="py-3 flex justify-between items-center text-sm">
                            <span>كود الفرع: <strong>${x.code}</strong> | الخدمة/البيان: <strong>${x.reason}</strong> <span class="text-xs text-gray-400">(${x.date})</span></span>
                            <span class="text-red-600 font-bold">${x.amount} ج.م</span>
                        </div>
                    `).join('') || '<p class="text-gray-400 text-sm">لا توجد مصاريف مسجلة لهذا الفرع حتى الآن</p>'}
                </div>
            </div>
        </div>
    `;
}

function clearTodayAttendance(branchName) {
    if (!confirm(`هل أنت متأكد من تصفير سجل حضور فرع ${branchName} لليوم؟`)) return;
    const today = new Date().toLocaleDateString('ar-EG');
    let attendance = DB.get('attendance');
    attendance = attendance.filter(a => !(a.branch === branchName && a.date === today));
    DB.set('attendance', attendance);
    alert('تم تصفير السجل بنجاح.');
}

function clearBranchExpenses(branchName) {
    if (!confirm(`هل أنت متأكد من حذف وتصفير جميع مصاريف ${branchName}؟`)) return;
    let expenses = DB.get('expenses');
    expenses = expenses.filter(x => x.branch !== branchName);
    DB.set('expenses', expenses);
    alert('تم تصفير مصاريف الفرع بنجاح.');
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
    const advances = DB.get('advances').filter(a => a.code === emp.code);
    const deductions = DB.get('deductions').filter(d => d.code === emp.code);
    const paidList = DB.get('salaries_paid').filter(p => p.code === emp.code);

    const totalDed = deductions.reduce((sum, d) => sum + d.amount, 0);
    const totalAdv = advances.filter(a => a.status === 'موافق').reduce((sum, a) => sum + a.amount, 0);
    const net = emp.salary - totalDed - totalAdv;

    return `
        <header class="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
            <div>
                <h2 class="text-xl font-bold text-gray-800">مرحباً بك، ${emp.name}</h2>
                <p class="text-xs text-gray-400">الفرع: ${emp.branch} | كود البصمة: ${emp.code}</p>
            </div>
            <button onclick="currentView='login_portal'; activeEmployee=null; sessionStorage.clear(); render();" class="text-red-600 font-semibold hover:underline text-sm">تسجيل الخروج</button>
        </header>
        <main class="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6">
            ${paidList.length ? `
                <div class="bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-2xl flex items-center justify-between">
                    <span>🎉 <strong>إشعار من الإدارة:</strong> تم إرسال مرتبك بالكامل لشهر <strong>${paidList[paidList.length - 1].month}</strong> بنجاح!</span>
                </div>
            ` : ''}

            <div class="bg-white p-6 rounded-3xl shadow-sm border text-center space-y-4">
                <h3 class="text-lg font-bold">تسجيل الحضور والانصراف</h3>
                <div class="space-x-4 space-x-reverse">
                    <button onclick="recordAttendance('حضور')" class="bg-green-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-green-700">تسجيل حضور</button>
                    <button onclick="recordAttendance('انصراف')" class="bg-amber-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-amber-700">تسجيل انصراف</button>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="bg-white p-5 rounded-2xl shadow-sm border"><p class="text-gray-400 text-sm">المرتب الأساسي</p><h3 class="text-2xl font-bold mt-1">${emp.salary} ج.م</h3></div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border"><p class="text-gray-400 text-sm">الخصومات</p><h3 class="text-2xl font-bold mt-1 text-red-600">-${totalDed} ج.م</h3></div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border"><p class="text-gray-400 text-sm">السلف المعتمدة</p><h3 class="text-2xl font-bold mt-1 text-yellow-600">-${totalAdv} ج.م</h3></div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border"><p class="text-gray-400 text-sm">الصافي المستحق</p><h3 class="text-2xl font-bold mt-1 text-pink-600">${net} ج.م</h3></div>
            </div>

            <div class="bg-white p-6 rounded-3xl shadow-sm border space-y-4">
                <h3 class="text-lg font-bold">طلب سلفة مالية جديدة</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="number" id="advAmount" placeholder="المبلغ" class="px-4 py-2.5 border rounded-xl">
                    <input type="text" id="advReason" placeholder="السبب" class="px-4 py-2.5 border rounded-xl">
                </div>
                <button onclick="requestAdvance()" class="bg-pink-600 text-white px-6 py-2.5 rounded-xl font-semibold">إرسال الطلب</button>
            </div>
        </main>
    `;
}

function recordAttendance(type) {
    if (!activeEmployee) return;
    const attendance = DB.get('attendance');
    attendance.push({
        id: Date.now(),
        code: activeEmployee.code,
        name: activeEmployee.name,
        branch: activeEmployee.branch,
        type: type,
        time: new Date().toLocaleTimeString('ar-EG'),
        date: new Date().toLocaleDateString('ar-EG')
    });
    DB.set('attendance', attendance);
    alert(`تم تسجيل ${type} بنجاح وتحديث بيانات الفرع عند الإدارة فوراً.`);
}

function requestAdvance() {
    const amountEl = document.getElementById('advAmount');
    const reasonEl = document.getElementById('advReason');
    if (!amountEl || !reasonEl || !activeEmployee) return;

    const amount = parseFloat(amountEl.value);
    const reason = reasonEl.value;
    if (!amount || !reason) return alert('أدخل المبلغ والسبب');
    const advances = DB.get('advances');
    advances.push({
        id: Date.now(),
        code: activeEmployee.code,
        empName: activeEmployee.name,
        branch: activeEmployee.branch,
        amount,
        reason,
        status: 'قيد المراجعة',
        date: new Date().toLocaleDateString('ar-EG')
    });
    DB.set('advances', advances);
    alert('تم الإرسال للإدارة');
}

render();
