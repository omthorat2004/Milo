import { createApi, SessionExpiredError } from "@/lib/api";
import { API_URL, APP_URL } from "@/lib/config";
import { byNewest, groupActiveLinks, paginate } from "@/lib/resume-list";
import type { Resume, Session, TrackingLink } from "@/lib/schemas";
import { chromeSessionStore } from "@/lib/storage";

const api = createApi({ baseUrl: API_URL, store: chromeSessionStore });
const root = document.getElementById("root") as HTMLElement;

type Tab = { url: string; title: string } | null;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}

const SVG_NS = "http://www.w3.org/2000/svg";

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string>,
  ...children: SVGElement[]
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  node.append(...children);
  return node;
}

/** The same mark as the web app's MiloMark (packages/frontend/src/components/app/milo-mark.tsx). */
function brand(): HTMLElement {
  const mark = svg(
    "svg",
    { viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true" },
    svg("path", {
      d: "M6 3h8l4 4v14H6z",
      stroke: "currentColor",
      "stroke-width": "1.3",
      "stroke-linejoin": "round",
      opacity: "0.85",
    }),
    svg("path", {
      d: "M14 3v4h4",
      stroke: "currentColor",
      "stroke-width": "1.3",
      "stroke-linejoin": "round",
    }),
    svg("circle", { cx: "12", cy: "14", r: "2", fill: "#3fcf8e" }),
    svg("circle", {
      cx: "12",
      cy: "14",
      r: "4.6",
      stroke: "#3fcf8e",
      "stroke-opacity": "0.45",
      "stroke-width": "0.9",
    }),
  );
  return el("div", { className: "brand" }, mark, el("span", { className: "wordmark" }, "Milo"));
}

// Eye / eye-off from Lucide (ISC), the same icons the web app's password field uses.
function icon(...children: SVGElement[]): SVGSVGElement {
  return svg(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
    },
    ...children,
  );
}

function eyeIcon(): SVGSVGElement {
  return icon(
    svg("path", {
      d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
    }),
    svg("circle", { cx: "12", cy: "12", r: "3" }),
  );
}

function eyeOffIcon(): SVGSVGElement {
  return icon(
    svg("path", {
      d: "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",
    }),
    svg("path", { d: "M14.084 14.158a3 3 0 0 1-4.242-4.242" }),
    svg("path", {
      d: "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",
    }),
    svg("path", { d: "m2 2 20 20" }),
  );
}

function render(...nodes: Node[]): void {
  root.replaceChildren(...nodes);
}

async function currentTab(): Promise<Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  // Only ever offer http(s) pages as a resume URL (never chrome://, file://, ...).
  if (!tab?.url || !/^https?:\/\//i.test(tab.url)) return null;
  return { url: tab.url, title: tab.title ?? "" };
}

function openInTab(url: string): void {
  void chrome.tabs.create({ url });
}

// ---- Signed out ------------------------------------------------------------------------------

function showLogin(message?: string): void {
  const email = el("input", {
    type: "email",
    name: "email",
    required: true,
    autocomplete: "email",
  });
  const password = el("input", {
    type: "password",
    name: "password",
    required: true,
    autocomplete: "current-password",
  });
  const error = el("p", { className: "error", role: "alert", hidden: !message }, message ?? "");
  const submit = el("button", { type: "submit", className: "primary" }, "Log in");

  const toggle = el("button", { type: "button", className: "reveal" });
  function setRevealed(revealed: boolean): void {
    password.type = revealed ? "text" : "password";
    toggle.setAttribute("aria-label", revealed ? "Hide password" : "Show password");
    toggle.setAttribute("aria-pressed", String(revealed));
    toggle.replaceChildren(revealed ? eyeOffIcon() : eyeIcon());
  }
  toggle.addEventListener("click", () => setRevealed(password.type === "password"));
  setRevealed(false);

  const form = el(
    "form",
    {},
    el("label", {}, "Email", email),
    el("label", {}, "Password", el("div", { className: "field" }, password, toggle)),
    submit,
    error,
  );
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submit.disabled = true;
    error.hidden = true;
    try {
      showHome(await api.login(email.value.trim(), password.value));
    } catch (caught) {
      error.textContent = errorText(caught);
      error.hidden = false;
      submit.disabled = false;
    }
  });

  const signUp = el("button", { type: "button", className: "ghost" }, "Create an account");
  signUp.addEventListener("click", () => openInTab(`${APP_URL}/register`));

  render(
    brand(),
    el("h1", {}, "Welcome back"),
    el("p", {}, "Log in to create tracking links."),
    form,
    signUp,
  );
}

// ---- Signed in -------------------------------------------------------------------------------

