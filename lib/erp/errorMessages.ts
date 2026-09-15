import type { ErrorType } from "@/types";

export function buyerErrorMessage(error: ErrorType): string {
  switch (error.type) {
    case "timeout":
      return "The service took too long to respond. It will recheck automatically the next time the cart updates.";

    case "not found":
      return "Stock could not be confirmed.";

    case "restricted":
      return "You do not have permission to view this information.";

    case "invalid input":
      return "Something you entered isn't valid. Please check it and try again.";

    case "request failed":
      return "Something went wrong on our end. Please try again.";

    default: //we should have default as our fallback, for the cases are not in the list
      return "Something unexpected happened. Please try again.";
  }
}