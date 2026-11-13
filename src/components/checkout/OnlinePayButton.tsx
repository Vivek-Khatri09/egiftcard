"use client";

import { useState, useTransition } from "react";
import { initiatePayment } from "@/app/actions/checkout";

export default function OnlinePayButton({ orderId, label }: { orderId: string; label: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function pay() {
    setError("");
    start(async () => {
      const r = await initiatePayment(orderId);
      if (!r.ok) return setError(r.message);
      if (r.kind === "redirect") {
        window.location.assign(r.url);
        return;
      }
      // eSewa needs a form POST to its own server with the signed fields.
      const form = document.createElement("form");
      form.method = "POST";
      form.action = r.url;
      Object.entries(r.fields).forEach(([k, v]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = v;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    });
  }

  return (
    <div>
      <button type="button" className="btn-primary w-full sm:w-auto" onClick={pay} disabled={pending}>{pending ? "Redirecting…" : label}</button>
      {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
    </div>
  );
}
