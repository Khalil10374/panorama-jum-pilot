import { Minus, Plus, Printer, ScanBarcode, ShoppingCart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Button from "../components/Button";
import { api } from "../lib/api";

export default function POSPage() {
  const [module, setModule] = useState("Coffee");
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [barcode, setBarcode] = useState("");
  const [customer, setCustomer] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.records("products").then((data) => setProducts(data.items));
  }, [receipt]);

  const filteredProducts = products.filter((product) => product.module === module && product.is_active);
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.sale_price * item.quantity, 0), [cart]);

  function add(product) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) return current.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      return [...current, { ...product, quantity: 1 }];
    });
  }

  function decrease(product) {
    setCart((current) =>
      current
        .map((item) => (item.id === product.id ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0)
    );
  }

  function scan() {
    const found = products.find((product) => product.barcode === barcode || product.sku === barcode);
    if (found) add(found);
    setBarcode("");
  }

  async function checkout() {
    setError("");
    try {
      const data = await api.checkout({
        module,
        customer_name: customer,
        items: cart.map((item) => ({ product_id: item.id, quantity: item.quantity })),
        discount: 0,
        tax: 0,
        payment_method: "Cash"
      });
      setReceipt(data);
      setCart([]);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.25fr_0.85fr]">
      <section className="grid gap-5">
        <div className="surface rounded-lg p-5">
          <p className="text-sm font-bold uppercase tracking-wide text-lagoon">Point of sale</p>
          <h1 className="text-3xl font-black text-ink">Fast Billing</h1>
          <p className="text-slate-500">Coffee, juice, restaurant, and store sales with barcode support and automatic stock deduction.</p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          {["Coffee", "Store", "Restaurant"].map((item) => (
            <button
              key={item}
              onClick={() => setModule(item)}
              className={`rounded-lg border px-4 py-2 text-sm font-bold ${
                module === item ? "border-white/30 bg-white/16 text-white" : "border-white/25 bg-white/10 text-white/80 backdrop-blur-md"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="surface no-print flex gap-2 rounded-lg p-3">
          <div className="field-shell flex min-h-11 flex-1 items-center gap-2 rounded-lg px-3">
            <ScanBarcode size={20} className="text-slate-400" />
            <input
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && scan()}
              placeholder="Scan barcode or enter SKU"
              className="w-full bg-transparent outline-none"
            />
          </div>
          <Button onClick={scan}>Add</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => (
            <button key={product.id} onClick={() => add(product)} className="surface rounded-lg p-4 text-left transition hover:-translate-y-1 hover:border-lagoon hover:shadow-lift">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-ink">{product.name}</p>
                  <p className="text-sm text-slate-500">{product.sku} | {product.stock_qty} {product.unit}</p>
                </div>
                <span className="glass-chip rounded-lg px-3 py-1 text-sm font-bold text-lagoon">৳{product.sale_price}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <aside className="print-surface surface rounded-lg p-5">
        <div className="print-brand mb-5 flex items-center gap-3 border-b border-white/40 pb-4">
          <img src="/panorama-logo.png" alt="Panorama Jum logo" className="h-14 w-14 rounded-lg bg-white/85 object-contain p-1 shadow-sm" />
          <div>
            <h2 className="text-xl font-black text-ink">Panorama Jum</h2>
            <p className="text-sm font-semibold text-slate-600">Sales Receipt</p>
          </div>
          <ShoppingCart className="text-lagoon" />
        </div>
        <label className="no-print mb-4 grid gap-1 text-sm font-semibold text-slate-700">
          Customer
          <input value={customer} onChange={(event) => setCustomer(event.target.value)} placeholder="Walk-in customer" className="field-shell min-h-11 rounded-lg px-3 outline-none" />
        </label>
        {error ? <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm font-semibold text-coral">{error}</p> : null}
        <div className="divide-y divide-slate-100">
          {cart.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-bold text-ink">{item.name}</p>
                <p className="text-sm text-slate-500">৳{item.sale_price} x {item.quantity}</p>
              </div>
              <div className="no-print flex items-center gap-2">
                <Button variant="soft" className="h-8 w-8 px-0" onClick={() => decrease(item)}><Minus size={14} /></Button>
                <span className="w-7 text-center font-bold">{item.quantity}</span>
                <Button variant="soft" className="h-8 w-8 px-0" onClick={() => add(item)}><Plus size={14} /></Button>
              </div>
            </div>
          ))}
        </div>
        <div className="glass-chip mt-5 rounded-lg p-4">
          <div className="flex justify-between text-sm text-slate-600"><span>Subtotal</span><span>৳{subtotal.toLocaleString()}</span></div>
          <div className="mt-2 flex justify-between text-xl font-black text-ink"><span>Total</span><span>৳{subtotal.toLocaleString()}</span></div>
        </div>
        <div className="no-print mt-5 grid gap-2 sm:grid-cols-2">
          <Button disabled={!cart.length} onClick={checkout}>Checkout</Button>
          <Button variant="soft" onClick={() => window.print()}><Printer size={17} /> Print</Button>
        </div>
        {receipt ? (
          <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <p className="font-black">Invoice {receipt.sale.invoice_number}</p>
            <p>Total paid: ৳{receipt.sale.total_amount}</p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
