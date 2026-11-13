import { useEffect, useState } from 'react';
import { api, currentMonth, money, thaiDate, workHours, bangkokToday, payMonthForWorkDate } from './api';
import EmployeeWorkForm from './EmployeeWorkForm';
import AccruedIncome from './AccruedIncome';

export default function EmployeeDashboard({ user }) {
    const [tab, setTab] = useState('work');
    const [revision, setRevision] = useState(0);
    const [accruedMonth, setAccruedMonth] = useState(() => payMonthForWorkDate(bangkokToday()));
    const [month, setMonth] = useState(currentMonth);
    const [logs, setLogs] = useState([]);
    const [periods, setPeriods] = useState([]);
    const [periodId, setPeriodId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        if (tab !== 'payroll') return;
        const controller = new AbortController();
        api('/me/payroll', { signal: controller.signal }).then(rows => {
            if (!controller.signal.aborted) { setPeriods(rows); setPeriodId(rows[0] ? String(rows[0].id) : ''); }
        }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
        return () => controller.abort();
    }, [tab]);
    useEffect(() => {
        const controller = new AbortController();
        // Month selection remounts this request without exposing another employee selector.
        api(`/me/work-logs?month=${month}`, { signal: controller.signal }).then(rows => {
            if (!controller.signal.aborted) setLogs(rows);
        }).catch(e => { if (!controller.signal.aborted) setError(e.message); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [month, revision]);
    function handleWorkCreated(row) {
        setMonth(row.work_date.slice(0, 7)); setLoading(true);
        setAccruedMonth(payMonthForWorkDate(row.work_date));
        setRevision(current => current + 1);
    }
    const selected = periods.find(p => String(p.id) === periodId);
    return <main className="min-h-screen px-4 py-10"><div className="mx-auto max-w-6xl space-y-6">
        <header><p className="font-semibold text-indigo-600">PayDay</p><h1 className="mt-2 text-3xl font-bold">ข้อมูลของเด็กเชี่ย</h1><p className="mt-2 text-slate-600">{user.login} — {user.full_name}</p></header>
        <nav aria-label="เมนูพนักงาน" className="flex flex-wrap gap-2">
            {[['log', 'ลงเวลาทำงาน'], ['work', 'ประวัติการทำงาน'], ['accrued', 'รายได้สะสมของฉัน'], ['payroll', 'เงินเดือนของฉัน']].map(([id, label]) => <button type="button" key={id} aria-current={tab === id ? 'page' : undefined} className={tab === id ? 'primary' : 'rounded-lg bg-white px-5 py-3'} onClick={() => setTab(id)}>{label}</button>)}
        </nav>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        {tab === 'log' && <EmployeeWorkForm onCreated={handleWorkCreated} />}
        {(tab === 'log' || tab === 'accrued') && <AccruedIncome key={`${accruedMonth}:${revision}`} month={accruedMonth} onMonthChange={setAccruedMonth} />}
        {tab === 'work' && <section className="space-y-4">
            <label className="block max-w-xs">เดือนที่ทำงาน<input required type="month" min="2000-01" max="2199-12" value={month} onChange={e => { if (e.target.value) { setMonth(e.target.value); setLoading(true); setError(''); setLogs([]); } }} /></label>
            {loading ? <p role="status">กำลังโหลดประวัติ…</p> : <div className="table-wrap"><table><thead><tr>{['วันที่ทำงาน', 'กะ', 'เวลาปกติ (ชั่วโมง)', 'OT รวม (ชั่วโมง)', 'OT 3 เท่า (ชั่วโมง)', 'ค่าอาหาร'].map(title => <th key={title}>{title}</th>)}</tr></thead><tbody>
                {logs.map(log => <tr key={log.id}><td>{thaiDate(log.work_date)}</td><td>{log.shift_type === 'night' ? 'กลางคืน' : 'กลางวัน'}</td><td>{workHours(log.regular_minutes)}</td><td>{workHours(log.overtime_minutes)}</td><td>{workHours(log.overtime_3x_minutes)}</td><td>{money(log.meal_allowance)}</td></tr>)}
                {!logs.length && <tr><td colSpan="6">ไม่มีประวัติในเดือนที่เลือก</td></tr>}
            </tbody></table></div>}
        </section>}
        {tab === 'payroll' && <section className="space-y-4">
            <label className="block rounded-2xl bg-white p-6">งวดเงินเดือนของเด็กเชี่ย<select aria-label="งวดเงินเดือนของฉัน" value={periodId} onChange={e => setPeriodId(e.target.value)}>
                <option value="">เลือกงวดที่เผยแพร่แล้ว</option>{periods.map(p => <option key={p.id} value={p.id}>งวดจ่าย {thaiDate(p.payment_date)}</option>)}
            </select></label>
            {periods.length === 0 && <p>ยังไม่มีงวดเงินเดือนที่เผยแพร่สำหรับ</p>}
            {selected && <>
                <div className="rounded-2xl bg-indigo-50 p-6 leading-8">
                    <h2 className="text-lg font-bold">เงินเดือนงวดจ่าย {thaiDate(selected.payment_date)}</h2>
                    <p>{selected.employee_code} — {selected.full_name}</p>
                    <p>ค่าจ้างปกติ / ค่าอาหาร / ค่ากะ: {thaiDate(selected.start_date)} ถึง {thaiDate(selected.end_date)}</p>
                    <p>OT: {thaiDate(selected.overtime_start_date)} ถึง {thaiDate(selected.overtime_end_date)}</p>
                </div>
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[['base_pay', 'ค่าจ้างปกติ'], ['overtime_15_pay', 'OT 1.5 เท่า'], ['overtime_3_pay', 'OT 3 เท่า'], ['meal_pay', 'ค่าอาหาร'], ['shift_pay', 'ค่ากะ'], ['gross_pay', 'รายได้รวม']].map(([key, label]) => <div key={key} className="rounded-2xl border border-slate-200 bg-white p-6"><dt className="text-slate-600">{label}</dt><dd className="mt-2 text-2xl font-semibold tabular-nums">{money(selected[key])} บาท</dd></div>)}
                </dl>
                <p className="text-sm text-slate-500">ยอดจากรายงานที่บันทึกและเผยแพร่แล้ว การแก้ข้อมูลปัจจุบันไม่เปลี่ยนยอดงวดนี้</p>
            </>}
        </section>}
    </div></main>;
}
