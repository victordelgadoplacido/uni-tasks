import { IcalEvent } from "./types";

// Minimal RFC5545 parser covering what university calendars (Moodle, Canvas,
// TimeEdit, etc.) typically export: flat VEVENT blocks with SUMMARY/DTSTART/
// DTEND/LOCATION/DESCRIPTION/UID, converted to the viewer's local time.
// Recurrence rules (RRULE) are not expanded - only each VEVENT's own DTSTART
// is used. Exporters like TimeEdit already emit one VEVENT per occurrence,
// so this covers class timetables as well as one-off deadlines; a source
// that relies on RRULE to represent a single repeating series would only
// show its first occurrence.

function unfoldLines(raw: string): string[] {
  const rawLines = raw.split(/\r\n|\n|\r/);
  const lines: string[] = [];
  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

interface ParsedDate {
  date: string; // "YYYY-MM-DD", in the viewer's local time
  time: string | null; // "HH:MM", in the viewer's local time
}

function toLocalParts(instant: Date): ParsedDate {
  const y = instant.getFullYear();
  const mo = String(instant.getMonth() + 1).padStart(2, "0");
  const d = String(instant.getDate()).padStart(2, "0");
  const h = String(instant.getHours()).padStart(2, "0");
  const mi = String(instant.getMinutes()).padStart(2, "0");
  return { date: `${y}-${mo}-${d}`, time: `${h}:${mi}` };
}

// Converts a wall-clock time expressed in an arbitrary IANA zone to the UTC
// instant it represents, using Intl to look up that zone's offset (handles
// DST correctly without shipping a timezone database).
function zonedWallTimeToUtcMs(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
): number | null {
  try {
    const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = dtf.formatToParts(new Date(utcGuess));
    const get = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value ?? "0");
    const asIfUtc = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour") % 24,
      get("minute"),
      get("second")
    );
    const offset = asIfUtc - utcGuess;
    return utcGuess - offset;
  } catch {
    return null;
  }
}

// `rawKey` is the property name including parameters, e.g. "DTSTART;TZID=Europe/Amsterdam".
function parseDateValue(rawKey: string, value: string): ParsedDate | null {
  const match = value.match(
    /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/
  );
  if (!match) return null;
  const [, y, mo, d, h, mi, s, z] = match;

  if (!h) {
    // Date-only value (VALUE=DATE) - all-day, no time conversion needed.
    return { date: `${y}-${mo}-${d}`, time: null };
  }

  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  const hour = Number(h);
  const minute = Number(mi);
  const second = s ? Number(s) : 0;

  if (z) {
    return toLocalParts(new Date(Date.UTC(year, month - 1, day, hour, minute, second)));
  }

  const tzidMatch = rawKey.match(/TZID=([^;:]+)/i);
  if (tzidMatch) {
    const utcMs = zonedWallTimeToUtcMs(year, month, day, hour, minute, second, tzidMatch[1]);
    if (utcMs !== null) return toLocalParts(new Date(utcMs));
  }

  // Floating local time (no Z, no resolvable TZID) - use the wall-clock value as-is.
  return { date: `${y}-${mo}-${d}`, time: `${h}:${mi}` };
}

export interface ParsedIcal {
  events: IcalEvent[];
  skipped: number;
}

const TRACKED_KEYS = ["SUMMARY", "DESCRIPTION", "LOCATION", "UID", "DTSTART", "DTEND"];

export function parseIcs(raw: string): ParsedIcal {
  const lines = unfoldLines(raw);
  const events: IcalEvent[] = [];
  let skipped = 0;

  let inEvent = false;
  let current: Record<string, string> = {};
  let currentRawKeys: Record<string, string> = {};

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      current = {};
      currentRawKeys = {};
      continue;
    }
    if (line === "END:VEVENT") {
      inEvent = false;
      const summary = current.SUMMARY ? unescapeText(current.SUMMARY) : "";
      const start = current.DTSTART
        ? parseDateValue(currentRawKeys.DTSTART, current.DTSTART)
        : null;
      const end = current.DTEND
        ? parseDateValue(currentRawKeys.DTEND, current.DTEND)
        : null;

      if (summary && start) {
        events.push({
          id: current.UID || `${start.date}-${summary}-${events.length}`,
          title: summary,
          date: start.date,
          time: start.time,
          endTime: end && end.date === start.date ? end.time : null,
          location: current.LOCATION ? unescapeText(current.LOCATION) : "",
          description: current.DESCRIPTION ? unescapeText(current.DESCRIPTION) : "",
        });
      } else {
        skipped++;
      }
      continue;
    }
    if (!inEvent) continue;

    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const rawKey = line.slice(0, colonIndex);
    const value = line.slice(colonIndex + 1);
    const key = rawKey.split(";")[0].toUpperCase();
    if (TRACKED_KEYS.includes(key)) {
      current[key] = value;
      currentRawKeys[key] = rawKey;
    }
  }

  return { events, skipped };
}
