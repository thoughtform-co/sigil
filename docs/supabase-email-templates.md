# Supabase Email Templates

Set these in the Supabase Dashboard under **Authentication > Email Templates**.

Each template below is the full HTML body to paste into the corresponding template field.

---

## 1. Confirm Signup

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#050403;padding:48px 24px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background-color:#0a0908;border:1px solid rgba(236,227,214,0.08);">
      <!-- Header -->
      <tr><td style="padding:24px 32px 16px;border-bottom:1px solid rgba(236,227,214,0.08);">
        <span style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#caa554;">SIGIL</span>
        <span style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(236,227,214,0.3);padding-left:12px;">by Thoughtform</span>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:32px;">
        <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#caa554;margin:0 0 24px;">Confirm your coordinates</p>
        <p style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;line-height:1.6;color:rgba(236,227,214,0.7);margin:0 0 24px;">Confirm your email to complete registration and begin navigating Sigil, Thoughtform's visual AI platform.</p>
        <table cellpadding="0" cellspacing="0"><tr><td style="background-color:#caa554;padding:12px 24px;">
          <a href="{{ .ConfirmationURL }}" style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#050403;text-decoration:none;display:inline-block;">Confirm email</a>
        </td></tr></table>
        <p style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;line-height:1.6;color:rgba(236,227,214,0.3);margin:24px 0 0;">If you did not request this, disregard this message.</p>
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:16px 32px;border-top:1px solid rgba(236,227,214,0.08);">
        <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.06em;color:rgba(236,227,214,0.3);margin:0;">Thoughtform &mdash; navigating intelligence</p>
      </td></tr>
    </table>
  </td></tr>
</table>
```

---

## 2. Magic Link

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#050403;padding:48px 24px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background-color:#0a0908;border:1px solid rgba(236,227,214,0.08);">
      <!-- Header -->
      <tr><td style="padding:24px 32px 16px;border-bottom:1px solid rgba(236,227,214,0.08);">
        <span style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#caa554;">SIGIL</span>
        <span style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(236,227,214,0.3);padding-left:12px;">by Thoughtform</span>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:32px;">
        <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#caa554;margin:0 0 24px;">Your access link</p>
        <p style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;line-height:1.6;color:rgba(236,227,214,0.7);margin:0 0 24px;">Use the link below to sign in to Sigil, Thoughtform's visual AI platform. This link expires in 24 hours.</p>
        <table cellpadding="0" cellspacing="0"><tr><td style="background-color:#caa554;padding:12px 24px;">
          <a href="{{ .ConfirmationURL }}" style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#050403;text-decoration:none;display:inline-block;">Sign in to Sigil</a>
        </td></tr></table>
        <p style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;line-height:1.6;color:rgba(236,227,214,0.3);margin:24px 0 0;">If you did not request this, disregard this message.</p>
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:16px 32px;border-top:1px solid rgba(236,227,214,0.08);">
        <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.06em;color:rgba(236,227,214,0.3);margin:0;">Thoughtform &mdash; navigating intelligence</p>
      </td></tr>
    </table>
  </td></tr>
</table>
```

---

## 3. Invite User

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#050403;padding:48px 24px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background-color:#0a0908;border:1px solid rgba(236,227,214,0.08);">
      <!-- Header -->
      <tr><td style="padding:24px 32px 16px;border-bottom:1px solid rgba(236,227,214,0.08);">
        <span style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#caa554;">SIGIL</span>
        <span style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(236,227,214,0.3);padding-left:12px;">by Thoughtform</span>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:32px;">
        <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#caa554;margin:0 0 24px;">You have been invited</p>
        <p style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;line-height:1.6;color:rgba(236,227,214,0.7);margin:0 0 24px;">You have been invited to join Sigil, Thoughtform's visual AI platform. Accept the invitation to set your course.</p>
        <table cellpadding="0" cellspacing="0"><tr><td style="background-color:#caa554;padding:12px 24px;">
          <a href="{{ .ConfirmationURL }}" style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#050403;text-decoration:none;display:inline-block;">Accept invitation</a>
        </td></tr></table>
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:16px 32px;border-top:1px solid rgba(236,227,214,0.08);">
        <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.06em;color:rgba(236,227,214,0.3);margin:0;">Thoughtform &mdash; navigating intelligence</p>
      </td></tr>
    </table>
  </td></tr>
