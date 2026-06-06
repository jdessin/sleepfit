import { useState, useEffect, useCallback, useRef } from "react";

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const fmt = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const fmtFull = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

const EMPTY_DAY = (date) => ({
  date: date || todayStr(),
  // Garmin
  garmin_score: "", garmin_duration: "", garmin_body_battery: "",
  garmin_hrv: "", garmin_resting_hr: "",
  // Sleep & Morning
  wake_feeling: null, disruptions: [], rls_intensity: "", morning_note: "",
  // Workout
  workout_type: "", workout_duration: "", workout_strength: null,
  workout_symptoms: [], workout_note: "",
  strength_weight_feel: "", cardio_pace_feel: "",
  // Evening
  evening_energy: null,
  focus_rating: null, focus_duration: "",
  med_taken: null, med_dose_am: "", med_dose_pm: "",
  physical_sensations: [],
  evening_rls: "", evening_anxiety: "",
  nap_taken: null, nap_duration: "", nap_feel: "",
  legs_rolled: null, evening_note: "",
});

const DISRUPTION_OPTIONS = [
  { id: "none",         label: "None" },
  { id: "pee_1",        label: "Pee 1×" },
  { id: "pee_2",        label: "Pee 2×" },
  { id: "pee_3plus",    label: "Pee 3+×" },
  { id: "rls",          label: "RLS" },
  { id: "too_hot",      label: "Too hot" },
  { id: "too_cold",     label: "Too cold" },
  { id: "anxious_mind", label: "Anxious / racing mind" },
  { id: "pain",         label: "Pain / discomfort" },
  { id: "other",        label: "Other" },
];

const WORKOUT_TYPES = ["Strength", "Cardio", "Hike", "Strength + Cardio", "Rest day"];

const WORKOUT_SYMPTOMS = [
  { id: "none",         label: "None" },
  { id: "dizzy",        label: "Lightheaded / dizzy" },
  { id: "heart",        label: "Heart racing oddly" },
  { id: "nausea",       label: "Nausea" },
  { id: "heavy_legs",   label: "Heavy legs" },
  { id: "short_breath", label: "Short of breath" },
  { id: "chest",        label: "Chest tightness" },
];

const SENSATIONS = [
  { id: "none",         label: "None" },
  { id: "jittery",      label: "Jittery" },
  { id: "heart_racing", label: "Heart racing" },
  { id: "dizzy",        label: "Dizzy" },
  { id: "heavy_legs",   label: "Heavy legs" },
  { id: "nausea",       label: "Nausea" },
  { id: "appetite_low", label: "Low appetite" },
  { id: "other",        label: "Other" },
];

const FOCUS_DURATION_OPTIONS = [
  { id: "all_day",   label: "All day" },
  { id: "most_day",  label: "Most of the day" },
  { id: "mid_day",   label: "Until mid-day" },
  { id: "morning",   label: "Morning only" },
  { id: "brief",     label: "Brief / patchy" },
  { id: "none",      label: "Didn't kick in" },
];

