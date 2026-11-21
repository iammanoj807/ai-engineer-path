import type { AnimationSpec, Frame } from '../../components/learning/anim/scene';
import type { AnimationRegistry } from '../../components/learning/anim/useTopicAnimation';
import { C, frame } from '../../components/learning/anim/kit';
import {
    DROP, FOCUS, GONE, KEEP, PLAIN, compare, customers, departments, employees, label, orderItems, orders, products, table,
    type Column, type Look, type ResultRows, type Row, type TRow,
} from './kit';
import type { SqlCell } from '../sqlPracticeDb';

// Unit 8: the interview problems. Each walk-through shows the lesson's own
// solution working on the practice database, one step at a time.
//
// They are kept apart from the other animations on purpose. A problem's
// solution is hidden until the learner has tried it, so its walk-through is
// only shown once the solution is open: never at the top of the lesson, and
// never in practice. `phase8SolutionChecks` lets a test compare the rows each
// one ends on with the lesson's solution.

const sum = (values: SqlCell[]) => values.reduce<number>((s, v) => s + (typeof v === 'number' ? v : 0), 0);
const round1 = (value: number) => Math.round(value * 10) / 10;
const dayNumber = (date: string) => Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) / 86400000;
const daysBetween = (from: string, to: string) => dayNumber(to) - dayNumber(from);
const dateOfDay = (day: number) => new Date(day * 86400000).toISOString().slice(0, 10);
const bySalaryDesc = (a: Row, b: Row) => (b.salary as number) - (a.salary as number) || compare(a.name, b.name);
/** One colour per group of rows (a window's partitions, the months of a year). */
const GROUP_COLORS = [C.cyan, C.violet, C.pink, C.amber, C.teal];
const groupLook = (index: number): Look => [GROUP_COLORS[index % GROUP_COLORS.length], 0.2];
const steps = (frames: Frame[]) => [{ label: 'Step by step', frames }];
/** Colours one column's cells, to show the column that has just been worked out. */
const lit = (column: string | null): Record<string, string> | undefined => (column ? { [column]: C.amber } : undefined);
/** The answer, drawn as a small green table. */
const result = (id: string, x: number, y: number, cols: Column[], rows: Record<string, SqlCell | string>[]) =>
    table(id, x, y, cols, rows.map((values, i): TRow => ({ id: `r${i}`, values, look: KEEP })), { title: 'RESULT', titleColor: C.green, headerColor: C.green });

// ============ sql8-p1 · The second highest salary ============

const salaryRanks = () => {
    const sorted = [...employees()].sort(bySalaryDesc);
    const distinct = [...new Set(sorted.map(e => e.salary))];
    return sorted.map(row => ({ row, rnk: distinct.indexOf(row.salary) + 1 }));
};
const secondHighestRows = (): ResultRows => {
    const second = salaryRanks().filter(r => r.rnk === 2).map(r => r.row.salary as number);
    return [[second.length ? Math.max(...second) : null]];
};

const secondHighest = (): AnimationSpec => {
    const ranked = salaryRanks();
    const cols: Column[] = [{ key: 'name', w: 62 }, { key: 'salary', w: 62 }, { key: 'rnk', w: 44 }];
    const tbl = (showRank: boolean, pick: boolean) => table('sh', 20, 30, cols, ranked.map(({ row, rnk }) => ({
        id: `e${row.emp_id}`,
        values: { name: row.name, salary: row.salary, rnk: showRank ? rnk : '' },
        look: pick ? (rnk === 2 ? KEEP : GONE) : showRank && rnk === 3 ? FOCUS : PLAIN,
    })), { title: 'employees, ORDER BY salary DESC' });
    const answer = result('sh-res', 232, 96, [{ key: 'second_highest', w: 110 }], [{ second_highest: secondHighestRows()[0][0] }]);
    return {
        title: 'The second highest salary: rank the salaries, then keep rank 2',
        height: 216,
        variants: steps([
            frame('All 8 salaries, highest first. The second highest salary is the second different value, which is not always the second row.', [tbl(false, false)]),
            frame('DENSE_RANK() OVER (ORDER BY salary DESC): equal salaries share a number, and no number is skipped. Ben and Chen are both 3.', [tbl(true, false)]),
            frame('WHERE rnk = 2 keeps the rows that hold the second highest salary. Here that is Hana.', [tbl(true, true)]),
            frame('MAX(salary) turns those rows into one value: 80000. With no rank 2 at all, MAX would give NULL instead of an empty result.', [tbl(true, true), answer]),
        ]),
    };
};

// ============ sql8-p2 · Employees who earn more than their manager ============

const withManagers = () => employees().map(e => ({ e, m: employees().find(m => m.emp_id === e.manager_id) ?? null }));
const moreThanManagerRows = (): ResultRows =>
    withManagers()
        .filter(({ e, m }) => m !== null && (e.salary as number) > (m.salary as number))
        .sort((a, b) => compare(a.e.name, b.e.name))
        .map(({ e, m }) => [e.name, e.salary, m!.name, m!.salary]);

