export function validateBooking(
  input: { start: string; end: string; size: number },
  capacity: number,
): string | null {
  const start = Date.parse(input.start),
    end = Date.parse(input.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    return "The end must be after the start.";
  if (input.start.slice(0, 10) !== input.end.slice(0, 10))
    return "Use a booking that starts and ends on the same date.";
  if (!Number.isInteger(input.size) || input.size < 1 || input.size > capacity)
    return "Class size must be positive and within room capacity.";
  return null;
}
