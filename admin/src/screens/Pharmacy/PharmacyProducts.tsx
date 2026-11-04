"use client";

import {
  RiAddLine,
  RiCapsuleLine,
  RiEditLine,
  RiEyeLine,
  RiEyeOffLine,
  RiFileList3Line,
  RiImageAddLine,
  RiSearchLine,
  RiSubtractLine,
} from "@remixicon/react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { API_PATHS } from "../../utils/apiPath";
import axiosInstance from "../../utils/axiosInstance";

export type Product = {
  _id: string;
  name: string;
  genericName?: string;
  strength?: string;
  packSize?: string;
  category: string;
  description?: string;
  priceCents: number;
  stock: number;
  requiresPrescription: boolean;
  image?: string;
  listed: boolean;
};
type Category = { id: string; label: string };

const LOW_STOCK = 5;
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const input = "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400";
const label = "text-[11px] font-bold uppercase tracking-wider text-slate-400";
// FormData must go as multipart (the shared client defaults to JSON, which would drop the photo)
const multipart = { headers: { "Content-Type": "multipart/form-data" } };

/** The pharmacy's catalogue: what it sells, prices, stock, and what patients can see. */
export default function PharmacyProducts() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out" | "hidden">("all");
  const [editing, setEditing] = useState<Product | "new" | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.PHARMACY.PRODUCTS);
      if (data.success) {
        setProducts(data.products);
        setCategories(data.categories);
      } else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Couldn't load products");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const replace = (p: Product) => setProducts((list) => (list ? list.map((x) => (x._id === p._id ? p : x)) : list));

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (products ?? []).filter(
      (p) =>
        (!term || [p.name, p.genericName, p.strength].some((v) => v?.toLowerCase().includes(term))) &&
        (filter === "all" ||
          (filter === "low" && p.stock > 0 && p.stock <= LOW_STOCK) ||
          (filter === "out" && p.stock === 0) ||
          (filter === "hidden" && !p.listed)),
    );
  }, [products, q, filter]);

  const counts = useMemo(
    () => ({
      low: (products ?? []).filter((p) => p.stock > 0 && p.stock <= LOW_STOCK).length,
      out: (products ?? []).filter((p) => p.stock === 0).length,
      hidden: (products ?? []).filter((p) => !p.listed).length,
    }),
    [products],
  );

  return (
    <div className="p-4 sm:p-6 md:p-10 bg-slate-50/50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-slate-900 rounded-xl text-teal-400">
                <RiCapsuleLine size={20} />
              </div>
              <h1 className="text-xl sm:text-3xl font-black text-slate-900">
                Products and stock
              </h1>
            </div>
            <p className="text-slate-500 text-sm ml-12">What you sell. Patients near you see listed products that are in stock.</p>
          </div>
          {editing === null && (
            <button
              onClick={() => setEditing("new")}
              className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700"
            >
              <RiAddLine size={16} /> Add a product
            </button>
          )}
        </div>

        {editing !== null && (
          <ProductForm
            product={editing === "new" ? null : editing}
            categories={categories}
            onClose={() => setEditing(null)}
            onSaved={(p, isNew) => {
              if (isNew) setProducts((list) => [p, ...(list ?? [])]);
              else replace(p);
              setEditing(null);
            }}
          />
        )}

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <label className="relative flex-1">
            <RiSearchLine size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your products" className={`${input} pl-9 bg-white`} />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["all", "All"],
                ["low", `Low stock${counts.low ? ` (${counts.low})` : ""}`],
                ["out", `Out of stock${counts.out ? ` (${counts.out})` : ""}`],
                ["hidden", `Hidden${counts.hidden ? ` (${counts.hidden})` : ""}`],
              ] as const
            ).map(([key, text]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-2 rounded-lg text-[11px] font-bold ${
                  filter === key ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        {products === null ? (
          <div className="h-48 rounded-[28px] bg-slate-200/60 animate-pulse" />
        ) : products.length === 0 ? (
          <div className="bg-white rounded-[28px] border border-slate-100 p-12 text-center">
            <RiCapsuleLine size={30} className="mx-auto text-slate-300" />
            <p className="font-black text-slate-900 mt-2">No products yet</p>
            <p className="text-sm text-slate-400 mt-1">Add what you sell so patients near you can find it.</p>
          </div>
        ) : shown.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">Nothing matches.</p>
        ) : (
          <ul className="space-y-2">
            {shown.map((p) => (
              <ProductRow key={p._id} p={p} category={categories.find((c) => c.id === p.category)?.label} onEdit={() => setEditing(p)} onChanged={replace} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ProductRow({ p, category, onEdit, onChanged }: { p: Product; category?: string; onEdit: () => void; onChanged: (p: Product) => void }) {
  const [busy, setBusy] = useState(false);

  const call = async (request: Promise<{ data: any }>) => {
    setBusy(true);
    try {
      const { data } = await request;
      if (data.success) onChanged(data.product);
      else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };
  const change = (n: number) => call(axiosInstance.post(API_PATHS.PHARMACY.PRODUCT_STOCK(p._id), { change: n }, { silent: true } as any));
  const toggleListed = () => {
    const fd = new FormData();
    fd.append("listed", String(!p.listed));
    call(axiosInstance.patch(API_PATHS.PHARMACY.PRODUCT(p._id), fd, multipart));
  };

  const stockTone = p.stock === 0 ? "text-red-600 bg-red-50" : p.stock <= LOW_STOCK ? "text-orange-700 bg-orange-50" : "text-slate-700 bg-slate-50";

  return (
    <li className={`bg-white rounded-[20px] border border-slate-200 p-3 sm:p-4 flex flex-wrap items-center gap-3 ${p.listed ? "" : "opacity-60"}`}>
      <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
        {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : <RiCapsuleLine size={22} className="text-slate-300" />}
      </div>
      <div className="flex-1 min-w-48">
        <p className="font-black text-slate-900 flex flex-wrap items-center gap-2">
          {p.name}
          {p.requiresPrescription && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">
              <RiFileList3Line size={11} /> Prescription
            </span>
          )}
          {!p.listed && <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Hidden</span>}
        </p>
        <p className="text-[12px] text-slate-500">{[p.genericName, p.strength, p.packSize, category].filter(Boolean).join(" · ")}</p>
      </div>
      <p className="font-black text-slate-900 tabular-nums w-20 text-right">{money(p.priceCents)}</p>
      <div className="flex items-center gap-1">
        <button onClick={() => change(-1)} disabled={busy || p.stock === 0} aria-label="One less in stock" className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30">
          <RiSubtractLine size={15} />
        </button>
        <span className={`min-w-16 text-center text-sm font-black tabular-nums px-2 py-1 rounded-lg ${stockTone}`}>
          {p.stock === 0 ? "Out" : `${p.stock} left`}
        </span>
        <button onClick={() => change(1)} disabled={busy} aria-label="One more in stock" className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30">
          <RiAddLine size={15} />
        </button>
      </div>
      <div className="flex gap-1">
        <button onClick={toggleListed} disabled={busy} title={p.listed ? "Hide from patients" : "Show to patients"} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">
          {p.listed ? <RiEyeLine size={17} /> : <RiEyeOffLine size={17} />}
        </button>
        <button onClick={onEdit} title="Edit" className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">
          <RiEditLine size={17} />
        </button>
      </div>
    </li>
  );
}

function ProductForm({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: (p: Product, isNew: boolean) => void;
}) {
  const [form, setForm] = useState({
    name: product?.name ?? "",
    genericName: product?.genericName ?? "",
    strength: product?.strength ?? "",
    packSize: product?.packSize ?? "",
    category: product?.category ?? "other",
    description: product?.description ?? "",
    price: product ? (product.priceCents / 100).toFixed(2) : "",
    stock: product ? String(product.stock) : "",
    requiresPrescription: product?.requiresPrescription ?? false,
  });
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | undefined>(product?.image);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    if (!image) return;
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("genericName", form.genericName);
    fd.append("strength", form.strength);
    fd.append("packSize", form.packSize);
    fd.append("category", form.category);
    fd.append("description", form.description);
    fd.append("priceCents", String(Math.round(Number(form.price) * 100)));
    fd.append("stock", form.stock || "0");
    fd.append("requiresPrescription", String(form.requiresPrescription));
    if (image) fd.append("image", image);
    setSaving(true);
    try {
      const { data } = product
        ? await axiosInstance.patch(API_PATHS.PHARMACY.PRODUCT(product._id), fd, multipart)
        : await axiosInstance.post(API_PATHS.PHARMACY.PRODUCTS, fd, multipart);
      if (data.success) {
        toast.success(data.message);
        onSaved(data.product, !product);
      } else toast.error(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-[28px] border border-slate-200 p-5 sm:p-6 mb-6">
      <p className="font-black text-slate-900 mb-4">{product ? `Edit ${product.name}` : "Add a product"}</p>
      <div className="flex flex-col sm:flex-row gap-5">
        <label className="shrink-0 w-full sm:w-36 h-36 rounded-2xl border-2 border-dashed border-slate-200 hover:border-teal-300 flex flex-col items-center justify-center cursor-pointer overflow-hidden bg-slate-50">
          {preview ? (
            <img src={preview} alt="" className="w-full h-full object-cover" />
          ) : (
            <>
              <RiImageAddLine size={26} className="text-slate-300" />
              <span className="text-[11px] font-bold text-slate-400 mt-1">Add a photo</span>
            </>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && file.size > 3 * 1024 * 1024) return toast.error("Use a photo under 3 MB");
              if (file) setImage(file);
            }}
          />
        </label>
        <div className="flex-1 grid sm:grid-cols-2 gap-3">
          <label className="block sm:col-span-2">
            <span className={label}>Product name</span>
            <input required value={form.name} onChange={set("name")} placeholder="e.g. Panadol Extra" className={`${input} mt-1`} />
          </label>
          <label className="block">
            <span className={label}>Active ingredient</span>
            <input value={form.genericName} onChange={set("genericName")} placeholder="e.g. Paracetamol" className={`${input} mt-1`} />
          </label>
          <label className="block">
            <span className={label}>Strength / form</span>
            <input value={form.strength} onChange={set("strength")} placeholder="e.g. 500 mg tablets" className={`${input} mt-1`} />
          </label>
          <label className="block">
            <span className={label}>Pack size</span>
            <input value={form.packSize} onChange={set("packSize")} placeholder="e.g. Pack of 24" className={`${input} mt-1`} />
          </label>
          <label className="block">
            <span className={label}>Shop section</span>
            <select value={form.category} onChange={set("category")} className={`${input} mt-1 bg-white`}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={label}>Price ($)</span>
            <input required type="number" min="0.01" step="0.01" value={form.price} onChange={set("price")} className={`${input} mt-1`} />
          </label>
          <label className="block">
            <span className={label}>In stock</span>
            <input required type="number" min="0" step="1" value={form.stock} onChange={set("stock")} className={`${input} mt-1`} />
          </label>
          <label className="block sm:col-span-2">
            <span className={label}>Description (optional)</span>
            <textarea value={form.description} onChange={set("description")} rows={2} className={`${input} mt-1 resize-none`} />
          </label>
          <label className="sm:col-span-2 flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/50 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.requiresPrescription}
              onChange={(e) => setForm({ ...form, requiresPrescription: e.target.checked })}
              className="mt-1 accent-violet-600"
            />
            <span>
              <span className="block text-sm font-black text-slate-900">Prescription-only medicine</span>
              <span className="block text-[12px] text-slate-500">
                Patients can only order it against a prescription from one of our doctors, and one of your pharmacists approves the order.
              </span>
            </span>
          </label>
        </div>
      </div>
      <div className="flex gap-2 mt-5">
        <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-50">
          {saving ? "Saving…" : product ? "Save changes" : "Add product"}
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100">
          Cancel
        </button>
      </div>
    </form>
  );
}
