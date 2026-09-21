import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangleIcon, Loader2 } from "lucide-react";

type CartBannersProps = {
  // True while the buyer's last submit is still being looked up.
  isLoading?: boolean;
  failedCount: number;
  hasStaleStock: boolean;
};

/* One banner at most, in this order: lookup in progress, stock failure,
   then the stale-data reminder. The text stays general because each row and
   the activity log already show the real reason. */
export function CartBanners({
  isLoading,
  failedCount,
  hasStaleStock,
}: CartBannersProps) {
  if (isLoading) {
    return (
      <Alert className="my-3 border-purple-300 bg-purple-100 text-black">
        <Loader2 className="animate-spin" />
        <AlertDescription>Updating cart...</AlertDescription>
      </Alert>
    );
  }

  if (failedCount > 0) {
    return (
      <Alert variant="destructive" className="my-3 border-red-600 bg-red-50">
        <AlertTriangleIcon />
        <AlertDescription>
          {failedCount} {failedCount === 1 ? "item" : "items"} could not be
          checked. See below for details.
        </AlertDescription>
      </Alert>
    );
  }

  if (hasStaleStock) {
    return (
      <Alert className="my-3 border-amber-300 bg-orange-100 text-black">
        <AlertTriangleIcon />
        <AlertDescription>
          Stock data may be a few hours old, please <strong>call</strong> to
          confirm before ordering. 604-236-0000
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
