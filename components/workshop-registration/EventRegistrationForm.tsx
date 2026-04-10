"use client";

import { useState } from "react";
import type {
  WorkshopEventPublic,
  RegistrationQuestion,
  WorkshopRegistrationResult,
} from "@/lib/types/workshop-registration";

type Props = {
  event: WorkshopEventPublic;
};

export function EventRegistrationForm({ event }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<WorkshopRegistrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isFull = event.spotsRemaining !== null && event.spotsRemaining <= 0;
  const isClosed = event.status === "closed" || event.status === "cancelled";
  const isPast = new Date(event.startAt) < new Date();

  function updateAnswer(questionId: string, label: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formAnswers = event.registrationQuestions
      .filter((q) => answers[q.id])
      .map((q) => ({ questionId: q.id, label: q.label, value: answers[q.id]! }));

    try {
      const res = await fetch(`/api/workshop-registration?slug=${event.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: phone || undefined,
          company: company || undefined,
          vatNumber: vatNumber || undefined,
          answers: formAnswers.length > 0 ? formAnswers : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
      } else {
        setResult(data as WorkshopRegistrationResult);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="reg-confirmation">
        <div className="reg-confirmation__icon">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" fill="var(--gold)" transform="rotate(45 16 0)" />
            <path d="M12 16l3 3 6-6" stroke="var(--gold-contrast)" strokeWidth="2" fill="none" />
          </svg>
        </div>
        <div className="reg-confirmation__title">Registration Confirmed</div>
        <div className="reg-confirmation__message">{result.message}</div>
        <div className="reg-confirmation__event">{result.eventTitle}</div>
      </div>
    );
  }

  if (isClosed || isPast) {
    return (
      <div className="reg-closed">
        <div className="reg-closed__label">
          {isPast ? "This event has ended" : "Registration is closed"}
        </div>
      </div>
    );
  }

  if (isFull) {
    return (
      <div className="reg-closed">
        <div className="reg-closed__label">This event is full</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="reg-form">
      <div className="reg-form__header">
        <div className="reg-form__label">Registration</div>
        {event.spotsRemaining !== null && (
          <div className="reg-form__spots">
            {event.spotsRemaining} spot{event.spotsRemaining !== 1 ? "s" : ""} remaining
          </div>
        )}
      </div>

      <div className="reg-form__fields">
        <FieldGroup label="Name" required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Your full name"
            className="reg-input"
          />
        </FieldGroup>

        <FieldGroup label="Email" required>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="reg-input"
          />
        </FieldGroup>

        <div className="reg-form__row">
          <FieldGroup label="Phone">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+32 ..."
              className="reg-input"
            />
          </FieldGroup>

          <FieldGroup label="Company">
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company name"
              className="reg-input"
            />
          </FieldGroup>
        </div>

        {event.priceAmountCents != null && event.priceAmountCents > 0 && (
          <FieldGroup label="VAT / BTW Number">
            <input
              type="text"
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              placeholder="BE0123456789"
              className="reg-input"
            />
          </FieldGroup>
        )}

        {event.registrationQuestions.map((q) => (
          <CustomQuestionField
            key={q.id}
            question={q}
            value={answers[q.id] ?? ""}
            onChange={(val) => updateAnswer(q.id, q.label, val)}
          />
        ))}
      </div>

      {error && <div className="reg-form__error">{error}</div>}

      <button
        type="submit"
        disabled={submitting || !name || !email}
        className="reg-form__submit"
      >
        {submitting ? "Registering..." : event.priceAmountCents
          ? `Register — ${formatPrice(event.priceAmountCents, event.priceCurrency)}`
          : "Register"}
      </button>
    </form>
  );
}

function FieldGroup({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="reg-field">
      <label className="reg-field__label">
        {label}
        {required && <span className="reg-field__required">*</span>}
      </label>
      {children}
    </div>
  );
}

function CustomQuestionField({
  question,
  value,
  onChange,
}: {
  question: RegistrationQuestion;
  value: string;
  onChange: (val: string) => void;
}) {
  if (question.type === "textarea") {
    return (
      <FieldGroup label={question.label} required={question.required}>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={question.required}
          placeholder={question.placeholder}
          className="reg-input reg-input--textarea"
          rows={3}
        />
      </FieldGroup>
    );
  }

  if (question.type === "select" && question.options) {
    return (
      <FieldGroup label={question.label} required={question.required}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={question.required}
          className="reg-input"
        >
          <option value="">Select...</option>
          {question.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </FieldGroup>
    );
  }

  if (question.type === "checkbox") {
    return (
      <FieldGroup label={question.label} required={question.required}>
        <label className="reg-checkbox">
          <input
            type="checkbox"
            checked={value === "true"}
            onChange={(e) => onChange(e.target.checked ? "true" : "")}
            required={question.required}
          />
          <span>{question.placeholder || question.label}</span>
        </label>
      </FieldGroup>
    );
  }

  return (
    <FieldGroup label={question.label} required={question.required}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={question.required}
        placeholder={question.placeholder}
        className="reg-input"
      />
    </FieldGroup>
  );
}

function formatPrice(cents: number, currency: string | null): string {
  const amount = cents / 100;
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency ?? "€";
  return `${symbol}${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
}