const SCALE_LABELS = {
  1: { short: "Drained",  color: "#A32D2D" },
  2: { short: "Low",      color: "#BA7517" },
  3: { short: "OK",       color: "#3B6D11" },
  4: { short: "Good",     color: "#185FA5" },
  5: { short: "Strong",   color: "#534AB7" },
};
const WORKOUT_SCALE = {
  1: { short: "Weak",     color: "#A32D2D" },
  2: { short: "Sluggish", color: "#BA7517" },
  3: { short: "OK",       color: "#3B6D11" },
  4: { short: "Good",     color: "#185FA5" },
  5: { short: "Strong",   color: "#534AB7" },
};
const FOCUS_SCALE = {
  1: { short: "Foggy",    color: "#A32D2D" },
  2: { short: "Drifting", color: "#BA7517" },
  3: { short: "OK",       color: "#3B6D11" },
  4: { short: "Focused",  color: "#185FA5" },
  5: { short: "Sharp",    color: "#534AB7" },
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  app:       { fontFamily: "var(--font-sans, system-ui)", maxWidth: 480, margin: "0 auto", padding: "0 0 80px", minHeight: "100vh", background: "var(--color-background-tertiary, #f5f4ef)" },
  header:    { background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "14px 20px 0", position: "sticky", top: 0, zIndex: 10 },
  nav:       { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "var(--color-background-primary)", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", zIndex: 20 },
  navBtn:    (a) => ({ flex: 1, padding: "10px 0 8px", border: "none", background: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: a ? "var(--color-text-info,#185FA5)" : "var(--color-text-tertiary)", fontSize: 10, fontFamily: "inherit" }),
  card:      { background: "var(--color-background-primary)", borderRadius: 12, border: "0.5px solid var(--color-border-tertiary)", padding: "14px 16px", marginBottom: 10 },
  label:     { fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 8, display: "block", textTransform: "uppercase", letterSpacing: "0.05em" },
  subLabel:  { fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 6, marginTop: 12, display: "block" },
  sTitle:    { fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 10 },
  scaleRow:  { display: "flex", gap: 6 },
  scaleBtn:  (a, c) => ({ flex: 1, padding: "10px 4px", border: a ? `2px solid ${c}` : "0.5px solid var(--color-border-tertiary)", borderRadius: 8, background: a ? `${c}18` : "var(--color-background-secondary)", cursor: "pointer", textAlign: "center", transition: "all 0.12s" }),
  scaleNum:  (c) => ({ fontSize: 20, fontWeight: 500, color: c, display: "block" }),
  scaleWord: { fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 2, lineHeight: 1.3 },
  chipRow:   { display: "flex", flexWrap: "wrap", gap: 6 },
  chip:      (a) => ({ padding: "7px 12px", borderRadius: 20, border: a ? "1.5px solid var(--color-text-info,#185FA5)" : "0.5px solid var(--color-border-tertiary)", background: a ? "var(--color-background-info,#E6F1FB)" : "var(--color-background-secondary)", cursor: "pointer", fontSize: 13, color: a ? "var(--color-text-info,#185FA5)" : "var(--color-text-secondary)", fontFamily: "inherit", transition: "all 0.12s" }),
  input:     { width: "100%", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" },
  textarea:  { width: "100%", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", resize: "vertical", minHeight: 70 },
  btn:       (v) => ({ padding: v==="lg"?"13px 24px":"9px 18px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: v==="primary"?"var(--color-text-primary)":"var(--color-background-primary)", color: v==="primary"?"var(--color-background-primary)":"var(--color-text-primary)", fontSize: v==="lg"?15:13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", width: (v==="full"||v==="lg")?"100%":"auto" }),
  statCard:  { background: "var(--color-background-secondary)", borderRadius: 8, padding: "12px 14px" },
  statNum:   { fontSize: 24, fontWeight: 500, color: "var(--color-text-primary)" },
  statLabel: { fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 },
  badge:     (c) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: c+"22", color: c }),
  syncDot:   (ok) => ({ width: 7, height: 7, borderRadius: "50%", background: ok===true?"#1D9E75":ok===false?"#A32D2D":"#BA7517", display: "inline-block", marginRight: 5 }),
  dateBar:   { display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" },
  divider:   { height: "0.5px", background: "var(--color-border-tertiary)", margin: "14px 0" },
};

// ─── Shared components ────────────────────────────────────────────────────────
function ScalePicker({ value, onChange, map }) {
  const m = map || SCALE_LABELS;
  return (
    <div style={S.scaleRow}>
      {[1,2,3,4,5].map(n => {
        const { short, color } = m[n];
        return (
          <button key={n} style={S.scaleBtn(value===n, color)} onClick={() => onChange(value===n ? null : n)}>
            <span style={S.scaleNum(color)}>{n}</span>
            <span style={S.scaleWord}>{short}</span>
          </button>
        );
      })}
    </div>
  );
}

function ChipPicker({ options, selected, onChange, single }) {
  const toggle = (id) => {
    if (single) { onChange(selected===id ? "" : id); return; }
    if (id==="none") { onChange(["none"]); return; }
    const cur = Array.isArray(selected) ? selected.filter(x => x!=="none") : [];
    const idx = cur.indexOf(id);
    onChange(idx >= 0 ? cur.filter(x => x!==id) : [...cur, id]);
  };
  return (
    <div style={S.chipRow}>
      {options.map(o => {
        const id    = typeof o==="string" ? o : o.id;
        const label = typeof o==="string" ? o : o.label;
        const active = single ? selected===id : (Array.isArray(selected) && selected.includes(id));
        return <button key={id} style={S.chip(active)} onClick={() => toggle(id)}>{label}</button>;
      })}
    </div>
  );
}

// ─── Sleep & Morning tab ──────────────────────────────────────────────────────
function SleepMorningSection({ day, update, onImportCSV }) {
  return (
    <div>
      {/* Garmin data */}
      <div style={S.card}>
        <div style={S.sTitle}>Garmin sleep data</div>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12, lineHeight: 1.6 }}>
          Import your Garmin CSV or enter manually.
        </div>
        <button style={S.btn("full")} onClick={onImportCSV}>📂 Import Garmin CSV</button>
        <div style={S.divider} />
        {[
          ["garmin_score",         "Sleep score",           "e.g. 77"],
          ["garmin_duration",      "Sleep duration (hours)","e.g. 6.6"],
          ["garmin_body_battery",  "Body battery",          "e.g. 45"],
          ["garmin_resting_hr",    "Resting HR (bpm)",      "e.g. 61"],
          ["garmin_hrv",           "HRV status",            "e.g. Balanced"],
        ].map(([key, label, ph]) => (
          <div key={key} style={{ marginBottom: 12 }}>
            <span style={S.label}>{label}</span>
            <input style={S.input} type={key==="garmin_hrv"?"text":"number"} placeholder={ph} value={day[key]} onChange={e => update(key, e.target.value)} />
          </div>
        ))}
      </div>

      {/* Wake feeling */}
      <div style={S.card}>
        <span style={S.label}>How do you feel waking up?</span>
        <ScalePicker value={day.wake_feeling} onChange={v => update("wake_feeling", v)} />
      </div>

      {/* Disruptions */}
      <div style={S.card}>
        <span style={S.label}>Sleep disruptions last night</span>
        <ChipPicker options={DISRUPTION_OPTIONS} selected={day.disruptions} onChange={v => update("disruptions", v)} />
        {Array.isArray(day.disruptions) && day.disruptions.includes("rls") && (
          <div style={{ marginTop: 10 }}>
            <span style={S.subLabel}>RLS intensity</span>
            <ChipPicker options={["Mild","Moderate","Severe"]} selected={day.rls_intensity} onChange={v => update("rls_intensity", v)} single />
          </div>
        )}
      </div>

      {/* Morning note */}
      <div style={S.card}>
        <span style={S.label}>Morning note (optional)</span>
        <textarea style={S.textarea} placeholder="How you feel after sleep, anything notable..." maxLength={200} value={day.morning_note} onChange={e => update("morning_note", e.target.value)} />
      </div>
    </div>
  );
}

