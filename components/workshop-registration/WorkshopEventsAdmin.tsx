"use client";

import { useCallback, useEffect, useState } from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type {
  WorkshopEventAdmin,
  WorkshopRegistrationItem,
} from "@/lib/types/workshop-registration";

export function WorkshopEventsAdmin() {
  const [events, setEvents] = useState<WorkshopEventAdmin[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<WorkshopRegistrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchEvents = useCallback(async () => {
    const res = await fetch("/api/admin/workshop-events");
    if (res.ok) setEvents(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const fetchRegistrations = useCallback(async (eventId: string) => {
    const res = await fetch(`/api/admin/workshop-events/${eventId}/registrations`);
    if (res.ok) setRegistrations(await res.json());
  }, []);

  function selectEvent(eventId: string) {
    setSelectedEventId(eventId);
    fetchRegistrations(eventId);
  }

  async function handleStatusAction(registrationId: string, action: string) {
    if (!selectedEventId) return;
    await fetch(`/api/admin/workshop-events/${selectedEventId}/registrations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationId, action }),
    });
    fetchRegistrations(selectedEventId);
  }

  async function handlePublish(eventId: string) {
    await fetch(`/api/admin/workshop-events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });
    fetchEvents();
  }

  async function handleClose(eventId: string) {
    await fetch(`/api/admin/workshop-events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    fetchEvents();
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  if (loading) return <p style={{ color: "var(--dawn-30)", fontFamily: "var(--font-mono)", fontSize: 12 }}>Loading...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      <SectionHeader
        label="WORKSHOP EVENTS"
        action={
          <button
            className="sigil-btn-secondary"
            style={{ fontSize: 11 }}
            onClick={() => setShowCreate(!showCreate)}
          >
            {showCreate ? "Cancel" : "+ New Event"}
          </button>
        }
      />

      {showCreate && (
        <CreateEventForm
          onCreated={() => {
            setShowCreate(false);
            fetchEvents();
          }}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
        {events.length === 0 && (
          <p style={{ color: "var(--dawn-30)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
            No workshop events yet. Create one to get started.
          </p>
        )}
        {events.map((event) => (
          <div
            key={event.id}
            onClick={() => selectEvent(event.id)}
            style={{
              padding: "var(--space-md)",
              border: `1px solid ${selectedEventId === event.id ? "var(--gold)" : "var(--dawn-08)"}`,
              cursor: "pointer",
              transition: "border-color var(--duration-base) var(--ease-out)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--dawn)" }}>
                {event.title}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--dawn-40)", marginTop: 4 }}>
                {new Date(event.startAt).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" })}
                {" · "}{event.registrationCount} registered
                {" · "}{event.slug}
              </div>
            </div>
            <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
              <StatusBadge status={event.status} />
              {event.status === "draft" && (
                <button
                  className="sigil-btn-secondary"
                  style={{ fontSize: 10, padding: "2px 8px" }}
                  onClick={(e) => { e.stopPropagation(); handlePublish(event.id); }}
                >
                  Publish
                </button>
              )}
              {event.status === "published" && (
                <button
                  className="sigil-btn-secondary"
                  style={{ fontSize: 10, padding: "2px 8px" }}
                  onClick={(e) => { e.stopPropagation(); handleClose(event.id); }}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedEvent && (
        <div style={{ marginTop: "var(--space-md)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
            <SectionHeader label={`REGISTRATIONS — ${selectedEvent.title}`} />
            <a
              href={`/events/${selectedEvent.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gold)", textDecoration: "none" }}
            >
              View public page ↗
            </a>
          </div>

          {registrations.length === 0 ? (
            <p style={{ color: "var(--dawn-30)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
              No registrations yet.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr auto auto auto",
                gap: "var(--space-md)",
                padding: "var(--space-sm) var(--space-md)",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--dawn-40)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                borderBottom: "1px solid var(--dawn-08)",
              }}>
                <span>Name</span>
                <span>Email</span>
                <span>Status</span>
                <span>Payment</span>
                <span>Actions</span>
              </div>
              {registrations.map((reg) => (
                <RegistrationRow
                  key={reg.id}
                  registration={reg}
                  onAction={(action) => handleStatusAction(reg.id, action)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RegistrationRow({
  registration: reg,
  onAction,
}: {
  registration: WorkshopRegistrationItem;
  onAction: (action: string) => void;
}) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr auto auto auto",
      gap: "var(--space-md)",
      padding: "var(--space-sm) var(--space-md)",
      alignItems: "center",
      borderBottom: "1px solid var(--dawn-04)",
    }}>
      <div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--dawn)" }}>{reg.name}</div>
        {reg.company && (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--dawn-30)" }}>{reg.company}</div>
        )}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--dawn-50)" }}>{reg.email}</div>
      <StatusBadge status={reg.status} />
      <PaymentBadge status={reg.paymentStatus} />
      <div style={{ display: "flex", gap: 4 }}>
        {reg.status === "registered" && (
          <>
            <MiniButton label="Approve" onClick={() => onAction("approve")} />
            <MiniButton label="Decline" onClick={() => onAction("decline")} variant="muted" />
          </>
        )}
        {reg.paymentStatus === "pending_invoice" && (
          <MiniButton label="Mark Invoiced" onClick={() => onAction("mark_invoiced")} />
        )}
        {reg.paymentStatus === "invoiced" && (
          <MiniButton label="Mark Paid" onClick={() => onAction("mark_paid")} />
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "var(--dawn-30)",
    published: "var(--gold)",
    closed: "var(--dawn-40)",
    cancelled: "var(--alert)",
    registered: "var(--dawn-50)",
    approved: "var(--status-success)",
    declined: "var(--alert)",
  };
  return (
    <span style={{
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      color: colors[status] ?? "var(--dawn-30)",
      letterSpacing: "0.04em",
      textTransform: "uppercase",
    }}>
      {status}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    not_required: "var(--dawn-15)",
    pending_invoice: "var(--dawn-40)",
    invoiced: "var(--gold-dim)",
    paid: "var(--status-success)",
    refunded: "var(--alert)",
  };
  const label = status.replace(/_/g, " ");
  return (
    <span style={{
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      color: colors[status] ?? "var(--dawn-30)",
      letterSpacing: "0.04em",
      textTransform: "uppercase",
    }}>
      {label}
    </span>
  );
}

function MiniButton({ label, onClick, variant }: { label: string; onClick: () => void; variant?: "muted" }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        padding: "2px 6px",
        border: `1px solid ${variant === "muted" ? "var(--dawn-08)" : "var(--gold-30)"}`,
        background: "transparent",
        color: variant === "muted" ? "var(--dawn-40)" : "var(--gold)",
        cursor: "pointer",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      {label}
    </button>
  );
}

function CreateEventForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [startAt, setStartAt] = useState("");
  const [locationName, setLocationName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [description, setDescription] = useState("");
  const [hostName, setHostName] = useState("Thoughtform");
  const [priceAmountCents, setPriceAmountCents] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function autoSlug(t: string) {
    return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const body: Record<string, unknown> = {
      title,
      slug: slug || autoSlug(title),
      startAt: new Date(startAt).toISOString(),
      hostName: hostName || undefined,
      locationName: locationName || undefined,
      description: description || undefined,
    };
    if (capacity) body.capacity = Number(capacity);
    if (priceAmountCents) {
      body.priceAmountCents = Math.round(Number(priceAmountCents) * 100);
      body.priceCurrency = "EUR";
    }

    const res = await fetch("/api/admin/workshop-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      onCreated();
    } else {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Failed to create event");
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} style={{
      border: "1px solid var(--dawn-08)",
      padding: "var(--space-lg)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-md)",
    }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--dawn-40)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
        Create Workshop Event
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
        <AdminField label="Title" required>
          <input
            value={title}
            onChange={(e) => { setTitle(e.target.value); if (!slug) setSlug(autoSlug(e.target.value)); }}
            required
            placeholder="Claude Home Sessions IV"
            className="reg-input"
          />
        </AdminField>
        <AdminField label="Slug">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={autoSlug(title) || "auto-from-title"}
            className="reg-input"
          />
        </AdminField>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-md)" }}>
        <AdminField label="Start Date/Time" required>
          <input
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            required
            className="reg-input"
          />
        </AdminField>
        <AdminField label="Location">
          <input
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="Thoughtform HQ, Antwerp"
            className="reg-input"
          />
        </AdminField>
        <AdminField label="Capacity">
          <input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="8"
            className="reg-input"
          />
        </AdminField>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
        <AdminField label="Host Name">
          <input
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            className="reg-input"
          />
        </AdminField>
        <AdminField label="Price (EUR, 0 = free)">
          <input
            type="number"
            step="0.01"
            value={priceAmountCents}
            onChange={(e) => setPriceAmountCents(e.target.value)}
            placeholder="0"
            className="reg-input"
          />
        </AdminField>
      </div>

      <AdminField label="Description">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Workshop description..."
          className="reg-input reg-input--textarea"
          rows={3}
        />
      </AdminField>

      {error && <div style={{ color: "var(--alert)", fontFamily: "var(--font-mono)", fontSize: 11 }}>{error}</div>}

      <button
        type="submit"
        disabled={submitting || !title || !startAt}
        className="sigil-btn-secondary"
        style={{ alignSelf: "flex-start" }}
      >
        {submitting ? "Creating..." : "Create Event (Draft)"}
      </button>
    </form>
  );
}

function AdminField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--dawn-40)", letterSpacing: "0.04em" }}>
        {label}{required && <span style={{ color: "var(--gold)" }}>*</span>}
      </label>
      {children}
    </div>
  );
}
