'use client';

// Per-island overlay panels. The visible panel is selected by GameState's
// `activePanel`. Content is ported from the prototype with TODO markers
// where the placeholder copy needs to be replaced with real bio / projects.

import { useState, type ReactNode } from 'react';

// ---- Shared shell (backdrop, card, traffic lights, close button) ----

type ShellProps = {
  headerColor: string;
  headerLabel: string;
  maxWidth?: number;
  scrollable?: boolean;
  onClose: () => void;
  children: ReactNode;
};

function PanelShell({
  headerColor,
  headerLabel,
  maxWidth = 460,
  scrollable = true,
  onClose,
  children,
}: ShellProps) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 20,
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(8,30,55,.46)',
          backdropFilter: 'blur(2px)',
        }}
      />
      <div
        className={scrollable ? 'bw-scroll' : undefined}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth,
          maxHeight: scrollable ? '86vh' : undefined,
          overflow: scrollable ? 'auto' : 'hidden',
          background: '#fff',
          borderRadius: 24,
          boxShadow: '0 24px 60px rgba(8,30,55,.4)',
          animation: 'bwpop .22s ease-out',
        }}
      >
        <div
          style={{
            background: headerColor,
            padding: '20px 26px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', gap: 7 }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 13,
                  height: 13,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,.55)',
                }}
              />
            ))}
          </div>
          <div
            style={{
              fontFamily: '"Baloo 2", sans-serif',
              fontWeight: 800,
              fontSize: 13,
              color: '#fff',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
            }}
          >
            {headerLabel}
          </div>
        </div>
        {children}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 14,
            right: 16,
            width: 34,
            height: 34,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255,255,255,.3)',
            color: '#fff',
            fontSize: 18,
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ---- Individual panels ----

type PanelProps = { onClose: () => void };

function HomePanel({ onClose }: PanelProps) {
  return (
    <PanelShell headerColor="#37b24d" headerLabel="Home Harbor" onClose={onClose}>
      <div style={{ padding: '24px 28px 30px' }}>
        <div
          style={{
            fontFamily: '"Baloo 2", sans-serif',
            fontWeight: 800,
            fontSize: 28,
            color: '#1d2b36',
            lineHeight: 1.1,
          }}
        >
          Welcome aboard! ⚓
        </div>
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.6,
            color: '#46555f',
            margin: '14px 0 0',
            textWrap: 'pretty',
          }}
        >
          This is your home harbor. Sail out to explore the archipelago — each
          island is a different part of my world.
        </p>
        <div
          style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 9 }}
        >
          {[
            ['#82d96b', 'About Me — my story & resume'],
            ['#fa5252', 'Contact — LinkedIn & GitHub'],
            ['#b0b8c0', 'Projects & isles — my work'],
          ].map(([color, text]) => (
            <div
              key={text}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13.5,
                fontWeight: 700,
                color: '#46555f',
              }}
            >
              <span
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: '50%',
                  background: color,
                  flex: 'none',
                }}
              />
              {text}
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 18,
            padding: '13px 16px',
            background: '#f1f8f3',
            borderRadius: 14,
            fontSize: 13,
            fontWeight: 700,
            color: '#2b8a3e',
          }}
        >
          WASD / arrows to sail · press E to dock · &ldquo;Sail home&rdquo; if you
          get lost.
        </div>
      </div>
    </PanelShell>
  );
}

function HousePanel({ onClose }: PanelProps) {
  return (
    <PanelShell
      headerColor="#fa5252"
      headerLabel="About Me · Resume"
      maxWidth={900}
      scrollable={false}
      onClose={onClose}
    >
      <iframe
        src="/Ethan-Vinh-Resume.pdf#view=FitH"
        title="Ethan Vinh — Resume"
        style={{
          display: 'block',
          width: '100%',
          height: '78vh',
          border: 'none',
          background: '#f4f4f4',
        }}
      />
    </PanelShell>
  );
}

function SocialsPanel({ onClose }: PanelProps) {
  return (
    <PanelShell
      headerColor="#fa5252"
      headerLabel="Contact"
      maxWidth={420}
      scrollable={false}
      onClose={onClose}
    >
      <div
        style={{
          padding: '22px 24px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: 11,
        }}
      >
        <SocialLink
          href="https://github.com/etvinh"
          bg="#24292e"
          shadow="#0d1117"
          color="#fff"
          label="GitHub"
        />
        <SocialLink
          href="https://www.linkedin.com/in/etvinh/"
          bg="#0a66c2"
          shadow="#074a8c"
          color="#fff"
          label="LinkedIn"
        />
        {/* TODO: replace mailto with the real email */}
        <SocialLink
          href="mailto:you@example.com"
          bg="#ffd43b"
          shadow="#e8a700"
          color="#3a2a12"
          label="Email"
        />
      </div>
    </PanelShell>
  );
}