const moreThanManager = (): AnimationSpec => {
    const pairs = withManagers();
    const first: Column[] = [{ key: 'name', w: 62 }, { key: 'manager_id', w: 82 }, { key: 'salary', w: 62 }];
    const joined: Column[] = [{ key: 'employee', w: 66 }, { key: 'salary', w: 58 }, { key: 'manager', w: 62 }, { key: 'mgr_salary', w: 82 }];
    const earnsMore = (e: Row, m: Row | null) => m !== null && (e.salary as number) > (m.salary as number);
    const start = table('mm', 20, 30, first, pairs.map(({ e }) => ({ id: `e${e.emp_id}`, values: { name: e.name, manager_id: e.manager_id, salary: e.salary }, look: e.manager_id === null ? FOCUS : PLAIN })), { title: 'employees e' });
    const tbl = (filter: boolean) => table('mm', 20, 30, joined, pairs.map(({ e, m }) => ({
        id: `e${e.emp_id}`,
        values: { employee: e.name, salary: e.salary, manager: m ? m.name : '', mgr_salary: m ? m.salary : '' },
        look: m === null ? GONE : filter ? (earnsMore(e, m) ? KEEP : DROP) : PLAIN,
    })), { title: 'e JOIN m ON m.emp_id = e.manager_id' });
    return {
        title: 'Employees who earn more than their manager: a table joined to itself',
        height: 216,
        variants: steps([
            frame('Each employee row holds a manager_id: the emp_id of another row in the same table. Asha has none; she is at the top.', [start]),
            frame('Use the table twice: e is the employee, m is the manager. The join puts each manager\'s name and salary beside the employee. Asha has no manager, so the inner join drops her.', [tbl(false)]),
            frame('WHERE e.salary > m.salary compares the two salaries on each row. Only Hana (80000) earns more than her manager, Ben (70000).', [tbl(true)]),
            frame('"More than" is strictly greater: an employee who earns exactly the same as their manager would not be listed.', [tbl(true)]),
        ]),
    };
};

// ============ sql8-p3 · Customers who have never had an order delivered ============

const deliveredOrders = (customerId: SqlCell) => orders().filter(o => o.customer_id === customerId && o.status === 'delivered').map(o => o.order_id as number);
const neverDeliveredRows = (): ResultRows =>
    customers().filter(c => deliveredOrders(c.customer_id).length === 0).sort((a, b) => compare(a.customer_id, b.customer_id)).map(c => [c.customer_id, c.name]);

const neverDelivered = (): AnimationSpec => {
    const cols: Column[] = [{ key: 'customer_id', w: 82 }, { key: 'name', w: 52 }, { key: 'delivered', label: 'delivered orders', w: 150 }];
    const found = (c: Row) => {
        const delivered = deliveredOrders(c.customer_id);
        if (delivered.length) return delivered.join(', ');
        const other = orders().find(o => o.customer_id === c.customer_id);
        return other ? `none (${other.order_id} is ${other.status})` : 'none (no orders)';
    };
    const tbl = (searched: boolean, filter: boolean) => table('nd', 20, 30, cols, customers().map(c => ({
        id: `c${c.customer_id}`,
        values: { customer_id: c.customer_id, name: c.name, delivered: searched ? found(c) : '' },
        look: filter ? (deliveredOrders(c.customer_id).length ? DROP : KEEP) : PLAIN,
    })), { title: 'customers c' });
    return {
        title: 'Customers with no delivered order: start from customers, then look for an order',
        height: 180,
        variants: steps([
            frame('Start from customers, so that people who have never ordered at all are still in the list.', [tbl(false, false)]),
            frame('For each customer, the subquery looks for an order of theirs with status = \'delivered\'.', [tbl(true, false)]),
            frame('NOT EXISTS keeps a customer when that search finds nothing: Omar, Zoe and the second Tom.', [tbl(true, true)]),
            frame('Zoe has an order, but it is still pending. Omar and the second Tom have no orders, so a query that started from orders could never return them.', [tbl(true, true)]),
        ]),
    };
};

// ============ sql8-p4 · Find duplicate emails ============

const emailGroups = () => [...new Set(customers().map(c => String(c.email)))].sort().map(email => [email, customers().filter(c => c.email === email).length] as [string, number]);
const duplicateEmailRows = (): ResultRows => emailGroups().filter(([, n]) => n > 1);

