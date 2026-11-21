<!-- Written by `npm run lessons` from the lesson data in src/data. Edit the lesson there, not this page. -->

# DISTINCT: removing duplicate rows

**SQL · Unit 1: Reading data: SELECT, WHERE and sorting · Lesson 6 of 8 · Must know**

> **In one line.** SELECT DISTINCT removes duplicate rows from the result, where two rows are duplicates only if every selected column is the same.

[Open this lesson on the site](https://learn.hamropedia.com/sql/distinct-removing-duplicate-rows/) for its animation, the practice game and tap-to-explain words.

## The problem it solves

"Which cities do our departments sit in?" lists London twice. "Which customers ordered in January?" lists Priya three times. DISTINCT gives each answer once.

## The idea

DISTINCT goes straight after SELECT and applies to the whole row you selected, not to one column. `SELECT DISTINCT location` compares only location, so London appears once. `SELECT DISTINCT name, customer_id` compares both, so two Toms with different ids are both kept. For DISTINCT, NULLs count as equal to each other, so many NULLs become one.

## Analogy

Collecting football stickers: when you sort your pile, you keep one of each and put the swaps aside. Two stickers count as the same only if they are completely identical.

**Where the analogy breaks.** With stickers you can choose which copy to keep. DISTINCT can't: it keeps one row of each and throws the rest away, without remembering how many there were. If you need the count, use GROUP BY.

## Syntax

```sql
SELECT DISTINCT column1, column2
FROM table_name;
```

## How it works, step by step

1. The database builds the rows with just the selected columns.
2. It compares whole rows: two rows are duplicates only if every selected column matches.
3. It keeps one copy of each distinct row.
4. ORDER BY then sorts what is left.

## Picture it

```mermaid
flowchart LR
  A["London<br/>Manchester<br/>London<br/>Leeds"] -->|"DISTINCT"| B["Leeds<br/>London<br/>Manchester"]
```

*DISTINCT collapses identical rows into one. Here the second London disappears, and ORDER BY sorts what is left.*

## Examples on the practice database

**One column**

```sql
SELECT DISTINCT location
FROM departments
ORDER BY location;
```

| location |
| --- |
| Leeds |
| London |
| Manchester |

Engineering and Marketing are both in London, but London appears once.

---

**Several columns: the whole row must match**

```sql
SELECT DISTINCT name, email
FROM customers
ORDER BY name;
```

| name | email |
| --- | --- |
| Lena | lena@mail.com |
| Omar | omar@mail.com |
| Priya | priya@mail.com |
| Tom | tom@mail.com |
| Zoe | zoe@mail.com |

Tom's two sign-ups have the same name and email, so they collapse into one row.

---

**Add a column that differs, and the duplicates come back**

```sql
SELECT DISTINCT customer_id, name
FROM customers
ORDER BY customer_id;
```

| customer_id | name |
| --- | --- |
| 1 | Priya |
| 2 | Tom |
| 3 | Lena |
| 4 | Omar |
| 5 | Zoe |
| 6 | Tom |

The ids differ, so both Toms stay. DISTINCT works on the row, not on one column.

## Must know

- DISTINCT applies to the whole selected row, never to just one column.
- Adding a unique column (like an id) to a DISTINCT query makes it do nothing.
- NULLs count as equal for DISTINCT: many NULLs become one.
- `COUNT(DISTINCT column)` counts the different values — Unit 2.
- DISTINCT has to compare every row, which costs time on big results.

## Common mistakes

- Writing `SELECT DISTINCT(name), email` and thinking only name is distinct. The brackets do nothing; the whole row is compared.
- Using DISTINCT to hide duplicates caused by a wrong join. Fix the join instead (Unit 3).
- Using DISTINCT when you actually need a count per value. That is GROUP BY.

> **Not true:** DISTINCT is the right fix when a join returns the same row several times.  
> **In fact:** Duplicates from a join usually mean the join itself is wrong, and DISTINCT only hides that. Fix the join condition instead.

## Other databases

- PostgreSQL has `DISTINCT ON (column)`, which keeps the first row for each value of that column — handy for "latest order per customer". Elsewhere, use ROW_NUMBER (Unit 5).

## In the interview

SELECT DISTINCT removes duplicate rows from the result, comparing all the selected columns together, with NULLs treated as equal. I use it for lists of unique values. But if I find myself adding DISTINCT to fix unexpected duplicates, I go back and check the join, because DISTINCT can hide a fan-out that also breaks sums and counts.

<details>
<summary>&lt;b>DISTINCT or GROUP BY?&lt;/b></summary>

For a plain list of unique values they give the same result. Use GROUP BY when you also need aggregates per value, such as counts.

</details>

<details>
<summary>&lt;b>Does DISTINCT apply to one column or the whole row?&lt;/b></summary>

The whole row of selected columns, always.

</details>

## Practise

Write each answer yourself first, then open the answer and compare.

### 1. Explain

Explain why `SELECT DISTINCT customer_id, name FROM customers` still shows Tom twice.

<details>
<summary>Show one good answer</summary>

DISTINCT removes a row only when every selected column matches another row. Tom has two sign-ups, with customer_id 2 and 6. So the rows are (2, Tom) and (6, Tom): the names match, but the ids don't, so they are different rows and both stay.

Drop customer_id and select just name, and the two Toms become one.

</details>

### 2. Write

Write a query for the list of customer ids who have placed at least one order, each id once, sorted.

<details>
<summary>Show one good answer</summary>

orders has one row per order, so customer 1 appears five times. DISTINCT keeps each id once. Customers 4 (Omar) and 6 (the second Tom) never ordered, so they are not in orders at all.

```sql
SELECT DISTINCT customer_id
FROM orders
ORDER BY customer_id;
```

| customer_id |
| --- |
| 1 |
| 2 |
| 3 |
| 5 |

</details>

### 3. Predict

How many rows does `SELECT DISTINCT status FROM orders;` return?

<details>
<summary>Show one good answer</summary>

4 rows: cancelled, delivered, pending and shipped. There are 10 orders but only four different statuses. (ORDER BY is added below so the order is fixed.)

```sql
SELECT DISTINCT status
FROM orders
ORDER BY status;
```

| status |
| --- |
| cancelled |
| delivered |
| pending |
| shipped |

</details>

### 4. Edge cases

How many rows does `SELECT DISTINCT dept_id FROM employees;` return, and does the NULL count as a row?

<details>
<summary>Show one good answer</summary>

4 rows: 1, 2, 3 and NULL. Yes, the NULL counts.

DISTINCT treats all NULLs as one group, even though `NULL = NULL` is not true in a WHERE. Gus's missing department gives one NULL row. Department 4 (HR) is not in the list, because nobody works there.

```sql
SELECT DISTINCT dept_id
FROM employees
ORDER BY dept_id;
```

| dept_id |
| --- |
| NULL |
| 1 |
| 2 |
| 3 |

</details>

## Go further (optional)

- READ · [W3Schools — SQL SELECT DISTINCT](https://www.w3schools.com/sql/sql_distinct.asp) · short page with a try-it editor, free
- READ · [Mode SQL Tutorial — SQL DISTINCT](https://mode.com/sql-tutorial/) · Mode, free
- PRACTICE · [SQLBolt — Lesson 4: Filtering and sorting Query results](https://sqlbolt.com/) · interactive exercises in the browser, free

---

[← ORDER BY, LIMIT and OFFSET: sorting and top N](order-by-limit-and-offset-sorting-and-top-n.md) · [All lessons](../../README.md) · [CASE WHEN: if-then logic inside a query →](case-when-if-then-logic-inside-a-query.md)
