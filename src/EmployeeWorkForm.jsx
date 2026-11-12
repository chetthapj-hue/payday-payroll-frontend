import { useState } from 'react';
import { api, bangkokToday, money, workHours, workTimePayload } from './api';

export default function EmployeeWorkForm({ onCreated }) {
    const [form, setForm] = useState(() => ({ work_date: bangkokToday(), shift_type: 'day', overtime_hours: '0', overtime_3x_hours: '0' }));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const today = bangkokToday();
    const change = e => setForm(current => ({ ...current, [e.target.name]: e.target.value }));
    async function submit(e) {
        e.preventDefault(); if (saving) return;
        setError(''); setSuccess('');
        let body;
        try {
            if (form.work_date > bangkokToday()) throw new Error('ไม่สามารถลงเวลาวันในอนาคตได้ (วันที่ประเทศไทย)');
            body = workTimePayload(form);
        } catch (error) { return setError(error.message); }
        setSaving(true);
        try {
            const row = await api('/me/work-logs', { method: 'POST', body: JSON.stringify(body) });
            onCreated(row);
            setSuccess('ลงเวลาสำเร็จ ประวัติและยอดสะสมอัปเดตแล้ว');
        } catch (error) { setError(error.message); }
        finally { setSaving(false); }
    }
    return <section aria-labelledby="self-work-heading" className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 id="self-work-heading" className="mb-4 text-lg font-semibold">ลงเวลาทำงาน</h2>
        <p className="mb-4 text-sm text-slate-600">บันทึกสำหรับบัญชีของคุณเท่านั้น เลือกวันนี้หรือย้อนหลังตามวันที่ประเทศไทย</p>
        <form onSubmit={submit}><fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2">
            <label>วันที่ทำงาน<input aria-label="วันที่ทำงาน" required type="date" name="work_date" max={today} value={form.work_date} onChange={change} /></label>
            <label>เวลาปกติ<input aria-label="เวลาปกติ" readOnly value={workHours(480)} /><span className="text-sm text-slate-500">เวลาปกติเต็มวัน 8 ชม.</span></label>
            <label>กะ<select aria-label="กะ" name="shift_type" value={form.shift_type} onChange={change}><option value="day">กลางวัน</option><option value="night">กลางคืน (ค่ากะ 150 บาท)</option></select></label>
            <label>OT รวม<span className="flex items-center gap-2"><input aria-label="OT รวม" required type="number" min="0" max="16" step="any" name="overtime_hours" value={form.overtime_hours} onChange={change} /><span>ชม.</span></span></label>
            <label>OT 3 เท่า<span className="flex items-center gap-2"><input aria-label="OT 3 เท่า" required type="number" min="0" max={form.overtime_hours} step="any" name="overtime_3x_hours" value={form.overtime_3x_hours} onChange={change} /><span>ชม.</span></span><span className="text-sm text-slate-500">เป็นส่วนหนึ่งของ OT รวม</span></label>
            <p>ค่าอาหาร: <strong>{money(Math.round(Number(form.overtime_hours) * 60) >= 60 ? 166 : 83)} บาท</strong><br /><span className="text-sm text-slate-500">ฐาน 83 บาท + เพิ่ม 83 บาทเมื่อ OT รวมตั้งแต่ 1 ชม. เก็บรวมครั้งเดียว</span></p>
            <p className="text-sm text-slate-500 sm:col-span-2">กรอกทศนิยมได้ เช่น 1.5 ชม. หรือ 0.25 ชม. ปัดเป็นนาทีเต็มที่ใกล้ที่สุดก่อนบันทึก</p>
            <button className="primary sm:col-span-2">{saving ? 'กำลังบันทึก…' : 'บันทึกเวลาของฉัน'}</button>
        </fieldset></form>
        {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
        {success && <p role="status" className="mt-4 text-green-700">{success}</p>}
    </section>;
}