const duplicateEmails = (): AnimationSpec => {
    const duplicated = new Set(duplicateEmailRows().map(([email]) => email));
    const base: Column[] = [{ key: 'customer_id', w: 82 }, { key: 'name', w: 52 }, { key: 'email', w: 110 }];
    const people = (mark: boolean) => table('de', 20, 30, mark ? [...base, { key: 'then', w: 60 }] : base, customers().map(c => {
        const twin = duplicated.has(c.email);
        const keeper = twin && customers().find(o => o.email === c.email) === c;
        return {
            id: `c${c.customer_id}`,
            values: { customer_id: c.customer_id, name: c.name, email: c.email, then: !mark || !twin ? '' : keeper ? 'keep' : 'delete' },
            look: !twin ? PLAIN : !mark ? FOCUS : keeper ? KEEP : DROP,
        };
    }), { title: 'customers' });
    const groups = (filter: boolean) => table('de-g', 20, 30, [{ key: 'email', w: 110 }, { key: 'sign_ups', w: 70 }], emailGroups().map(([email, n]) => ({
        id: `g${email}`, values: { email, sign_ups: n }, look: filter ? (n > 1 ? KEEP : DROP) : n > 1 ? FOCUS : PLAIN,
    })), { title: 'GROUP BY email' });
    return {
        title: 'Duplicate emails: group, count, keep the groups with more than one row',
        height: 180,
        variants: steps([
            frame('Six customers. Two rows share the same email: Tom signed up twice.', [people(false)]),
            frame('GROUP BY email makes one group for each different email, and COUNT(*) counts the rows in it.', [groups(false)]),
            frame('HAVING COUNT(*) > 1 keeps the groups with more than one row. WHERE could not do this: it runs before the groups exist.', [groups(true)]),
            frame('To remove the duplicate, keep the smallest customer_id of each email and delete the rest, after checking the rows with a SELECT. Then add a UNIQUE constraint.', [people(true)]),
        ]),
    };
};

// ============ sql8-p5 · The highest-paid employee in each department ============

const deptRanked = () => {
    const joined = employees().filter(e => e.dept_id !== null).map(e => ({ e, dept: departments().find(d => d.dept_id === e.dept_id)! }));
    return joined
        .map(({ e, dept }) => ({ e, dept, rnk: joined.filter(o => o.e.dept_id === e.dept_id && (o.e.salary as number) > (e.salary as number)).length + 1 }))
        .sort((a, b) => compare(a.dept.dept_id, b.dept.dept_id) || bySalaryDesc(a.e, b.e));
};
const topPerDepartmentRows = (): ResultRows =>
    deptRanked().filter(r => r.rnk === 1).sort((a, b) => compare(a.dept.dept_name, b.dept.dept_name)).map(r => [r.dept.dept_name, r.e.name, r.e.salary]);

const topPerDepartment = (): AnimationSpec => {
    const rows = deptRanked();
    const deptIds = [...new Set(rows.map(r => r.dept.dept_id))];
    const cols: Column[] = [{ key: 'dept_name', w: 88 }, { key: 'name', w: 56 }, { key: 'salary', w: 58 }, { key: 'rnk', w: 40 }];
    const tbl = (showRank: boolean, pick: boolean) => table('tp', 20, 30, cols, rows.map(({ e, dept, rnk }) => ({
        id: `e${e.emp_id}`,
        values: { dept_name: dept.dept_name, name: e.name, salary: e.salary, rnk: showRank ? rnk : '' },
        look: pick ? (rnk === 1 ? KEEP : GONE) : groupLook(deptIds.indexOf(dept.dept_id)),
    })), { title: 'employees e JOIN departments d' });
    const answer = result('tp-res', 20, 30, cols.slice(0, 3), topPerDepartmentRows().map(([dept_name, name, salary]) => ({ dept_name, name, salary })));
    return {
        title: 'The highest-paid employee in each department: rank inside each department',
        height: 198,
        variants: steps([
            frame('Join employees to departments. Gus has no department, so the inner join drops him; HR has no employees, so it does not appear.', [tbl(false, false)]),
            frame('RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC): the numbering starts again at 1 in each department.', [tbl(true, false)]),
            frame('WHERE rnk = 1, in the outer query, keeps the top of each department. If two people tied at the top, RANK would keep both.', [tbl(true, true)]),
            frame('ORDER BY dept_name gives the final answer: one row for each department that has employees.', [answer]),
        ]),
    };
};

// ============ sql8-p6 · Employees paid above their department's average ============

const withDeptAverage = () =>
    employees().map(e => {
        // A window puts every NULL dept_id in one partition, so Gus is a department of one.
        const same = employees().filter(o => o.dept_id === e.dept_id);
        return { e, avg: sum(same.map(o => o.salary)) / same.length };
    });
const aboveDeptAverageRows = (): ResultRows =>
    withDeptAverage()
        .filter(r => (r.e.salary as number) > r.avg)
        .sort((a, b) => compare(a.e.dept_id, b.e.dept_id) || bySalaryDesc(a.e, b.e))
        .map(r => [r.e.name, r.e.dept_id, r.e.salary, r.avg]);

