import { useEffect, useState } from 'react';
import { api, money, thaiDate } from './api';

export default function AccruedIncome({ month, onMonthChange }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    useEffect(() => {
        const controller = new AbortController();
        api(`/me/accrued-income?month=${month}`, { signal: controller.signal }).then(result => {
            if (!controller.signal.aborted) setData(result);
        }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
        return () => controller.abort();
    }, [month]);
    return <section aria-labelledby="accrued-income-heading" className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 id="accrued-income-heading" className="text-xl font-bold">รายได้สะสมของฉัน</h2>
            <p className="my-3 inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">ยอดสะสมก่อนปิดงวด</p>
            <label className="block max-w-xs">เดือนจ่ายสำหรับยอดสะสม<input required aria-label="เดือนจ่ายสำหรับยอดสะสม" type="month" min="2000-01" max="2199-12" value={month} onChange={e => { if (e.target.value) onMonthChange(e.target.value); }} /></label>
            <p className="mt-4 text-sm text-slate-600">ยอดนี้คำนวณจากรายการงานที่บันทึกแล้ว ยอดจริงของงวดที่เผยแพร่แล้วให้เปิดจาก “เงินเดือนของฉัน”</p>
        </div>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        {!data && !error && <p role="status">กำลังคำนวณยอดสะสม…</p>}
        {data && <>
            <div className="rounded-2xl bg-indigo-50 p-6 leading-8">
                <h3 className="font-bold">งวดจ่าย {thaiDate(data.period.payment_date)}</h3>
                <p>รอบค่าจ้างปกติ / ค่าอาหาร / ค่ากะ: {thaiDate(data.period.start_date)} ถึง {thaiDate(data.period.end_date)} (รวมวันต้นและวันท้าย)</p>
                <p>รอบ OT: {thaiDate(data.period.overtime_start_date)} ถึง {thaiDate(data.period.overtime_end_date)}</p>
                <p>จำนวนวันที่ลงงานในรอบค่าจ้าง: <strong>{data.row.recorded_days} วัน</strong></p>
                <p className="text-sm">ข้อมูล ณ {thaiDate(data.as_of_date)} · OT เดือนปัจจุบันจะอยู่ในงวดจ่ายวันที่ 25 ของเดือนถัดไป</p>
                {data.row.pay_type_used === 'monthly' && <p className="text-sm">รายเดือนใช้เต็มอัตรา {money(data.row.pay_rate_used)} บาทตามสูตรเดิม ไม่เฉลี่ยตามจำนวนวันที่ลงงาน</p>}
            </div>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[['base_pay', 'ค่าจ้างปกติสะสม'], ['overtime_15_pay', 'OT 1.5 เท่า'], ['overtime_3_pay', 'OT 3 เท่า'], ['meal_pay', 'ค่าอาหาร'], ['shift_pay', 'ค่ากะ'], ['gross_pay', 'รายได้รวมสะสม']].map(([key, label]) => <div key={key} className="rounded-2xl border border-slate-200 bg-white p-6"><dt className="text-slate-600">{label}</dt><dd className="mt-2 text-2xl font-semibold tabular-nums">{money(data.row[key])} บาท</dd></div>)}
            </dl>
        </>}
    </section>;
}
