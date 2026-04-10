"use client";

import type { WorkshopEventPublic } from "@/lib/types/workshop-registration";
import { EventRegistrationForm } from "./EventRegistrationForm";

type Props = {
  event: WorkshopEventPublic;
};

export function PublicEventPage({ event }: Props) {
  const startDate = new Date(event.startAt);
  const endDate = event.endAt ? new Date(event.endAt) : null;

  return (
    <div className="event-page">
      <div className="event-page__inner">
        {/* Left column: cover + host + social proof */}
        <div className="event-page__left">
          {event.coverImageUrl && (
            <div className="event-page__cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={event.coverImageUrl} alt={event.title} />
            </div>
          )}

          {event.hostName && (
            <div className="event-page__host">
              <div className="event-page__host-label">HOSTED BY</div>
              <div className="event-page__host-row">
                {event.hostAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.hostAvatarUrl}
                    alt={event.hostName}
                    className="event-page__host-avatar"
                  />
                ) : (
                  <div className="event-page__host-avatar event-page__host-avatar--placeholder">
                    {event.hostName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="event-page__host-name">{event.hostName}</span>
              </div>
            </div>
          )}

          {event.registrationCount > 0 && (
            <div className="event-page__attendees">
              <div className="event-page__attendees-count">
                {event.registrationCount} registered
              </div>
            </div>
          )}
        </div>

        {/* Right column: details + registration form */}
        <div className="event-page__right">
          <h1 className="event-page__title">{event.title}</h1>

          <div className="event-page__meta">
            <MetaRow
              icon={<CalendarIcon />}
              primary={formatDate(startDate)}
              secondary={formatTime(startDate, endDate, event.timezone)}
            />

            {(event.locationName || event.isOnline) && (
              <MetaRow
                icon={<LocationIcon />}
                primary={event.isOnline ? "Online Event" : event.locationName!}
                secondary={event.locationAddress ?? undefined}
              />
            )}

            {event.priceAmountCents != null && event.priceAmountCents > 0 && (
              <MetaRow
                icon={<TicketIcon />}
                primary={formatPrice(event.priceAmountCents, event.priceCurrency)}
                secondary="excl. VAT"
              />
            )}
          </div>

          <div className="event-page__registration">
            <EventRegistrationForm event={event} />
          </div>

          {event.description && (
            <div className="event-page__section">
              <div className="event-page__section-label">ABOUT THIS EVENT</div>
              <div className="event-page__description">{event.description}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaRow({ icon, primary, secondary }: { icon: React.ReactNode; primary: string; secondary?: string }) {
  return (
    <div className="event-meta-row">
      <div className="event-meta-row__icon">{icon}</div>
      <div className="event-meta-row__text">
        <div className="event-meta-row__primary">{primary}</div>
        {secondary && <div className="event-meta-row__secondary">{secondary}</div>}
      </div>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      <rect x="2" y="3" width="12" height="11" rx="0" />
      <line x1="2" y1="7" x2="14" y2="7" />
      <line x1="5" y1="1" x2="5" y2="4" />
      <line x1="11" y1="1" x2="11" y2="4" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M8 1C5.24 1 3 3.24 3 6c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5z" />
      <rect x="6.5" y="4.5" width="3" height="3" transform="rotate(45 8 6)" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M1 5h14v6H1z" />
      <line x1="5" y1="5" x2="5" y2="11" strokeDasharray="1.5 1.5" />
    </svg>
  );
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(start: Date, end: Date | null, timezone: string): string {
  const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", timeZone: timezone };
  const startStr = start.toLocaleTimeString("en-GB", opts);
  if (!end) return `${startStr} (${timezone.split("/")[1]?.replace("_", " ") ?? timezone})`;
  const endStr = end.toLocaleTimeString("en-GB", opts);
  return `${startStr} – ${endStr} (${timezone.split("/")[1]?.replace("_", " ") ?? timezone})`;
}

function formatPrice(cents: number, currency: string | null): string {
  const amount = cents / 100;
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency ?? "€";
  return `${symbol}${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
}
