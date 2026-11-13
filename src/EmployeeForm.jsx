import { useState } from 'react';
import { api } from './api';

const initialForm = {
    employee_code: '',
    full_name: '',
    pay_type: 'daily',
    pay_rate: '',
};

function EmployeeForm({ onCreated, employee, onCancel }) {
    const [form, setForm] = useState(employee ? { ...employee, pay_rate: String(employee.pay_rate) } : initialForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (saving) {
            return;
        }

        setSaving(true);
        setError('');
        setSuccess('');

        try {
            let employeeData;
            try {
                employeeData = await api(employee ? `/employees/${employee.id}` : '/employees', {
                    method: employee ? 'PUT' : 'POST',
                    body: JSON.stringify({
                        ...form,
                        employee_code: form.employee_code.trim(),
                        full_name: form.full_name.trim(),
                    }),
                });
            } catch (error) {
                if (error.status === 409) throw new Error('รหัสพนักงานนี้มีอยู่แล้ว', { cause: error });
                throw error;
            }
            onCreated(employeeData);
            setForm(initialForm);
            setSuccess(employee ? 'แก้ไขพนักงานเรียบร้อยแล้ว' : 'เพิ่มพนักงานเรียบร้อยแล้ว');
        } catch (error) {
            setError(error.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-5 text-lg font-semibold">{employee ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงาน'}</h2>

            <form onSubmit={handleSubmit}>
                <fieldset
                    disabled={saving}
                    className="grid gap-4 sm:grid-cols-2 disabled:opacity-60"
                >
                    <label className="grid gap-2 text-sm">
                        รหัสพนักเด็กเปรต
                        <input
                            name="employee_code"
                            value={form.employee_code}
                            onChange={handleChange}
                            required
                            className="rounded-lg border border-slate-300 px-3 py-2"
                        />
                    </label>

                    <label className="grid gap-2 text-sm">
                        ชื่อ–นามสกุล และ สายพันธ์
                        <input
                            name="full_name"
                            value={form.full_name}
                            onChange={handleChange}
                            required
                            className="rounded-lg border border-slate-300 px-3 py-2"
                        />
                    </label>

                    <label className="grid gap-2 text-sm">
                        ประเภทค่าจ้าง
                        <select
                            name="pay_type"
                            value={form.pay_type}
                            onChange={handleChange}
                            className="rounded-lg border border-slate-300 px-3 py-2"
                        >
                            <option value="daily">รายวัน</option>
                            <option value="monthly">รายเดือน</option>
                        </select>
                    </label>

                    <label className="grid gap-2 text-sm">
                        {form.pay_type === 'daily'
                            ? 'ค่าแรงต่อวัน (บาท)'
                            : 'เงินเดือน (บาท)'}
                        <input
                            name="pay_rate"
                            type="number"
                            min="0.01"
                            max="9999999999.99"
                            step="0.01"
                            value={form.pay_rate}
                            onChange={handleChange}
                            required
                            className="rounded-lg border border-slate-300 px-3 py-2"
                        />
                    </label>

                    <button
                        type="submit"
                        className="rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700 sm:col-span-2"
                    >
                        {saving ? 'กำลังบันทึก…' : employee ? 'บันทึกการแก้ไข' : 'เพิ่มพนักงาน'}
                    </button>
                </fieldset>
            </form>

            {employee && <button type="button" onClick={onCancel} disabled={saving} className="mt-4 text-indigo-600">ยกเลิกการแก้ไข</button>}

            {error && (
                <p role="alert" className="mt-4 text-sm text-red-700">
                    {error}
                </p>
            )}

            {success && (
                <p role="status" className="mt-4 text-sm text-emerald-700">
                    {success}
                </p>
            )}
        </section>
    );
}

export default EmployeeForm;