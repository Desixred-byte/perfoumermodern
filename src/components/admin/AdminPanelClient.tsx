"use client";

import { useMemo, useRef, useState } from "react";

import type { Note, Perfume } from "@/types/catalog";

type AdminPanelClientProps = {
  configured: boolean;
  initialAuthenticated: boolean;
  initialPerfumesJson: string;
  initialNotesJson: string;
};

type AdminView = "perfumes" | "notes";

type PerfumeDraft = Perfume;
type NoteDraft = Note;

function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

function safeParsePerfumes(input: string): PerfumeDraft[] {
  try {
    const parsed = JSON.parse(input) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => item as PerfumeDraft)
      .filter((item) => item && typeof item.slug === "string" && item.slug.trim().length > 0);
  } catch {
    return [];
  }
}

function safeParseNotes(input: string): NoteDraft[] {
  try {
    const parsed = JSON.parse(input) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => item as NoteDraft)
      .filter((item) => item && typeof item.slug === "string" && item.slug.trim().length > 0);
  } catch {
    return [];
  }
}

function createEmptyPerfume(): PerfumeDraft {
  const uid = Date.now();
  return {
    id: `perfume-${uid}`,
    slug: `new-perfume-${uid}`,
    name: "New Perfume",
    brand: "",
    gender: "Unisex",
    image: "",
    imageAlt: "",
    stockStatus: "Stock var",
    inStock: true,
    externalLink: "",
    sizes: [
      { label: "15ML", ml: 15, price: 0 },
      { label: "30ML", ml: 30, price: 0 },
    ],
    noteSlugs: {
      top: [],
      heart: [],
      base: [],
    },
  };
}

function createEmptyNote(): NoteDraft {
  const uid = Date.now();
  return {
    slug: `new-note-${uid}`,
    name: "New Note",
    image: "",
    imageAlt: "",
    content: "",
  };
}

async function parseResponse(response: Response) {
  try {
    return (await response.json()) as { error?: string; [key: string]: unknown };
  } catch {
    return {} as { error?: string; [key: string]: unknown };
  }
}

