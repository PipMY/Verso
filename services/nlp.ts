/**
 * Natural Language Processing service for parsing reminder text.
 * Uses chrono-node for date/time extraction and pattern matching for recurrence.
 *
 * Examples:
 *   "take bins out every day at 7am starting tomorrow"
 *   "call mum every sunday at 3pm"
 *   "dentist appointment on march 15 at 2:30pm"
 *   "water plants every 3 days at 8am"
 *   "pay rent monthly on the 1st at 9am"
 *   "team standup every weekday at 9:15am"
 */

import { RecurrenceType } from "@/types/reminder";
import * as chrono from "chrono-node";
import {
    addDays,
    addHours,
    isBefore
} from "date-fns";

export interface ParsedReminder {
  title: string;
  datetime: Date;
  recurrence?: {
    type: RecurrenceType;
    interval: number;
  };
  priority: "low" | "medium" | "high";
  notes?: string;
  confidence: number; // 0-1 how confident we are in the parse
}

// Patterns to strip from the title after extraction
const TIME_PHRASES =
  /\b(at\s+\d{1,2}(:\d{2})?\s*(am|pm)?|starting\s+(today|tomorrow|next\s+\w+|on\s+\w+)|from\s+(today|tomorrow|next\s+\w+))\b/gi;

const RECURRENCE_PHRASES =
  /\b(every\s+(single\s+)?(other\s+)?(day|daily|week|weekly|month|monthly|year|yearly|weekday|morning|evening|night|hour|hourly|\d+\s*(days?|weeks?|months?|years?|hours?))|daily|weekly|monthly|yearly|hourly)\b/gi;

const PRIORITY_PHRASES =
  /\b(high\s+priority|urgent|important|low\s+priority|not\s+urgent)\b/gi;

interface RecurrenceMatch {
  type: RecurrenceType;
  interval: number;
}

/**
 * Extract recurrence info from natural language text.
 */
function parseRecurrence(text: string): RecurrenceMatch | undefined {
  const lower = text.toLowerCase();

  // "every other day/week/month"
  const everyOther = lower.match(/every\s+other\s+(day|week|month|year|hour)/i);
  if (everyOther) {
    const unit = everyOther[1];
    const typeMap: Record<string, RecurrenceType> = {
      day: "daily",
      week: "weekly",
      month: "monthly",
      year: "yearly",
      hour: "hourly",
    };
    return { type: typeMap[unit] || "daily", interval: 2 };
  }

  // "every N days/weeks/months/hours"
  const everyN = lower.match(
    /every\s+(\d+)\s*(days?|weeks?|months?|years?|hours?)/i,
  );
  if (everyN) {
    const interval = parseInt(everyN[1], 10);
    const unit = everyN[2].replace(/s$/, "");
    const typeMap: Record<string, RecurrenceType> = {
      day: "daily",
      week: "weekly",
      month: "monthly",
      year: "yearly",
      hour: "hourly",
    };
    return { type: typeMap[unit] || "daily", interval };
  }

  // "every day" / "every week" / "daily" / "weekly" etc.
  const everyUnit = lower.match(
    /every\s+(?:single\s+)?(day|week|month|year|hour|morning|evening|night|weekday)/i,
  );
  if (everyUnit) {
    const unit = everyUnit[1];
    const typeMap: Record<string, RecurrenceType> = {
      day: "daily",
      week: "weekly",
      month: "monthly",
      year: "yearly",
      hour: "hourly",
      morning: "daily",
      evening: "daily",
      night: "daily",
      weekday: "daily", // Approximate — daily for now
    };
    return { type: typeMap[unit] || "daily", interval: 1 };
  }

  // Standalone keywords
  if (/\bdaily\b/i.test(lower)) return { type: "daily", interval: 1 };
  if (/\bweekly\b/i.test(lower)) return { type: "weekly", interval: 1 };
  if (/\bmonthly\b/i.test(lower)) return { type: "monthly", interval: 1 };
  if (/\byearly\b/i.test(lower)) return { type: "yearly", interval: 1 };
  if (/\bhourly\b/i.test(lower)) return { type: "hourly", interval: 1 };

  // "every sunday/monday/etc." → weekly
  if (
    /every\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i.test(
      lower,
    )
  ) {
    return { type: "weekly", interval: 1 };
  }

  return undefined;
}

/**
 * Extract priority from natural language text.
 */
