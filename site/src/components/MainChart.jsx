import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import events from "../content/events.json";
import { useLanguage } from "../i18n/language.jsx";
import { BASE_MONTH, districtBasket, lastIndexWithValue, scaledCpi } from "../lib/basket.js";
import { formatDate, formatMonth, formatRM } from "../lib/format.js";

// Line colours. Selangor wears the site's magenta. Districts take the next free
// colour when switched on and keep it until switched off, so a line never changes
// colour under the reader. The four were checked with a colour-blindness validator
// against the white background, every pair against every other, since lines can
// cross anywhere. That's why it's at most 3 districts at a time.
const STATE_COLOR = "#D6125F";
const DISTRICT_COLORS = ["#2a78d6", "#eb6834", "#1baf7a"];
const CPI_COLOR = "#4A505C"; // a dark grey dashed line: a reference, not a place
const AXIS_COLOR = "#5F6673";
const GRID_COLOR = "#E3E5EA";
const EVENT_COLOR = "#9AA0AA";

export default function MainChart({ view }) {
  const { lang, t } = useLanguage();
  const { meta, itemDistricts, cpi, months, selected, basket } = view;
  const [chosen, setChosen] = useState([]); // districts on the chart, as { name, slot }
  const [showCpi, setShowCpi] = useState(false);

  // Each district's basket for the items switched on (small: 11 districts x 59 months)
  const districtSeries = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(itemDistricts.districts)
          .sort()
          .map((name) => [name, districtBasket(itemDistricts, name, selected)]),
      ),
    [itemDistricts, selected],
  );
  const cpiLine = useMemo(() => scaledCpi(months, cpi, basket), [months, cpi, basket]);

  const districtNames = Object.keys(districtSeries);
  const neverShown = districtNames.filter((name) => districtSeries[name].every((v) => v === null));
  const full = chosen.length >= DISTRICT_COLORS.length;

  function toggleDistrict(name) {
    setChosen((current) => {
      if (current.some((d) => d.name === name)) return current.filter((d) => d.name !== name);
      const used = new Set(current.map((d) => d.slot));
      const slot = DISTRICT_COLORS.findIndex((_, s) => !used.has(s));
      return slot === -1 ? current : [...current, { name, slot }];
    });
  }

  // Everything drawn, in legend order. Keys are fixed per slot ("d0", "d1", "d2").
  const series = [
    { key: "state", name: meta.state, color: STATE_COLOR, values: basket },
    ...chosen.map((d) => ({
      key: `d${d.slot}`,
      name: d.name,
      color: DISTRICT_COLORS[d.slot],
      values: districtSeries[d.name],
      district: true,
    })),
    ...(showCpi
      ? [{ key: "cpi", name: t("chart.cpiName"), color: CPI_COLOR, values: cpiLine, dashed: true }]
      : []),
  ];
  // Recharts wants one object per point on the x-axis: { month, state, d0, cpi, ... }
  const rows = months.map((month, i) =>
    Object.fromEntries([["month", month], ...series.map((s) => [s.key, s.values[i]])]),
  );

  const yTicks = niceTicks(series.flatMap((s) => s.values).filter((v) => v !== null));
  const yearTicks = months.filter((month) => month.endsWith("-01"));
  const last = lastIndexWithValue(basket);
  // Put the end label where the line isn't: below the dot if the line comes down into it
  const labelBelow = last > 0 && basket[last - 1] !== null && basket[last - 1] > basket[last];
  const cpiUntil = cpi.length ? cpi[cpi.length - 1].month : null;

  return (
    <section className="section" aria-labelledby="chart-title">
      <div className="container">
        <h2 id="chart-title">{t("chart.title", { state: meta.state })}</h2>
        <p className="section-intro">{t("chart.caption")}</p>

        <div className="chart-controls">
          <p className="control-label" id="district-buttons">
            {t("chart.addDistricts", { max: DISTRICT_COLORS.length })}
          </p>
          <div className="button-row" role="group" aria-labelledby="district-buttons">
            {districtNames
              .filter((name) => !neverShown.includes(name))
              .map((name) => {
                const on = chosen.find((d) => d.name === name);
                return (
                  <button
                    key={name}
                    type="button"
                    className="chip"
                    aria-pressed={Boolean(on)}
                    disabled={!on && full}
                    onClick={() => toggleDistrict(name)}
                  >
                    {on && <LineKey color={DISTRICT_COLORS[on.slot]} />}
                    {name}
                  </button>
                );
              })}
          </div>
          {full && <p className="hint">{t("chart.full", { max: DISTRICT_COLORS.length })}</p>}
          {neverShown.length > 0 && (
            <p className="hint">{t("chart.neverShown", { districts: neverShown.join(", ") })}</p>
          )}
          <div className="button-row">
            <button
              type="button"
              className="chip"
              aria-pressed={showCpi}
              onClick={() => setShowCpi((on) => !on)}
            >
              <LineKey color={CPI_COLOR} dashed />
              {t("chart.cpiButton")}
            </button>
          </div>
        </div>

        {series.length > 1 && (
          <ul className="chart-legend">
            {series.map((s) => (
              <li key={s.key}>
                <LineKey color={s.color} dashed={s.dashed} />
                {s.name}
              </li>
            ))}
          </ul>
        )}

        <figure className="chart" aria-label={chartSummary(t, meta.state, months, basket)}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 30, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID_COLOR} />
              <XAxis
                dataKey="month"
                ticks={yearTicks}
                tickFormatter={(month) => month.slice(0, 4)}
                stroke={GRID_COLOR}
                tick={{ fill: AXIS_COLOR, fontSize: 13 }}
                tickLine={false}
              />
              <YAxis
                domain={[yTicks[0], yTicks[yTicks.length - 1]]}
                ticks={yTicks}
                tickFormatter={(value) => `RM${value}`}
                stroke={GRID_COLOR}
                tick={{ fill: AXIS_COLOR, fontSize: 13 }}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              {events.map((event, i) => (
                <ReferenceLine
                  key={event.date}
                  x={event.date.slice(0, 7)}
                  stroke={EVENT_COLOR}
                  label={<EventMarker number={i + 1} />}
                />
              ))}
              <Tooltip
                content={(props) => (
                  <ChartTooltip {...props} series={series} months={months} meta={meta} t={t} />
                )}
                cursor={{ stroke: AXIS_COLOR, strokeWidth: 1 }}
                isAnimationActive={false}
              />
              {series.map((s) => (
                <Line
                  key={s.key}
                  dataKey={s.key}
                  name={s.name}
                  type="linear"
                  stroke={s.color}
                  strokeWidth={s.key === "state" ? 3 : 2}
                  strokeDasharray={s.dashed ? "6 4" : undefined}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  connectNulls={false}
                  isAnimationActive={false}
                  activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                  dot={
                    s.key === "state"
                      ? (props) => (
                          <EndDot
                            {...props}
                            last={last}
                            partial={months[last] === meta.partial_month}
                            below={labelBelow}
                          />
                        )
                      : false
                  }
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </figure>

        {meta.partial_month && (
          <p className="chart-note">
            {t("chart.partial", {
              month: formatMonth(meta.partial_month, t),
              date: formatDate(meta.data_until, t),
            })}
          </p>
        )}
        {showCpi && (
          <p className="chart-note">
            {t("chart.cpiNote", {
              base: formatMonth(BASE_MONTH, t),
              until: cpiUntil ? formatMonth(cpiUntil, t) : "–",
            })}
          </p>
        )}

        <h3 className="events-title">{t("chart.eventsTitle")}</h3>
        <ol className="event-list">
          {events.map((event) => (
            <li key={event.date}>
              <span className="event-date">{formatDate(event.date, t)}</span> {event.label[lang]} (
              <a href={event.source.url}>{event.source.name}</a>)
            </li>
          ))}
        </ol>

        <details className="table-view">
          <summary>{t("chart.showTable")}</summary>
          <div className="table-scroll" tabIndex={0} role="region" aria-label={t("chart.tableLabel")}>
            <table>
              <thead>
                <tr>
                  <th scope="col" className="sticky">
                    {t("chart.month")}
                  </th>
                  {series.map((s) => (
                    <th scope="col" key={s.key} className="num">
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {months.map((month, i) => (
                  <tr key={month}>
                    <th scope="row" className="sticky">
                      {formatMonth(month, t)}
                      {month === meta.partial_month && ` (${t("chart.partialShort")})`}
                    </th>
                    {series.map((s) => (
                      <td key={s.key} className="num">
                        {formatRM(s.values[i])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </section>
  );
}

// A short stroke in the series colour: the key in buttons, the legend and the tooltip
function LineKey({ color, dashed }) {
  return (
    <svg className="line-key" width="18" height="6" aria-hidden="true">
      <line
        x1="1"
        y1="3"
        x2="17"
        y2="3"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={dashed ? "4 3" : undefined}
      />
    </svg>
  );
}

// The Selangor line's last point, labelled with its value. A hollow dot means the
// month isn't over yet.
function EndDot({ cx, cy, index, value, last, partial, below }) {
  if (index !== last || cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill={partial ? "#fff" : STATE_COLOR} stroke={STATE_COLOR} strokeWidth={2} />
      <text x={cx - 8} y={below ? cy + 22 : cy - 12} textAnchor="end" className="end-label">
        {formatRM(value)}
      </text>
    </g>
  );
}

// A numbered circle at the top of each event line; the numbers match the list below
function EventMarker({ viewBox, number }) {
  if (!viewBox) return null;
  return (
    <g aria-hidden="true">
      <circle cx={viewBox.x} cy={viewBox.y - 14} r={10} fill="#16181D" />
      <text x={viewBox.x} y={viewBox.y - 10} textAnchor="middle" className="event-number">
        {number}
      </text>
    </g>
  );
}

// One tooltip listing every series at the month under the pointer. Values lead.
function ChartTooltip({ active, label, series, months, meta, t }) {
  if (!active || !label) return null;
  const i = months.indexOf(label);
  return (
    <div className="chart-tooltip">
      <p className="tooltip-month">
        {formatMonth(label, t)}
        {label === meta.partial_month && ` (${t("chart.partialShort")})`}
      </p>
      <ul>
        {series.map((s) => (
          <li key={s.key}>
            <LineKey color={s.color} dashed={s.dashed} />
            <strong>
              {s.values[i] !== null
                ? formatRM(s.values[i])
                : s.district
                  ? t("chart.notEnoughShops")
                  : "–"}
            </strong>
            <span>{s.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Round axis steps (1, 2 or 5 times a power of ten) that cover all the values
function niceTicks(values) {
  if (values.length === 0) return [0, 10];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const rough = (max - min) / 5 || 1;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * power).find((s) => s >= rough);
  const ticks = [Math.floor(min / step) * step];
  while (ticks[ticks.length - 1] < max) ticks.push(Math.round((ticks[ticks.length - 1] + step) * 100) / 100);
  return ticks;
}

// The text alternative for the chart: where the line starts, ends and peaks
function chartSummary(t, state, months, basket) {
  const points = basket.map((value, i) => ({ value, month: months[i] })).filter((p) => p.value !== null);
  if (points.length === 0) return t("chart.title", { state });
  const peak = points.reduce((a, b) => (b.value > a.value ? b : a));
  const [first, last] = [points[0], points[points.length - 1]];
  return t("chart.summary", {
    state,
    firstMonth: formatMonth(first.month, t),
    first: formatRM(first.value),
    lastMonth: formatMonth(last.month, t),
    last: formatRM(last.value),
    peakMonth: formatMonth(peak.month, t),
    peak: formatRM(peak.value),
  });
}
