"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { slugify } from "@/lib/links-analytics";
import { cn } from "@/lib/utils";
import { useLinksStore, type ResumeLink } from "@/stores/links-store";

type Props = {
  mode: "create" | "edit";
  link?: ResumeLink;
  className?: string;
};

export function LinkForm({ mode, link, className }: Props) {
  const router = useRouter();
  const createLink = useLinksStore((state) => state.createLink);
  const updateLink = useLinksStore((state) => state.updateLink);
  const links = useLinksStore((state) => state.links);

  const labelId = useId();
  const urlId = useId();
  const slugId = useId();
  const errorId = useId();

  const [label, setLabel] = useState(link?.label ?? "");
  const [resumeUrl, setResumeUrl] = useState(link?.resumeUrl ?? "");
  const [slug, setSlug] = useState(link?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [error, setError] = useState<string | null>(null);

  function handleLabelChange(value: string) {
    setLabel(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedLabel = label.trim();
    const trimmedUrl = resumeUrl.trim();
    const trimmedSlug = slugify(slug);

    if (!trimmedLabel || !trimmedUrl || !trimmedSlug) {
      setError("Label, resume URL and link slug are all required.");
      return;
    }

    try {
      const parsed = new URL(trimmedUrl);
      void parsed;
    } catch {
      setError("That doesn't look like a full URL — include https://.");
      return;
    }

    const slugTaken = links.some(
      (existing) => existing.slug === trimmedSlug && existing.id !== link?.id,
    );
    if (slugTaken) {
      setError("That link slug is already in use. Try another.");
      return;
    }

    if (mode === "create") {
      const created = createLink({ label: trimmedLabel, resumeUrl: trimmedUrl, slug: trimmedSlug });
      router.push(`/${created.id}/dashboard`);
      return;
    }

    if (link) {
      updateLink(link.id, { label: trimmedLabel, resumeUrl: trimmedUrl, slug: trimmedSlug });
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      <Field
        id={labelId}
        label="Label"
        hint="How you'll tell this link apart from the others — the role, company, or audience."
        inputProps={{
          value: label,
          onChange: (event) => handleLabelChange(event.target.value),
          placeholder: "Backend engineer — Acme",
          required: true,
          maxLength: 80,
        }}
      />

      <Field
        id={urlId}
        label="Resume URL"
        hint="Wherever the PDF already lives — Google Drive, Dropbox, your own site. Milo stores the URL, not the file."
        inputProps={{
          value: resumeUrl,
          onChange: (event) => setResumeUrl(event.target.value),
          placeholder: "https://drive.google.com/file/d/…/view",
          type: "url",
          required: true,
        }}
      />

      <Field
        id={slugId}
        label="Link slug"
        hint="The short link you share instead of the raw URL: milo.link/go/<slug>."
        inputProps={{
          value: slug,
          onChange: (event) => {
            setSlugTouched(true);
            setSlug(event.target.value);
          },
          placeholder: "acme-backend",
          required: true,
          maxLength: 40,
        }}
      />

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit">{mode === "create" ? "Create link" : "Save changes"}</Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      {error ? (
        <p
          id={errorId}
          role="status"
          className="rounded-lg border border-clay-400/25 bg-clay-400/5 px-4 py-3 text-sm text-foreground-muted"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
};

function Field({ id, label, hint, inputProps }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-foreground-muted">
        {label}
      </label>
      <input
        id={id}
        {...inputProps}
        className={cn(
          "mt-2 h-11 w-full rounded-lg border border-surface-border bg-surface px-4 text-base",
          "text-foreground placeholder:text-foreground-muted",
          "transition-colors focus:border-signal-400/60 focus:outline-none",
        )}
      />
      {hint ? <p className="mt-1.5 text-xs text-foreground-muted">{hint}</p> : null}
    </div>
  );
}