// ─── Workout tab ──────────────────────────────────────────────────────────────
function WorkoutSection({ day, update }) {
  const isRest     = day.workout_type === "Rest day";
  const isStrength = day.workout_type?.includes("Strength");
  const isCardio   = day.workout_type?.includes("Cardio") || day.workout_type === "Hike";
  return (
    <div>
      <div style={S.card}>
        <span style={S.label}>Workout type</span>
        <ChipPicker options={WORKOUT_TYPES} selected={day.workout_type} onChange={v => update("workout_type", v)} single />
      </div>
      {!isRest && day.workout_type && (<>
        <div style={S.card}>
          <span style={S.label}>Duration (minutes)</span>
          <input style={S.input} type="number" placeholder="e.g. 60" value={day.workout_duration} onChange={e => update("workout_duration", e.target.value)} />
        </div>
        <div style={S.card}>
          <span style={S.label}>Overall strength & energy (1 = weak, 5 = strong)</span>
          <ScalePicker value={day.workout_strength} onChange={v => update("workout_strength", v)} map={WORKOUT_SCALE} />
        </div>
        <div style={S.card}>
          <span style={S.label}>Any symptoms during workout?</span>
          <ChipPicker options={WORKOUT_SYMPTOMS} selected={day.workout_symptoms} onChange={v => update("workout_symptoms", v)} />
        </div>
        {isStrength && (
          <div style={S.card}>
            <span style={S.label}>Weights felt</span>
            <ChipPicker options={["Heavier than usual","Normal","Lighter than usual"]} selected={day.strength_weight_feel} onChange={v => update("strength_weight_feel", v)} single />
          </div>
        )}
        {isCardio && (
          <div style={S.card}>
            <span style={S.label}>Pace / effort vs. recent</span>
            <ChipPicker options={["Slower","Similar","Faster"]} selected={day.cardio_pace_feel} onChange={v => update("cardio_pace_feel", v)} single />
          </div>
        )}
        <div style={S.card}>
          <span style={S.label}>Workout notes (optional)</span>
          <textarea style={S.textarea} placeholder="What you did, how it felt..." maxLength={300} value={day.workout_note} onChange={e => update("workout_note", e.target.value)} />
        </div>
      </>)}
    </div>
  );
}