</table>
```

---

## 4. Reset Password

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#050403;padding:48px 24px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background-color:#0a0908;border:1px solid rgba(236,227,214,0.08);">
      <!-- Header -->
      <tr><td style="padding:24px 32px 16px;border-bottom:1px solid rgba(236,227,214,0.08);">
        <span style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#caa554;">SIGIL</span>
        <span style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(236,227,214,0.3);padding-left:12px;">by Thoughtform</span>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:32px;">
        <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#caa554;margin:0 0 24px;">Reset your credentials</p>
        <p style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;line-height:1.6;color:rgba(236,227,214,0.7);margin:0 0 24px;">A password reset was requested for your account on Sigil, Thoughtform's visual AI platform. Use the link below to set a new password.</p>
        <table cellpadding="0" cellspacing="0"><tr><td style="background-color:#caa554;padding:12px 24px;">
          <a href="{{ .ConfirmationURL }}" style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#050403;text-decoration:none;display:inline-block;">Reset password</a>
        </td></tr></table>
        <p style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;line-height:1.6;color:rgba(236,227,214,0.3);margin:24px 0 0;">If you did not request this, disregard this message. Your current password remains unchanged.</p>
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:16px 32px;border-top:1px solid rgba(236,227,214,0.08);">
        <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.06em;color:rgba(236,227,214,0.3);margin:0;">Thoughtform &mdash; navigating intelligence</p>
      </td></tr>
    </table>
  </td></tr>
</table>
```

---

## 5. Change Email Address

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#050403;padding:48px 24px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background-color:#0a0908;border:1px solid rgba(236,227,214,0.08);">
      <!-- Header -->
      <tr><td style="padding:24px 32px 16px;border-bottom:1px solid rgba(236,227,214,0.08);">
        <span style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#caa554;">SIGIL</span>
        <span style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(236,227,214,0.3);padding-left:12px;">by Thoughtform</span>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:32px;">
        <p style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#caa554;margin:0 0 24px;">Confirm new email</p>
        <p style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;line-height:1.6;color:rgba(236,227,214,0.7);margin:0 0 24px;">An email change was requested for your account on Sigil, Thoughtform's visual AI platform. Confirm the new address to complete the update.</p>
        <table cellpadding="0" cellspacing="0"><tr><td style="background-color:#caa554;padding:12px 24px;">
          <a href="{{ .ConfirmationURL }}" style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#050403;text-decoration:none;display:inline-block;">Confirm new email</a>
        </td></tr></table>
        <p style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;line-height:1.6;color:rgba(236,227,214,0.3);margin:24px 0 0;">If you did not request this change, contact an administrator.</p>
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:16px 32px;border-top:1px solid rgba(236,227,214,0.08);">
        <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.06em;color:rgba(236,227,214,0.3);margin:0;">Thoughtform &mdash; navigating intelligence</p>
      </td></tr>
    </table>
  </td></tr>
</table>
```

---

## Design Rationale

- **Background:** Void (#050403) outer, Surface-0 (#0A0908) card -- matching the Depth Layers grammar
- **Borders:** 1px rgba(236,227,214,0.08) -- dawn-08 Course Lines
- **Header:** "SIGIL" in gold monospace (Tensor Gold #CAA554), "by Thoughtform" in dawn-30
- **Section label:** Monospace, 11px, uppercase, gold -- matching `.sigil-section-label`
- **Body text:** Sans-serif, 14px, dawn-70 -- readable and warm
- **CTA button:** Solid gold background, void text, monospace uppercase -- matching `.sigil-btn-primary`
- **Footer:** Monospace, 9px, dawn-30 -- Data Readout grammar
- **Copy voice:** Navigational metaphor ("coordinates", "set your course"), precise, no exclamation marks
- **Fonts:** Courier New (monospace) and Helvetica Neue (sans) -- email-safe equivalents of PT Mono and IBM Plex Sans