type ProjectTab = {
  id: string;
  label: string;
  title: string;
  description: string;
  techTags: Array<{ label: string; color: string; bg: string; shadow: string }>;
  // Optional gallery — when present, replaces the placeholder hatching.
  // Each entry is served from /public.
  gallery?: Array<{ src: string; label?: string }>;
  // Optional — omit for projects with no public repo (e.g. school gitlab).
  repoHref?: string;
  // Optional secondary link (e.g. Devpost submission for a hackathon project)
  altHref?: string;
  altLabel?: string;
  altBg?: string;
  altShadow?: string;
};

const PROJECT_TABS: ProjectTab[] = [
  {
    id: 'kitgrail',
    label: 'KitGrail',
    title: 'KitGrail',
    description:
      'Full-stack marketplace for vintage soccer jerseys with separate admin and seller apps. Built with Next.js, React, GraphQL, and PostgreSQL; Stripe for payments, Google OAuth for authentication; deployed on AWS.',
    techTags: [
      { label: 'Next.js', color: '#fff', bg: '#1d2b36', shadow: '#0b1117' },
      { label: 'GraphQL', color: '#fff', bg: '#e535ab', shadow: '#a01f7a' },
      { label: 'PostgreSQL', color: '#fff', bg: '#336791', shadow: '#1f3f5a' },
      { label: 'Stripe', color: '#fff', bg: '#635bff', shadow: '#3f3acc' },
      { label: 'AWS', color: '#fff', bg: '#232f3e', shadow: '#0e1419' },
    ],
    gallery: [
      { src: '/shopper.png', label: 'Shopper marketplace' },
      { src: '/seller.png', label: 'Seller app' },
      { src: '/admin.png', label: 'Admin app' },
      { src: '/architecture.png', label: 'System architecture' },
    ],
    // Repo lives on school GitLab and is not public.
  },
  {
    id: 'safeflex',
    label: 'SafeFlex',
    title: 'SafeFlex',
    description:
      'A wearable for post-surgical physical therapy that validates rep form in real time from sensor data. CruzHacks 2026 prototype built with a team of four (FastAPI + vanilla JS); second prototype in Swift/SwiftUI adds Bluetooth + iOS integration. Awarded university funding to develop the second prototype after competing against 100+ teams.',
    techTags: [
      { label: 'FastAPI', color: '#fff', bg: '#009688', shadow: '#00695c' },
      { label: 'SwiftUI', color: '#fff', bg: '#fa7343', shadow: '#a83a14' },
      { label: 'Bluetooth', color: '#fff', bg: '#0082fc', shadow: '#0057a8' },
      { label: 'iOS', color: '#fff', bg: '#1d2b36', shadow: '#0b1117' },
    ],
    repoHref: 'https://github.com/ServeshKarnawat/CruzHacks2026',
    altHref: 'https://devpost.com/software/safeflex',
    altLabel: 'View on Devpost',
    altBg: '#003e54',
    altShadow: '#001f2b',
  },
  {
    id: 'mptgt',
    label: 'MPTGT',
    title: 'Monty Python Trained Generative Transformer',
    description:
      'A generative transformer trained to write Monty Python: Holy Grail script, built in PyTorch and TensorFlow. Implemented self-attention from scratch with aggregated weight matrices; optimized inference for Apple M2 Silicon and tuned the temperature hyperparameter for output coherence.',
    techTags: [
      { label: 'Python', color: '#fff', bg: '#3776ab', shadow: '#1d4d6e' },
      { label: 'PyTorch', color: '#fff', bg: '#ee4c2c', shadow: '#a8341d' },
      { label: 'TensorFlow', color: '#fff', bg: '#ff6f00', shadow: '#b34d00' },
      { label: 'Transformers', color: '#3a2a12', bg: '#ffd43b', shadow: '#e8a700' },
    ],
    repoHref: 'https://github.com/etvinh/MyGpt',
  },
];

