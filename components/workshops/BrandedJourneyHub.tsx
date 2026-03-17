"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  parseBrandedSettings,
  defaultBrandedSettings,
  type BrandedJourneySettings,
} from "@/lib/workshops/types";

type BrandedJourneyHubProps = {
  journeyId: string;
  journeyName: string;
  journeyDescription: string | null;
  rawSettings: unknown;
};

export function BrandedJourneyHub({
  journeyId,
  journeyName,
  journeyDescription,
  rawSettings,
}: BrandedJourneyHubProps) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<BrandedJourneySettings>(
    () => parseBrandedSettings(rawSettings) ?? defaultBrandedSettings(),
  );

  const updateField = useCallback(
    <K extends keyof BrandedJourneySettings>(key: K, value: BrandedJourneySettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const updateBranding = useCallback(
    (patch: Partial<BrandedJourneySettings["branding"]>) => {
      setSettings((prev) => ({
        ...prev,
        branding: { ...prev.branding, ...patch },
      }));
    },
    [],
  );

  const updateHub = useCallback(
    (patch: Partial<BrandedJourneySettings["hub"]>) => {
      setSettings((prev) => ({
        ...prev,
        hub: { ...prev.hub, ...patch },
      }));
    },
    [],
  );

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/admin/workspace-projects/${journeyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
    } finally {
      setSaving(false);
    }
  }

  function launch() {
    router.push(`/journeys/${journeyId}/workshop`);
  }

  const branding = settings.branding;
  const hub = settings.hub;

  return (
    <section
      className="w-full animate-fade-in-up"
      style={{
        paddingTop: "var(--space-2xl)",
        maxWidth: "var(--layout-content-md, 1200px)",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "var(--space-xl)" }}>
        <h1
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "18px",
            fontWeight: 500,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--dawn)",
          }}
        >
          {journeyName}
        </h1>
        {journeyDescription && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "13px",
              color: "var(--dawn-50)",
              marginTop: 6,
            }}
          >
            {journeyDescription}
          </p>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 12,
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--gold)",
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              background: "var(--gold)",
              transform: "rotate(45deg)",
              flexShrink: 0,
            }}
          />
          branded workshop
        </div>
      </div>

      {/* Launch button */}
      <div style={{ marginBottom: "var(--space-xl)" }}>
        <button
          type="button"
          onClick={launch}
          style={{
            padding: "12px 28px",
            background: "transparent",
            border: "1px solid var(--gold)",
            color: "var(--gold)",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "background 120ms, color 120ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--gold)";
            e.currentTarget.style.color = "var(--void)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--gold)";
          }}
        >
          Open Workshop
        </button>
      </div>

      {/* Settings (admin only) */}
      {isAdmin && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-xl)",
          }}
        >
          {/* Branding section */}
          <div>
            <SectionHeader label="BRANDING" />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "var(--space-md)",
                paddingTop: "var(--space-sm)",
              }}
            >
              <SettingsField
                label="Client name"
                value={branding.clientName}
                onChange={(v) => updateBranding({ clientName: v })}
                placeholder="e.g. Poppins"
              />
              <SettingsField
                label="Accent color"
                value={branding.accentColor ?? ""}
                onChange={(v) => updateBranding({ accentColor: v || undefined })}
                placeholder="#FE6744"
              />
              <SettingsField
                label="Secondary color"
                value={branding.secondaryColor ?? ""}
                onChange={(v) => updateBranding({ secondaryColor: v || undefined })}
                placeholder="#C4DD05"
              />
              <SettingsField
                label="Background"
                value={branding.backgroundBase ?? ""}
                onChange={(v) => updateBranding({ backgroundBase: v || undefined })}
                placeholder="#FCF3EC"
              />
              <SettingsField
                label="Font family"
                value={branding.fontFamily ?? ""}
                onChange={(v) => updateBranding({ fontFamily: v || undefined })}
                placeholder="Poppins, sans-serif"
              />
              <SettingsField
                label="Mono font"
                value={branding.monoFontFamily ?? ""}
                onChange={(v) => updateBranding({ monoFontFamily: v || undefined })}
                placeholder="JetBrains Mono, monospace"
              />
              <SettingsField
                label="Logo URL"
                value={branding.logoUrl ?? ""}
                onChange={(v) => updateBranding({ logoUrl: v || undefined })}
                placeholder="https://..."
              />
              <SettingsField
                label="Hero image URL"
                value={branding.heroImageUrl ?? ""}
                onChange={(v) => updateBranding({ heroImageUrl: v || undefined })}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Hub section */}
          <div>
            <SectionHeader label="WORKSHOP DETAILS" />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "var(--space-md)",
                paddingTop: "var(--space-sm)",
              }}
            >
              <SettingsField
                label="Hero tagline"
                value={hub.heroTagline ?? ""}
                onChange={(v) => updateHub({ heroTagline: v || undefined })}
                placeholder="A hands-on workshop for the team"
              />
              <SettingsField
                label="Subtitle"
                value={hub.subtitle ?? ""}
                onChange={(v) => updateHub({ subtitle: v || undefined })}
                placeholder="Navigate, Encode, Accelerate"
              />
              <SettingsField
                label="Facilitator"
                value={hub.facilitatorName ?? ""}
                onChange={(v) => updateHub({ facilitatorName: v || undefined })}
                placeholder="Thoughtform"
              />
              <SettingsField
                label="Workshop date"
                value={hub.workshopDate ?? ""}
                onChange={(v) => updateHub({ workshopDate: v || undefined })}
                placeholder="March 18, 2026"
              />
            </div>
          </div>

          {/* Preview of current config */}
          {settings.branding.clientName && (
            <div>
              <SectionHeader label="PREVIEW" />
              <div
                style={{
                  padding: "var(--space-md)",
                  border: "1px solid var(--dawn-08)",
                  marginTop: "var(--space-sm)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--dawn-50)",
                  }}
                >
                  {settings.branding.clientName} x Thoughtform
                </div>
                {hub.heroTagline && (
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "14px",
                      color: "var(--dawn)",
                      marginTop: 8,
                    }}
                  >
                    {hub.heroTagline}
                  </div>
                )}
                {hub.workshopDate && (
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "9px",
                      color: "var(--dawn-30)",
                      marginTop: 4,
                    }}
                  >
                    {hub.workshopDate}
                  </div>
                )}
                {branding.accentColor && (
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        background: branding.accentColor,
                        border: "1px solid var(--dawn-08)",
                      }}
                    />
                    {branding.secondaryColor && (
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          background: branding.secondaryColor,
                          border: "1px solid var(--dawn-08)",
                        }}
                      />
                    )}
                    {branding.backgroundBase && (
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          background: branding.backgroundBase,
                          border: "1px solid var(--dawn-08)",
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Save button */}
          <div>
            <button
              type="button"
              className="sigil-btn-primary"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? "saving..." : "save settings"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function SettingsField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "9px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--dawn-40)",
        }}
      >
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="admin-input"
        style={{ width: "100%" }}
      />
    </div>
  );
}