const aboveDeptAverage = (): AnimationSpec => {
    const last = (id: SqlCell) => (id === null ? Number.MAX_SAFE_INTEGER : (id as number));
    const rows = withDeptAverage().sort((a, b) => last(a.e.dept_id) - last(b.e.dept_id) || bySalaryDesc(a.e, b.e));
    const deptIds = [...new Set(rows.map(r => r.e.dept_id))];
    const cols: Column[] = [{ key: 'name', w: 56 }, { key: 'dept_id', w: 62 }, { key: 'salary', w: 58 }, { key: 'dept_avg', w: 70 }];
    const tbl = (showAvg: boolean, filter: boolean) => table('ad', 20, 30, cols, rows.map(({ e, avg }) => ({
        id: `e${e.emp_id}`,
        values: { name: e.name, dept_id: e.dept_id, salary: e.salary, dept_avg: showAvg ? avg : '' },
        look: filter ? ((e.salary as number) > avg ? KEEP : DROP) : groupLook(deptIds.indexOf(e.dept_id)),
    })), { title: 'employees, one colour per department' });
    return {
        title: 'Paid above the department average: put the average on every row, then compare',
        height: 216,
        variants: steps([
            frame('Eight employees, coloured by department. Gus has no department.', [tbl(false, false)]),
            frame('AVG(salary) OVER (PARTITION BY dept_id) writes each department\'s average on every one of its rows. No rows are collapsed, as GROUP BY would do.', [tbl(true, false)]),
            frame('WHERE salary > dept_avg, in the outer query, keeps Asha, Hana and Dara. A window function can\'t be used in the WHERE of the same SELECT.', [tbl(true, true)]),
            frame('Fatima and Gus are each alone in their group, so each equals their own average and is not above it.', [tbl(true, true)]),
        ]),
    };
};

// ============ sql8-p7 · Month-over-month revenue growth ============

const monthOf = (order: Row) => String(order.order_date).slice(0, 7);
const monthlyRevenue = () => [...new Set(orders().map(monthOf))].sort().map(month => [month, sum(orders().filter(o => monthOf(o) === month).map(o => o.amount))] as [string, number]);
const monthlyGrowthRows = (): ResultRows => monthlyRevenue().map(([month, revenue], i, all) => [month, revenue, i ? round1((100 * (revenue - all[i - 1][1])) / all[i - 1][1]) : null]);

const monthlyGrowth = (): AnimationSpec => {
    const months = monthlyRevenue().map(([month]) => month);
    const growth = monthlyGrowthRows();
    const list = table('mg-o', 8, 30, [{ key: 'order_date', w: 82 }, { key: 'amount', w: 54 }], [...orders()].sort((a, b) => compare(a.order_date, b.order_date)).map(o => ({
        id: `o${o.order_id}`, values: { order_date: o.order_date, amount: o.amount }, look: groupLook(months.indexOf(monthOf(o))),
    })), { title: 'orders' });
    const monthly = (x: number, columns: number) => table('mg-m', x, 30, [{ key: 'month', w: 62 }, { key: 'revenue', w: 62 }, { key: 'previous', w: 70 }, { key: 'growth_pct', w: 82 }].slice(0, columns), growth.map(([month, revenue, pct], i) => ({
        id: `m${month}`,
        values: { month, revenue, previous: i ? growth[i - 1][1] : null, growth_pct: pct },
        look: groupLook(i),
        cells: lit(columns === 3 ? 'previous' : columns === 4 ? 'growth_pct' : null),
    })), { title: 'monthly' });
    return {
        title: 'Month-over-month growth: add up each month, then compare with the month before',
        height: 250,
        variants: steps([
            frame('Ten orders, coloured by month. Growth is about months, so the orders must be added up first.', [list]),
            frame('GROUP BY month with SUM(amount) gives one row per month. Order 106 has no amount (NULL), and SUM skips it.', [list, monthly(170, 2)]),
            frame('LAG(revenue) OVER (ORDER BY month) puts the previous month\'s revenue beside each month. January has no month before it, so it gets NULL.', [monthly(20, 3)]),
            frame('growth_pct = 100.0 × (revenue − previous) ÷ previous. The 100.0 keeps it from being whole-number division. January stays NULL.', [monthly(20, 4)]),
        ]),
    };
};

// ============ sql8-p8 · Each customer's first order ============

const numberedOrders = () => {
    const sorted = [...orders()].sort((a, b) => compare(a.customer_id, b.customer_id) || compare(a.order_date, b.order_date) || compare(a.order_id, b.order_id));
    return sorted.map(o => ({ o, rn: sorted.filter(x => x.customer_id === o.customer_id).indexOf(o) + 1 }));
};
const firstOrderRows = (): ResultRows =>
    numberedOrders().filter(r => r.rn === 1).map(({ o }) => {
        const customer = customers().find(c => c.customer_id === o.customer_id)!;
        return [customer.name, o.order_id, o.order_date, o.amount, daysBetween(String(customer.signup_date), String(o.order_date))];
    });

