import { create } from "zustand";

export type LinkStatus = "active" | "paused";

export type ResumeLink = {
  id: string;
  label: string;
  resumeUrl: string;
  slug: string;
  status: LinkStatus;
  createdAt: string;
};

export type EventType = "view" | "download";
export type DeviceCategory = "desktop" | "mobile" | "tablet";

export type LinkEvent = {
  id: string;
  linkId: string;
  type: EventType;
  occurredAt: string;
  sessionId: string;
  device: DeviceCategory;
  browser: string;
  os: string;
  referrerDomain: string | null;
  utmSource: string | null;
  page: number;
  dwellSeconds: number | null;
};

export type LinkCreateInput = {
  label: string;
  resumeUrl: string;
  slug: string;
};

export type LinkUpdateInput = Partial<Pick<ResumeLink, "label" | "resumeUrl" | "slug" | "status">>;

function createId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

const seedLinks: ResumeLink[] = [
  {
    id: "r7k2p9qa",
    label: "Backend engineer — Acme",
    resumeUrl: "https://drive.google.com/file/d/example-acme-resume/view",
    slug: "acme-backend",
    status: "active",
    createdAt: hoursAgo(24 * 9),
  },
  {
    id: "m3x8j1wb",
    label: "General portfolio resume",
    resumeUrl: "https://omthorat.dev/resume.pdf",
    slug: "om-resume",
    status: "active",
    createdAt: hoursAgo(24 * 20),
  },
];

const seedEvents: LinkEvent[] = [
  {
    id: "e1",
    linkId: "r7k2p9qa",
    type: "view",
    occurredAt: hoursAgo(2),
    sessionId: "sess_4f9a2c",
    device: "desktop",
    browser: "Chrome",
    os: "macOS",
    referrerDomain: "linkedin.com",
    utmSource: "linkedin",
    page: 1,
    dwellSeconds: 48,
  },
  {
    id: "e2",
    linkId: "r7k2p9qa",
    type: "view",
    occurredAt: hoursAgo(2),
    sessionId: "sess_4f9a2c",
    device: "desktop",
    browser: "Chrome",
    os: "macOS",
    referrerDomain: "linkedin.com",
    utmSource: "linkedin",
    page: 2,
    dwellSeconds: 31,
  },
  {
    id: "e3",
    linkId: "r7k2p9qa",
    type: "download",
    occurredAt: hoursAgo(2),
    sessionId: "sess_4f9a2c",
    device: "desktop",
    browser: "Chrome",
    os: "macOS",
    referrerDomain: "linkedin.com",
    utmSource: "linkedin",
    page: 2,
    dwellSeconds: null,
  },
  {
    id: "e4",
    linkId: "r7k2p9qa",
    type: "view",
    occurredAt: hoursAgo(9),
    sessionId: "sess_19bb7e",
    device: "mobile",
    browser: "Safari",
    os: "iOS",
    referrerDomain: null,
    utmSource: null,
    page: 1,
    dwellSeconds: 22,
  },
  {
    id: "e5",
    linkId: "r7k2p9qa",
    type: "view",
    occurredAt: hoursAgo(28),
    sessionId: "sess_8821dc",
    device: "desktop",
    browser: "Firefox",
    os: "Windows",
    referrerDomain: "mail.google.com",
    utmSource: null,
    page: 1,
    dwellSeconds: 56,
  },
  {
    id: "e6",
    linkId: "r7k2p9qa",
    type: "view",
    occurredAt: hoursAgo(28),
    sessionId: "sess_8821dc",
    device: "desktop",
    browser: "Firefox",
    os: "Windows",
    referrerDomain: "mail.google.com",
    utmSource: null,
    page: 2,
    dwellSeconds: 40,
  },
  {
    id: "e7",
    linkId: "r7k2p9qa",
    type: "download",
    occurredAt: hoursAgo(28),
    sessionId: "sess_8821dc",
    device: "desktop",
    browser: "Firefox",
    os: "Windows",
    referrerDomain: "mail.google.com",
    utmSource: null,
    page: 2,
    dwellSeconds: null,
  },
  {
    id: "e8",
    linkId: "m3x8j1wb",
    type: "view",
    occurredAt: hoursAgo(5),
    sessionId: "sess_0b4a91",
    device: "mobile",
    browser: "Chrome",
    os: "Android",
    referrerDomain: "twitter.com",
    utmSource: "twitter",
    page: 1,
    dwellSeconds: 15,
  },
  {
    id: "e9",
    linkId: "m3x8j1wb",
    type: "view",
    occurredAt: hoursAgo(50),
    sessionId: "sess_c72f10",
    device: "desktop",
    browser: "Chrome",
    os: "macOS",
    referrerDomain: null,
    utmSource: null,
    page: 1,
    dwellSeconds: 63,
  },
  {
    id: "e10",
    linkId: "m3x8j1wb",
    type: "view",
    occurredAt: hoursAgo(50),
    sessionId: "sess_c72f10",
    device: "desktop",
    browser: "Chrome",
    os: "macOS",
    referrerDomain: null,
    utmSource: null,
    page: 2,
    dwellSeconds: 37,
  },
];

type LinksState = {
  links: ResumeLink[];
  events: LinkEvent[];
  createLink: (input: LinkCreateInput) => ResumeLink;
  updateLink: (id: string, patch: LinkUpdateInput) => void;
  deleteLink: (id: string) => void;
};

/**
 * Demo data layer standing in for the backend's tracking-link API (not built yet, see
 * docs/business-requirements.md). Shape mirrors the planned Link + AnalyticsEvent entities so
 * swapping this for real `links.api.ts` calls later is a localized change.
 */
export const useLinksStore = create<LinksState>((set) => ({
  links: seedLinks,
  events: seedEvents,

  createLink(input) {
    const link: ResumeLink = {
      id: createId(),
      status: "active",
      createdAt: new Date().toISOString(),
      ...input,
    };
    set((state) => ({ links: [link, ...state.links] }));
    return link;
  },

  updateLink(id, patch) {
    set((state) => ({
      links: state.links.map((link) => (link.id === id ? { ...link, ...patch } : link)),
    }));
  },

  deleteLink(id) {
    set((state) => ({
      links: state.links.filter((link) => link.id !== id),
      events: state.events.filter((event) => event.linkId !== id),
    }));
  },
}));
