"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Customer, CustomerType } from "@/types/customer";

export type CustomerFormValues = {
  name: string;
  phone: string;
  email: string;
  address: string;
  customerType: CustomerType;
  notes: string;
};

const emptyValues: CustomerFormValues = {
  name: "",
  phone: "",
  email: "",
  address: "",
  customerType: "REGULAR",
  notes: "",
};

export function customerFormValues(customer?: Customer | null): CustomerFormValues {
  if (!customer) return { ...emptyValues };
  return {
    name: customer.name,
    phone: customer.phone || "",
    email: customer.email || "",
    address: customer.address || "",
    customerType: customer.customerType,
    notes: customer.notes || "",
  };
}

interface CustomerFormProps {
  initialValues: CustomerFormValues;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (values: CustomerFormValues) => Promise<void>;
}

export function CustomerForm({ initialValues, isSaving, onCancel, onSubmit }: CustomerFormProps) {
  const [values, setValues] = useState(initialValues);
  const [validationError, setValidationError] = useState("");

  function update<K extends keyof CustomerFormValues>(field: K, value: CustomerFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values.name.trim()) {
      setValidationError("Customer name is required.");
      return;
    }
    setValidationError("");
    await onSubmit({
      ...values,
      name: values.name.trim(),
      phone: values.phone.trim(),
      email: values.email.trim(),
      address: values.address.trim(),
      notes: values.notes.trim(),
    });
  }

  const fieldClass = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

  return (
    <form onSubmit={submit} className="space-y-4">
      {(validationError) && <p role="alert" className="text-sm text-rose-700">{validationError}</p>}
      <label className="block text-sm font-medium text-slate-700">
        Customer Name *
        <input autoFocus required maxLength={160} value={values.name} onChange={(event) => update("name", event.target.value)} className={fieldClass} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Phone
          <input maxLength={40} value={values.phone} onChange={(event) => update("phone", event.target.value)} className={fieldClass} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input type="email" maxLength={254} value={values.email} onChange={(event) => update("email", event.target.value)} className={fieldClass} />
        </label>
      </div>
      <label className="block text-sm font-medium text-slate-700">
        Address
        <textarea rows={2} maxLength={500} value={values.address} onChange={(event) => update("address", event.target.value)} className={fieldClass} />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Customer Type
        <select value={values.customerType} onChange={(event) => update("customerType", event.target.value as CustomerType)} className={fieldClass}>
          <option value="REGULAR">Regular</option>
          <option value="BUSINESS">Business</option>
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Notes
        <textarea rows={3} maxLength={2000} value={values.notes} onChange={(event) => update("notes", event.target.value)} className={fieldClass} />
      </label>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" isLoading={isSaving}>Save Customer</Button>
      </div>
    </form>
  );
}