function showHome(session: Session): void {
  const status = el("p", { className: "error", role: "alert", hidden: true });
  const resultSlot = el("div");
  const list = el("ul");
  const pager = el("div", { className: "pager", hidden: true });
  const addSlot = el("div");

  function fail(error: unknown): void {
    if (error instanceof SessionExpiredError) return showLogin(error.message);
    status.textContent = errorText(error);
    status.hidden = false;
  }

  function showLink(link: TrackingLink): void {
    const copy = el("button", { type: "button", className: "primary" }, "Copy link");
    copy.addEventListener("click", async () => {
      await navigator.clipboard.writeText(link.share_url);
      copy.textContent = "Copied";
    });
    const open = el("button", { type: "button" }, "Open dashboard");
    // Signed out in the web app? It sends them to /login?from=... and back here after.
    open.addEventListener("click", () => openInTab(`${APP_URL}/${link.slug}/dashboard`));
    resultSlot.replaceChildren(
      el("div", { className: "link" }, link.share_url),
      el("div", { className: "row" }, copy, open),
    );
  }

  let resumes: Resume[] = [];
  let linksByResume = new Map<string, TrackingLink[]>();
  let page = 0;

  function copyButton(url: string): HTMLButtonElement {
    const copy = el("button", { type: "button", className: "small" }, "Copy");
    copy.addEventListener("click", async () => {
      await navigator.clipboard.writeText(url);
      copy.textContent = "Copied";
      setTimeout(() => (copy.textContent = "Copy"), 1500);
    });
    return copy;
  }

  function resumeItem(resume: Resume): HTMLLIElement {
    const create = el("button", { type: "button", className: "small" }, "Create link");
    create.addEventListener("click", async () => {
      create.disabled = true;
      status.hidden = true;
      try {
        showLink(await api.createLink(resume.id));
        await loadLinks();
      } catch (error) {
        fail(error);
      } finally {
        create.disabled = false;
      }
    });

    const links = (linksByResume.get(resume.id) ?? []).map((link) =>
      el(
        "div",
        { className: "link-row" },
        el("span", { title: link.share_url }, link.share_url.replace(/^https?:\/\//, "")),
        copyButton(link.share_url),
      ),
    );

    return el(
      "li",
      {},
      el(
        "div",
        { className: "resume-head" },
        el("span", { title: resume.source_url }, resume.title),
        create,
      ),
      ...links,
    );
  }

  function renderResumes(): void {
    const view = paginate(byNewest(resumes), page);
    page = view.page;

    list.replaceChildren(
      ...(view.items.length === 0
        ? [el("li", {}, el("span", {}, "No resumes yet."))]
        : view.items.map(resumeItem)),
    );

    const prev = el("button", { type: "button", className: "small" }, "Previous");
    prev.disabled = view.page === 0;
    prev.addEventListener("click", () => {
      page -= 1;
      renderResumes();
    });
    const next = el("button", { type: "button", className: "small" }, "Next");
    next.disabled = view.page >= view.pageCount - 1;
    next.addEventListener("click", () => {
      page += 1;
      renderResumes();
    });
    pager.hidden = view.pageCount <= 1;
    pager.replaceChildren(
      prev,
      el("small", {}, `Page ${view.page + 1} of ${view.pageCount}`),
      next,
    );
  }

  async function loadLinks(): Promise<void> {
    linksByResume = groupActiveLinks(await api.listLinks());
    renderResumes();
  }

  async function loadResumes(): Promise<void> {
    try {
      resumes = await api.listResumes();
      renderResumes();
      await loadLinks();
    } catch (error) {
      fail(error);
    }
  }

  async function renderAddForm(): Promise<void> {
    const tab = await currentTab();
    if (!tab) {
      addSlot.replaceChildren(el("small", {}, "Open your hosted resume PDF to add it here."));
      return;
    }
    const title = el("input", {
      name: "title",
      required: true,
      maxLength: 80,
      value: tab.title.slice(0, 80),
    });
    const submit = el(
      "button",
      { type: "submit", className: "primary" },
      "Add this page as a resume",
    );
    const form = el("form", {}, el("label", {}, "Title", title), submit);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      submit.disabled = true;
      status.hidden = true;
      try {
        const resume = await api.createResume({ title: title.value.trim(), source_url: tab.url });
        await loadResumes();
        showLink(await api.createLink(resume.id));
      } catch (error) {
        fail(error);
      } finally {
        submit.disabled = false;
      }
    });
    addSlot.replaceChildren(form);
  }

  const logout = el("button", { type: "button", className: "ghost" }, "Log out");
  logout.addEventListener("click", async () => {
    await api.logout();
    showLogin();
  });
  const dashboard = el("button", { type: "button" }, "Dashboard");
  dashboard.addEventListener("click", () => openInTab(`${APP_URL}/dashboard`));

  render(
    brand(),
    el("small", {}, session.user.email),
    addSlot,
    resultSlot,
    el("h2", {}, "Your resumes"),
    list,
    pager,
    status,
    el("div", { className: "row" }, dashboard, logout),
  );
  void renderAddForm();
  void loadResumes();
}

async function start(): Promise<void> {
  const session = await chromeSessionStore.get();
  if (session) showHome(session);
  else showLogin();
}

void start();
