// Shared display formatters. Kept out of components so they are easy to test.

// A server timestamp as a short time, like "2:45 PM".
export function formatStockCheckTime(isoTimestamp: string) {
  return new Date(isoTimestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

// A server timestamp as a full date and time, like "Sep 3, 2026, 2:45 PM".
export function formatSourceDate(isoTimestamp: string) {
  return new Date(isoTimestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
