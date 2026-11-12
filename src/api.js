let csrfToken = '';
export function setAuthSession(session) { csrfToken = session?.csrf_token || ''; }
export async function api(path, options = {}) {
    let response;
    try {
        response = await fetch(`/api${path}`, {
            ...options,
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-PayDay-Request': '1',
                ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
                ...options.headers,
            },
        });
    } catch (error) {
        if (error.name === 'AbortError') throw error;
        throw new Error('เชื่อมต่อ Backend ไม่ได้ กรุณาตรวจสอบว่าเปิดที่พอร์ต 3000 แล้ว', { cause: error });
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        if (response.status === 401 && path !== '/auth/login' && path !== '/auth/session') {
            setAuthSession(null);
            window.dispatchEvent(new Event('payday-session-expired'));
        }
        const error = new Error(result.message || 'ทำรายการไม่สำเร็จ กรุณาตรวจสอบ Backend');
        error.status = response.status; error.code = result.code;
        throw error;
    }
    return result.data;
}
export const money = value => new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(Number(value));
export const thaiDate = value => value ? new Intl.DateTimeFormat('th-TH', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
}).format(new Date(`${value}T00:00:00Z`)) : 'ไม่ระบุ';
export function currentMonth() {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
    return `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}`;
}

export const workHours = minutes => `${new Intl.NumberFormat('th-TH', {
    maximumFractionDigits: 2,
}).format(Number(minutes) / 60)} ชม.`;

export function hoursToMinutes(hours) {
    if (!['string', 'number'].includes(typeof hours) || String(hours).trim() === '' ||
        !Number.isFinite(Number(hours)) || Number(hours) < 0 ||
        !Number.isSafeInteger(Math.round(Number(hours) * 60))) {
        throw new Error('กรุณากรอกชั่วโมงเป็นตัวเลขที่ถูกต้องและไม่ติดลบ');
    }
    return Math.round(Number(hours) * 60);
}

export function bangkokToday(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now);
    return ['year', 'month', 'day'].map(type => parts.find(p => p.type === type).value).join('-');
}
export function payMonthForWorkDate(date) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1 + (day >= 17 ? 1 : 0), 1)).toISOString().slice(0, 7);
}
export function workTimePayload(form) {
    const overtime_minutes = hoursToMinutes(form.overtime_hours);
    const overtime_3x_minutes = hoursToMinutes(form.overtime_3x_hours);
    if (Number(form.overtime_3x_hours) > Number(form.overtime_hours)) throw new Error('OT 3 เท่าต้องไม่เกิน OT รวม');
    if (Number(form.overtime_hours) > 16) throw new Error('เวลาปกติและ OT รวมต้องไม่เกิน 24 ชม. ต่อวัน');
    return { work_date: form.work_date, regular_minutes: 480, overtime_minutes, overtime_3x_minutes, shift_type: form.shift_type };
}
