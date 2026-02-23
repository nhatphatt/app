import { Hono } from 'hono';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';
import { generateId } from '../utils/crypto';

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();


// ============ EMPLOYEE ROUTES (/employees) ============

app.get('/employees', authMiddleware, async (c) => {
	try {
		const user = c.get('user');
		const status = c.req.query('status');
		let sql = 'SELECT * FROM employees WHERE store_id = ?';
		const params: any[] = [user.store_id];
		if (status) { sql += ' AND status = ?'; params.push(status); }
		sql += ' ORDER BY full_name ASC';
		const result = await c.env.DB.prepare(sql).bind(...params).all();
		return c.json(result.results ?? []);
	} catch (e: any) {
		return c.json({ detail: e.message }, 500);
	}
});

app.get('/employees/:employee_id', authMiddleware, async (c) => {
	try {
		const user = c.get('user');
		const emp = await c.env.DB.prepare('SELECT * FROM employees WHERE id = ? AND store_id = ?').bind(c.req.param('employee_id'), user.store_id).first();
		if (!emp) return c.json({ detail: 'Employee not found' }, 404);
		return c.json(emp);
	} catch (e: any) {
		return c.json({ detail: e.message }, 500);
	}
});

app.post('/employees', authMiddleware, async (c) => {
	try {
		const user = c.get('user');
		const body = await c.req.json();

		const existing = await c.env.DB.prepare('SELECT id FROM employees WHERE store_id = ? AND phone_number = ?').bind(user.store_id, body.phone_number).first();
		if (existing) return c.json({ detail: 'Số điện thoại đã được sử dụng bởi nhân viên khác' }, 400);

		const id = generateId();
		const now = new Date().toISOString();

		await c.env.DB.prepare(
			'INSERT INTO employees (id, store_id, full_name, position, phone_number, email, hire_date, salary, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
		).bind(id, user.store_id, body.full_name, body.position, body.phone_number, body.email || '', body.hire_date || '', body.salary || 0, 'active', body.notes || '', now, null).run();

		const emp = await c.env.DB.prepare('SELECT * FROM employees WHERE id = ?').bind(id).first();
		return c.json(emp);
	} catch (e: any) {
		return c.json({ detail: e.message }, 500);
	}
});