export function AdminPanelClient({
  configured,
  initialAuthenticated,
  initialPerfumesJson,
  initialNotesJson,
}: AdminPanelClientProps) {
  const initialPerfumes = safeParsePerfumes(initialPerfumesJson);
  const initialNotes = safeParseNotes(initialNotesJson);

  const [view, setView] = useState<AdminView>("perfumes");
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [perfumes, setPerfumes] = useState<PerfumeDraft[]>(initialPerfumes);
  const [notes, setNotes] = useState<NoteDraft[]>(initialNotes);
  const [savedPerfumes, setSavedPerfumes] = useState<PerfumeDraft[]>(cloneDeep(initialPerfumes));
  const [savedNotes, setSavedNotes] = useState<NoteDraft[]>(cloneDeep(initialNotes));
  const [selectedPerfumeId, setSelectedPerfumeId] = useState<string>(
    initialPerfumes[0]?.id || initialPerfumes[0]?.slug || "",
  );
  const [selectedNoteSlug, setSelectedNoteSlug] = useState<string>(
    initialNotes[0]?.slug || "",
  );
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState<"perfumes" | "notes" | null>(null);
  const [dirty, setDirty] = useState(false);
  const [tokenInput, setTokenInput] = useState<{ top: string; heart: string; base: string }>({
    top: "",
    heart: "",
    base: "",
  });
  const perfumeImportRef = useRef<HTMLInputElement | null>(null);
  const noteImportRef = useRef<HTMLInputElement | null>(null);

  const cosmetics = useMemo(
    () => ({
      card: "rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_34px_rgba(24,24,24,0.06)] sm:p-6",
      input:
        "w-full rounded-2xl border border-zinc-300 bg-[#f5f5f4] px-4 py-3 text-zinc-800 outline-none transition focus:border-zinc-500 focus:bg-white",
      button:
        "inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 px-6 text-sm font-semibold text-white transition md:hover:bg-zinc-800 disabled:opacity-60",
      secondaryButton:
        "inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-6 text-sm font-semibold text-zinc-700 transition md:hover:bg-zinc-100 disabled:opacity-60",
      tab: "inline-flex min-h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition",
      softCard: "rounded-2xl border border-zinc-200 bg-zinc-50/60 p-3",
    }),
    [],
  );

  const selectedPerfume =
    perfumes.find((item) => item.id === selectedPerfumeId || item.slug === selectedPerfumeId) ||
    perfumes[0] ||
    null;
  const selectedNote = notes.find((item) => item.slug === selectedNoteSlug) || notes[0] || null;

  const filteredPerfumes = perfumes.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.slug.toLowerCase().includes(q) ||
      item.brand.toLowerCase().includes(q)
    );
  });

  const filteredNotes = notes.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return item.name.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q);
  });

  const noteSlugOptions = notes.map((item) => item.slug).sort();

  const markDirty = () => {
    setDirty(true);
  };

  const setPerfumeField = <K extends keyof PerfumeDraft>(key: K, value: PerfumeDraft[K]) => {
    if (!selectedPerfume) return;
    setPerfumes((prev) =>
      prev.map((item) =>
        item.id === selectedPerfume.id
          ? {
              ...item,
              [key]: value,
            }
          : item,
      ),
    );
    markDirty();
  };

  const setPerfumeNoteSlugs = (group: "top" | "heart" | "base", values: string[]) => {
    if (!selectedPerfume) return;
    setPerfumes((prev) =>
      prev.map((item) =>
        item.id === selectedPerfume.id
          ? {
              ...item,
              noteSlugs: {
                ...item.noteSlugs,
                [group]: values,
              },
            }
          : item,
      ),
    );
    markDirty();
  };

  const setPerfumeSizeField = (index: number, field: "ml" | "price" | "label", value: string) => {
    if (!selectedPerfume) return;

    setPerfumes((prev) =>
      prev.map((item) => {
        if (item.id !== selectedPerfume.id) {
          return item;
        }

        const nextSizes = [...item.sizes];
        const current = nextSizes[index];
        if (!current) {
          return item;
        }

        if (field === "label") {
          nextSizes[index] = { ...current, label: value };
        } else {
          const parsed = Number(value);
          nextSizes[index] = {
            ...current,
            [field]: Number.isFinite(parsed) ? parsed : 0,
          };
        }

        return { ...item, sizes: nextSizes };
      }),
    );

    markDirty();
  };

  const addPerfumeSize = () => {
    if (!selectedPerfume) return;
    setPerfumes((prev) =>
      prev.map((item) =>
        item.id === selectedPerfume.id
          ? {
              ...item,
              sizes: [...item.sizes, { ml: 100, price: 0, label: "100ML" }],
            }
          : item,
      ),
    );
    markDirty();
  };

  const removePerfumeSize = (index: number) => {
    if (!selectedPerfume) return;
    setPerfumes((prev) =>
      prev.map((item) =>
        item.id === selectedPerfume.id
          ? {
              ...item,
              sizes: item.sizes.filter((_, sizeIndex) => sizeIndex !== index),
            }
          : item,
      ),
    );
    markDirty();
  };

  const addPerfume = () => {
    const fresh = createEmptyPerfume();
    setPerfumes((prev) => [fresh, ...prev]);
    setSelectedPerfumeId(fresh.id);
    setView("perfumes");
    markDirty();
  };

  const duplicatePerfume = () => {
    if (!selectedPerfume) return;
    const cloned: PerfumeDraft = {
      ...selectedPerfume,
      id: `${selectedPerfume.id}-copy-${Date.now()}`,
      slug: `${selectedPerfume.slug}-copy-${Date.now().toString().slice(-4)}`,
      name: `${selectedPerfume.name} Copy`,
      sizes: selectedPerfume.sizes.map((size) => ({ ...size })),
      noteSlugs: {
        top: [...selectedPerfume.noteSlugs.top],
        heart: [...selectedPerfume.noteSlugs.heart],
        base: [...selectedPerfume.noteSlugs.base],
      },
    };

    setPerfumes((prev) => [cloned, ...prev]);
    setSelectedPerfumeId(cloned.id);
    markDirty();
  };

  const deletePerfume = () => {
    if (!selectedPerfume) return;
    if (!window.confirm(`Delete perfume: ${selectedPerfume.name}?`)) return;

    setPerfumes((prev) => {
      const next = prev.filter((item) => item.id !== selectedPerfume.id);
      const fallback = next[0];
      setSelectedPerfumeId(fallback ? fallback.id : "");
      return next;
    });
    markDirty();
  };

  const setNoteField = <K extends keyof NoteDraft>(key: K, value: NoteDraft[K]) => {
    if (!selectedNote) return;
    setNotes((prev) =>
      prev.map((item) =>
        item.slug === selectedNote.slug
          ? {
              ...item,
              [key]: value,
            }
          : item,
      ),
    );
    markDirty();
  };

  const uploadImage = async (file: File, folder: "perfumes" | "notes") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const response = await fetch("/api/admin/upload", {
      method: "POST",
      body: formData,
    });

    const body = await parseResponse(response);

    if (!response.ok || typeof body.url !== "string") {
      throw new Error(body.error || "Upload failed.");
    }

    return body.url;
  };

  const onUploadPerfumeImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedPerfume) {
      return;
    }

    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setUploading(true);
    setStatus("");

    try {
      const url = await uploadImage(file, "perfumes");
      setPerfumeField("image", url);
      if (!selectedPerfume.imageAlt) {
        setPerfumeField("imageAlt", selectedPerfume.name || file.name.replace(/\.[^.]+$/, ""));
      }
      setStatus("Perfume image uploaded.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      setStatus(message);
    } finally {
      setUploading(false);
    }
  };

  const onUploadNoteImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedNote) {
      return;
    }

    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setUploading(true);
    setStatus("");

    try {
      const url = await uploadImage(file, "notes");
      setNoteField("image", url);
      if (!selectedNote.imageAlt) {
        setNoteField("imageAlt", selectedNote.name || file.name.replace(/\.[^.]+$/, ""));
      }
      setStatus("Note image uploaded.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      setStatus(message);
    } finally {
      setUploading(false);
    }
  };

  const addNote = () => {
    const fresh = createEmptyNote();
    setNotes((prev) => [fresh, ...prev]);
    setSelectedNoteSlug(fresh.slug);
    setView("notes");
    markDirty();
  };

  const deleteNote = () => {
    if (!selectedNote) return;
    if (!window.confirm(`Delete note: ${selectedNote.name}?`)) return;

    setNotes((prev) => {
      const next = prev.filter((item) => item.slug !== selectedNote.slug);
      const fallback = next[0];
      setSelectedNoteSlug(fallback ? fallback.slug : "");
      return next;
    });
    markDirty();
  };

  const addTokenToGroup = (group: "top" | "heart" | "base") => {
    if (!selectedPerfume) return;
    const token = normalizeSlug(tokenInput[group]);
    if (!token) return;

    const current = selectedPerfume.noteSlugs[group];
    if (!current.includes(token)) {
      setPerfumeNoteSlugs(group, [...current, token]);
    }

    setTokenInput((prev) => ({ ...prev, [group]: "" }));
  };

  const removeTokenFromGroup = (group: "top" | "heart" | "base", token: string) => {
    if (!selectedPerfume) return;
    setPerfumeNoteSlugs(
      group,
      selectedPerfume.noteSlugs[group].filter((item) => item !== token),
    );
  };

  const cancelEditing = () => {
    const nextPerfumes = cloneDeep(savedPerfumes);
    const nextNotes = cloneDeep(savedNotes);

    setPerfumes(nextPerfumes);
    setNotes(nextNotes);

    setSelectedPerfumeId((prev) => {
      if (nextPerfumes.some((item) => item.id === prev || item.slug === prev)) {
        return prev;
      }
      return nextPerfumes[0]?.id || nextPerfumes[0]?.slug || "";
    });

    setSelectedNoteSlug((prev) => {
      if (nextNotes.some((item) => item.slug === prev)) {
        return prev;
      }
      return nextNotes[0]?.slug || "";
    });

    setDirty(false);
    setStatus("Unsaved changes discarded.");
  };

  const onLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const body = await parseResponse(response);

      if (!response.ok) {
        setStatus(body.error || "Login failed.");
        return;
      }

      const dataResponse = await fetch("/api/admin/data", { method: "GET" });
      const dataBody = await parseResponse(dataResponse);

      if (dataResponse.ok) {
        const fetchedPerfumes = JSON.stringify(dataBody.perfumes ?? [], null, 2);
        const fetchedNotes = JSON.stringify(dataBody.notes ?? [], null, 2);
        const nextPerfumes = safeParsePerfumes(fetchedPerfumes);
        const nextNotes = safeParseNotes(fetchedNotes);
        setPerfumes(nextPerfumes);
        setNotes(nextNotes);
        setSavedPerfumes(cloneDeep(nextPerfumes));
        setSavedNotes(cloneDeep(nextNotes));
        setSelectedPerfumeId(nextPerfumes[0]?.id || nextPerfumes[0]?.slug || "");
        setSelectedNoteSlug(nextNotes[0]?.slug || "");
        setDirty(false);
      }

      setAuthenticated(true);
      setPassword("");
      setStatus("Logged in.");
    } catch {
      setStatus("Login request failed. Check connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const onLogout = async () => {
    setBusy(true);
    setStatus("");

    try {
      await fetch("/api/admin/logout", {
        method: "POST",
      });

      setAuthenticated(false);
      setStatus("Logged out.");
    } catch {
      setStatus("Logout failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const onSave = async () => {
    setBusy(true);
    setStatus("");

    const perfumesPayload = perfumes.map((item) => ({
      ...item,
      slug: normalizeSlug(item.slug) || normalizeSlug(item.name),
      id: item.id || normalizeSlug(item.slug) || normalizeSlug(item.name),
    }));
    const notesPayload = notes.map((item) => ({
      ...item,
      slug: normalizeSlug(item.slug) || normalizeSlug(item.name),
    }));

    try {
      const response = await fetch("/api/admin/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perfumes: perfumesPayload, notes: notesPayload }),
      });

      const body = await parseResponse(response);

      if (!response.ok) {
        setStatus(body.error || "Save failed.");
        return;
      }

      const nextPerfumes = safeParsePerfumes(JSON.stringify(body.perfumes ?? [], null, 2));
      const nextNotes = safeParseNotes(JSON.stringify(body.notes ?? [], null, 2));
      setPerfumes(nextPerfumes);
      setNotes(nextNotes);
      setSavedPerfumes(cloneDeep(nextPerfumes));
      setSavedNotes(cloneDeep(nextNotes));
      setSelectedPerfumeId((prev) => prev || nextPerfumes[0]?.id || nextPerfumes[0]?.slug || "");
      setSelectedNoteSlug((prev) => prev || nextNotes[0]?.slug || "");
      setDirty(false);
      setStatus("Saved successfully. Public pages are revalidated.");
    } catch {
      setStatus("Save request failed. Check connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const downloadCsv = async (type: "perfumes" | "notes") => {
    setStatus("");

    try {
      const response = await fetch(`/api/admin/export?type=${type}`);
      if (!response.ok) {
        const body = await parseResponse(response);
        setStatus(body.error || "Export failed.");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-export.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus(`${type === "perfumes" ? "Perfumes" : "Notes"} CSV exported.`);
    } catch {
      setStatus("Export request failed.");
    }
  };

  const importCsv = async (type: "perfumes" | "notes", file: File) => {
    setImporting(type);
    setStatus("");

    try {
      const formData = new FormData();
      formData.append("type", type);
      formData.append("file", file);

      const response = await fetch("/api/admin/import", {
        method: "POST",
        body: formData,
      });
      const body = await parseResponse(response);

      if (!response.ok) {
        setStatus(body.error || "CSV import failed.");
        return;
      }

      const nextPerfumes = safeParsePerfumes(JSON.stringify(body.perfumes ?? [], null, 2));
      const nextNotes = safeParseNotes(JSON.stringify(body.notes ?? [], null, 2));
      setPerfumes(nextPerfumes);
      setNotes(nextNotes);
      setSavedPerfumes(cloneDeep(nextPerfumes));
      setSavedNotes(cloneDeep(nextNotes));
      setSelectedPerfumeId((prev) => prev || nextPerfumes[0]?.id || nextPerfumes[0]?.slug || "");
      setSelectedNoteSlug((prev) => prev || nextNotes[0]?.slug || "");
      setDirty(false);
      setStatus(`${type === "perfumes" ? "Perfumes" : "Notes"} CSV imported.`);
    } catch {
      setStatus("Import request failed.");
    } finally {
      setImporting(null);
    }
  };

  if (!configured) {
    return (
      <section className={cosmetics.card}>
        <h1 className="text-2xl font-semibold text-zinc-900">Admin Panel</h1>
        <p className="mt-3 text-zinc-600">Set ADMIN_PASSWORD in your environment and restart the server to enable admin access.</p>
      </section>
    );
  }

  if (!authenticated) {
    return (
      <section className={cosmetics.card}>
        <h1 className="text-2xl font-semibold text-zinc-900">Admin Login</h1>
        <p className="mt-2 text-zinc-600">Sign in to manage perfumes, notes, and all editable website data.</p>

        <form className="mt-5 space-y-3" onSubmit={onLogin}>
          <label className="block">
            <span className="mb-1.5 block text-sm text-zinc-600">Username</span>
            <input
              className={cosmetics.input}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm text-zinc-600">Password</span>
            <input
              type="password"
              className={cosmetics.input}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <button type="submit" className={cosmetics.button} disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {status ? <p className="mt-3 text-sm text-zinc-600">{status}</p> : null}
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className={cosmetics.card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Admin Workspace</h1>
            <p className="mt-2 text-zinc-600">Manage perfumes and notes from structured editors with real rows and forms.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
              {dirty ? "Unsaved changes" : "Saved"}
            </span>
            {dirty ? (
              <>
                <button className={cosmetics.button} onClick={onSave} disabled={busy || uploading || Boolean(importing)} type="button">
                  {busy ? "Saving..." : "Save changes"}
                </button>
                <button
                  className={cosmetics.secondaryButton}
                  onClick={cancelEditing}
                  disabled={busy || uploading || Boolean(importing)}
                  type="button"
                >
                  Cancel editing
                </button>
              </>
            ) : null}
            <button className={cosmetics.secondaryButton} onClick={onLogout} disabled={busy}>
              Log out
            </button>
          </div>
        </div>
      </div>

      <div className={cosmetics.card}>
        <div className="flex flex-wrap items-center gap-2">
          <button className={cosmetics.secondaryButton} type="button" onClick={() => downloadCsv("perfumes")} disabled={busy || uploading || Boolean(importing)}>
            Export Perfumes CSV
          </button>
          <button className={cosmetics.secondaryButton} type="button" onClick={() => downloadCsv("notes")} disabled={busy || uploading || Boolean(importing)}>
            Export Notes CSV
          </button>
          <button
            className={cosmetics.secondaryButton}
            type="button"
            onClick={() => perfumeImportRef.current?.click()}
            disabled={busy || uploading || Boolean(importing)}
          >
            {importing === "perfumes" ? "Importing..." : "Import Perfumes CSV"}
          </button>
          <button
            className={cosmetics.secondaryButton}
            type="button"
            onClick={() => noteImportRef.current?.click()}
            disabled={busy || uploading || Boolean(importing)}
          >
            {importing === "notes" ? "Importing..." : "Import Notes CSV"}
          </button>
          <input
            ref={perfumeImportRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) {
                importCsv("perfumes", file);
              }
            }}
          />
          <input
            ref={noteImportRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) {
                importCsv("notes", file);
              }
            }}
          />
        </div>
      </div>

      <div className={cosmetics.card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              className={[
                cosmetics.tab,
                view === "perfumes"
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white text-zinc-700 md:hover:bg-zinc-100",
              ].join(" ")}
              onClick={() => setView("perfumes")}
            >
              Perfumes
            </button>
            <button
              type="button"
              className={[
                cosmetics.tab,
                view === "notes"
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white text-zinc-700 md:hover:bg-zinc-100",
              ].join(" ")}
              onClick={() => setView("notes")}
            >
              Notes
            </button>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={view === "perfumes" ? "Search perfumes..." : "Search notes..."}
            className="h-10 w-full rounded-xl border border-zinc-300 bg-[#f5f5f4] px-3 text-sm text-zinc-800 outline-none focus:border-zinc-500 sm:w-72"
          />
        </div>

        {status ? <p className="mt-3 text-sm text-zinc-600">{status}</p> : null}

        {view === "perfumes" ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[390px_minmax(0,1fr)]">
            <div className={[
              cosmetics.softCard,
              "xl:max-h-[76vh] xl:overflow-hidden",
            ].join(" ")}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">Perfume Items</h2>
                <button className={cosmetics.secondaryButton} type="button" onClick={addPerfume}>
                  Add
                </button>
              </div>

              <div className="max-h-[58vh] space-y-2 overflow-auto pr-1 xl:max-h-[66vh]">
                {filteredPerfumes.map((item) => {
                  const active = selectedPerfume && (item.id === selectedPerfume.id || item.slug === selectedPerfume.slug);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedPerfumeId(item.id)}
                      className={[
                        "w-full rounded-xl border px-3 py-2 text-left transition",
                        active
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white text-zinc-700 md:hover:border-zinc-400",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-2">
                        <div className={[
                          "h-9 w-9 shrink-0 overflow-hidden rounded-lg border",
                          active ? "border-zinc-700 bg-zinc-800" : "border-zinc-200 bg-zinc-100",
                        ].join(" ")}>
                          {item.image ? (
                            <img src={item.image} alt={item.imageAlt || item.name} className="h-full w-full object-cover" loading="lazy" />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{item.name || "Untitled perfume"}</p>
                          <p className={active ? "mt-0.5 text-xs text-zinc-300" : "mt-0.5 text-xs text-zinc-500"}>{item.slug}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {!filteredPerfumes.length ? <p className="px-1 py-3 text-sm text-zinc-500">No perfumes found.</p> : null}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 2xl:p-6">
              {!selectedPerfume ? (
                <p className="text-zinc-500">Select a perfume to edit.</p>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-zinc-900">Perfume Editor</h3>
                    <div className="flex gap-2">
                      <button className={cosmetics.secondaryButton} type="button" onClick={duplicatePerfume}>
                        Duplicate
                      </button>
                      <button className={cosmetics.secondaryButton} type="button" onClick={deletePerfume}>
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                    <label className="block">
                      <span className="mb-1 block text-sm text-zinc-600">Name</span>
                      <input className={cosmetics.input} value={selectedPerfume.name} onChange={(event) => setPerfumeField("name", event.target.value)} />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm text-zinc-600">Brand</span>
                      <input className={cosmetics.input} value={selectedPerfume.brand} onChange={(event) => setPerfumeField("brand", event.target.value)} />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm text-zinc-600">Slug</span>
                      <input
                        className={cosmetics.input}
                        value={selectedPerfume.slug}
                        onChange={(event) => {
                          const nextSlug = normalizeSlug(event.target.value);
                          setPerfumeField("slug", nextSlug);
                          setPerfumeField("id", selectedPerfume.id || nextSlug);
                        }}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm text-zinc-600">Gender</span>
                      <input className={cosmetics.input} value={selectedPerfume.gender} onChange={(event) => setPerfumeField("gender", event.target.value)} />
                    </label>
                    <label className="block sm:col-span-2 2xl:col-span-3">
                      <span className="mb-1 block text-sm text-zinc-600">Image URL</span>
                      <input className={cosmetics.input} value={selectedPerfume.image} onChange={(event) => setPerfumeField("image", event.target.value)} />
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition md:hover:bg-zinc-100">
                          {uploading ? "Uploading..." : "Upload from PC"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={onUploadPerfumeImage}
                            disabled={uploading || busy}
                          />
                        </label>
                        <span className="text-xs text-zinc-500">PNG, JPG, WEBP, GIF up to 8MB</span>
                      </div>
                    </label>
                    <label className="block sm:col-span-2 2xl:col-span-3">
                      <span className="mb-1 block text-sm text-zinc-600">Image Alt</span>
                      <input className={cosmetics.input} value={selectedPerfume.imageAlt} onChange={(event) => setPerfumeField("imageAlt", event.target.value)} />
                    </label>
                    <label className="block sm:col-span-2 2xl:col-span-3">
                      <span className="mb-1 block text-sm text-zinc-600">External Link</span>
                      <input className={cosmetics.input} value={selectedPerfume.externalLink} onChange={(event) => setPerfumeField("externalLink", event.target.value)} />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm text-zinc-600">Stock Status Text</span>
                      <input className={cosmetics.input} value={selectedPerfume.stockStatus} onChange={(event) => setPerfumeField("stockStatus", event.target.value)} />
                    </label>
                    <label className="flex items-center gap-2 rounded-2xl border border-zinc-300 bg-[#f5f5f4] px-4 py-3 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        checked={selectedPerfume.inStock}
                        onChange={(event) => setPerfumeField("inStock", event.target.checked)}
                      />
                      In stock
                    </label>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">Sizes & Prices</h4>
                      <button className={cosmetics.secondaryButton} onClick={addPerfumeSize} type="button">
                        Add Size
                      </button>
                    </div>
                    <div className="space-y-2">
                      {selectedPerfume.sizes.map((size, index) => (
                        <div key={`${size.label}-${index}`} className="grid gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2 lg:grid-cols-[140px_1fr_1fr_auto]">
                          <input
                            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
                            value={size.label}
                            onChange={(event) => setPerfumeSizeField(index, "label", event.target.value)}
                            placeholder="15ML"
                          />
                          <input
                            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
                            type="number"
                            value={size.ml}
                            onChange={(event) => setPerfumeSizeField(index, "ml", event.target.value)}
                            placeholder="ml"
                          />
                          <input
                            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
                            type="number"
                            value={size.price}
                            onChange={(event) => setPerfumeSizeField(index, "price", event.target.value)}
                            placeholder="price"
                          />
                          <button
                            type="button"
                            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 md:hover:bg-zinc-100"
                            onClick={() => removePerfumeSize(index)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {(["top", "heart", "base"] as const).map((group) => (
                    <div key={group} className="space-y-2">
                      <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">{group} notes</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedPerfume.noteSlugs[group].map((token) => (
                          <span key={token} className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700">
                            {token}
                            <button type="button" onClick={() => removeTokenFromGroup(group, token)} className="text-zinc-500 md:hover:text-zinc-900">
                              x
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          list="note-slug-options"
                          className="w-full rounded-xl border border-zinc-300 bg-[#f5f5f4] px-3 py-2 text-sm outline-none focus:border-zinc-500"
                          value={tokenInput[group]}
                          onChange={(event) =>
                            setTokenInput((prev) => ({
                              ...prev,
                              [group]: event.target.value,
                            }))
                          }
                          placeholder={`Add ${group} note slug`}
                        />
                        <button
                          type="button"
                          className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 md:hover:bg-zinc-100"
                          onClick={() => addTokenToGroup(group)}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ))}

                  <datalist id="note-slug-options">
                    {noteSlugOptions.map((slug) => (
                      <option key={slug} value={slug} />
                    ))}
                  </datalist>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[390px_minmax(0,1fr)]">
            <div className={[
              cosmetics.softCard,
              "xl:max-h-[76vh] xl:overflow-hidden",
            ].join(" ")}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">Note Items</h2>
                <button className={cosmetics.secondaryButton} type="button" onClick={addNote}>
                  Add
                </button>
              </div>

              <div className="max-h-[58vh] space-y-2 overflow-auto pr-1 xl:max-h-[66vh]">
                {filteredNotes.map((item) => {
                  const active = selectedNote && item.slug === selectedNote.slug;
                  return (
                    <button
                      key={item.slug}
                      type="button"
                      onClick={() => setSelectedNoteSlug(item.slug)}
                      className={[
                        "w-full rounded-xl border px-3 py-2 text-left transition",
                        active
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white text-zinc-700 md:hover:border-zinc-400",
                      ].join(" ")}
                    >
                      <p className="truncate text-sm font-semibold">{item.name || "Untitled note"}</p>
                      <p className={active ? "mt-0.5 text-xs text-zinc-300" : "mt-0.5 text-xs text-zinc-500"}>{item.slug}</p>
                    </button>
                  );
                })}
                {!filteredNotes.length ? <p className="px-1 py-3 text-sm text-zinc-500">No notes found.</p> : null}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 2xl:p-6">
              {!selectedNote ? (
                <p className="text-zinc-500">Select a note to edit.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-zinc-900">Note Editor</h3>
                    <button className={cosmetics.secondaryButton} type="button" onClick={deleteNote}>
                      Delete
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                    <label className="block">
                      <span className="mb-1 block text-sm text-zinc-600">Name</span>
                      <input className={cosmetics.input} value={selectedNote.name} onChange={(event) => setNoteField("name", event.target.value)} />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm text-zinc-600">Slug</span>
                      <input
                        className={cosmetics.input}
                        value={selectedNote.slug}
                        onChange={(event) => {
                          const nextSlug = normalizeSlug(event.target.value);
                          setNoteField("slug", nextSlug);
                          setSelectedNoteSlug(nextSlug);
                        }}
                      />
                    </label>
                    <label className="block sm:col-span-2 2xl:col-span-3">
                      <span className="mb-1 block text-sm text-zinc-600">Image URL</span>
                      <input className={cosmetics.input} value={selectedNote.image} onChange={(event) => setNoteField("image", event.target.value)} />
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition md:hover:bg-zinc-100">
                          {uploading ? "Uploading..." : "Upload from PC"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={onUploadNoteImage}
                            disabled={uploading || busy}
                          />
                        </label>
                        <span className="text-xs text-zinc-500">PNG, JPG, WEBP, GIF up to 8MB</span>
                      </div>
                    </label>
                    <label className="block sm:col-span-2 2xl:col-span-3">
                      <span className="mb-1 block text-sm text-zinc-600">Image Alt</span>
                      <input className={cosmetics.input} value={selectedNote.imageAlt} onChange={(event) => setNoteField("imageAlt", event.target.value)} />
                    </label>
                    <label className="block sm:col-span-2 2xl:col-span-3">
                      <span className="mb-1 block text-sm text-zinc-600">Description</span>
                      <textarea
                        className="min-h-[180px] w-full rounded-2xl border border-zinc-300 bg-[#f5f5f4] px-4 py-3 text-zinc-800 outline-none transition focus:border-zinc-500 focus:bg-white"
                        value={selectedNote.content}
                        onChange={(event) => setNoteField("content", event.target.value)}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className={cosmetics.card}>
        <div className="flex flex-wrap items-center gap-3">
          {dirty ? (
            <>
              <button
                className={cosmetics.button}
                onClick={onSave}
                disabled={busy || uploading || Boolean(importing)}
                type="button"
              >
                {busy ? "Saving..." : "Save all changes"}
              </button>
              <button
                className={cosmetics.secondaryButton}
                onClick={cancelEditing}
                disabled={busy || uploading || Boolean(importing)}
                type="button"
              >
                Cancel editing
              </button>
            </>
          ) : null}
          <p className="text-sm text-zinc-500">Changes are persisted into admin data files and immediately used by the website.</p>
        </div>
      </div>
    </section>
  );
}
