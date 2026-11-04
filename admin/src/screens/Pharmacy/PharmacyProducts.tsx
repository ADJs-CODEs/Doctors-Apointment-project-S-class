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
import { PageHeader, Pill, Skeleton } from "../../components/panel";
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
const input = "field";
const label = "caption";
const iconBtn = "p-2 rounded-xl border border-line bg-white text-ink-3 hover:bg-canvas disabled:opacity-30";
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
    <div className="p-4 sm:p-6 lg:p-8 animate-reveal">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <PageHeader
            eyebrow="Your pharmacy"
            title="Products and stock"
            subtitle="What you sell. Patients near you see listed products that are in stock."
            action={
              editing === null && (
                <button onClick={() => setEditing("new")} className="btn btn-teal !rounded-xl">
                  <RiAddLine size={16} /> Add a product
                </button>
              )
            }
          />
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
            <RiSearchLine size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your products" className={`${input} !pl-10`} />
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
                className={`px-3.5 py-2.5 rounded-xl text-[14px] font-bold ${
                  filter === key ? "btn-ink" : "bg-white border border-line text-ink-2 hover:border-ink-3/40"
                }`}
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        {products === null ? (
          <Skeleton className="h-48" />
        ) : products.length === 0 ? (
          <div className="surface rounded-[24px] p-12 text-center">
            <div className="w-14 h-14 bg-brand-soft rounded-2xl flex items-center justify-center text-brand-ink mb-4 mx-auto">
              <RiCapsuleLine size={24} />
            </div>
            <p className="font-bold text-ink">No products yet</p>
            <p className="text-[14px] text-ink-3 mt-1">Add what you sell so patients near you can find it.</p>
          </div>
        ) : shown.length === 0 ? (
          <p className="text-[14px] text-ink-3 text-center py-10">Nothing matches.</p>
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

  const stockTone = p.stock === 0 ? "text-rose-600 bg-rose-50" : p.stock <= LOW_STOCK ? "text-orange-700 bg-orange-50" : "text-ink bg-canvas";

  return (
    <li className={`surface rounded-[18px] p-3 sm:p-4 flex flex-wrap items-center gap-3 ${p.listed ? "" : "opacity-60"}`}>
      <div className="w-14 h-14 rounded-xl bg-brand-soft overflow-hidden shrink-0 flex items-center justify-center">
        {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : <RiCapsuleLine size={22} className="text-brand-ink/50" />}
      </div>
      <div className="flex-1 min-w-48">
        <p className="text-[15px] font-bold text-ink flex flex-wrap items-center gap-2">
          {p.name}
          {p.requiresPrescription && (
            <Pill tone="violet">
              <RiFileList3Line size={12} /> Prescription
            </Pill>
          )}
          {!p.listed && <Pill>Hidden</Pill>}
        </p>
        <p className="text-[13px] text-ink-3">{[p.genericName, p.strength, p.packSize, category].filter(Boolean).join(" · ")}</p>
      </div>
      <p className="num text-[15px] text-ink w-20 text-right">{money(p.priceCents)}</p>
      <div className="flex items-center gap-1">
        <button onClick={() => change(-1)} disabled={busy || p.stock === 0} aria-label="One less in stock" className="p-1.5 rounded-lg border border-line bg-white text-ink-3 hover:bg-canvas disabled:opacity-30">
          <RiSubtractLine size={15} />
        </button>
        <span className={`num min-w-16 text-center text-[13px] px-2 py-1 rounded-lg ${stockTone}`}>
          {p.stock === 0 ? "Out" : `${p.stock} left`}
        </span>
        <button onClick={() => change(1)} disabled={busy} aria-label="One more in stock" className="p-1.5 rounded-lg border border-line bg-white text-ink-3 hover:bg-canvas disabled:opacity-30">
          <RiAddLine size={15} />
        </button>
      </div>
      <div className="flex gap-1">
        <button onClick={toggleListed} disabled={busy} title={p.listed ? "Hide from patients" : "Show to patients"} aria-label={p.listed ? "Hide from patients" : "Show to patients"} className={iconBtn}>
          {p.listed ? <RiEyeLine size={17} /> : <RiEyeOffLine size={17} />}
        </button>
        <button onClick={onEdit} title="Edit" aria-label={`Edit ${p.name}`} className={iconBtn}>
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
    <form onSubmit={submit} className="surface rounded-[22px] p-5 sm:p-6 mb-6">
      <p className="text-[16px] font-bold text-ink mb-4">{product ? `Edit ${product.name}` : "Add a product"}</p>
      <div className="flex flex-col sm:flex-row gap-5">
        <label className="shrink-0 w-full sm:w-36 h-36 rounded-2xl border-2 border-dashed border-line hover:border-brand flex flex-col items-center justify-center cursor-pointer overflow-hidden bg-canvas">
          {preview ? (
            <img src={preview} alt="" className="w-full h-full object-cover" />
          ) : (
            <>
              <RiImageAddLine size={26} className="text-ink-3" />
              <span className="text-[13px] font-bold text-ink-3 mt-1">Add a photo</span>
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
            <select value={form.category} onChange={set("category")} className={`${input} mt-1`}>
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
          <label className="sm:col-span-2 flex items-start gap-3 rounded-2xl border border-violet-100 bg-video-soft p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.requiresPrescription}
              onChange={(e) => setForm({ ...form, requiresPrescription: e.target.checked })}
              className="mt-1 accent-violet-600"
            />
            <span>
              <span className="block text-[15px] font-bold text-ink">Prescription-only medicine</span>
              <span className="block text-[13px] text-ink-2">
                Patients can only order it against a prescription from one of our doctors, and one of your pharmacists approves the order.
              </span>
            </span>
          </label>
        </div>
      </div>
      <div className="flex gap-2 mt-5">
        <button type="submit" disabled={saving} className="btn btn-teal !py-2.5 !px-5 !text-[14px] !rounded-xl disabled:opacity-50">
          {saving ? "Saving…" : product ? "Save changes" : "Add product"}
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-[14px] font-bold text-ink-3 hover:bg-canvas">
          Cancel
        </button>
      </div>
    </form>
  );
}
