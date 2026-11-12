import { useEffect, useState } from 'react';
import EmployeeForm from './EmployeeForm';
import WorkLogs from './WorkLogs';
import Payroll from './Payroll';
import EmployeeAccounts from './EmployeeAccounts';
import { api } from './api';
import EmployeeRemoval from './EmployeeRemoval';

const moneyFormatter = new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

function AdminDashboard() {
    const [employees, setEmployees] = useState([]);
    const [tab, setTab] = useState('employees');
    const [editing, setEditing] = useState(null);
    const [removing, setRemoving] = useState(null);
    const [search, setSearch] = useState('');
    const [notice, setNotice] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        async function loadEmployees() {
            try {
                const data = await api('/employees', { signal: controller.signal });
                if (!Array.isArray(data)) {
                    throw new Error('รูปแบบข้อมูลพนักงานไม่ถูกต้อง');
                }

                setEmployees([...data].sort((first, second) =>
                    first.employee_code.localeCompare(second.employee_code)
                ));
            } catch (error) {
                if (!controller.signal.aborted) {
                    setError(error.message);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        loadEmployees();

        return () => controller.abort();
    }, []);

    function handleEmployeeCreated(employee) {
        setEditing(null);
        setEmployees((current) => {
            const updatedEmployees = [...current.filter(item => item.id !== employee.id), employee];

            return updatedEmployees.sort((first, second) =>
                first.employee_code.localeCompare(second.employee_code)
            );
        });
    }

    const visibleEmployees = employees.filter(e => `${e.employee_code} ${e.full_name}`.toLowerCase().includes(search.trim().toLowerCase()));
    function handleRemoved(data) {
        setRemoving(null);
        if (editing?.id === data.id) setEditing(null);
        setEmployees(current => data.deleted ? current.filter(e => e.id !== data.id) : current.map(e => e.id === data.id ? data : e));
        setNotice(data.deleted ? 'ลบพนักงานเรียบร้อยแล้ว' : 'ปิดสถานะพนักงานและยกเลิก session แล้ว ประวัติและรายงานเดิมยังอยู่');
    }
    return (
        <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
            <div className="mx-auto max-w-7xl">
                <header className="mb-8">
                    <p className="font-semibold text-indigo-600">PayDay</p>
                    <h1 className="mt-2 text-3xl font-bold">จัดการเงินเดือน</h1>
                </header>

                <nav aria-label="เมนูหลัก" className="mb-6 flex flex-wrap gap-2">
                    {[['employees', 'พนักงาน'], ['work', 'บันทึกการทำงาน'], ['payroll', 'คำนวณเงินเดือน'], ['reports', 'รายงานที่บันทึก']].map(([id, label]) => (
                        <button type="button" key={id} aria-current={tab === id ? 'page' : undefined}
                            onClick={() => setTab(id)} className={tab === id ? 'rounded-lg bg-indigo-600 px-4 py-2 text-white' : 'rounded-lg bg-white px-4 py-2'}>{label}</button>
                    ))}
                </nav>
                {!loading && !error && tab === 'work' && <WorkLogs employees={employees} />}
                {!loading && !error && (tab === 'payroll' || tab === 'reports') && <Payroll key={tab} reportsOnly={tab === 'reports'} />}
                {!loading && !error && tab === 'employees' && (
                    <>
                        <EmployeeForm key={editing?.id || 'new'} employee={editing} onCancel={() => setEditing(null)} onCreated={handleEmployeeCreated} />
                        <EmployeeAccounts key={employees.map(e => `${e.id}:${e.is_active}`).join(",")} employees={employees.filter(e => e.is_active)} />
                        <label className="mb-6 block">ค้นหาพนักงาน (รวมผู้ที่ปิดสถานะ)<input type="search" aria-label="ค้นหาพนักงาน" value={search} onChange={e => setSearch(e.target.value)} placeholder="รหัสหรือชื่อพนักงาน" /></label>
                    </>
                )}

                {notice && <p role="status" className="mb-4 text-green-700">{notice}</p>}
                {removing && <EmployeeRemoval employee={removing} onCancel={() => setRemoving(null)} onCompleted={handleRemoved} />}
                {loading && (
                    <p role="status">กำลังโหลดรายชื่อพนักงาน…</p>
                )}

                {error && (
                    <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
                        {error} กรุณาตรวจสอบว่า Backend เปิดอยู่
                    </p>
                )}

                {!loading && !error && tab === 'employees' && employees.length === 0 && (
                    <p className="rounded-xl bg-white p-6">
                        ยังไม่มีข้อมูลพนักงาน
                    </p>
                )}

                {!loading && !error && tab === 'employees' && employees.length > 0 && (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                        <table className="w-full min-w-[600px] text-left">
                            <thead className="bg-slate-50 text-sm text-slate-600">
                                <tr>
                                    <th scope="col" className="px-6 py-4">รหัส</th>
                                    <th scope="col" className="px-6 py-4">ชื่อพนักงาน</th>
                                    <th scope="col" className="px-6 py-4">ประเภทค่าจ้าง</th>
                                    <th scope="col" className="px-6 py-4 text-right">
                                        อัตราค่าจ้าง (บาท)
                                    </th>
                                    <th scope="col" className="px-6 py-4">สถานะ</th>
                                    <th scope="col" className="px-6 py-4">จัดการ</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {visibleEmployees.map((employee) => (
                                    <tr key={employee.id}>
                                        <td className="px-6 py-4 font-medium">
                                            {employee.employee_code}
                                        </td>
                                        <td className="px-6 py-4">
                                            {employee.full_name}
                                        </td>
                                        <td className="px-6 py-4">
                                            {employee.pay_type === 'daily'
                                                ? 'รายวัน'
                                                : 'รายเดือน'}
                                        </td>
                                        <td className="px-6 py-4 text-right tabular-nums">
                                            {moneyFormatter.format(Number(employee.pay_rate))}
                                        </td>
                                        <td className="px-6 py-4">{employee.is_active ? 'ใช้งาน' : 'ปิดสถานะ'}</td>
                                        <td className="px-6 py-4"><div className="flex flex-wrap gap-3"><button type="button" className="text-indigo-600" onClick={() => setEditing(employee)}>แก้ไข {employee.employee_code}</button><button type="button" className="text-red-700" aria-label={`ลบพนักงาน ${employee.employee_code}`} onClick={() => setRemoving(employee)}>ลบพนักงาน</button></div></td>
                                    </tr>
                                ))}
                                {visibleEmployees.length === 0 && <tr><td colSpan="6" className="px-6 py-4">ไม่พบพนักงานที่ค้นหา</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </main>
    );
}

export default AdminDashboard;
