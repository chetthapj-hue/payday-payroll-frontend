import { useEffect, useState } from 'react';
import AdminDashboard from './AdminDashboard';
import EmployeeDashboard from './EmployeeDashboard';
import { Login, ChangePassword } from './AuthForms';
import { api, setAuthSession } from './api';

export default function App() {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [changing, setChanging] = useState(false);
    const [error, setError] = useState('');
    function authenticated(data) {
        setAuthSession(data); setSession(data); setChanging(false); setError('');
    }
    useEffect(() => {
        const controller = new AbortController();
        api('/auth/session', { signal: controller.signal }).then(data => {
            if (!controller.signal.aborted) { setAuthSession(data); setSession(data); }
        }).catch(e => { if (!controller.signal.aborted && e.status !== 401) setError(e.message); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        const expired = () => { setSession(null); setChanging(false); setAuthSession(null); };
        window.addEventListener('payday-session-expired', expired);
        return () => { controller.abort(); window.removeEventListener('payday-session-expired', expired); };
    }, []);
    async function logout() {
        try { await api('/auth/logout', { method: 'POST', body: '{}' }); authenticated(null); }
        catch (e) { if (e.status === 401) authenticated(null); else setError(e.message); }
    }
    if (loading) return <p role="status" className="p-8">กำลังตรวจสอบการเข้าสู่ระบบ…</p>;
    if (!session) return <>{error && <p role="alert" className="bg-red-50 p-4 text-red-700">{error}</p>}<Login onAuthenticated={authenticated} /></>;
    return <div className="min-h-screen bg-slate-100 text-slate-900">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-4">
            <p>{session.user.full_name} <span className="text-sm text-slate-500">({session.user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงาน'})</span></p>
            <div className="flex gap-4">
                {!session.user.must_change_password && <button type="button" className="text-indigo-600" onClick={() => setChanging(true)}>เปลี่ยนรหัสผ่าน</button>}
                <button type="button" onClick={logout}>ออกจากระบบ</button>
            </div>
        </header>
        {error && <p role="alert" className="p-4 text-red-700">{error}</p>}
        {session.user.must_change_password || changing
            ? <ChangePassword required={session.user.must_change_password} onChanged={authenticated} onCancel={() => setChanging(false)} />
            : session.user.role === 'admin' ? <AdminDashboard /> : <EmployeeDashboard user={session.user} />}
    </div>;
}
