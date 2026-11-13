import { useState } from 'react';
import { api } from './api';

export function Login({ onAuthenticated }) {
    const [form, setForm] = useState({ role: 'employee', login: '', password: '' });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const change = e => setForm(current => ({ ...current, [e.target.name]: e.target.value }));
    async function submit(e) {
        e.preventDefault(); if (busy) return;
        setBusy(true); setError('');
        try { onAuthenticated(await api('/auth/login', { method: 'POST', body: JSON.stringify(form) })); }
        catch (e) { setError(e.message); setForm(current => ({ ...current, password: '' })); }
        finally { setBusy(false); }
    }
    return <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 text-slate-900">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8">
            <p className="font-semibold text-indigo-600">PayDayเว้ย</p>
            <h1 className="mb-6 mt-2 text-2xl font-bold">เข้าสู่ระบบสิว่ะ</h1>
            <form onSubmit={submit}><fieldset disabled={busy} className="grid gap-4">
                <label>ประเภทบัญชี<select aria-label="ประเภทบัญชี" name="role" value={form.role} onChange={change}><option value="employee">พนักงาน</option><option value="admin">ผู้ดูแลระบบ</option></select></label>
                <label>{form.role === 'employee' ? 'รหัสพนักงาน' : 'ชื่อผู้ดูแลระบบ'}<input autoComplete="username" required name="login" maxLength="100" value={form.login} onChange={change} /></label>
                <label>รหัสผ่าน<input type="password" autoComplete="current-password" required name="password" maxLength="128" value={form.password} onChange={change} /></label>
                <button className="primary">{busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</button>
            </fieldset></form>
            {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
            <p className="mt-6 text-sm text-slate-500">พนักงานที่ยังไม่มีบัญชีหรือลืมรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบ</p>
        </section>
    </main>;
}
export function ChangePassword({ required, onChanged, onCancel }) {
    const [current, setCurrent] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    async function submit(e) {
        e.preventDefault(); if (busy) return;
        if (password !== confirm) return setError('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');
        setBusy(true); setError('');
        try { onChanged(await api('/auth/password', { method: 'POST', body: JSON.stringify({ current_password: current, new_password: password }) })); }
        catch (e) { setError(e.message); }
        finally { setBusy(false); }
    }
    return <main className="min-h-screen bg-slate-100 px-4 py-10"><section className="mx-auto max-w-lg rounded-2xl bg-white p-6">
        <h1 className="mb-4 text-xl font-bold">{required ? 'เปลี่ยนรหัสผ่านชั่วคราว' : 'เปลี่ยนรหัสผ่าน'}</h1>
        {required && <p className="mb-4">กรุณาตั้งรหัสผ่านใหม่ก่อนเข้าดูข้อมูลของมึง</p>}
        <form onSubmit={submit}><fieldset disabled={busy} className="grid gap-4">
            <label>รหัสผ่านปัจจุบัน<input required type="password" autoComplete="current-password" maxLength="128" value={current} onChange={e => setCurrent(e.target.value)} /></label>
            <label>รหัสผ่านใหม่<input required type="password" autoComplete="new-password" minLength="4" maxLength="128" value={password} onChange={e => setPassword(e.target.value)} /></label>
            <label>ยืนยันรหัสผ่านใหม่<input required type="password" autoComplete="new-password" minLength="4" maxLength="128" value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
            <p className="text-sm text-slate-500">ใช้รหัสผ่าน 4–128 ตัวอักษร และต้องต่างจากรหัสผ่านเดิม</p>
            <button className="primary">{busy ? 'กำลังบันทึก…' : 'บันทึกรหัสผ่านใหม่'}</button>
        </fieldset></form>
        {!required && <button type="button" disabled={busy} onClick={onCancel} className="mt-4 text-indigo-600">ยกเลิก</button>}
        {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
    </section></main>;
}
