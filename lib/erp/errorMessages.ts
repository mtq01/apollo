import type { ErrorType } from "@/types";

export function buyerErrorMessage(error: ErrorType): string {
  switch (error.type) {
    case "timeout":
      return "The service took too long to respond. Please try again.";

    case "not found":
      return "The requested product could not be found.";

    case "restricted":
      return "You do not have permission to view this information.";

    case "invalid input":
      return "The information provided is not valid. Please check your request and try again.";

    case "request failed":
      return "Something went wrong on our end. Please try again.";

    default: //we should have default as our fallback, for the cases are not in the list
      return "An unexpected error occurred. Please try again.";
  }
}