// ─── Evening tab ──────────────────────────────────────────────────────────────
function EveningSection({ day, update }) {
  const onMed = day.med_taken && day.med_taken !== "No med";
  return (
    <div>

      {/* Overall day energy */}
      <div style={S.card}>
        <span style={S.label}>Overall day energy</span>
        <ScalePicker value={day.evening_energy} onChange={v => update("evening_energy", v)} />
      </div>

      {/* Adderall */}
      <div style={S.card}>
        <span style={S.label}>Adderall today</span>
        <ChipPicker options={["No med","5 mg once","10 mg once","Split dose"]} selected={day.med_taken} onChange={v => update("med_taken", v)} single />
        {day.med_taken === "Split dose" && (
          <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <span style={S.subLabel}>AM dose (mg)</span>
              <input style={S.input} type="number" placeholder="e.g. 5" value={day.med_dose_am} onChange={e => update("med_dose_am", e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={S.subLabel}>PM dose (mg)</span>
              <input style={S.input} type="number" placeholder="e.g. 5" value={day.med_dose_pm} onChange={e => update("med_dose_pm", e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* Focus — only on med days */}
      {onMed && (
        <div style={S.card}>
          <span style={S.label}>Focus & mental clarity today</span>
          <ScalePicker value={day.focus_rating} onChange={v => update("focus_rating", v)} map={FOCUS_SCALE} />
          <span style={S.subLabel}>How long did the focus last?</span>
          <ChipPicker options={FOCUS_DURATION_OPTIONS} selected={day.focus_duration} onChange={v => update("focus_duration", v)} single />
        </div>
      )}

      {/* Physical sensations */}
      <div style={S.card}>
        <span style={S.label}>Physical sensations today</span>
        <ChipPicker options={SENSATIONS} selected={day.physical_sensations} onChange={v => update("physical_sensations", v)} />
      </div>

      {/* RLS */}
      <div style={S.card}>
        <span style={S.label}>RLS this evening</span>
        <ChipPicker options={["None","Mild","Moderate","Severe"]} selected={day.evening_rls} onChange={v => update("evening_rls", v)} single />
      </div>

      {/* Anxiety */}
      <div style={S.card}>
        <span style={S.label}>Anxiety level</span>
        <ChipPicker options={["None","Low","Moderate","High"]} selected={day.evening_anxiety} onChange={v => update("evening_anxiety", v)} single />
      </div>

      {/* Nap */}
      <div style={S.card}>
        <span style={S.label}>Did you nap today?</span>
        <ChipPicker options={["Yes","No"]} selected={day.nap_taken} onChange={v => update("nap_taken", v)} single />
        {day.nap_taken === "Yes" && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <span style={S.subLabel}>Duration (minutes)</span>
                <input style={S.input} type="number" placeholder="e.g. 30" value={day.nap_duration} onChange={e => update("nap_duration", e.target.value)} />
              </div>
            </div>
            <span style={S.subLabel}>Felt after nap</span>
            <ChipPicker options={["Refreshed","Groggy","No change"]} selected={day.nap_feel} onChange={v => update("nap_feel", v)} single />
          </div>
        )}
      </div>

      {/* Legs rolled */}
      <div style={S.card}>
        <span style={S.label}>Legs rolled / stretched?</span>
        <ChipPicker options={["Yes","No"]} selected={day.legs_rolled} onChange={v => update("legs_rolled", v)} single />
      </div>

      {/* Evening note */}
      <div style={S.card}>
        <span style={S.label}>Evening note (optional)</span>
        <textarea style={S.textarea} placeholder="How the day went overall..." maxLength={200} value={day.evening_note} onChange={e => update("evening_note", e.target.value)} />
      </div>

    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ entries }) {
  const recent = entries.slice().sort((a,b) => b.date.localeCompare(a.date)).slice(0, 14);
  const avg = arr => arr.length ? (arr.reduce((s,v) => s+v, 0) / arr.length).toFixed(1) : "—";

  const wakeVals    = recent.map(e => e.wake_feeling).filter(Boolean);
  const sleepScores = recent.map(e => parseFloat(e.garmin_score)).filter(v => !isNaN(v));
  const batteryVals = recent.map(e => parseFloat(e.garmin_body_battery)).filter(v => !isNaN(v));
  const rlsNights   = recent.filter(e => Array.isArray(e.disruptions) && e.disruptions.includes("rls"));
  const napDays     = recent.filter(e => e.nap_taken === "Yes");
  const workouts    = recent.filter(e => e.workout_type && e.workout_type !== "Rest day");
  const medDays     = recent.filter(e => e.med_taken && e.med_taken !== "No med");
  const noMedDays   = recent.filter(e => e.med_taken === "No med");
  const medWO       = workouts.filter(e => medDays.find(m => m.date===e.date));
  const noMedWO     = workouts.filter(e => noMedDays.find(m => m.date===e.date));
  const focusRatings = medDays.map(e => e.focus_rating).filter(Boolean);

  return (
    <div style={S.page}>
      <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 14 }}>Last {recent.length} days</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        <div style={S.statCard}><div style={S.statNum}>{avg(wakeVals)}<span style={{ fontSize: 13, fontWeight: 400 }}>/5</span></div><div style={S.statLabel}>Avg wake feeling</div></div>
        <div style={S.statCard}><div style={S.statNum}>{avg(sleepScores)}</div><div style={S.statLabel}>Avg sleep score</div></div>
        <div style={S.statCard}><div style={S.statNum}>{avg(batteryVals)}</div><div style={S.statLabel}>Avg body battery</div></div>
        <div style={S.statCard}><div style={S.statNum}>{rlsNights.length}</div><div style={S.statLabel}>RLS nights</div></div>
        <div style={S.statCard}><div style={S.statNum}>{napDays.length}</div><div style={S.statLabel}>Nap days</div></div>
        <div style={S.statCard}><div style={S.statNum}>{workouts.length}</div><div style={S.statLabel}>Workout days</div></div>
      </div>

      {(medWO.length > 0 || noMedWO.length > 0) && (
        <div style={{ ...S.card, marginBottom: 12 }}>
          <div style={S.sTitle}>Workout strength: med vs. no med</div>
          <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 500, color: "#185FA5" }}>{avg(medWO.map(e => e.workout_strength).filter(Boolean))}</div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Med days ({medWO.length})</div>
            </div>
            <div style={{ width: "0.5px", background: "var(--color-border-tertiary)" }} />
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 500, color: "#3B6D11" }}>{avg(noMedWO.map(e => e.workout_strength).filter(Boolean))}</div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>No med ({noMedWO.length})</div>
            </div>
          </div>
        </div>
      )}

      {focusRatings.length > 0 && (
        <div style={{ ...S.card, marginBottom: 12 }}>
          <div style={S.sTitle}>Avg focus on med days</div>
          <div style={{ fontSize: 22, fontWeight: 500, color: "#534AB7", marginTop: 4 }}>
            {avg(focusRatings)}<span style={{ fontSize: 13, fontWeight: 400, color: "var(--color-text-secondary)" }}>/5 across {medDays.length} days</span>
          </div>
        </div>
      )}

      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 8, marginTop: 4 }}>Recent log</div>
      {recent.length === 0 && <div style={{ color: "var(--color-text-tertiary)", fontSize: 13, padding: "20px 0" }}>No entries yet — start logging today!</div>}
      {recent.map(e => (
        <div key={e.date} style={{ ...S.card, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>{fmt(e.date)}</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {e.med_taken && e.med_taken !== "No med" && <span style={S.badge("#185FA5")}>{e.med_taken}</span>}
              {Array.isArray(e.disruptions) && e.disruptions.includes("rls") && <span style={S.badge("#A32D2D")}>RLS</span>}
              {e.nap_taken === "Yes" && <span style={S.badge("#BA7517")}>Nap</span>}
              {e.workout_type && e.workout_type !== "Rest day" && <span style={S.badge("#3B6D11")}>{e.workout_type}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--color-text-secondary)", flexWrap: "wrap" }}>
            {e.wake_feeling      && <span>Wake <strong style={{ color: SCALE_LABELS[e.wake_feeling]?.color }}>{e.wake_feeling}/5</strong></span>}
            {e.garmin_score      && <span>Sleep <strong>{e.garmin_score}</strong></span>}
            {e.garmin_body_battery && <span>Battery <strong>{e.garmin_body_battery}</strong></span>}
            {e.workout_strength  && <span>Workout <strong style={{ color: WORKOUT_SCALE[e.workout_strength]?.color }}>{e.workout_strength}/5</strong></span>}
            {e.evening_energy    && <span>Day <strong style={{ color: SCALE_LABELS[e.evening_energy]?.color }}>{e.evening_energy}/5</strong></span>}
            {e.focus_rating      && <span>Focus <strong style={{ color: FOCUS_SCALE[e.focus_rating]?.color }}>{e.focus_rating}/5</strong></span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function Settings({ onExportCSV, onClearData, syncStatus, onSavePasscode }) {
  const [passcode, setPasscode] = useState(localStorage.getItem("sleepfit_passcode") || "");
  const saved = !!localStorage.getItem("sleepfit_passcode");
  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.sTitle}>Sync</div>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4, marginBottom: 12, lineHeight: 1.6 }}>
          Every change auto-saves here and syncs to the server. Open on any device and your data is already there.
        </div>
        {syncStatus && (
          <div style={{ fontSize: 12, marginBottom: 12, padding: "8px 12px", background: "var(--color-background-secondary)", borderRadius: 8 }}>
            <span style={S.syncDot(syncStatus.ok)} />{syncStatus.msg}
          </div>
        )}
        <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 12, padding: "10px 12px", background: "var(--color-background-secondary)", borderRadius: 8, lineHeight: 1.7 }}>
          Setup: 1) In your Vercel dashboard → Storage → Create KV Database → Connect to this project. 2) In Vercel Settings → Environment Variables → add <strong>SYNC_PASSCODE</strong> with any password you choose. 3) Enter that same password below.
        </div>
        <input
          style={{ ...S.input, marginBottom: 10 }}
          type="password"
          placeholder="Enter your sync passcode…"
          value={passcode}
          onChange={e => setPasscode(e.target.value)}
        />
        <button style={{ ...S.btn("full"), background: "#185FA5", color: "#fff", border: "none" }} onClick={() => onSavePasscode(passcode.trim())}>
          {saved ? "Update passcode" : "Save passcode & sync"}
        </button>
      </div>
      <div style={S.card}>
        <div style={S.sTitle}>Export data</div>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4, marginBottom: 12, lineHeight: 1.6 }}>
          Export as CSV to share with Dr. Tan or review in Excel.
        </div>
        <button style={S.btn("full")} onClick={onExportCSV}>Export all data as CSV</button>
      </div>
      <div style={{ ...S.card, borderColor: "#F7C1C1" }}>
        <div style={{ ...S.sTitle, color: "#A32D2D" }}>Danger zone</div>
        <button style={{ ...S.btn("full"), marginTop: 8, borderColor: "#F7C1C1", color: "#A32D2D" }} onClick={onClearData}>Clear all local data</button>
      </div>
    </div>
  );
}

