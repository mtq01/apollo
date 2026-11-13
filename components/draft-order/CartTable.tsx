import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CartLineRow } from "@/components/draft-order/CartLineRow";
import type { CartTotals } from "@/components/draft-order/cartTotals";
import type { DraftLine } from "@/components/draft-order/DraftOrderContext";
import type { PricedRow } from "@/components/draft-order/pricedRow";

type CartTableProps = {
  lines: DraftLine[];
  pricedBySku: Record<string, PricedRow>;
  totals: CartTotals;
  setQuantity: (sku: string, quantity: number) => void;
  removeLine: (sku: string) => void;
};

// One footer row: a label on the left and an amount under "Line total".
function TotalRow({ label, amount }: { label: string; amount: string }) {
  return (
    <TableRow>
      <TableCell colSpan={6}>{label}</TableCell>
      <TableCell className="text-right">{amount}</TableCell>
      <TableCell />
    </TableRow>
  );
}

// The cart table: a header, one row per line, and the totals footer.
export function CartTable({
  lines,
  pricedBySku,
  totals,
  setQuantity,
  removeLine,
}: CartTableProps) {
  const { subTotal, discount, tax, total, internalCost, internalCostIsHidden } =
    totals;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead className="w-1/7">Qty</TableHead>
          <TableHead className="w-1/7">Price</TableHead>
          <TableHead className="w-1/7">Stock</TableHead>
          <TableHead className="w-1/7">Lead time</TableHead>
          <TableHead className="w-1/7">Warehouse</TableHead>
          <TableHead className="text-right">Line total</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>

      <TableBody>
        {lines.map((line) => (
          <CartLineRow
            key={line.sku}
            line={line}
            pricedRow={pricedBySku[line.sku]}
            setQuantity={setQuantity}
            removeLine={removeLine}
          />
        ))}
      </TableBody>

      <TableFooter>
        <TotalRow label="Sub Total" amount={`$${subTotal.toFixed(2)}`} />
        <TotalRow
          label="Discount"
          amount={discount > 0 ? `-$${discount.toFixed(2)}` : "$0.00"}
        />
        <TotalRow label="Tax" amount={`$${tax.toFixed(2)}`} />
        <TotalRow label="Total" amount={`$${total.toFixed(2)}`} />
        {/* Buyers and managers can never see cost, so hide the row for them. */}
        {!internalCostIsHidden && (
          <TotalRow label="Internal Cost" amount={`$${internalCost.toFixed(2)}`} />
        )}
      </TableFooter>
    </Table>
  );
}
