import { useEffect, useState } from 'react';
import { api, money, thaiDate } from './api';

const columns = [['base_pay', 'ค่าจ้างปกติ'], ['overtime_15_pay', 'OT 1.5 เท่า'], ['overtime_3_pay', 'OT 3 เท่า'], ['meal_pay', 'ค่าอาหาร'], ['shift_pay', 'ค่ากะ'], ['gross_pay', 'รายได้รวม']];
export default function Payroll({ reportsOnly }) {
    const [month, setMonth] = useState(() => {
        const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
        return `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}`;
    });
    const [periods, setPeriods] = useState([]);
    const [data, setData] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    useEffect(() => {
        const controller = new AbortController();
        api('/payroll/periods', { signal: controller.signal }).then(rows => {
            if (!controller.signal.aborted) setPeriods(rows);
        }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
        return () => controller.abort();
    }, []);
    async function load(path) {
        if (busy) return;
        setBusy(true); setError(''); setNotice(''); setData(null);
        try { setData(await api(path)); } catch (e) { setError(e.message); }
        finally { setBusy(false); }
    }
    async function save() {
        if (busy || !data || data.saved) return;
        setBusy(true); setError('');
        try {
            const saved = await api('/payroll/save', { method: 'POST', body: JSON.stringify({ month, preview_token: data.preview_token }) });
            setData(saved); setNotice('บันทึกงวดเรียบร้อยแล้ว ยอดและข้อมูลพนักงานในรายงานจะคงเดิม');
            setPeriods(current => [saved.period, ...current.filter(p => p.id !== saved.period.id)].sort((a, b) => b.payment_date.localeCompare(a.payment_date)));
        } catch (e) { setError(e.message); if (e.status === 409) setData(null); }
        finally { setBusy(false); }
    }
    async function publish() {
        if (busy || !data?.saved || data.period.published_at) return;
        setBusy(true); setError('');
        try {
            const published = await api(`/payroll/periods/${data.period.id}/publish`, { method: 'POST', body: '{}' });
            setData(published);
            setPeriods(current => current.map(p => p.id === published.period.id ? published.period : p));
            setNotice('เผยแพร่งวดแล้ว พนักงานแต่ละคนจะเห็นเฉพาะยอดของตัวเอง');
        } catch (e) { setError(e.message); }
        finally { setBusy(false); }
    }
    return <section className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">{reportsOnly ? 'เปิดรายงานงวดที่บันทึกแล้ว' : 'คำนวณและตรวจยอดก่อนบันทึก'}</h2>
            {!reportsOnly && <form className="flex flex-wrap items-end gap-4" onSubmit={e => { e.preventDefault(); load(`/payroll/preview?month=${month}`); }}>
                <label>เดือนจ่าย (จ่ายวันที่ 25)<input required type="month" min="2000-01" max="2199-12" value={month} disabled={busy} onChange={e => { setMonth(e.target.value); setData(null); setError(''); setNotice(''); }} /></label>
                <button disabled={busy} className="primary">คำนวณ / เปิดงวด</button>
            </form>}
            <label className="mt-4 block">งวดที่บันทึกแล้ว<select disabled={busy} value={data?.saved ? String(data.period.id) : ''} onChange={e => { if (e.target.value) load(`/payroll/periods/${e.target.value}`); }}>
                <option value="">เลือกงวดที่ต้องการเปิด</option>{periods.map(p => <option key={p.id} value={p.id}>งวดจ่าย {thaiDate(p.payment_date)}{!p.payment_date ? ` (${p.period_name})` : ''}</option>)}
            </select></label>
            {reportsOnly && periods.length === 0 && <p className="mt-4">ยังไม่มีงวดที่บันทึก หรือกำลังโหลดรายการ</p>}
            {busy && <p role="status" className="mt-4">กำลังทำรายการ…</p>}
            {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
            {notice && <p role="status" className="mt-4 text-green-700">{notice}</p>}
        </div>
        {data && <>
            <div className="rounded-2xl bg-indigo-50 p-6 leading-8">
                <h3 className="font-bold">งวดจ่าย {thaiDate(data.period.payment_date)} — {data.saved ? 'รายงานที่บันทึกแล้ว' : 'ยอดคำนวณ ยังไม่บันทึก'}</h3>
                <p>ค่าจ้างปกติ / ค่าอาหาร / ค่ากะ: {thaiDate(data.period.start_date)} ถึง {thaiDate(data.period.end_date)}</p>
                <p>OT: {thaiDate(data.period.overtime_start_date)} ถึง {thaiDate(data.period.overtime_end_date)}</p>
                <p className="text-sm">รวมวันต้นและวันท้าย ค่าอาหารรวมส่วนเพิ่ม OT ที่บันทึกแล้ว จึงไม่บวก 83 บาทซ้ำ</p>
            </div>
            <div className="table-wrap"><table><thead><tr><th>รหัส</th><th>ชื่อพนักงาน</th><th>ประเภท / อัตรา</th>{columns.map(([key, title]) => <th key={key}>{title}</th>)}</tr></thead><tbody>
                {data.rows.map(row => <tr key={row.employee_id}><td>{row.employee_code}</td><td>{row.full_name}</td><td>{row.pay_type_used === 'daily' ? 'รายวัน' : 'รายเดือน'} / {money(row.pay_rate_used)}</td>{columns.map(([key]) => <td className="text-right tabular-nums" key={key}>{money(row[key])}</td>)}</tr>)}
                {!data.rows.length && <tr><td colSpan="9">ไม่มีพนักงานในงวดนี้</td></tr>}
            </tbody><tfoot><tr><th colSpan="3">รวม (บาท)</th>{columns.map(([key]) => <td className="text-right font-semibold tabular-nums" key={key}>{money(data.rows.reduce((sum, row) => sum + Number(row[key]), 0))}</td>)}</tr></tfoot></table></div>
            {!data.saved && <button className="primary" disabled={busy || !data.rows.length} onClick={save}>ตรวจยอดแล้ว — บันทึกงวดนี้</button>}
            {data.saved && !data.period.published_at && <button className="primary" disabled={busy} onClick={publish}>เผยแพร่งวด</button>}
            {data.saved && <p className="font-semibold text-indigo-700">{data.period.published_at ? 'เผยแพร่ให้พนักงานแล้ว' : 'ยังไม่เผยแพร่ — พนักงานยังไม่เห็นงวดนี้'}</p>}
            {data.saved && <p className="text-sm text-slate-600">รายงานนี้อ่านยอดที่บันทึกไว้ การแก้พนักงานหรือลงเวลาเพิ่มจะไม่เปลี่ยนรายงานเดิม</p>}
        </>}
    </section>;
}