// ─── Date bar ─────────────────────────────────────────────────────────────────
function DateBar({ selectedDate, onPrev, onNext, onToday }) {
  const isToday = selectedDate === todayStr();
  return (
    <div style={S.dateBar}>
      <button style={{ border: "none", background: "none", cursor: "pointer", fontSize: 20, color: "var(--color-text-secondary)", padding: "0 4px", lineHeight: 1 }} onClick={onPrev}>‹</button>
      <div style={{ flex: 1, textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{fmtFull(selectedDate)}</div>
        {!isToday && <div style={{ fontSize: 11, color: "#BA7517", marginTop: 1 }}>Editing past entry</div>}
      </div>
      <button style={{ border: "none", background: "none", cursor: "pointer", fontSize: 20, color: isToday ? "var(--color-text-tertiary)" : "var(--color-text-secondary)", padding: "0 4px", lineHeight: 1 }} onClick={onNext} disabled={isToday}>›</button>
      {!isToday && <button style={{ ...S.btn(""), fontSize: 11, padding: "4px 10px" }} onClick={onToday}>Today</button>}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]                   = useState("log");
  const [logTab, setLogTab]             = useState("sleep");
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [entries, setEntries]           = useState({});
  const [syncStatus, setSyncStatus]     = useState(null);
  const syncTimer = useRef(null);

  const syncFetch = (passcode, method, body) =>
    fetch("/api/sync", {
      method,
      headers: { "x-passcode": passcode, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("sleepfit_v3");
      if (stored) setEntries(JSON.parse(stored));
    } catch {}

    const passcode = localStorage.getItem("sleepfit_passcode");
    if (passcode) {
      setSyncStatus({ ok: null, msg: "Syncing…" });
      syncFetch(passcode, "GET")
        .then(data => {
          if (data && typeof data === "object" && Object.keys(data).length > 0) {
            setEntries(data);
            try { localStorage.setItem("sleepfit_v3", JSON.stringify(data)); } catch {}
          }
          const t = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          localStorage.setItem("sleepfit_last_synced", t);
          setSyncStatus({ ok: true, msg: `Synced ✓ ${t}` });
        })
        .catch(() => setSyncStatus({ ok: false, msg: "Sync failed — check passcode in Settings" }));
    }
  }, []);

  const currentDay = entries[selectedDate] || EMPTY_DAY(selectedDate);

  const update = useCallback((key, value) => {
    setEntries(prev => {
      const day = prev[selectedDate] || EMPTY_DAY(selectedDate);
      const updated = { ...prev, [selectedDate]: { ...day, [key]: value } };
      try { localStorage.setItem("sleepfit_v3", JSON.stringify(updated)); } catch {}
      const passcode = localStorage.getItem("sleepfit_passcode");
      if (passcode) {
        if (syncTimer.current) clearTimeout(syncTimer.current);
        syncTimer.current = setTimeout(() => {
          syncFetch(passcode, "POST", updated)
            .then(() => {
              const t = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              localStorage.setItem("sleepfit_last_synced", t);
              setSyncStatus({ ok: true, msg: `Synced ✓ ${t}` });
            })
            .catch(() => setSyncStatus({ ok: false, msg: "Sync failed" }));
        }, 1500);
      }
      return updated;
    });
  }, [selectedDate]);

  const shiftDate = (days) => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + days);
    const next = d.toISOString().slice(0, 10);
    if (next <= todayStr()) setSelectedDate(next);
  };


  const onImportCSV = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".csv";
    input.onchange = e => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const lines = ev.target.result.trim().split("\n");
        const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, "").replace(/\uFEFF/, ""));
        const newEntries = { ...entries };
        lines.slice(1).forEach(line => {
          const vals = line.split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
          const row = {}; headers.forEach((h, i) => { row[h] = vals[i] || ""; });
          const dateRaw = row["Sleep Score 4 Weeks"] || row["Date"] || row["date"];
          if (!dateRaw || dateRaw === "--") return;
          const date = dateRaw.slice(0, 10);
          const base = newEntries[date] || EMPTY_DAY(date);
          if (row["Score"] !== "--") base.garmin_score = row["Score"];
          if (row["Body Battery"] !== "--") base.garmin_body_battery = row["Body Battery"];
          if (row["Resting Heart Rate"] !== "--") base.garmin_resting_hr = row["Resting Heart Rate"];
          if (row["HRV Status"] !== "--") base.garmin_hrv = row["HRV Status"];
          const dur = row["Duration"] || "";
          if (dur && dur !== "--") { const m = dur.match(/(\d+)h\s*(\d+)?min?/); if (m) base.garmin_duration = (parseInt(m[1]) + (parseInt(m[2]||0)/60)).toFixed(1); }
          newEntries[date] = base;
        });
        setEntries(newEntries);
        try { localStorage.setItem("sleepfit_v3", JSON.stringify(newEntries)); } catch {}
        setSyncStatus({ ok: null, msg: "CSV imported ✓" });
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const onExportCSV = () => {
    const keys = Object.keys(EMPTY_DAY());
    const rows = Object.values(entries).sort((a,b) => a.date.localeCompare(b.date)).map(e =>
      keys.map(k => { const v = e[k]; return Array.isArray(v) ? '"'+v.join("|")+'"' : v==null ? '' : '"'+String(v).replace(/"/g,'""')+'"'; }).join(",")
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([[keys.join(","), ...rows].join("\n")], { type: "text/csv" }));
    a.download = "sleepfit_export.csv"; a.click();
  };

  const onClearData = () => {
    if (window.confirm("Delete all local SleepFit data? Cannot be undone.")) {
      localStorage.removeItem("sleepfit_v3");
      setEntries({});
    }
  };

  const LOG_TABS = [
    { id: "sleep",   label: "Sleep" },
    { id: "workout", label: "Workout" },
    { id: "evening", label: "Evening" },
  ];

  return (
    <div style={S.app}>
      <div style={S.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 500, color: "var(--color-text-primary)" }}>
              {tab === "log" ? "Daily log" : tab === "dashboard" ? "Dashboard" : "Settings"}
            </div>
            {(syncStatus || localStorage.getItem("sleepfit_last_synced")) && (
              <div style={{ fontSize: 11, marginTop: 2 }}>
                <span style={S.syncDot(syncStatus ? syncStatus.ok : true)} />
                {syncStatus ? syncStatus.msg : `Last synced ${localStorage.getItem("sleepfit_last_synced")}`}
              </div>
            )}
          </div>
          {localStorage.getItem("sleepfit_passcode") && syncStatus?.ok !== true && syncStatus?.ok !== null && (
            <button
              style={{ fontSize: 12, padding: "5px 12px", borderRadius: 8, border: "1px solid #185FA5", background: "none", color: "#185FA5", cursor: "pointer", fontFamily: "inherit" }}
              onClick={() => {
                const p = localStorage.getItem("sleepfit_passcode");
                setSyncStatus({ ok: null, msg: "Syncing…" });
                syncFetch(p, "GET")
                  .then(data => {
                    if (data && typeof data === "object" && Object.keys(data).length > 0) {
                      setEntries(data);
                      try { localStorage.setItem("sleepfit_v3", JSON.stringify(data)); } catch {}
                    }
                    const t = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                    localStorage.setItem("sleepfit_last_synced", t);
                    setSyncStatus({ ok: true, msg: `Synced ✓ ${t}` });
                  })
                  .catch(() => setSyncStatus({ ok: false, msg: "Sync failed" }));
              }}
            >
              Sync
            </button>
          )}
        </div>
        {tab === "log" && (
          <div style={{ display: "flex", gap: 0, borderBottom: "0.5px solid var(--color-border-tertiary)", marginLeft: -20, marginRight: -20, paddingLeft: 20 }}>
            {LOG_TABS.map(t => (
              <button key={t.id} onClick={() => setLogTab(t.id)} style={{ padding: "6px 20px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit", color: logTab===t.id ? "var(--color-text-info,#185FA5)" : "var(--color-text-secondary)", borderBottom: logTab===t.id ? "2px solid var(--color-text-info,#185FA5)" : "2px solid transparent", marginBottom: -0.5, fontWeight: logTab===t.id ? 500 : 400 }}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === "log" && (
        <DateBar selectedDate={selectedDate} onPrev={() => shiftDate(-1)} onNext={() => shiftDate(1)} onToday={() => setSelectedDate(todayStr())} />
      )}

      <div style={{ padding: tab === "log" ? "14px 16px" : 0 }}>
        {tab === "log" && logTab === "sleep"   && <SleepMorningSection day={currentDay} update={update} onImportCSV={onImportCSV} />}
        {tab === "log" && logTab === "workout" && <WorkoutSection       day={currentDay} update={update} />}
        {tab === "log" && logTab === "evening" && <EveningSection       day={currentDay} update={update} />}
        {tab === "dashboard" && <Dashboard entries={Object.values(entries)} />}
        {tab === "settings"  && <Settings onExportCSV={onExportCSV} onClearData={onClearData} syncStatus={syncStatus} onSavePasscode={p => {
          localStorage.setItem("sleepfit_passcode", p);
          setSyncStatus({ ok: null, msg: "Syncing…" });
          syncFetch(p, "GET")
            .then(data => {
              if (data && typeof data === "object" && Object.keys(data).length > 0) {
                setEntries(data);
                try { localStorage.setItem("sleepfit_v3", JSON.stringify(data)); } catch {}
              }
              const t = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              localStorage.setItem("sleepfit_last_synced", t);
              setSyncStatus({ ok: true, msg: `Synced ✓ ${t}` });
            })
            .catch(() => setSyncStatus({ ok: false, msg: "Wrong passcode or KV not set up" }));
        }} />}
      </div>

      <nav style={S.nav}>
        {[
          { id: "log",       icon: "ti-pencil",    label: "Log"       },
          { id: "dashboard", icon: "ti-chart-bar", label: "Dashboard" },
          { id: "settings",  icon: "ti-settings",  label: "Settings"  },
        ].map(n => (
          <button key={n.id} style={S.navBtn(tab===n.id)} onClick={() => setTab(n.id)}>
            <i className={`ti ${n.icon}`} style={{ fontSize: 20 }} aria-hidden="true" />
            {n.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