app.put('/employees/:employee_id', authMiddleware, async (c) => {
	try {
		const user = c.get('user');
		const empId = c.req.param('employee_id');
		const body = await c.req.json();

		const existing = await c.env.DB.prepare('SELECT * FROM employees WHERE id = ? AND store_id = ?').bind(empId, user.store_id).first<any>();
		if (!existing) return c.json({ detail: 'Employee not found' }, 404);

		const fields: string[] = [];
		const values: any[] = [];
		for (const key of ['full_name', 'position', 'phone_number', 'email', 'hire_date', 'salary', 'status', 'notes']) {
			if (body[key] !== undefined && body[key] !== null) {
				fields.push(`${key} = ?`);
				values.push(body[key]);
			}
		}
		if (fields.length === 0) return c.json({ detail: 'No data to update' }, 400);

		if (body.phone_number && body.phone_number !== existing.phone_number) {
			const phoneExists = await c.env.DB.prepare('SELECT id FROM employees WHERE store_id = ? AND phone_number = ? AND id != ?').bind(user.store_id, body.phone_number, empId).first();
			if (phoneExists) return c.json({ detail: 'Số điện thoại đã được sử dụng bởi nhân viên khác' }, 400);
		}

		fields.push('updated_at = ?');
		values.push(new Date().toISOString());
		values.push(empId);

		await c.env.DB.prepare(`UPDATE employees SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
		const updated = await c.env.DB.prepare('SELECT * FROM employees WHERE id = ?').bind(empId).first();
		return c.json(updated);
	} catch (e: any) {
		return c.json({ detail: e.message }, 500);
	}
});

app.delete('/employees/:employee_id', authMiddleware, async (c) => {
	try {
		const user = c.get('user');
		const result = await c.env.DB.prepare('DELETE FROM employees WHERE id = ? AND store_id = ?').bind(c.req.param('employee_id'), user.store_id).run();
		if (!result.meta.changes) return c.json({ detail: 'Employee not found' }, 404);
		return c.json({ message: 'Employee deleted successfully' });
	} catch (e: any) {
		return c.json({ detail: e.message }, 500);
	}
});

app.post('/employees/bulk-import', authMiddleware, async (c) => {
	try {
		const user = c.get('user');
		const body = await c.req.json();
		const created: any[] = [];
		const errors: any[] = [];

		for (let idx = 0; idx < body.employees.length; idx++) {
			const emp = body.employees[idx];
			const existing = await c.env.DB.prepare('SELECT id FROM employees WHERE store_id = ? AND phone_number = ?').bind(user.store_id, emp.phone_number).first();
			if (existing) { errors.push({ index: idx, full_name: emp.full_name, error: 'Số điện thoại đã tồn tại' }); continue; }

			const id = generateId();
			const now = new Date().toISOString();
			try {
				await c.env.DB.prepare(
					'INSERT INTO employees (id, store_id, full_name, position, phone_number, email, hire_date, salary, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
				).bind(id, user.store_id, emp.full_name, emp.position, emp.phone_number, emp.email || '', emp.hire_date || '', emp.salary || 0, 'active', emp.notes || '', now, null).run();
				const doc = await c.env.DB.prepare('SELECT * FROM employees WHERE id = ?').bind(id).first();
				created.push(doc);
			} catch (e: any) {
				errors.push({ index: idx, full_name: emp.full_name, error: e.message });
			}
		}

		return c.json({ employees_success: created.length, employees_failed: errors.length, created_employees: created, errors });
	} catch (e: any) {
		return c.json({ detail: e.message }, 500);
	}
});

// ============ SHIFT ROUTES (/shifts) ============

function calcHours(start: string, end: string): number {
	const [sh, sm] = start.split(':').map(Number);
	const [eh, em] = end.split(':').map(Number);
	let hours = (eh * 60 + em - sh * 60 - sm) / 60;
	if (hours < 0) hours += 24;
	return Math.round(hours * 100) / 100;
}

app.get('/shifts', authMiddleware, async (c) => {
	try {
		const user = c.get('user');
		let sql = 'SELECT * FROM shifts WHERE store_id = ?';
		const params: any[] = [user.store_id];
		const startDate = c.req.query('start_date');
		const endDate = c.req.query('end_date');
		const employeeId = c.req.query('employee_id');
		if (startDate) { sql += ' AND shift_date >= ?'; params.push(startDate); }
		if (endDate) { sql += ' AND shift_date <= ?'; params.push(endDate); }
		if (employeeId) { sql += ' AND employee_id = ?'; params.push(employeeId); }
		sql += ' ORDER BY shift_date DESC';
		const result = await c.env.DB.prepare(sql).bind(...params).all();
		return c.json(result.results ?? []);
	} catch (e: any) {
		return c.json({ detail: e.message }, 500);
	}
});

app.get('/shifts/:shift_id', authMiddleware, async (c) => {
	try {
		const user = c.get('user');
		const shift = await c.env.DB.prepare('SELECT * FROM shifts WHERE id = ? AND store_id = ?').bind(c.req.param('shift_id'), user.store_id).first();
		if (!shift) return c.json({ detail: 'Shift not found' }, 404);
		return c.json(shift);
	} catch (e: any) {
		return c.json({ detail: e.message }, 500);
	}
});

app.post('/shifts', authMiddleware, async (c) => {
	try {
		const user = c.get('user');
		const body = await c.req.json();

		const employee = await c.env.DB.prepare('SELECT * FROM employees WHERE id = ? AND store_id = ?').bind(body.employee_id, user.store_id).first<any>();
		if (!employee) return c.json({ detail: 'Employee not found' }, 404);

		if (!/^\d{2}:\d{2}$/.test(body.shift_start) || !/^\d{2}:\d{2}$/.test(body.shift_end)) {
			return c.json({ detail: 'Invalid time format. Use HH:MM (e.g., 09:00, 17:30)' }, 400);
		}

		const id = generateId();
		const now = new Date().toISOString();
		const hoursWorked = calcHours(body.shift_start, body.shift_end);

		await c.env.DB.prepare(
			'INSERT INTO shifts (id, store_id, employee_id, employee_name, shift_date, shift_start, shift_end, hours_worked, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
		).bind(id, user.store_id, body.employee_id, employee.full_name, body.shift_date, body.shift_start, body.shift_end, hoursWorked, body.notes || '', now, null).run();

		const shift = await c.env.DB.prepare('SELECT * FROM shifts WHERE id = ?').bind(id).first();
		return c.json(shift);
	} catch (e: any) {
		return c.json({ detail: e.message }, 500);
	}
});

app.post('/shifts/bulk-create', authMiddleware, async (c) => {
	try {
		const user = c.get('user');
		const body = await c.req.json();

		if (!/^\d{2}:\d{2}$/.test(body.shift_start) || !/^\d{2}:\d{2}$/.test(body.shift_end)) {
			return c.json({ detail: 'Invalid time format. Use HH:MM' }, 400);
		}

		const hoursWorked = calcHours(body.shift_start, body.shift_end);
		const created: any[] = [];
		const errors: any[] = [];

		for (let idx = 0; idx < body.employee_ids.length; idx++) {
			const employeeId = body.employee_ids[idx];
			const employee = await c.env.DB.prepare('SELECT * FROM employees WHERE id = ? AND store_id = ?').bind(employeeId, user.store_id).first<any>();
			if (!employee) { errors.push({ index: idx, employee_id: employeeId, error: 'Employee not found' }); continue; }

			const id = generateId();
			const now = new Date().toISOString();
			try {
				await c.env.DB.prepare(
					'INSERT INTO shifts (id, store_id, employee_id, employee_name, shift_date, shift_start, shift_end, hours_worked, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
				).bind(id, user.store_id, employeeId, employee.full_name, body.shift_date, body.shift_start, body.shift_end, hoursWorked, body.notes || '', now, null).run();
				const doc = await c.env.DB.prepare('SELECT * FROM shifts WHERE id = ?').bind(id).first();
				created.push(doc);
			} catch (e: any) {
				errors.push({ index: idx, employee_id: employeeId, error: e.message });
			}
		}

		return c.json({ shifts_created: created.length, shifts_failed: errors.length, created_shifts: created, errors });
	} catch (e: any) {
		return c.json({ detail: e.message }, 500);
	}
});

app.put('/shifts/:shift_id', authMiddleware, async (c) => {
	try {
		const user = c.get('user');
		const shiftId = c.req.param('shift_id');
		const body = await c.req.json();

		const existing = await c.env.DB.prepare('SELECT * FROM shifts WHERE id = ? AND store_id = ?').bind(shiftId, user.store_id).first<any>();
		if (!existing) return c.json({ detail: 'Shift not found' }, 404);

		const fields: string[] = [];
		const values: any[] = [];
		for (const key of ['employee_id', 'employee_name', 'shift_date', 'shift_start', 'shift_end', 'notes']) {
			if (body[key] !== undefined && body[key] !== null) {
				fields.push(`${key} = ?`);
				values.push(body[key]);
			}
		}
		if (fields.length === 0) return c.json({ detail: 'No data to update' }, 400);

		if (body.shift_start || body.shift_end) {
			const start = body.shift_start || existing.shift_start;
			const end = body.shift_end || existing.shift_end;
			if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
				return c.json({ detail: 'Invalid time format' }, 400);
			}
			fields.push('hours_worked = ?');
			values.push(calcHours(start, end));
		}

		fields.push('updated_at = ?');
		values.push(new Date().toISOString());
		values.push(shiftId);

		await c.env.DB.prepare(`UPDATE shifts SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
		const updated = await c.env.DB.prepare('SELECT * FROM shifts WHERE id = ?').bind(shiftId).first();
		return c.json(updated);
	} catch (e: any) {
		return c.json({ detail: e.message }, 500);
	}
});

app.delete('/shifts/:shift_id', authMiddleware, async (c) => {
	try {
		const user = c.get('user');
		const result = await c.env.DB.prepare('DELETE FROM shifts WHERE id = ? AND store_id = ?').bind(c.req.param('shift_id'), user.store_id).run();
		if (!result.meta.changes) return c.json({ detail: 'Shift not found' }, 404);
		return c.json({ message: 'Shift deleted successfully' });
	} catch (e: any) {
		return c.json({ detail: e.message }, 500);
	}
});

// ============ ATTENDANCE ROUTES (/attendance) ============

app.post('/attendance/checkin', authMiddleware, async (c) => {
	try {
		const user = c.get('user');
		const body = await c.req.json();

		const employee = await c.env.DB.prepare('SELECT * FROM employees WHERE id = ? AND store_id = ?').bind(body.employee_id, user.store_id).first<any>();
		if (!employee) return c.json({ detail: 'Employee not found' }, 404);

		const today = new Date().toISOString().split('T')[0];
		const existingCheckin = await c.env.DB.prepare(
			"SELECT id FROM attendance_logs WHERE employee_id = ? AND check_in_time LIKE ? AND check_out_time IS NULL"
		).bind(body.employee_id, `${today}%`).first();
		if (existingCheckin) return c.json({ detail: 'Nhân viên đã check-in. Vui lòng check-out trước khi check-in lại.' }, 400);

		const id = generateId();
		const now = new Date().toISOString();

		await c.env.DB.prepare(
			'INSERT INTO attendance_logs (id, store_id, employee_id, employee_name, shift_id, check_in_time, check_out_time, hours_worked, status, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
		).bind(id, user.store_id, body.employee_id, employee.full_name, body.shift_id || null, now, null, null, 'checked_in', body.notes || '', now).run();

		const record = await c.env.DB.prepare('SELECT * FROM attendance_logs WHERE id = ?').bind(id).first();
		return c.json(record);
	} catch (e: any) {
		return c.json({ detail: e.message }, 500);
	}
});

app.post('/attendance/checkout/:attendance_id', authMiddleware, async (c) => {
	try {
		const user = c.get('user');
		const attId = c.req.param('attendance_id');
		const body = await c.req.json();

		const attendance = await c.env.DB.prepare('SELECT * FROM attendance_logs WHERE id = ? AND store_id = ?').bind(attId, user.store_id).first<any>();
		if (!attendance) return c.json({ detail: 'Attendance record not found' }, 404);
		if (attendance.check_out_time) return c.json({ detail: 'Already checked out' }, 400);

		const now = new Date().toISOString();
		const checkInMs = new Date(attendance.check_in_time).getTime();
		const checkOutMs = new Date(now).getTime();
		const hoursWorked = Math.round(((checkOutMs - checkInMs) / 3600000) * 100) / 100;

		let notes = attendance.notes || '';
		if (body.notes) notes = notes ? notes + ' | ' + body.notes : body.notes;

		await c.env.DB.prepare('UPDATE attendance_logs SET check_out_time = ?, hours_worked = ?, status = ?, notes = ? WHERE id = ?').bind(now, hoursWorked, 'checked_out', notes, attId).run();

		const updated = await c.env.DB.prepare('SELECT * FROM attendance_logs WHERE id = ?').bind(attId).first();
		return c.json(updated);
	} catch (e: any) {
		return c.json({ detail: e.message }, 500);
	}
});

app.get('/attendance/active', authMiddleware, async (c) => {
	try {
		const user = c.get('user');
		const result = await c.env.DB.prepare("SELECT * FROM attendance_logs WHERE store_id = ? AND status = 'checked_in' AND check_out_time IS NULL ORDER BY check_in_time DESC LIMIT 100").bind(user.store_id).all();
		return c.json(result.results ?? []);
	} catch (e: any) {
		return c.json({ detail: e.message }, 500);
	}
});

app.get('/attendance/employee/:employee_id/stats', authMiddleware, async (c) => {
	try {
		const user = c.get('user');
		const employeeId = c.req.param('employee_id');
		const startDate = c.req.query('start_date')!;
		const endDate = c.req.query('end_date')!;

		const employee = await c.env.DB.prepare('SELECT * FROM employees WHERE id = ? AND store_id = ?').bind(employeeId, user.store_id).first<any>();
		if (!employee) return c.json({ detail: 'Employee not found' }, 404);

		const logs = await c.env.DB.prepare(
			'SELECT * FROM attendance_logs WHERE store_id = ? AND employee_id = ? AND check_in_time >= ? AND check_in_time <= ?'
		).bind(user.store_id, employeeId, startDate, endDate).all();

		const records = logs.results ?? [];
		const totalDays = records.length;
		const totalHours = records.reduce((sum: number, r: any) => sum + (r.hours_worked || 0), 0);
		const avgHours = totalDays > 0 ? Math.round((totalHours / totalDays) * 100) / 100 : 0;

		let lateCount = 0;
		for (const log of records as any[]) {
			const d = new Date(log.check_in_time);
			if (d.getUTCHours() > 8 || (d.getUTCHours() === 8 && d.getUTCMinutes() > 15)) lateCount++;
		}

		return c.json({
			employee_id: employeeId,
			employee_name: employee.full_name,
			total_days_worked: totalDays,
			total_hours_worked: Math.round(totalHours * 100) / 100,
			average_hours_per_day: avgHours,
			late_count: lateCount,
			absent_count: 0,
			period_start: startDate,
			period_end: endDate,
		});
	} catch (e: any) {
		return c.json({ detail: e.message }, 500);
	}
});

app.get('/attendance', authMiddleware, async (c) => {
	try {
		const user = c.get('user');
		let sql = 'SELECT * FROM attendance_logs WHERE store_id = ?';
		const params: any[] = [user.store_id];
		const startDate = c.req.query('start_date');
		const endDate = c.req.query('end_date');
		const employeeId = c.req.query('employee_id');
		const status = c.req.query('status');
		if (startDate) { sql += ' AND check_in_time >= ?'; params.push(startDate); }
		if (endDate) { sql += ' AND check_in_time <= ?'; params.push(endDate); }
		if (employeeId) { sql += ' AND employee_id = ?'; params.push(employeeId); }
		if (status) { sql += ' AND status = ?'; params.push(status); }
		sql += ' ORDER BY check_in_time DESC';
		const result = await c.env.DB.prepare(sql).bind(...params).all();
		return c.json(result.results ?? []);
	} catch (e: any) {
		return c.json({ detail: e.message }, 500);
	}
});

export default app;
