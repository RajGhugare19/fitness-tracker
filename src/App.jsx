import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

/* ------------------------------------------------------------------ */
/* Foods — macros per 100 g raw, or per piece where unit === "piece"   */
/* ------------------------------------------------------------------ */

const SEED_FOODS = [
  { id: "oats", name: "Oats, dry", unit: "g", kcal: 380, p: 13, c: 67, f: 7 },
  { id: "yog", name: "Greek yoghurt 0%", unit: "g", kcal: 58, p: 10, c: 3.6, f: 0.4 },
  { id: "banana", name: "Banana, medium", unit: "piece", kcal: 105, p: 1.3, c: 27, f: 0.4 },
  { id: "almond", name: "Almonds", unit: "g", kcal: 579, p: 21, c: 22, f: 50 },
  { id: "eggwhite", name: "Egg whites, liquid", unit: "g", kcal: 50, p: 10.5, c: 0.7, f: 0.2 },
  { id: "eggwhitec", name: "Egg whites, cooked", unit: "g", kcal: 62, p: 13, c: 0.8, f: 0.2 },
  { id: "salmon", name: "Salmon, raw", unit: "g", kcal: 208, p: 20, c: 0, f: 13 },
  { id: "chicken", name: "Chicken breast, raw", unit: "g", kcal: 165, p: 31, c: 0, f: 3.6 },
  { id: "rice", name: "Rice, dry", unit: "g", kcal: 360, p: 7.5, c: 78, f: 1 },
  { id: "atta", name: "Chapati flour", unit: "g", kcal: 340, p: 12, c: 70, f: 2 },
  { id: "oil", name: "Cooking oil", unit: "g", kcal: 884, p: 0, c: 0, f: 100 },
  { id: "berries", name: "Mixed berries", unit: "g", kcal: 45, p: 0.8, c: 10, f: 0.3 },
  { id: "carrot", name: "Baby carrots", unit: "g", kcal: 35, p: 0.8, c: 8, f: 0.2 },
];

/* Four meals. Every quantity is editable and can be saved back as your default. */
const SEED_MEALS = [
  {
    id: "breakfast",
    name: "Breakfast",
    items: [
      { foodId: "oats", qty: 60 },
      { foodId: "yog", qty: 250 },
      { foodId: "banana", qty: 1 },
      { foodId: "almond", qty: 15 },
    ],
  },
  {
    id: "lunch",
    name: "Lunch",
    items: [
      { foodId: "salmon", qty: 250 },
      { foodId: "rice", qty: 65 },
      { foodId: "oil", qty: 5 },
    ],
  },
  {
    id: "snack",
    name: "Snack",
    items: [
      { foodId: "yog", qty: 250 },
      { foodId: "berries", qty: 100 },
    ],
  },
  {
    id: "dinner",
    name: "Dinner",
    items: [
      { foodId: "chicken", qty: 180 },
      { foodId: "yog", qty: 60 },
      { foodId: "atta", qty: 60 },
      { foodId: "carrot", qty: 100 },
    ],
  },
];

const SEED_TARGETS = { kcal: 2200, p: 173, c: 220, f: 65, startWeight: 72, goalWeight: 65 };

/* Default sessions, straight from the plan. Weights in lb. */
const SEED_PLANS = {
  push: [
    { name: "Chest press", sets: 3, target: "6–8" },
    { name: "Smith incline press", sets: 3, target: "8–10" },
    { name: "DB shoulder press", sets: 3, target: "8" },
    { name: "Chest fly", sets: 3, target: "12" },
    { name: "Lateral raises", sets: 3, target: "12" },
    { name: "Tricep rope pushdown", sets: 3, target: "10–12" },
    { name: "Hanging knee raises", sets: 3, target: "10–15" },
  ],
  pull: [
    { name: "Pullups", sets: 3, target: "4–6" },
    { name: "Wide lat pulldown", sets: 3, target: "8" },
    { name: "Horizontal pulls", sets: 3, target: "8–10" },
    { name: "Rear delts", sets: 3, target: "10" },
    { name: "Shrugs", sets: 3, target: "10" },
    { name: "DB biceps curls", sets: 3, target: "6–9" },
  ],
  legs: [
    { name: "Squats", sets: 5, target: "5/5/5 then 8–10/8–10" },
    { name: "Romanian deadlifts", sets: 3, target: "8–10" },
    { name: "Leg curls", sets: 3, target: "10" },
    { name: "Leg extensions", sets: 3, target: "12–14" },
    { name: "Sitting calf raise", sets: 3, target: "20" },
    { name: "Cable crunch", sets: 3, target: "12–15" },
  ],
};

const DAY_TYPES = [
  ["push", "Push"],
  ["pull", "Pull"],
  ["legs", "Legs"],
];

const K = {
  config: "cut:config:v2",
  log: "cut:log:v2",
  weights: "cut:weights:v2",
  plans: "cut:plans:v1",
  sessions: "cut:sessions:v1",
};

/* ------------------------------------------------------------------ */

/* Standalone build: data lives in this phone's browser storage. */
async function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Save failed", e);
  }
}

/* Back up everything to a file, or restore from one. */
export function exportAll() {
  const out = {};
  Object.values(K).forEach((k) => {
    const v = localStorage.getItem(k);
    if (v) out[k] = v;
  });
  return JSON.stringify(out, null, 2);
}

export function importAll(json) {
  const data = JSON.parse(json);
  Object.entries(data).forEach(([k, v]) => localStorage.setItem(k, v));
}

/* ------------------------------------------------------------------ */

