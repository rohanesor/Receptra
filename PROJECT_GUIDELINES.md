# Receptra — Project Guidelines

## Project Overview

Receptra is an AI-powered voice receptionist designed for appointment-based businesses.

The first implementation targets barbershops.

The system answers phone calls, understands customer requests, books appointments, answers FAQs, sends confirmations, and logs conversations.

The goal is to create a modern, trustworthy, professional SaaS product.

---

# Design Principles

## Core Product Values

* Fast
* Trustworthy
* Professional
* Minimal
* Human-like
* Reliable

Every UI component and feature must support these values.

Avoid unnecessary complexity.

---

# UI Design Language

The interface should feel like:

* Linear
* Stripe
* Retool
* Vapi
* ElevenLabs Dashboard

Characteristics:

* Clean layouts
* Large spacing
* Clear hierarchy
* Minimal distractions
* Enterprise-grade appearance

---

# Typography

## Primary Font

Inter

Fallback:

```css
font-family:
Inter,
system-ui,
sans-serif;
```

---

## Heading Scale

H1

```css
font-size: 40px;
font-weight: 700;
```

H2

```css
font-size: 32px;
font-weight: 600;
```

H3

```css
font-size: 24px;
font-weight: 600;
```

H4

```css
font-size: 20px;
font-weight: 600;
```

---

## Body Text

```css
font-size: 14px;
line-height: 1.6;
font-weight: 400;
```

---

# Color System

## Primary

```css
#0F172A
```

Deep Navy

---

## Secondary

```css
#334155
```

Slate

---

## Accent

```css
#2563EB
```

Professional Blue

---

## Success

```css
#22C55E
```

---

## Warning

```css
#F59E0B
```

---

## Error

```css
#EF4444
```

---

## Background

```css
#F8FAFC
```

---

# Layout Rules

## Spacing Scale

Only use:

```text
4
8
12
16
24
32
48
64
```

Avoid random spacing values.

---

## Border Radius

Cards

```css
12px
```

Buttons

```css
10px
```

Inputs

```css
10px
```

---

# Component Guidelines

## Buttons

Primary Button

* Solid accent color
* White text

Secondary Button

* Light border
* Transparent background

Never use more than 2 button styles.

---

## Cards

Every card should:

* Have subtle border
* Light shadow
* Consistent padding
* Rounded corners

Avoid heavy shadows.

---

## Tables

Tables should:

* Support sorting
* Support searching
* Be mobile responsive

---

# Dashboard Pages

## Dashboard

Overview metrics

* Calls Today
* Appointments
* Messages
* Conversion Rate

---

## Live Calls

Display:

* Active Call
* Duration
* Transcript Stream

---

## Appointments

Display:

* Customer Name
* Service
* Date
* Time
* Status

---

## Messages

Display:

* Name
* Phone
* Callback Request

---

# Development Rules

## Architecture

Use:

* Clean Architecture
* Service Layer Pattern
* Modular Components

Avoid:

* Monolithic files
* Business logic inside UI

---

## React Rules

Use:

* Functional Components
* Hooks
* Reusable Components

Avoid:

* Class Components
* Inline business logic

---

## Backend Rules

Use:

* TypeScript
* Express
* Service Layer

Controllers must remain thin.

Business logic belongs in services.

---

# Naming Conventions

## Components

Good

```text
AppointmentCard.tsx
LiveTranscript.tsx
CallStatusBadge.tsx
```

Bad

```text
Card1.tsx
Component.tsx
NewCard.tsx
```

---

## Variables

Good

```ts
customerName
appointmentDate
activeCallCount
```

Bad

```ts
a
b
temp
data1
```

---

# AI Assistant Rules

When generating code:

1. Follow project structure.
2. Never create duplicate components.
3. Reuse existing services.
4. Keep files under 300 lines when possible.
5. Use TypeScript.
6. Add error handling.
7. Add loading states.
8. Add empty states.
9. Add responsive design.
10. Generate production-quality code.

---

# Voice Experience Rules

AI receptionist should:

* Speak naturally
* Be concise
* Confirm important details
* Never hallucinate appointments
* Always verify booking information

Maximum response length:

2 sentences whenever possible.

---

# Future Scalability

All architecture decisions should support:

* Multi-tenant businesses
* Multiple locations
* Additional service categories
* Analytics
* CRM integrations

Avoid hardcoded business logic.

Everything should be configurable.

---

# Success Criteria

A customer should be able to:

1. Call the number
2. Book a haircut
3. Receive confirmation
4. End call within 60 seconds

The experience should feel faster than speaking to a human receptionist.
