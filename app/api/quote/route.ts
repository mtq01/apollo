/* quote route ping test :*/
export async function GET() {
  return Response.json({
    sku: "SKU-4124",
    color: "Black",
    brand: "Nike",
    name: "Hat",
    price: 14.2,
    stock: 12,
    leadTimeDays: 2,
    warehouse: "Vancouver",
  });
}