const firstOrder = (): AnimationSpec => {
    const rows = numberedOrders();
    const ids = [...new Set(rows.map(r => r.o.customer_id))];
    const cols: Column[] = [{ key: 'customer_id', w: 82 }, { key: 'order_id', w: 62 }, { key: 'order_date', w: 82 }, { key: 'amount', w: 54 }, { key: 'rn', w: 30 }];
    const tbl = (showRn: boolean, pick: boolean) => table('fo', 20, 30, cols, rows.map(({ o, rn }) => ({
        id: `o${o.order_id}`,
        values: { customer_id: o.customer_id, order_id: o.order_id, order_date: o.order_date, amount: o.amount, rn: showRn ? rn : '' },
        look: pick ? (rn === 1 ? KEEP : GONE) : groupLook(ids.indexOf(o.customer_id)),
    })), { title: 'orders, sorted inside each customer' });
    const answer = result('fo-res', 20, 30, [{ key: 'name', w: 50 }, { key: 'order_id', w: 62 }, { key: 'order_date', w: 82 }, { key: 'amount', w: 54 }, { key: 'days', w: 44 }],
        firstOrderRows().map(([name, order_id, order_date, amount, days]) => ({ name, order_id, order_date, amount, days })));
    return {
        title: 'Each customer\'s first order: number the orders inside each customer, keep number 1',
        height: 250,
        variants: steps([
            frame('The orders, grouped by customer and sorted by date inside each group.', [tbl(false, false)]),
            frame('ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date, order_id): number 1 is each customer\'s first order. The order_id breaks a tie on the same day.', [tbl(true, false)]),
            frame('WHERE rn = 1, in the outer query, keeps one whole row for each customer: the date and the amount stay together.', [tbl(true, true)]),
            frame('Join customers for the name and the sign-up date: days = first order date − sign-up date. Lena\'s first order was cancelled and has no amount, so ask whether it should count.', [answer]),
        ]),
    };
};

// ============ sql8-p9 · Streaks: orders on consecutive days ============

