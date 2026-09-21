import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { CircleX } from "lucide-react";
import type { DraftLine } from "@/components/draft-order/DraftOrderContext";
import {
  stockCheckedAt,
  type PricedRow,
} from "@/components/draft-order/pricedRow";
import { buyerErrorMessage } from "@/lib/erp/errorMessages";
import { formatSourceDate, formatStockCheckTime } from "@/lib/format";

/* A small pulsing bar for a cell whose line has not been priced yet.
   It is not the same as "—", which means there is nothing to show. */
function LoadingCell() {
  return (
    <span className="inline-block h-3 w-10 animate-pulse rounded bg-gray-200" />
  );
}

/* Shows the value when there is one. Otherwise shows the loading bar while
   the line waits for its price, or "—" if the line was checked and has nothing. */
function orPlaceholder(value: ReactNode, isRowLoading: boolean) {
  if (value != null && value !== false) return value;
  return isRowLoading ? <LoadingCell /> : "—";
}

type CartLineRowProps = {
  line: DraftLine;
  // Undefined until the server has priced this line.
  pricedRow: PricedRow | undefined;
  setQuantity: (sku: string, quantity: number) => void;
  removeLine: (sku: string) => void;
};

// One cart row: name, quantity box, price, stock, lead time, warehouse, total.
export function CartLineRow({
  line,
  pricedRow,
  setQuantity,
  removeLine,
}: CartLineRowProps) {
  // No priced row means the line is waiting on a price request, not blank for good.
  const isRowLoading = !pricedRow;
  const unitPrice = pricedRow?.price;
  const stockLevel = pricedRow?.stock;
  const checkedAt = stockCheckedAt(pricedRow);

  return (
    <TableRow>
      {/* Name, sku, and a green tag if it came from a PO, order, or suggestion. */}
      <TableCell>
        <div>{line.productName}</div>
        <div className="font-mono text-xs text-gray-500">{line.sku}</div>
        {line.sourceRef ? (
          <>
            <div className="text-xs font-medium text-green-700">
              from {line.sourceRef}
            </div>

            {line.sourceDate && (
              <div className="text-xs text-gray-500">
                {formatSourceDate(line.sourceDate)}
              </div>
            )}
          </>
        ) : line.source === "suggestion" ? (
          <div className="text-xs font-medium text-green-700">suggested</div>
        ) : null}
      </TableCell>

      {/* Editable quantity, never below 1. */}
      <TableCell>
        <Input
          type="number"
          min={1}
          value={line.quantity}
          onChange={(event) =>
            setQuantity(line.sku, Number(event.target.value) || 1)
          }
          className="w-20"
          aria-label={`Quantity for ${line.productName}`}
        />
      </TableCell>

      {/* Price per unit. */}
      <TableCell>
        {orPlaceholder(
          typeof unitPrice === "number" && `$${unitPrice.toFixed(2)}`,
          isRowLoading,
        )}
      </TableCell>

      {/* Stock count and check time, or an error. whitespace-normal lets a
          long error wrap here instead of stretching the whole table. */}
      <TableCell className="whitespace-normal">
        {typeof stockLevel === "number" ? (
          <>
            {stockLevel}
            {checkedAt && (
              <div className="text-xs text-gray-600">
                as of {formatStockCheckTime(checkedAt)}
              </div>
            )}
          </>
        ) : stockLevel === "hidden" ? (
          "—"
        ) : stockLevel === "error" ? (
          <span className="text-red-900">
            {pricedRow?.stockError
              ? buyerErrorMessage(pricedRow.stockError)
              : "Stock check failed."}
          </span>
        ) : stockLevel ? (
          <span className="text-red-900">{buyerErrorMessage(stockLevel)}</span>
        ) : (
          orPlaceholder(null, isRowLoading)
        )}
      </TableCell>

      {/* Lead time in days. */}
      <TableCell>
        {orPlaceholder(
          pricedRow?.leadTime != null &&
            `${pricedRow.leadTime} ${pricedRow.leadTime === 1 ? "day" : "days"}`,
          isRowLoading,
        )}
      </TableCell>

      {/* Warehouse, or "Restricted". */}
      <TableCell>
        {pricedRow?.warehouse === "hidden"
          ? "Restricted"
          : orPlaceholder(pricedRow?.warehouse || null, isRowLoading)}
      </TableCell>

      {/* Price per unit × quantity. */}
      <TableCell className="text-right">
        {orPlaceholder(
          typeof unitPrice === "number" &&
            `$${(unitPrice * line.quantity).toFixed(2)}`,
          isRowLoading,
        )}
      </TableCell>

      {/* Remove button. */}
      <TableCell>
        <button
          onClick={() => removeLine(line.sku)}
          aria-label={`Remove ${line.productName}`}
          className="px-1 align-middle text-gray-500 hover:text-red-600"
        >
          <CircleX size={16} className="cursor-pointer" />
        </button>
      </TableCell>
    </TableRow>
  );
}
