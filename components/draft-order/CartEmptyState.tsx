import Loader from "@/components/Loader";

type CartEmptyStateProps = {
  // Set right after an order goes through, to confirm it.
  placedOrderId: string | null;
  // True while the buyer's first lookup is running.
  isLoading?: boolean;
};

// What the cart shows when it has no lines: a confirmation, a spinner, or a hint.
export function CartEmptyState({
  placedOrderId,
  isLoading,
}: CartEmptyStateProps) {
  if (placedOrderId) {
    return (
      <>
        <h2 className="mb-2 text-lg font-semibold">Your Cart</h2>
        <p className="text-sm text-green-700">Order {placedOrderId} placed.</p>
      </>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <Loader />
        <p className="text-lg">Getting quote...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center gap-4 py-16">
      <div className="py-16">
        <p className="text-3xl text-gray-600">Nothing added yet.</p>
        <p className="text-lg">
          Paste SKUs or a product list above, or reorder a past order.
        </p>
      </div>
    </div>
  );
}
