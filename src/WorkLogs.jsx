import { useEffect, useState } from 'react';
import { api, money, thaiDate, workHours, workTimePayload } from './api';

const empty = { employee_id: '', work_date: '', overtime_hours: '0', overtime_3x_hours: '0', shift_type: 'day' };
export default function WorkLogs({ employees }) {
    const [form, setForm] = useState(empty);
    const [logs, setLogs] = useState([]);
    const [historyEmployee, setHistoryEmployee] = useState('');
    const [historyMonth, setHistoryMonth] = useState('');
    const activeEmployees = employees.filter(e => e.is_active);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    useEffect(() => {
        const controller = new AbortController();
        api('/work-logs', { signal: controller.signal }).then(data => {
            if (!controller.signal.aborted) setLogs(data);
        }).catch(e => { if (!controller.signal.aborted) setError(e.message); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, []);
    const change = e => setForm(current => ({ ...current, [e.target.name]: e.target.value }));
    async function searchHistory(e) {
        e.preventDefault(); setLoading(true); setError('');
        const params = new URLSearchParams();
        if (historyEmployee) params.set('employee_id', historyEmployee);
        if (historyMonth) params.set('month', historyMonth);
        try { setLogs(await api(`/work-logs?${params}`)); }
        catch (error) { setError(error.message); }
        finally { setLoading(false); }
    }
    async function submit(e) {
        e.preventDefault();
        if (saving) return;
        setError(''); setSuccess('');
        let body;
        try { body = { ...workTimePayload(form), employee_id: Number(form.employee_id) }; }
        catch (error) { return setError(error.message); }
        setSaving(true);
        try {
            const row = await api('/work-logs', { method: 'POST', body: JSON.stringify(body) });
            const employee = employees.find(item => item.id === row.employee_id);
            setLogs(current => [...((!historyEmployee || Number(historyEmployee) === row.employee_id) && (!historyMonth || row.work_date.startsWith(historyMonth)) ? [{ ...row, employee_code: employee.employee_code, full_name: employee.full_name }] : []), ...current]
                .sort((a, b) => b.work_date.localeCompare(a.work_date) || b.id - a.id).slice(0, 100));
            setSuccess('บันทึกเวลาทำงานเรียบร้อยแล้ว');
        } catch (e) {
            setError(e.code === 'WORK_LOG_DUPLICATE' ? 'พนักงานคนนี้มีบันทึกในวันที่เลือกแล้ว กรุณาตรวจสอบรายการด้านล่าง' : e.message);
        } finally { setSaving(false); }
    }
    return <section className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">บันทึกการทำงาน</h2>
            <form onSubmit={submit}><fieldset disabled={saving || activeEmployees.length === 0} className="grid gap-4 sm:grid-cols-2">
                <label>พนักงาน<select required name="employee_id" value={form.employee_id} onChange={change}><option value="">เลือกพนักงาน</option>{activeEmployees.map(e => <option key={e.id} value={e.id}>{e.employee_code} — {e.full_name}</option>)}</select></label>
                <label>วันที่ทำงาน<input required type="date" name="work_date" value={form.work_date} onChange={change} /></label>
                <label>เวลาปกติ<input aria-label="เวลาปกติ" value={workHours(480)} readOnly /><span className="text-sm text-slate-500">เวลาปกติเต็มวัน 8 ชม.</span></label>
                <label>กะ<select name="shift_type" value={form.shift_type} onChange={change}><option value="day">กลางวัน</option><option value="night">กลางคืน (ค่ากะ 150 บาท)</option></select></label>
                <label>OT รวม<span className="flex items-center gap-2"><input aria-label="OT รวม" required type="number" min="0" max="16" step="any" name="overtime_hours" value={form.overtime_hours} onChange={change} /><span>ชม.</span></span></label>
                <label>OT 3 เท่า<span className="flex items-center gap-2"><input aria-label="OT 3 เท่า" required type="number" min="0" max={form.overtime_hours} step="any" name="overtime_3x_hours" value={form.overtime_3x_hours} onChange={change} /><span>ชม.</span></span><span className="text-sm text-slate-500">เป็นส่วนหนึ่งของ OT รวม</span></label>
                <p className="sm:col-span-2">ค่าอาหารตามกติกา: <strong>{money(Math.round(Number(form.overtime_hours) * 60) >= 60 ? 166 : 83)} บาท</strong> (ฐาน 83 บาท + ค่าอาหารเพิ่ม 83 บาทเมื่อ OT รวมตั้งแต่ 1 ชม. เก็บรวมครั้งเดียว)</p>
                <p className="text-sm text-slate-500 sm:col-span-2">กรอกทศนิยมได้ เช่น 1.5 ชม. หรือ 0.25 ชม. ระบบปัดเป็นนาทีเต็มที่ใกล้ที่สุดก่อนบันทึก</p>
                <button className="primary sm:col-span-2">{saving ? 'กำลังบันทึก…' : 'บันทึกเวลาทำงาน'}</button>
            </fieldset></form>
            {activeEmployees.length === 0 && <p className="mt-4">กรุณาเพิ่มพนักงานก่อน</p>}
            {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
            {success && <p role="status" className="mt-4 text-green-700">{success}</p>}
        </div>
        <form onSubmit={searchHistory} className="grid gap-4 rounded-2xl bg-white p-4 sm:grid-cols-3">
            <label>พนักงานสำหรับค้นประวัติ<select aria-label="พนักงานสำหรับค้นประวัติ" value={historyEmployee} onChange={e => setHistoryEmployee(e.target.value)}><option value="">ทุกคน</option>{employees.map(e => <option key={e.id} value={e.id}>{e.employee_code} — {e.full_name}{e.is_active ? '' : ' (ปิดสถานะ)'}</option>)}</select></label>
            <label>เดือนประวัติ<input aria-label="เดือนประวัติ" type="month" min="2000-01" max="2199-12" value={historyMonth} onChange={e => setHistoryMonth(e.target.value)} /></label>
            <button disabled={loading} className="primary self-end">ค้นประวัติ</button>
        </form>
        <div className="table-wrap"><h2 className="p-4 font-semibold">รายการล่าสุด 100 รายการ</h2>
            {loading ? <p role="status" className="p-4">กำลังโหลด…</p> : <table><thead><tr>{['วันที่', 'พนักงาน', 'กะ', 'ปกติ (ชั่วโมง)', 'OT รวม (ชั่วโมง)', 'OT 3 เท่า (ชั่วโมง)', 'ค่าอาหาร'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>
                {logs.map(log => <tr key={log.id}><td>{thaiDate(log.work_date)}</td><td>{log.employee_code} {log.full_name}</td><td>{log.shift_type === 'night' ? 'กลางคืน' : 'กลางวัน'}</td><td>{workHours(log.regular_minutes)}</td><td>{workHours(log.overtime_minutes)}</td><td>{workHours(log.overtime_3x_minutes)}</td><td>{money(log.meal_allowance)}</td></tr>)}
                {!logs.length && <tr><td colSpan="7">ยังไม่มีบันทึก</td></tr>}
            </tbody></table>}
        </div>
    </section>;
}