const customerDays = () => {
    const seen = new Set<string>();
    const days = [...orders()]
        .sort((a, b) => compare(a.customer_id, b.customer_id) || compare(a.order_date, b.order_date))
        .filter(o => {
            const key = `${o.customer_id}|${o.order_date}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    return days.map(o => {
        const rn = days.filter(x => x.customer_id === o.customer_id).indexOf(o) + 1;
        return { id: o.customer_id as number, date: String(o.order_date), rn, island: dateOfDay(dayNumber(String(o.order_date)) - rn) };
    });
};
const streakRows = (): ResultRows => {
    const days = customerDays();
    const groups = [...new Set(days.map(d => `${d.id}|${d.island}`))].map(key => days.filter(d => `${d.id}|${d.island}` === key));
    return groups
        .filter(group => group.length >= 2)
        .map(group => [customers().find(c => c.customer_id === group[0].id)!.name, group[0].date, group[group.length - 1].date, group.length] as SqlCell[])
        .sort((a, b) => (b[3] as number) - (a[3] as number) || compare(a[0], b[0]));
};

const streaks = (): AnimationSpec => {
    const days = customerDays();
    const size = (d: { id: number; island: string }) => days.filter(x => x.id === d.id && x.island === d.island).length;
    const cols: Column[] = [{ key: 'customer_id', w: 82 }, { key: 'order_date', w: 82 }, { key: 'rn', w: 30 }, { key: 'island', w: 82 }];
    const tbl = (filled: number, group: boolean) => table('st', 20, 30, cols, days.map(d => ({
        id: `d${d.id}-${d.date}`,
        values: { customer_id: d.id, order_date: d.date, rn: filled >= 1 ? d.rn : '', island: filled >= 2 ? d.island : '' },
        look: group ? (size(d) >= 2 ? KEEP : GONE) : PLAIN,
        cells: lit(filled === 2 && !group ? 'island' : null),
    })), { title: 'one row per customer and day' });
    const answer = result('st-res', 20, 30, [{ key: 'name', w: 50 }, { key: 'streak_start', w: 88 }, { key: 'streak_end', w: 82 }, { key: 'days', w: 44 }],
        streakRows().map(([name, streak_start, streak_end, n]) => ({ name, streak_start, streak_end, days: n })));
    return {
        title: 'Streaks of consecutive days: date minus row number gives each streak one label',
        height: 250,
        variants: steps([
            frame('First, one row for each customer and day (DISTINCT): two orders on the same day must count as one day.', [tbl(0, false)]),
            frame('ROW_NUMBER() per customer, in date order: 1, 2, 3 and so on.', [tbl(1, false)]),
            frame('island = date − row number, in days. On consecutive days the date and the row number both go up by 1, so their difference stays the same.', [tbl(2, false)]),
            frame('Rows with the same customer and the same island are one streak. Customer 1 has three days with island 2024-01-05; every other island has one day.', [tbl(2, true)]),
            frame('GROUP BY customer and island, then HAVING COUNT(*) >= 2 keeps the real streaks: Priya, 6 to 8 January, 3 days in a row.', [answer]),
        ]),
    };
};

// ============ sql8-p10 · Products bought together ============

const productName = (id: SqlCell) => String(products().find(p => p.product_id === id)!.product_name);
const orderProducts = () => [...new Set(orderItems().map(i => i.order_id as number))].sort((a, b) => a - b).map(id => ({ id, names: orderItems().filter(i => i.order_id === id).map(i => productName(i.product_id)) }));
const boughtTogetherRows = (): ResultRows => {
    const count = new Map<string, number>();
    for (const { names } of orderProducts()) for (const a of names) for (const b of names) if (a < b) count.set(`${a}|${b}`, (count.get(`${a}|${b}`) ?? 0) + 1);
    return [...count].map(([pair, n]) => [...pair.split('|'), n] as SqlCell[]).sort((x, y) => (y[2] as number) - (x[2] as number) || compare(x[0], y[0]) || compare(x[1], y[1]));
};

const boughtTogether = (): AnimationSpec => {
    const all = orderProducts();
    const shown = all.find(o => o.names.length === 2)!;
    const list = (focus: boolean) => table('bt-o', 8, 30, [{ key: 'order_id', w: 62 }, { key: 'products', w: 150 }], all.map(o => ({
        id: `o${o.id}`, values: { order_id: o.id, products: o.names.join(', ') }, look: focus && o === shown ? FOCUS : o.names.length < 2 && focus ? GONE : PLAIN,
    })), { title: 'the products of each order' });
    const pairs = (filter: boolean) => table('bt-p', 232, 30, [{ key: 'a', w: 80 }, { key: 'b', w: 80 }], shown.names.flatMap(a => shown.names.map(b => ({
        id: `p${a}-${b}`, values: { a, b }, look: filter ? (a < b ? KEEP : DROP) : PLAIN,
    }))), { title: `order ${shown.id}: a with b` });
    const answer = result('bt-res', 20, 30, [{ key: 'product_a', w: 84 }, { key: 'product_b', w: 84 }, { key: 'orders_together', w: 110 }],
        boughtTogetherRows().map(([product_a, product_b, n]) => ({ product_a, product_b, orders_together: n })));
    return {
        title: 'Products bought together: pair each order\'s products with each other',
        variants: steps([
            frame('order_items joined to products: what each order contains. Only orders with two or more products can make a pair.', [list(false)]),
            frame(`Join order_items to itself on order_id. In order ${shown.id}, every product is paired with every product: with itself, and both ways round.`, [list(true), pairs(false)]),
            frame('WHERE a < b keeps each pair once. It drops a product paired with itself, and the mirrored copy of each pair.', [list(true), pairs(true)]),
            frame('Do the same for every order, then GROUP BY the pair and COUNT(*). Here every pair appears in one order.', [answer]),
        ]),
    };
};

// ============ sql8-p11 · Which products make up 80% of revenue? ============

const productRevenue = () =>
    products()
        .map(p => [String(p.product_name), sum(orderItems().filter(i => i.product_id === p.product_id).map(i => (i.quantity as number) * (p.price as number)))] as [string, number])
        // A product that never sold has no order_items row, so the inner join leaves it out.
        .filter(([name]) => orderItems().some(i => productName(i.product_id) === name))
        .sort((a, b) => b[1] - a[1]);
const revenueShareRows = (): ResultRows => {
    const all = productRevenue();
    const whole = sum(all.map(([, revenue]) => revenue));
    let running = 0;
    return all.map(([name, revenue]) => {
        running += revenue;
        return [name, revenue, round1((100 * revenue) / whole), round1((100 * running) / whole)];
    });
};

const revenueShare = (): AnimationSpec => {
    const rows = revenueShareRows();
    const whole = sum(rows.map(r => r[1]));
    const cols: Column[] = [{ key: 'product_name', w: 92 }, { key: 'revenue', w: 62 }, { key: 'pct_of_total', w: 92 }, { key: 'cumulative_pct', w: 104 }];
    const tbl = (filled: number, pick: boolean) => table('rs', 20, 30, cols, rows.map(([name, revenue, pct, cumulative], i) => ({
        id: `p${name}`,
        values: { product_name: name, revenue, pct_of_total: filled >= 1 ? pct : '', cumulative_pct: filled >= 2 ? cumulative : '' },
        // "The first 80%": keep a product while the share before it is still under 80.
        look: pick ? ((i ? (rows[i - 1][3] as number) : 0) < 80 ? KEEP : GONE) : PLAIN,
        cells: lit(pick ? null : filled === 1 ? 'pct_of_total' : filled === 2 ? 'cumulative_pct' : null),
    })), { title: 'product_revenue, ORDER BY revenue DESC' });
    return {
        title: 'Share of total and running share: which products bring in the first 80%',
        height: 180,
        variants: steps([
            frame('Revenue per product is SUM(quantity × price), highest first. The phone case never sold, so it is not here.', [tbl(0, false)]),
            frame(`SUM(revenue) OVER () is the grand total, ${whole}, on every row. pct_of_total = 100.0 × revenue ÷ ${whole}.`, [tbl(1, false)]),
            frame('A running SUM, ordered by revenue DESC with an explicit ROWS frame, adds up the rows so far: the cumulative share.', [tbl(2, false)]),
            frame('The first 80%: keep a product while the share before it is still under 80. The backpack takes the total from 74.4 to 89.5, so it is included.', [tbl(2, true)]),
        ]),
    };
};

// ============ sql8-p12 · Retention: who came back within 30 days? ============

const firstDates = () => [...new Set(orders().map(o => o.customer_id as number))].sort((a, b) => a - b).map(id => ({ id, first: orders().filter(o => o.customer_id === id).map(o => String(o.order_date)).sort()[0] }));
const laterOrders = () =>
    firstDates().flatMap(({ id, first }) =>
        orders()
            .filter(o => o.customer_id === id && String(o.order_date) > first)
            .sort((a, b) => compare(a.order_date, b.order_date))
            .map(o => ({ id, orderId: o.order_id as number, date: String(o.order_date), after: daysBetween(first, String(o.order_date)) })));
const cameBack = () => firstDates().map(({ id }) => ({ id, flag: laterOrders().some(l => l.id === id && l.after <= 30) ? 1 : 0 }));
const retentionRows = (): ResultRows => {
    const flags = cameBack();
    const back = flags.filter(f => f.flag === 1).length;
    return [[flags.length, back, round1((100 * back) / flags.length)]];
};

const retention = (): AnimationSpec => {
    const flags = cameBack();
    const firsts = (showFlag: boolean) => table('rt-f', 214, 30, [{ key: 'customer_id', w: 82 }, showFlag ? { key: 'came_back', w: 76 } : { key: 'first_date', w: 82 }], firstDates().map(({ id, first }) => {
        const flag = flags.find(f => f.id === id)!.flag;
        return { id: `c${id}`, values: { customer_id: id, first_date: first, came_back: flag }, look: showFlag ? (flag ? KEEP : DROP) : PLAIN };
    }), { title: showFlag ? 'flags' : 'firsts' });
    const later = table('rt-l', 8, 30, [{ key: 'cust', w: 40 }, { key: 'order_date', w: 82 }, { key: 'days_after', w: 76 }], laterOrders().map(l => ({
        id: `l${l.orderId}`, values: { cust: l.id, order_date: l.date, days_after: l.after }, look: l.after <= 30 ? KEEP : DROP,
    })), { title: 'later orders' });
    const [customersCount, back, pct] = retentionRows()[0];
    const answer = result('rt-res', 8, 206, [{ key: 'customers', w: 76 }, { key: 'came_back', label: 'came back', w: 76 }, { key: 'retention_pct', w: 104 }], [{ customers: customersCount, came_back: back, retention_pct: pct }]);
    return {
        title: 'Retention: of the customers who ordered, how many ordered again within 30 days',
        height: 256,
        variants: steps([
            frame('firsts: each customer\'s first order date, from MIN(order_date) with GROUP BY customer_id. Four customers have ordered.', [firsts(false)]),
            frame('Join back to their orders and look at the later ones: how many days after the first order? Green is within 30 days.', [later, firsts(false)]),
            frame('MAX(CASE … THEN 1 ELSE 0 END) is 1 if any later order came within 30 days. Customer 2 came back after 40 days: 0. Customer 5 has no second order: 0.', [later, firsts(true)]),
            frame(`COUNT(*) is ${customersCount} customers and SUM(came_back) is ${back}, so retention is 100.0 × ${back} ÷ ${customersCount} = ${pct}%.`, [later, firsts(true), answer]),
        ]),
    };
};

// ============ sql8-p13 · The median salary ============

const salariesAscending = () => [...employees()].sort((a, b) => (a.salary as number) - (b.salary as number) || compare(a.name, b.name));
const middlePositions = (n: number) => [Math.floor((n + 1) / 2), Math.floor((n + 2) / 2)];
const medianRows = (): ResultRows => {
    const salaries = salariesAscending().map(e => e.salary as number);
    const middle = [...new Set(middlePositions(salaries.length))].map(position => salaries[position - 1]);
    return [[sum(middle) / middle.length]];
};

const median = (): AnimationSpec => {
    const sorted = salariesAscending();
    const n = sorted.length;
    const [low, high] = middlePositions(n);
    const middle = sorted.filter((_, i) => i + 1 === low || i + 1 === high).map(e => e.salary as number);
    const mean = sum(sorted.map(e => e.salary)) / n;
    const tbl = (pick: boolean) => table('md', 20, 30, [{ key: 'rn', w: 30 }, { key: 'name', w: 56 }, { key: 'salary', w: 62 }], sorted.map((e, i) => ({
        id: `e${e.emp_id}`, values: { rn: i + 1, name: e.name, salary: e.salary }, look: pick && (i + 1 === low || i + 1 === high) ? KEEP : PLAIN,
    })), { title: 'ordered, lowest salary first' });
    const note = (id: string, y: number, value: string, color: string = C.ink) => label(id, 190, y, value, color, { size: 12 });
    return {
        title: 'The median salary: sort, number the rows, average the middle one or two',
        height: 216,
        variants: steps([
            frame('Sort the salaries and number them with ROW_NUMBER. COUNT(*) OVER () writes n, the number of rows, on every row.', [tbl(false), note('n', 60, `n = ${n}`)]),
            frame('The middle positions are (n + 1) / 2 and (n + 2) / 2, with whole-number division.', [tbl(true), note('n', 60, `n = ${n}`), note('a', 84, `(n + 1) / 2 = ${low}`, C.green), note('b', 104, `(n + 2) / 2 = ${high}`, C.green)]),
            frame(`AVG of those rows is the median: (${middle.join(' + ')}) ÷ ${middle.length} = ${medianRows()[0][0]}. With an odd n the two formulas give the same row, so the median is that one value.`, [tbl(true), note('n', 60, `n = ${n}`), note('a', 84, `(n + 1) / 2 = ${low}`, C.green), note('b', 104, `(n + 2) / 2 = ${high}`, C.green), note('m', 136, `median = ${medianRows()[0][0]}`, C.green)]),
            frame(`The median is not the mean. AVG(salary) over all ${n} rows is ${mean}: one very large salary would move the mean a lot and the median hardly at all.`, [tbl(true), note('m', 136, `median = ${medianRows()[0][0]}`, C.green), note('avg', 160, `mean = ${mean}`, C.amber)]),
        ]),
    };
};

// ============ sql8-p14 · Customers who bought every product in a category ============

const CATEGORY = 'Stationery';
const categoryProducts = () => products().filter(p => p.category === CATEGORY);
const categoryPurchases = () =>
    orderItems()
        .flatMap(item => {
            const product = categoryProducts().find(p => p.product_id === item.product_id);
            if (!product) return [];
            const order = orders().find(o => o.order_id === item.order_id)!;
            return [{ customer: customers().find(c => c.customer_id === order.customer_id)!, order, product }];
        })
        .sort((a, b) => compare(a.order.order_id, b.order.order_id) || compare(a.product.product_id, b.product.product_id));
const buyerCounts = () =>
    [...new Set(categoryPurchases().map(r => r.customer))].map(customer => {
        const bought = categoryPurchases().filter(r => r.customer === customer);
        return { customer, rows: bought.length, different: new Set(bought.map(r => r.product.product_id)).size };
    });
const boughtEveryRows = (): ResultRows =>
    buyerCounts().filter(b => b.different === categoryProducts().length).map(b => [b.customer.name]).sort((a, b) => compare(a[0], b[0]));

const boughtEvery = (): AnimationSpec => {
    const target = categoryProducts().length;
    const category = table('be-c', 8, 30, [{ key: 'product_name', w: 92 }], categoryProducts().map(p => ({ id: `p${p.product_id}`, values: { product_name: p.product_name }, look: FOCUS })), { title: CATEGORY });
    const bought = table('be-b', 120, 30, [{ key: 'name', w: 50 }, { key: 'order_id', w: 62 }, { key: 'product_name', w: 92 }], categoryPurchases().map(r => ({
        id: `b${r.order.order_id}-${r.product.product_id}`, values: { name: r.customer.name, order_id: r.order.order_id, product_name: r.product.product_name },
    })), { title: 'who bought which' });
    const counts = (pick: boolean) => table('be-n', 120, 150, [{ key: 'name', w: 50 }, { key: 'rows', label: 'COUNT(*)', w: 66 }, { key: 'different', label: 'COUNT(DISTINCT)', w: 110 }], buyerCounts().map(b => ({
        id: `n${b.customer.customer_id}`, values: { name: b.customer.name, rows: b.rows, different: b.different },
        look: pick ? (b.different === target ? KEEP : DROP) : PLAIN, cells: lit(pick ? null : 'different'),
    })), { title: 'GROUP BY customer' });
    return {
        title: 'Customers who bought every product in a category: count the different products',
        height: 222,
        variants: steps([
            frame(`The category has ${target} products. That number is the target: a customer must have bought ${target} different products from it.`, [category]),
            frame('Join customers, orders, order_items and products, and keep the rows of this category: who bought which product.', [category, bought]),
            frame('GROUP BY customer. Priya bought the notebook twice, so COUNT(*) is 3, but COUNT(DISTINCT product_id) counts different products: 2.', [category, bought, counts(false)]),
            frame(`HAVING COUNT(DISTINCT product_id) = ${target}, the size of the category, keeps Priya. Counting the category in a subquery means the query still works when a product is added.`, [category, bought, counts(true)]),
        ]),
    };
};

// ============ REGISTRY ============

export const phase8SolutionAnimations: AnimationRegistry = {
    'sql8-p1': secondHighest,
    'sql8-p2': moreThanManager,
    'sql8-p3': neverDelivered,
    'sql8-p4': duplicateEmails,
    'sql8-p5': topPerDepartment,
    'sql8-p6': aboveDeptAverage,
    'sql8-p7': monthlyGrowth,
    'sql8-p8': firstOrder,
    'sql8-p9': streaks,
    'sql8-p10': boughtTogether,
    'sql8-p11': revenueShare,
    'sql8-p12': retention,
    'sql8-p13': median,
    'sql8-p14': boughtEvery,
};

/** The rows each walk-through ends on, for the test that compares them with the lesson's solution. */
export const phase8SolutionChecks: Record<string, () => ResultRows> = {
    'sql8-p1': secondHighestRows,
    'sql8-p2': moreThanManagerRows,
    'sql8-p3': neverDeliveredRows,
    'sql8-p4': duplicateEmailRows,
    'sql8-p5': topPerDepartmentRows,
    'sql8-p6': aboveDeptAverageRows,
    'sql8-p7': monthlyGrowthRows,
    'sql8-p8': firstOrderRows,
    'sql8-p9': streakRows,
    'sql8-p10': boughtTogetherRows,
    'sql8-p11': revenueShareRows,
    'sql8-p12': retentionRows,
    'sql8-p13': medianRows,
    'sql8-p14': boughtEveryRows,
};
