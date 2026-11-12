import { useEffect, useState } from 'react';
import { api } from './api';

export default function EmployeeAccounts({ employees }) {
    const [accounts, setAccounts] = useState([]);
    const [employeeId, setEmployeeId] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const account = accounts.find(a => a.employee_id === Number(employeeId));
    useEffect(() => {
        const controller = new AbortController();
        api('/accounts', { signal: controller.signal }).then(rows => { if (!controller.signal.aborted) setAccounts(rows); })
            .catch(e => { if (!controller.signal.aborted) setError(e.message); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, []);
    async function action(disable = false) {
        if (busy || !employeeId || loading) return;
        setBusy(true); setError(''); setNotice('');
        try {
            const endpoint = disable ? 'disable-account' : account ? 'reset-password' : 'account';
            const row = await api(`/employees/${employeeId}/${endpoint}`, {
                method: 'POST', body: JSON.stringify(disable ? {} : { temporary_password: password }),
            });
            setAccounts(current => [...current.filter(a => a.employee_id !== row.employee_id), row]);
            setPassword('');
            setNotice(disable ? 'ปิดบัญชีและยกเลิก session ทั้งหมดแล้ว' : account ? 'ตั้งรหัสผ่านชั่วคราวใหม่และยกเลิก session เดิมแล้ว' : 'สร้างบัญชีแล้ว พนักงานต้องเปลี่ยนรหัสผ่านชั่วคราวเมื่อเข้าสู่ระบบ');
        } catch (e) { setError(e.message); }
        finally { setBusy(false); }
    }
    return <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">บัญชีเข้าสู่ระบบพนักงาน</h2>
        <form onSubmit={e => { e.preventDefault(); action(); }}><fieldset disabled={busy || loading} className="grid gap-4 sm:grid-cols-2">
            <label>เลือกพนักงานสำหรับบัญชี<select aria-label="เลือกพนักงานสำหรับบัญชี" required value={employeeId} onChange={e => { setEmployeeId(e.target.value); setPassword(''); setError(''); setNotice(''); }}>
                <option value="">เลือกพนักงาน</option>{employees.map(e => {
                    const a = accounts.find(a => a.employee_id === e.id);
                    return <option key={e.id} value={e.id}>{e.employee_code} — {e.full_name} ({!a ? 'ยังไม่มีบัญชี' : a.is_active ? 'เปิดใช้งาน' : 'ปิดบัญชี'})</option>;
                })}
            </select></label>
            <label>รหัสผ่านชั่วคราว<input required type="password" autoComplete="new-password" minLength="4" maxLength="128" value={password} onChange={e => setPassword(e.target.value)} /></label>
            {employeeId && <p className="text-sm sm:col-span-2">สถานะ: {!account ? 'ยังไม่มีบัญชี' : !account.is_active ? 'ปิดบัญชี' : account.must_change_password ? 'รอเปลี่ยนรหัสผ่านชั่วคราว' : 'เปิดใช้งาน'} — ใช้รหัสพนักงานปัจจุบันเพื่อเข้าสู่ระบบ</p>}
            <button disabled={!employeeId} className="primary">{busy ? 'กำลังทำรายการ…' : account ? 'รีเซ็ตรหัสผ่าน / เปิดบัญชีอีกครั้ง' : 'สร้างบัญชีพนักงาน'}</button>
            {account?.is_active && <button type="button" className="rounded-lg border border-red-300 px-5 py-3 text-red-700" onClick={() => action(true)}>ปิดบัญชีพนักงาน</button>}
        </fieldset></form>
        <p className="mt-4 text-sm text-slate-500">ตั้งรหัสผ่าน 4–128 ตัวอักษร และแจ้งให้พนักงานทราบโดยตรง การรีเซ็ตหรือปิดบัญชีจะยกเลิก session เดิมทั้งหมด</p>
        {loading && <p role="status">กำลังโหลดบัญชี…</p>}
        {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
        {notice && <p role="status" className="mt-4 text-green-700">{notice}</p>}
    </section>;
}
