import { useEffect, useRef, useState } from 'react';
import { api } from './api';

export default function EmployeeRemoval({ employee, onCancel, onCompleted }) {
    const dialog = useRef(null);
    const [check, setCheck] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        const element = dialog.current;
        element.showModal();
        const controller = new AbortController();
        api(`/employees/${employee.id}/deletion-check`, { signal: controller.signal })
            .then(data => { if (!controller.signal.aborted) setCheck(data); })
            .catch(e => { if (!controller.signal.aborted) setError(e.message); });
        return () => { controller.abort(); element.close(); };
    }, [employee.id]);
    async function confirm() {
        if (busy || !check) return;
        setBusy(true); setError('');
        try {
            const data = await api(check.can_delete ? `/employees/${employee.id}` : `/employees/${employee.id}/deactivate`, {
                method: check.can_delete ? 'DELETE' : 'POST', body: '{}',
            });
            onCompleted(data);
        } catch (e) {
            setError(e.message);
            if (e.code === 'EMPLOYEE_HAS_HISTORY') setCheck({ can_delete: false });
        } finally { setBusy(false); }
    }
    return <dialog ref={dialog} aria-labelledby="employee-removal-title" onCancel={e => { e.preventDefault(); if (!busy) onCancel(); }}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-slate-200 p-6 text-slate-900 backdrop:bg-slate-900/40">
        <h2 id="employee-removal-title" className="text-xl font-bold">ยืนยันการจัดการพนักงาน</h2>
        <p className="mt-4 font-semibold">{employee.employee_code} — {employee.full_name}</p>
        {!check && !error && <p role="status" className="mt-4">กำลังตรวจบัญชีและประวัติ…</p>}
        {check && <p className="mt-4">{check.can_delete
            ? 'พนักงานไม่มีบัญชีหรือประวัติงานและเงินเดือน ต้องการลบพนักงานนี้ถาวรหรือไม่?'
            : 'พนักงานมีบัญชีหรือประวัติงานและเงินเดือน จึงลบถาวรไม่ได้ สามารถปิดสถานะพนักงานเพื่อยกเลิกการเข้าสู่ระบบและซ่อนจากตัวเลือกลงเวลางานใหม่ โดยยังเก็บประวัติและรายงานเดิมไว้'}</p>}
        {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button type="button" disabled={busy} onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2">ยกเลิก</button>
            {check && (check.can_delete || employee.is_active) && <button type="button" disabled={busy} onClick={confirm} className="rounded-lg bg-red-600 px-4 py-2 text-white">
                {busy ? 'กำลังทำรายการ…' : check.can_delete ? 'ยืนยันลบพนักงาน' : 'ปิดสถานะพนักงาน'}
            </button>}
            {check && !check.can_delete && !employee.is_active && <p>พนักงานนี้ปิดสถานะแล้ว</p>}
        </div>
    </dialog>;
}