function parsePriority(text: string): "low" | "medium" | "high" {
  const lower = text.toLowerCase();
  if (/\b(urgent|high\s*priority|important|asap|critical)\b/i.test(lower)) {
    return "high";
  }
  if (/\b(low\s*priority|not\s*urgent|whenever|no\s*rush)\b/i.test(lower)) {
    return "low";
  }
  return "medium";
}

/**
 * Clean up the title by removing date/time/recurrence phrases,
 * leaving just the actionable part.
 */
function extractTitle(text: string): string {
  let title = text;

  // Remove recurrence phrases
  title = title.replace(RECURRENCE_PHRASES, "");

  // Remove time-related phrases that chrono would parse
  title = title.replace(TIME_PHRASES, "");

  // Remove priority phrases
  title = title.replace(PRIORITY_PHRASES, "");

  // Remove common date phrases that might remain
  title = title.replace(
    /\b(tomorrow|today|tonight|next\s+(week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|on\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)|this\s+(morning|afternoon|evening|weekend))\b/gi,
    "",
  );

  // Remove standalone time patterns like "7am", "3:30pm", "14:00"
  title = title.replace(/\b\d{1,2}(:\d{2})?\s*(am|pm)\b/gi, "");
  title = title.replace(/\b(at|by|before|after|around|from)\s*$/gi, "");

  // Remove "starting" / "from" at the end
  title = title.replace(/\b(starting|from|beginning)\s*$/gi, "");

  // Clean up extra whitespace, leading/trailing punctuation
  title = title.replace(/\s+/g, " ").trim();
  title = title.replace(/^[\s,\-–—]+|[\s,\-–—]+$/g, "").trim();

  // Capitalize first letter
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  return title;
}

/**
 * Parse a natural language string into a structured reminder.
 *
 * @param input - The raw text like "take bins out every day at 7am starting tomorrow"
 * @param referenceDate - The reference date for relative parsing (defaults to now)
 * @returns ParsedReminder or null if parsing failed
 */
export function parseNaturalLanguage(
  input: string,
  referenceDate?: Date,
): ParsedReminder | null {
  if (!input || !input.trim()) return null;

  const text = input.trim();
  const ref = referenceDate || new Date();

  // 1. Parse date/time with chrono
  const chronoResults = chrono.parse(text, ref, { forwardDate: true });

  let datetime: Date;
  let confidence = 0.5;

  if (chronoResults.length > 0) {
    const result = chronoResults[0];
    datetime = result.start.date();
    confidence = 0.8;

    // If chrono found a specific time, boost confidence
    if (result.start.isCertain("hour") || result.start.isCertain("minute")) {
      confidence = 0.9;
    }

    // If the parsed date is in the past, push to tomorrow (same time)
    if (isBefore(datetime, ref)) {
      datetime = addDays(datetime, 1);
    }
  } else {
    // No date/time found — default to 1 hour from now
    datetime = addHours(ref, 1);
    confidence = 0.3;
  }

  // 2. Parse recurrence
  const recurrence = parseRecurrence(text);
  if (recurrence) {
    confidence = Math.min(confidence + 0.1, 1);
  }

  // 3. Parse priority
  const priority = parsePriority(text);

  // 4. Extract clean title
  const title = extractTitle(text);

  if (!title) {
    return null; // Nothing left after stripping — bad input
  }

  return {
    title,
    datetime,
    recurrence,
    priority,
    confidence,
  };
}

/**
 * Generate a human-readable summary of a parsed reminder.
 */
export function formatParsedSummary(parsed: ParsedReminder): string {
  const parts: string[] = [];

  parts.push(`"${parsed.title}"`);

  // Format the date/time nicely
  const now = new Date();
  const isToday = parsed.datetime.toDateString() === now.toDateString();
  const isTomorrow =
    parsed.datetime.toDateString() === addDays(now, 1).toDateString();

  const timeStr = parsed.datetime.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) {
    parts.push(`today at ${timeStr}`);
  } else if (isTomorrow) {
    parts.push(`tomorrow at ${timeStr}`);
  } else {
    const dateStr = parsed.datetime.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    parts.push(`${dateStr} at ${timeStr}`);
  }

  if (parsed.recurrence) {
    const { type, interval } = parsed.recurrence;
    if (interval === 1) {
      parts.push(`repeating ${type}`);
    } else {
      const unitMap: Record<string, string> = {
        daily: "days",
        weekly: "weeks",
        monthly: "months",
        yearly: "years",
        hourly: "hours",
      };
      parts.push(`repeating every ${interval} ${unitMap[type] || type}`);
    }
  }

  if (parsed.priority !== "medium") {
    parts.push(`(${parsed.priority} priority)`);
  }

  return parts.join(" · ");
}
