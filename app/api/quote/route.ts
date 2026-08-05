/* quote route ping test :*/
export async function GET() {
  return Response.json({
    sku: "SKU-441",
    name: "Example Object Data!!!!!!! weeeeeooooOOOooo",
    price: 14.20,
    stock: 12,
    leadTimeDays: 2,
    warehouse: "Warehouse B",
  });
}