function NeonPanel({ onClose }: PanelProps) {
  const [activeId, setActiveId] = useState<string>(PROJECT_TABS[0].id);
  const active = PROJECT_TABS.find((t) => t.id === activeId) ?? PROJECT_TABS[0];

  return (
    <PanelShell headerColor="#f06595" headerLabel="Projects" onClose={onClose}>
      {/* Tab row */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          padding: '14px 26px 0',
          borderBottom: '2px solid #f1f3f5',
        }}
      >
        {PROJECT_TABS.map((t) => {
          const isActive = t.id === activeId;
          return (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              style={{
                fontFamily: '"Baloo 2", sans-serif',
                fontWeight: 800,
                fontSize: 13,
                color: isActive ? '#c2255c' : '#8696a3',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid #f06595' : '3px solid transparent',
                marginBottom: -2,
                padding: '8px 14px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div style={{ padding: '22px 26px 28px' }}>
        <div
          style={{
            fontFamily: '"Baloo 2", sans-serif',
            fontWeight: 800,
            fontSize: 24,
            color: '#1d2b36',
          }}
        >
          {active.title}
        </div>
        <p style={{ ...paragraphStyle, margin: '8px 0 16px' }}>{active.description}</p>
        {active.gallery && <ProjectGallery items={active.gallery} />}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          {active.techTags.map((tag) => (
            <TechTag
              key={tag.label}
              label={tag.label}
              color={tag.color}
              bg={tag.bg}
              shadow={tag.shadow}
            />
          ))}
        </div>
        {(active.repoHref || active.altHref) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {active.repoHref && (
              <RepoLink href={active.repoHref} bg="#f06595" shadow="#c2255c" />
            )}
            {active.altHref && (
              <RepoLink
                href={active.altHref}
                bg={active.altBg ?? '#1d2b36'}
                shadow={active.altShadow ?? '#0b1117'}
                label={active.altLabel ?? 'View Demo'}
              />
            )}
          </div>
        )}
      </div>
    </PanelShell>
  );
}

// Vertical stack of project screenshots with little caption labels.
// Each image gets `loading="lazy"` so the panel opens fast even with 4+ shots.
function ProjectGallery({ items }: { items: Array<{ src: string; label?: string }> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {items.map((item) => (
        <figure key={item.src} style={{ margin: 0 }}>
          <img
            src={item.src}
            alt={item.label ?? ''}
            loading="lazy"
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
              borderRadius: 14,
              border: '1px solid #e3e9ef',
              background: '#eef2f6',
            }}
          />
          {item.label && (
            <figcaption
              style={{
                marginTop: 6,
                fontSize: 12,
                fontWeight: 700,
                color: '#8696a3',
                textAlign: 'center',
              }}
            >
              {item.label}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}

// ---- helpers ----

const paragraphStyle = {
  fontSize: 14,
  lineHeight: 1.6,
  color: '#46555f',
  margin: 0,
} as const;

function SocialLink({
  href,
  bg,
  shadow,
  color,
  label,
}: {
  href: string;
  bg: string;
  shadow: string;
  color: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontFamily: '"Baloo 2", sans-serif',
        fontWeight: 700,
        fontSize: 15,
        color,
        background: bg,
        borderBottom: `4px solid ${shadow}`,
        borderRadius: 14,
        padding: '13px 18px',
      }}
    >
      {label}{' '}
      <span style={{ opacity: label === 'Email' ? 0.6 : 0.7 }}>↗</span>
    </a>
  );
}

function TechTag({
  label,
  color,
  bg,
  shadow,
}: {
  label: string;
  color: string;
  bg: string;
  shadow: string;
}) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        color,
        background: bg,
        borderBottom: `3px solid ${shadow}`,
        borderRadius: 9,
        padding: '5px 11px',
      }}
    >
      {label}
    </span>
  );
}

function RepoLink({
  href,
  bg,
  shadow,
  label = 'View Repo',
}: {
  href: string;
  bg: string;
  shadow: string;
  label?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-block',
        marginTop: 18,
        textDecoration: 'none',
        fontFamily: '"Baloo 2", sans-serif',
        fontWeight: 700,
        fontSize: 14,
        color: '#fff',
        background: bg,
        borderBottom: `4px solid ${shadow}`,
        borderRadius: 13,
        padding: '11px 20px',
      }}
    >
      {label} ↗
    </a>
  );
}

// ---- switch ----

type Props = {
  activePanel: string | null;
  onClose: () => void;
};

export function Panels({ activePanel, onClose }: Props) {
  switch (activePanel) {
    case 'home':
      return <HomePanel onClose={onClose} />;
    case 'house':
      return <HousePanel onClose={onClose} />;
    case 'socials':
      return <SocialsPanel onClose={onClose} />;
    case 'neon':
      return <NeonPanel onClose={onClose} />;
    default:
      return null;
  }
}