const iso = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(
    x.getDate()
  ).padStart(2, "0")}`;
};
const today = () => iso(new Date());
const shift = (dateStr, days) => {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return iso(d);
};
const pretty = (dateStr) => {
  const d = new Date(dateStr + "T12:00:00");
  if (dateStr === today()) return "Today";
  if (dateStr === shift(today(), -1)) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
};
const round = (n, dp = 0) => {
  const m = Math.pow(10, dp);
  return Math.round(n * m) / m;
};

function macrosFor(food, qty) {
  const factor = food.unit === "piece" ? qty : qty / 100;
  return { kcal: food.kcal * factor, p: food.p * factor, c: food.c * factor, f: food.f * factor };
}

function sumItems(items, foodById) {
  return items.reduce(
    (a, it) => {
      const food = foodById[it.foodId];
      if (!food) return a;
      const m = macrosFor(food, it.qty);
      a.kcal += m.kcal;
      a.p += m.p;
      a.c += m.c;
      a.f += m.f;
      return a;
    },
    { kcal: 0, p: 0, c: 0, f: 0 }
  );
}

function rollingAvg(weights, endDate, windowDays = 7) {
  const start = shift(endDate, -(windowDays - 1));
  const vals = Object.entries(weights)
    .filter(([d]) => d >= start && d <= endDate)
    .map(([, v]) => v);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/* ------------------------------------------------------------------ */

export default function CutTracker() {
  const [tab, setTab] = useState("today");
  const [ready, setReady] = useState(false);

  const [foods, setFoods] = useState(SEED_FOODS);
  const [meals, setMeals] = useState(SEED_MEALS);
  const [targets, setTargets] = useState(SEED_TARGETS);
  const [log, setLog] = useState([]);
  const [weights, setWeights] = useState({});
  const [date, setDate] = useState(today());
  const [editing, setEditing] = useState(null); // { mealId, name, items }
  const [plans, setPlans] = useState(SEED_PLANS);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    (async () => {
      const cfg = await load(K.config, null);
      if (cfg) {
        setFoods(cfg.foods || SEED_FOODS);
        setMeals(cfg.meals || SEED_MEALS);
        setTargets({ ...SEED_TARGETS, ...(cfg.targets || {}) });
      }
      setLog(await load(K.log, []));
      setWeights(await load(K.weights, {}));
      setPlans(await load(K.plans, SEED_PLANS));
      setSessions(await load(K.sessions, []));
      setReady(true);
    })();
  }, []);

  const foodById = useMemo(() => Object.fromEntries(foods.map((f) => [f.id, f])), [foods]);
  const dayEntries = useMemo(() => log.filter((e) => e.date === date), [log, date]);
  const dayTotals = useMemo(() => sumItems(dayEntries, foodById), [dayEntries, foodById]);

  const persistConfig = useCallback(
    (patch) => {
      const next = { foods, meals, targets, ...patch };
      if (patch.foods) setFoods(patch.foods);
      if (patch.meals) setMeals(patch.meals);
      if (patch.targets) setTargets(patch.targets);
      save(K.config, next);
    },
    [foods, meals, targets]
  );

  const logItems = (items) => {
    const stamp = Date.now();
    const added = items
      .filter((it) => Number(it.qty) > 0)
      .map((it, i) => ({ id: `${stamp}-${i}`, date, foodId: it.foodId, qty: Number(it.qty) }));
    const next = [...log, ...added];
    setLog(next);
    save(K.log, next);
  };

  const removeEntry = (id) => {
    const next = log.filter((e) => e.id !== id);
    setLog(next);
    save(K.log, next);
  };

  const clearDay = () => {
    const next = log.filter((e) => e.date !== date);
    setLog(next);
    save(K.log, next);
  };

  const setWeight = (d, kg) => {
    const next = { ...weights };
    if (kg === null || kg === "" || Number.isNaN(Number(kg))) delete next[d];
    else next[d] = Number(kg);
    setWeights(next);
    save(K.weights, next);
  };

  const upsertSession = (session) => {
    const next = sessions.some((x) => x.id === session.id)
      ? sessions.map((x) => (x.id === session.id ? session : x))
      : [...sessions, session];
    setSessions(next);
    save(K.sessions, next);
  };

  const deleteSession = (id) => {
    const next = sessions.filter((x) => x.id !== id);
    setSessions(next);
    save(K.sessions, next);
  };

  const savePlanDefault = (type, exercises) => {
    const next = {
      ...plans,
      [type]: exercises.map((e) => ({
        name: e.name,
        sets: e.sets.length,
        target: e.target || "",
      })),
    };
    setPlans(next);
    save(K.plans, next);
  };

  const saveMealDefault = (mealId, items) => {
    persistConfig({
      meals: meals.map((m) => (m.id === mealId ? { ...m, items } : m)),
    });
  };

  if (!ready) {
    return (
      <div className="ct-root">
        <style>{CSS}</style>
        <div className="ct-loading">Loading your log…</div>
      </div>
    );
  }

  return (
    <div className="ct-root">
      <style>{CSS}</style>
      <div className="ct-frame">
        <header className="ct-head">
          <span className="ct-head-name">Cut</span>
          <span className="ct-head-goal">
            {targets.startWeight} → {targets.goalWeight} kg
          </span>
        </header>

        <main className="ct-body">
          {tab === "today" && (
            <TodayTab
              date={date}
              setDate={setDate}
              totals={dayTotals}
              targets={targets}
              meals={meals}
              foodById={foodById}
              entries={dayEntries}
              onOpenMeal={(m) => setEditing({ mealId: m.id, name: m.name, items: m.items.map((i) => ({ ...i })) })}
              onRemove={removeEntry}
              onClear={clearDay}
            />
          )}
          {tab === "gym" && (
            <GymTab
              date={date}
              setDate={setDate}
              plans={plans}
              sessions={sessions}
              onSave={upsertSession}
              onDelete={deleteSession}
              onSaveDefault={savePlanDefault}
            />
          )}
          {tab === "weight" && <WeightTab weights={weights} onSet={setWeight} />}
          {tab === "trend" && <TrendTab weights={weights} targets={targets} />}
          {tab === "setup" && (
            <SetupTab
              foods={foods}
              targets={targets}
              onSaveFoods={(f) => persistConfig({ foods: f })}
              onSaveTargets={(t) => persistConfig({ targets: t })}
            />
          )}
        </main>

        <nav className="ct-tabs">
          {[
            ["today", "Food"],
            ["gym", "Gym"],
            ["weight", "Weight"],
            ["trend", "Trend"],
            ["setup", "Setup"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={"ct-tab" + (tab === id ? " is-on" : "")}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {editing && (
        <MealEditor
          draft={editing}
          foods={foods}
          foodById={foodById}
          onChange={setEditing}
          onClose={() => setEditing(null)}
          onLog={(items) => {
            logItems(items);
            setEditing(null);
          }}
          onSaveDefault={(items) => saveMealDefault(editing.mealId, items)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Meal editor sheet                                                   */
/* ------------------------------------------------------------------ */

function MealEditor({ draft, foods, foodById, onChange, onClose, onLog, onSaveDefault }) {
  const [addId, setAddId] = useState(foods[0]?.id || "");
  const [addQty, setAddQty] = useState("");
  const [saved, setSaved] = useState(false);

  const totals = sumItems(draft.items, foodById);

  const setQty = (idx, qty) =>
    onChange({
      ...draft,
      items: draft.items.map((it, i) => (i === idx ? { ...it, qty } : it)),
    });

  const removeItem = (idx) =>
    onChange({ ...draft, items: draft.items.filter((_, i) => i !== idx) });

  return (
    <div className="ct-scrim" onClick={onClose}>
      <div className="ct-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="ct-sheet-head">
          <span className="ct-sheet-title">{draft.name}</span>
          <button className="ct-x ct-x-big" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="ct-sheet-body">
          <ul className="ct-list">
            {draft.items.map((it, idx) => {
              const food = foodById[it.foodId];
              if (!food) return null;
              const m = macrosFor(food, Number(it.qty) || 0);
              return (
                <li key={idx} className="ct-edit-row">
                  <span className="ct-item-name">{food.name}</span>
                  <input
                    className="ct-input ct-input-inline"
                    type="number"
                    inputMode="decimal"
                    value={it.qty}
                    onChange={(e) => setQty(idx, e.target.value)}
                  />
                  <span className="ct-unit">{food.unit === "g" ? "g" : "×"}</span>
                  <span className="ct-item-kcal">{round(m.kcal)}</span>
                  <button className="ct-x" onClick={() => removeItem(idx)} aria-label="Remove">
                    ×
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="ct-addrow">
            <select className="ct-select" value={addId} onChange={(e) => setAddId(e.target.value)}>
              {foods.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <input
              className="ct-input ct-input-qty"
              type="number"
              inputMode="decimal"
              placeholder={foodById[addId]?.unit === "piece" ? "no." : "g"}
              value={addQty}
              onChange={(e) => setAddQty(e.target.value)}
            />
            <button
              className="ct-btn ct-btn-ghost"
              disabled={!addQty}
              onClick={() => {
                onChange({ ...draft, items: [...draft.items, { foodId: addId, qty: Number(addQty) }] });
                setAddQty("");
              }}
            >
              Add
            </button>
          </div>

          <div className="ct-sheet-totals">
            <span className="ct-tot-kcal">{round(totals.kcal)} kcal</span>
            <span className="ct-tot-macros">
              {round(totals.p)}p · {round(totals.c)}c · {round(totals.f)}f
            </span>
          </div>
        </div>

        <div className="ct-sheet-foot">
          <button
            className="ct-btn ct-btn-ghost"
            onClick={() => {
              onSaveDefault(draft.items.map((it) => ({ ...it, qty: Number(it.qty) || 0 })));
              setSaved(true);
              setTimeout(() => setSaved(false), 1600);
            }}
          >
            {saved ? "Default saved" : "Save as default"}
          </button>
          <button className="ct-btn ct-btn-grow" onClick={() => onLog(draft.items)}>
            Log {draft.name.toLowerCase()}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function TodayTab({ date, setDate, totals, targets, meals, foodById, entries, onOpenMeal, onRemove, onClear }) {
  const left = targets.kcal - totals.kcal;

  return (
    <>
      <div className="ct-datebar">
        <button className="ct-nudge" onClick={() => setDate(shift(date, -1))} aria-label="Previous day">
          ‹
        </button>
        <span className="ct-date">{pretty(date)}</span>
        <button
          className="ct-nudge"
          onClick={() => setDate(shift(date, 1))}
          disabled={date >= today()}
          aria-label="Next day"
        >
          ›
        </button>
      </div>

      <div className="ct-hero">
        <div className={"ct-hero-num" + (left < 0 ? " is-over" : "")}>{round(Math.abs(left))}</div>
        <div className="ct-hero-label">{left < 0 ? "kcal over" : "kcal left"}</div>
      </div>

      <div className="ct-gauges">
        <Gauge label="Protein" value={totals.p} target={targets.p} unit="g" tone="p" />
        <Gauge label="Carbs" value={totals.c} target={targets.c} unit="g" tone="c" />
        <Gauge label="Fat" value={totals.f} target={targets.f} unit="g" tone="f" />
        <Gauge label="Calories" value={totals.kcal} target={targets.kcal} unit="" tone="k" />
      </div>

      <h2 className="ct-h2">Log a meal</h2>
      <div className="ct-meals">
        {meals.map((m) => {
          const t = sumItems(m.items, foodById);
          return (
            <button key={m.id} className="ct-meal" onClick={() => onOpenMeal(m)}>
              <span className="ct-meal-name">{m.name}</span>
              <span className="ct-meal-macros">
                {round(t.kcal)} kcal · {round(t.p)}p
              </span>
            </button>
          );
        })}
      </div>
      <p className="ct-hint">Tap a meal to see the default, adjust anything, then log it.</p>

      <h2 className="ct-h2">
        Eaten
        {entries.length > 0 && (
          <button className="ct-clear" onClick={onClear}>
            Clear day
          </button>
        )}
      </h2>
      {entries.length === 0 ? (
        <p className="ct-empty">Nothing logged yet.</p>
      ) : (
        <ul className="ct-list">
          {entries.map((e) => {
            const food = foodById[e.foodId];
            if (!food) return null;
            const m = macrosFor(food, e.qty);
            return (
              <li key={e.id} className="ct-item">
                <span className="ct-item-name">{food.name}</span>
                <span className="ct-item-qty">
                  {e.qty}
                  {food.unit === "g" ? " g" : "×"}
                </span>
                <span className="ct-item-kcal">{round(m.kcal)}</span>
                <button className="ct-x" onClick={() => onRemove(e.id)} aria-label="Remove">
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function Gauge({ label, value, target, unit, tone }) {
  const pct = Math.min(100, (value / target) * 100);
  const over = value > target * 1.02;
  return (
    <div className="ct-gauge">
      <div className="ct-gauge-top">
        <span className="ct-gauge-label">{label}</span>
        <span className="ct-gauge-val">
          {round(value)}
          <span className="ct-gauge-target">
            {" / "}
            {target}
            {unit}
          </span>
        </span>
      </div>
      <div className="ct-bar">
        <div className={"ct-bar-fill tone-" + tone + (over ? " is-over" : "")} style={{ width: pct + "%" }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function GymTab({ date, setDate, plans, sessions, onSave, onDelete, onSaveDefault }) {
  const session = sessions.find((x) => x.date === date);

  const startSession = (type) => {
    onSave({
      id: `${date}-${type}`,
      date,
      type,
      exercises: plans[type].map((e) => ({
        name: e.name,
        target: e.target,
        sets: Array.from({ length: e.sets }, () => ({ w: "", r: "" })),
      })),
    });
  };

  /* most recent session of the same type, before this date */
  const previous = useMemo(() => {
    if (!session) return null;
    return (
      sessions
        .filter((x) => x.type === session.type && x.date < session.date)
        .sort((a, b) => (a.date < b.date ? 1 : -1))[0] || null
    );
  }, [sessions, session]);

  return (
    <>
      <div className="ct-datebar">
        <button className="ct-nudge" onClick={() => setDate(shift(date, -1))} aria-label="Previous day">
          ‹
        </button>
        <span className="ct-date">{pretty(date)}</span>
        <button
          className="ct-nudge"
          onClick={() => setDate(shift(date, 1))}
          disabled={date >= today()}
          aria-label="Next day"
        >
          ›
        </button>
      </div>

      {!session ? (
        <>
          <h2 className="ct-h2">What are you training?</h2>
          <div className="ct-daypick">
            {DAY_TYPES.map(([id, label]) => {
              const last = sessions
                .filter((x) => x.type === id)
                .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
              return (
                <button key={id} className="ct-day" onClick={() => startSession(id)}>
                  <span className="ct-day-name">{label}</span>
                  <span className="ct-day-last">{last ? "last " + pretty(last.date).toLowerCase() : "no history"}</span>
                </button>
              );
            })}
          </div>
          <p className="ct-hint">
            The plan runs Push → Pull → Legs → Rest on repeat. Never run the day before legs.
          </p>
        </>
      ) : (
        <SessionView
          session={session}
          previous={previous}
          onSave={onSave}
          onDelete={onDelete}
          onSaveDefault={onSaveDefault}
        />
      )}
    </>
  );
}

function SessionView({ session, previous, onSave, onDelete, onSaveDefault }) {
  const [newName, setNewName] = useState("");
  const [saved, setSaved] = useState(false);

  const label = DAY_TYPES.find(([id]) => id === session.type)?.[1] || session.type;

  const update = (exIdx, setIdx, field, value) =>
    onSave({
      ...session,
      exercises: session.exercises.map((ex, i) =>
        i !== exIdx
          ? ex
          : { ...ex, sets: ex.sets.map((st, j) => (j === setIdx ? { ...st, [field]: value } : st)) }
      ),
    });

  const addSet = (exIdx) =>
    onSave({
      ...session,
      exercises: session.exercises.map((ex, i) =>
        i === exIdx ? { ...ex, sets: [...ex.sets, { w: "", r: "" }] } : ex
      ),
    });

  const dropSet = (exIdx) =>
    onSave({
      ...session,
      exercises: session.exercises.map((ex, i) =>
        i === exIdx && ex.sets.length > 1 ? { ...ex, sets: ex.sets.slice(0, -1) } : ex
      ),
    });

  const removeExercise = (exIdx) =>
    onSave({ ...session, exercises: session.exercises.filter((_, i) => i !== exIdx) });

  const addExercise = () => {
    if (!newName.trim()) return;
    onSave({
      ...session,
      exercises: [
        ...session.exercises,
        { name: newName.trim(), target: "", sets: [{ w: "", r: "" }, { w: "", r: "" }, { w: "", r: "" }] },
      ],
    });
    setNewName("");
  };

  const doneSets = session.exercises.reduce(
    (n, ex) => n + ex.sets.filter((st) => st.r !== "").length,
    0
  );
  const totalSets = session.exercises.reduce((n, ex) => n + ex.sets.length, 0);

  return (
    <>
      <div className="ct-session-head">
        <div>
          <div className="ct-session-title">{label}</div>
          <div className="ct-session-sub">
            {doneSets} of {totalSets} sets logged
            {previous ? ` · last ${pretty(previous.date).toLowerCase()}` : " · first one"}
          </div>
        </div>
        <button className="ct-clear" onClick={() => onDelete(session.id)}>
          Change day
        </button>
      </div>

      {session.exercises.map((ex, exIdx) => {
        const prevEx = previous?.exercises.find((p) => p.name === ex.name);
        const prevSets = prevEx?.sets.filter((st) => st.r !== "") || [];
        return (
          <div key={exIdx} className="ct-ex">
            <div className="ct-ex-head">
              <span className="ct-ex-name">{ex.name}</span>
              {ex.target && <span className="ct-ex-target">{ex.target}</span>}
              <button className="ct-x" onClick={() => removeExercise(exIdx)} aria-label="Remove exercise">
                ×
              </button>
            </div>

            <div className="ct-ex-prev">
              {prevSets.length
                ? "Last: " + prevSets.map((st) => `${st.w || "bw"}×${st.r}`).join("  ")
                : "No previous record"}
            </div>

            {ex.sets.map((st, setIdx) => {
              const p = prevSets[setIdx];
              return (
                <div key={setIdx} className="ct-set">
                  <span className="ct-set-n">{setIdx + 1}</span>
                  <input
                    className="ct-input ct-set-in"
                    type="number"
                    inputMode="decimal"
                    placeholder={p ? String(p.w) : "lb"}
                    value={st.w}
                    onChange={(e) => update(exIdx, setIdx, "w", e.target.value)}
                  />
                  <span className="ct-set-x">×</span>
                  <input
                    className="ct-input ct-set-in"
                    type="number"
                    inputMode="decimal"
                    placeholder={p ? String(p.r) : "reps"}
                    value={st.r}
                    onChange={(e) => update(exIdx, setIdx, "r", e.target.value)}
                  />
                  {p && st.r !== "" && (
                    <span
                      className={
                        "ct-delta " +
                        (Number(st.w) * Number(st.r) > Number(p.w) * Number(p.r)
                          ? "is-up"
                          : Number(st.w) * Number(st.r) < Number(p.w) * Number(p.r)
                          ? "is-down"
                          : "is-same")
                      }
                    >
                      {Number(st.w) * Number(st.r) > Number(p.w) * Number(p.r)
                        ? "up"
                        : Number(st.w) * Number(st.r) < Number(p.w) * Number(p.r)
                        ? "down"
                        : "same"}
                    </span>
                  )}
                </div>
              );
            })}

            <div className="ct-setbtns">
              <button className="ct-mini" onClick={() => addSet(exIdx)}>
                + Set
              </button>
              {ex.sets.length > 1 && (
                <button className="ct-mini" onClick={() => dropSet(exIdx)}>
                  − Set
                </button>
              )}
            </div>
          </div>
        );
      })}

      <h2 className="ct-h2">Add an exercise</h2>
      <div className="ct-addrow">
        <input
          className="ct-input ct-select"
          placeholder="Exercise name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addExercise()}
        />
        <button className="ct-btn" disabled={!newName.trim()} onClick={addExercise}>
          Add
        </button>
      </div>

      <button
        className="ct-btn ct-btn-ghost ct-btn-wide"
        onClick={() => {
          onSaveDefault(session.type, session.exercises);
          setSaved(true);
          setTimeout(() => setSaved(false), 1600);
        }}
      >
        {saved ? `${label} default saved` : `Save this as my ${label.toLowerCase()} default`}
      </button>
      <p className="ct-hint">
        Holding your numbers in a deficit is success. Any increase is a bonus, not the target.
      </p>
    </>
  );
}

function WeightTab({ weights, onSet }) {
  const [val, setVal] = useState("");
  const t = today();
  const avg = rollingAvg(weights, t, 7);
  const recent = Object.entries(weights)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 14);

  return (
    <>
      <h2 className="ct-h2">This morning</h2>
      <div className="ct-weighin">
        <input
          className="ct-input ct-input-big"
          type="number"
          step="0.1"
          inputMode="decimal"
          placeholder={weights[t] ? String(weights[t]) : "72.0"}
          value={val}
          onChange={(e) => setVal(e.target.value)}
        />
        <span className="ct-kg">kg</span>
        <button
          className="ct-btn"
          disabled={!val}
          onClick={() => {
            onSet(t, val);
            setVal("");
          }}
        >
          {weights[t] ? "Update" : "Save"}
        </button>
      </div>
      <p className="ct-hint">Weigh after the bathroom, before food or water. Same time every day.</p>

      <div className="ct-stat">
        <span className="ct-stat-label">7-day average</span>
        <span className="ct-stat-val">{avg ? round(avg, 2) + " kg" : "—"}</span>
      </div>

      <h2 className="ct-h2">Recent</h2>
      {recent.length === 0 ? (
        <p className="ct-empty">No weigh-ins yet.</p>
      ) : (
        <ul className="ct-list">
          {recent.map(([d, kg]) => (
            <li key={d} className="ct-item">
              <span className="ct-item-name">{pretty(d)}</span>
              <span className="ct-item-kcal">{round(kg, 1)}</span>
              <button className="ct-x" onClick={() => onSet(d, null)} aria-label="Remove">
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="ct-hint">Daily swings of 1–1.5 kg are water and food weight. Only the average means anything.</p>
    </>
  );
}

/* ------------------------------------------------------------------ */

function TrendTab({ weights, targets }) {
  const dates = Object.keys(weights).sort();

  const series = useMemo(() => {
    if (!dates.length) return [];
    const out = [];
    let d = dates[0];
    const end = today() > dates[dates.length - 1] ? today() : dates[dates.length - 1];
    let guard = 0;
    while (d <= end && guard++ < 400) {
      out.push({ date: d, raw: weights[d] ?? null, avg: rollingAvg(weights, d, 7) });
      d = shift(d, 1);
    }
    return out;
  }, [weights, dates]);

  const avgNow = rollingAvg(weights, today(), 7);
  const avgPrev = rollingAvg(weights, shift(today(), -7), 7);
  const rate = avgNow != null && avgPrev != null ? avgNow - avgPrev : null;
  const totalChange = avgNow != null ? avgNow - targets.startWeight : null;
  const toGo = avgNow != null ? avgNow - targets.goalWeight : null;
  const weeksLeft = rate != null && rate < -0.05 && toGo > 0 ? toGo / Math.abs(rate) : null;

  let verdict;
  if (rate == null) {
    verdict = { tone: "neutral", text: "Log weight for 14 days to get a reliable rate." };
  } else if (rate > -0.2) {
    verdict = {
      tone: "warn",
      text: "Losing under 0.2 kg/week. If this holds another week, cut 150 kcal — 30 g less rice and 3 fewer almonds.",
    };
  } else if (rate < -0.8) {
    verdict = {
      tone: "warn",
      text: "Losing over 0.8 kg/week. Add 150 kcal. Faster isn't better — this is where lifts and muscle start going.",
    };
  } else {
    verdict = { tone: "good", text: "Rate is in the target band. Change nothing." };
  }

  return (
    <>
      {series.length < 2 ? (
        <p className="ct-empty">Not enough weigh-ins to draw a trend yet.</p>
      ) : (
        <div className="ct-chart">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <XAxis
                dataKey="date"
                tick={{ fill: "#7C8D93", fontSize: 10 }}
                tickFormatter={(d) => d.slice(8) + "/" + d.slice(5, 7)}
                interval="preserveStartEnd"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={["dataMin - 0.6", "dataMax + 0.6"]}
                tick={{ fill: "#7C8D93", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip
                contentStyle={{
                  background: "#161D20",
                  border: "1px solid #27343A",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "#E6EDEF",
                }}
                formatter={(v) => (v == null ? "—" : round(v, 2) + " kg")}
              />
              <ReferenceLine y={targets.goalWeight} stroke="#3B4A50" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="raw"
                stroke="#3E5057"
                strokeWidth={1}
                dot={{ r: 1.8, fill: "#3E5057" }}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="avg"
                stroke="#F0A93B"
                strokeWidth={2.5}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="ct-legend">Amber is the 7-day average. Grey dots are daily weigh-ins. Dashed line is your goal.</p>
        </div>
      )}

      {[
        ["Current average", avgNow != null ? round(avgNow, 2) + " kg" : "—"],
        ["Rate", rate != null ? (rate > 0 ? "+" : "") + round(rate, 2) + " kg/wk" : "—"],
        ["Change so far", totalChange != null ? (totalChange > 0 ? "+" : "") + round(totalChange, 1) + " kg" : "—"],
        ["Left to goal", toGo != null ? round(Math.max(0, toGo), 1) + " kg" : "—"],
        ["At this rate", weeksLeft != null ? round(weeksLeft) + " weeks" : "—"],
      ].map(([label, val]) => (
        <div key={label} className="ct-stat">
          <span className="ct-stat-label">{label}</span>
          <span className="ct-stat-val">{val}</span>
        </div>
      ))}

      <div className={"ct-verdict tone-" + verdict.tone}>{verdict.text}</div>
    </>
  );
}

/* ------------------------------------------------------------------ */

function SetupTab({ foods, targets, onSaveFoods, onSaveTargets }) {
  const [t, setT] = useState(targets);
  const [newFood, setNewFood] = useState({ name: "", unit: "g", kcal: "", p: "", c: "", f: "" });

  const updateFood = (id, field, value) =>
    onSaveFoods(foods.map((f) => (f.id === id ? { ...f, [field]: Number(value) || 0 } : f)));

  return (
    <>
      <h2 className="ct-h2">Daily targets</h2>
      <div className="ct-targets">
        {[
          ["kcal", "Calories"],
          ["p", "Protein g"],
          ["c", "Carbs g"],
          ["f", "Fat g"],
          ["startWeight", "Start kg"],
          ["goalWeight", "Goal kg"],
        ].map(([key, label]) => (
          <label key={key} className="ct-field">
            <span>{label}</span>
            <input
              className="ct-input"
              type="number"
              step="0.1"
              value={t[key]}
              onChange={(e) => setT({ ...t, [key]: Number(e.target.value) })}
            />
          </label>
        ))}
      </div>
      <button className="ct-btn ct-btn-wide" onClick={() => onSaveTargets(t)}>
        Save targets
      </button>

      <h2 className="ct-h2">Foods</h2>
      <p className="ct-hint">
        Per 100 g raw, or per piece where marked. Weigh salmon and chicken before cooking. Correct any
        number against your own packaging.
      </p>
      <div className="ct-table">
        <div className="ct-tr ct-th">
          <span>Food</span>
          <span>kcal</span>
          <span>P</span>
          <span>C</span>
          <span>F</span>
        </div>
        {foods.map((f) => (
          <div key={f.id} className="ct-tr">
            <span className="ct-td-name">
              {f.name}
              {f.unit === "piece" && <em> ea</em>}
            </span>
            {["kcal", "p", "c", "f"].map((k) => (
              <input
                key={k}
                className="ct-cell"
                type="number"
                step="0.1"
                value={f[k]}
                onChange={(e) => updateFood(f.id, k, e.target.value)}
              />
            ))}
          </div>
        ))}
      </div>

      <h2 className="ct-h2">Add a food</h2>
      <div className="ct-newfood">
        <input
          className="ct-input"
          placeholder="Name"
          value={newFood.name}
          onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
        />
        <select
          className="ct-select"
          value={newFood.unit}
          onChange={(e) => setNewFood({ ...newFood, unit: e.target.value })}
        >
          <option value="g">per 100 g</option>
          <option value="piece">per piece</option>
        </select>
        <div className="ct-newfood-macros">
          {[
            ["kcal", "kcal"],
            ["p", "P"],
            ["c", "C"],
            ["f", "F"],
          ].map(([k, label]) => (
            <input
              key={k}
              className="ct-input"
              type="number"
              placeholder={label}
              value={newFood[k]}
              onChange={(e) => setNewFood({ ...newFood, [k]: e.target.value })}
            />
          ))}
        </div>
        <button
          className="ct-btn ct-btn-wide"
          disabled={!newFood.name || !newFood.kcal}
          onClick={() => {
            onSaveFoods([
              ...foods,
              {
                id: "u" + Date.now(),
                name: newFood.name,
                unit: newFood.unit,
                kcal: Number(newFood.kcal) || 0,
                p: Number(newFood.p) || 0,
                c: Number(newFood.c) || 0,
                f: Number(newFood.f) || 0,
              },
            ]);
            setNewFood({ name: "", unit: "g", kcal: "", p: "", c: "", f: "" });
          }}
        >
          Add food
        </button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;800&display=swap');

.ct-root {
  --ink: #0E1315;
  --panel: #161D20;
  --line: #27343A;
  --text: #E6EDEF;
  --dim: #7C8D93;
  --amber: #F0A93B;
  --teal: #4FD1C5;
  --red: #E5674B;
  font-family: 'Archivo', ui-sans-serif, system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  background: var(--ink);
  color: var(--text);
  min-height: 100%;
  display: flex;
  justify-content: center;
  position: relative;
}
.ct-frame { width: 100%; max-width: 440px; display: flex; flex-direction: column; min-height: 620px; }
.ct-loading { color: var(--dim); padding: 40px; font-size: 14px; }

.ct-head { display: flex; align-items: baseline; justify-content: space-between; padding: 18px 20px 12px; border-bottom: 1px solid var(--line); }
.ct-head-name { font-weight: 800; font-size: 19px; letter-spacing: -0.02em; }
.ct-head-goal { color: var(--dim); font-size: 12px; }

.ct-body { flex: 1; padding: 16px 20px 28px; overflow-y: auto; }

.ct-datebar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.ct-date { font-size: 13px; color: var(--dim); }
.ct-nudge { background: none; border: 1px solid var(--line); color: var(--text); width: 30px; height: 30px; border-radius: 4px; font-size: 17px; cursor: pointer; line-height: 1; }
.ct-nudge:disabled { opacity: 0.3; cursor: default; }

.ct-hero { text-align: center; padding: 10px 0 20px; }
.ct-hero-num { font-size: 68px; font-weight: 800; letter-spacing: -0.045em; line-height: 0.9; color: var(--amber); }
.ct-hero-num.is-over { color: var(--red); }
.ct-hero-label { color: var(--dim); font-size: 12px; margin-top: 8px; }

.ct-gauges { display: flex; flex-direction: column; gap: 12px; margin-bottom: 26px; }
.ct-gauge-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px; }
.ct-gauge-label { font-size: 12px; color: var(--dim); }
.ct-gauge-val { font-size: 13px; font-weight: 600; }
.ct-gauge-target { color: var(--dim); font-weight: 400; }
.ct-bar { height: 5px; background: var(--panel); border-radius: 3px; overflow: hidden; }
.ct-bar-fill { height: 100%; border-radius: 3px; transition: width 180ms ease; }
.tone-p { background: var(--teal); }
.tone-c { background: #5E8CA8; }
.tone-f { background: #A88BC4; }
.tone-k { background: var(--amber); }
.ct-bar-fill.is-over { background: var(--red); }

.ct-h2 { font-size: 12px; font-weight: 600; color: var(--dim); margin: 24px 0 10px; display: flex; justify-content: space-between; align-items: center; }
.ct-clear { background: none; border: none; color: var(--dim); font-size: 11px; cursor: pointer; text-decoration: underline; font-family: inherit; }

.ct-meals { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.ct-meal { background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 13px 12px; text-align: left; cursor: pointer; color: var(--text); display: flex; flex-direction: column; gap: 3px; font-family: inherit; }
.ct-meal:hover { border-color: var(--amber); }
.ct-meal-name { font-size: 14px; font-weight: 600; }
.ct-meal-macros { font-size: 11px; color: var(--amber); }

.ct-addrow { display: flex; gap: 7px; }
.ct-select, .ct-input { background: var(--panel); border: 1px solid var(--line); color: var(--text); border-radius: 5px; padding: 9px 10px; font-size: 13px; font-family: inherit; min-width: 0; }
.ct-select { flex: 1; }
.ct-input-qty { width: 66px; }
.ct-input-inline { width: 62px; padding: 6px 8px; text-align: right; }
.ct-unit { color: var(--dim); font-size: 11px; width: 12px; }
.ct-btn { background: var(--amber); color: #14181A; border: none; border-radius: 5px; padding: 9px 15px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
.ct-btn:disabled { opacity: 0.35; cursor: default; }
.ct-btn-wide { width: 100%; margin-top: 10px; padding: 11px; }
.ct-btn-grow { flex: 1; padding: 11px; }
.ct-btn-ghost { background: none; border: 1px solid var(--line); color: var(--text); }

.ct-list { list-style: none; margin: 0; padding: 0; }
.ct-item, .ct-edit-row { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--line); font-size: 13px; }
.ct-edit-row { gap: 7px; }
.ct-item-name { flex: 1; }
.ct-item-qty { color: var(--dim); font-size: 12px; }
.ct-item-kcal { font-weight: 600; min-width: 44px; text-align: right; }
.ct-x { background: none; border: none; color: var(--dim); font-size: 17px; cursor: pointer; padding: 0 2px; line-height: 1; }
.ct-x-big { font-size: 24px; }
.ct-x:hover { color: var(--red); }
.ct-empty { color: var(--dim); font-size: 13px; padding: 6px 0; }
.ct-hint { color: var(--dim); font-size: 11.5px; line-height: 1.55; margin: 10px 0 0; }

.ct-scrim { position: absolute; inset: 0; background: rgba(6,9,10,0.72); display: flex; align-items: flex-end; justify-content: center; z-index: 20; }
.ct-sheet { width: 100%; max-width: 440px; background: var(--ink); border-top: 1px solid var(--line); border-radius: 12px 12px 0 0; display: flex; flex-direction: column; max-height: 92%; }
.ct-sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 15px 20px 10px; border-bottom: 1px solid var(--line); }
.ct-sheet-title { font-size: 17px; font-weight: 700; letter-spacing: -0.02em; }
.ct-sheet-body { padding: 6px 20px 14px; overflow-y: auto; }
.ct-sheet-totals { display: flex; align-items: baseline; justify-content: space-between; margin-top: 16px; padding-top: 13px; border-top: 1px solid var(--line); }
.ct-tot-kcal { font-size: 22px; font-weight: 700; color: var(--amber); letter-spacing: -0.02em; }
.ct-tot-macros { font-size: 12px; color: var(--dim); }
.ct-sheet-foot { display: flex; gap: 8px; padding: 12px 20px 18px; border-top: 1px solid var(--line); }
.ct-sheet-body .ct-addrow { margin-top: 12px; }

.ct-daypick { display: flex; flex-direction: column; gap: 8px; }
.ct-day { background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 15px 14px; text-align: left; cursor: pointer; color: var(--text); font-family: inherit; display: flex; align-items: baseline; justify-content: space-between; }
.ct-day:hover { border-color: var(--amber); }
.ct-day-name { font-size: 16px; font-weight: 700; letter-spacing: -0.01em; }
.ct-day-last { font-size: 11px; color: var(--dim); }

.ct-session-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 18px; }
.ct-session-title { font-size: 20px; font-weight: 800; letter-spacing: -0.025em; }
.ct-session-sub { font-size: 11.5px; color: var(--dim); margin-top: 3px; }

.ct-ex { border-top: 1px solid var(--line); padding: 13px 0 11px; }
.ct-ex-head { display: flex; align-items: baseline; gap: 8px; }
.ct-ex-name { font-size: 14px; font-weight: 600; flex: 1; }
.ct-ex-target { font-size: 11px; color: var(--dim); }
.ct-ex-prev { font-size: 11px; color: var(--teal); margin: 4px 0 9px; }
.ct-set { display: flex; align-items: center; gap: 7px; margin-bottom: 6px; }
.ct-set-n { font-size: 11px; color: var(--dim); width: 12px; }
.ct-set-in { width: 68px; padding: 7px 9px; text-align: center; }
.ct-set-x { color: var(--dim); font-size: 12px; }
.ct-delta { font-size: 10.5px; margin-left: 3px; }
.ct-delta.is-up { color: var(--teal); }
.ct-delta.is-down { color: var(--red); }
.ct-delta.is-same { color: var(--dim); }
.ct-setbtns { display: flex; gap: 7px; margin-top: 7px; }
.ct-mini { background: none; border: 1px solid var(--line); color: var(--dim); border-radius: 4px; padding: 4px 10px; font-size: 11px; cursor: pointer; font-family: inherit; }
.ct-mini:hover { color: var(--text); border-color: var(--amber); }

.ct-weighin { display: flex; align-items: center; gap: 9px; }
.ct-input-big { font-size: 26px; font-weight: 700; width: 130px; padding: 10px 12px; }
.ct-kg { color: var(--dim); font-size: 14px; }

.ct-stat { display: flex; justify-content: space-between; align-items: baseline; padding: 11px 0; border-bottom: 1px solid var(--line); }
.ct-stat-label { color: var(--dim); font-size: 12.5px; }
.ct-stat-val { font-size: 15px; font-weight: 600; }

.ct-chart { margin-bottom: 18px; }
.ct-legend { color: var(--dim); font-size: 11px; margin: 8px 0 0; line-height: 1.5; }

.ct-verdict { margin-top: 18px; padding: 13px 14px; border-radius: 6px; font-size: 13px; line-height: 1.55; border-left: 3px solid var(--line); background: var(--panel); }
.ct-verdict.tone-good { border-left-color: var(--teal); }
.ct-verdict.tone-warn { border-left-color: var(--amber); }

.ct-targets { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.ct-field { display: flex; flex-direction: column; gap: 4px; font-size: 11.5px; color: var(--dim); }

.ct-table { border: 1px solid var(--line); border-radius: 6px; overflow: hidden; }
.ct-tr { display: grid; grid-template-columns: 1fr 52px 44px 44px 44px; align-items: center; border-bottom: 1px solid var(--line); }
.ct-tr:last-child { border-bottom: none; }
.ct-th { font-size: 10.5px; color: var(--dim); padding: 7px 9px; background: var(--panel); }
.ct-th span:not(:first-child) { text-align: center; }
.ct-td-name { font-size: 12px; padding: 0 9px; }
.ct-td-name em { color: var(--dim); font-style: normal; font-size: 10px; }
.ct-cell { background: none; border: none; border-left: 1px solid var(--line); color: var(--text); font-size: 12px; padding: 9px 4px; text-align: center; width: 100%; font-family: inherit; }
.ct-cell:focus { background: var(--panel); outline: 1px solid var(--amber); }

.ct-newfood { display: flex; flex-direction: column; gap: 8px; }
.ct-newfood-macros { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }

.ct-tabs { display: grid; grid-template-columns: repeat(5, 1fr); border-top: 1px solid var(--line); }
.ct-tab { background: none; border: none; color: var(--dim); padding: 13px 2px; font-size: 11.5px; cursor: pointer; font-family: inherit; border-top: 2px solid transparent; }
.ct-tab.is-on { color: var(--text); border-top-color: var(--amber); font-weight: 600; }

input:focus-visible, button:focus-visible, select:focus-visible { outline: 2px solid var(--amber); outline-offset: 1px; }
@media (prefers-reduced-motion: reduce) { .ct-bar-fill { transition: none; } }
`;
