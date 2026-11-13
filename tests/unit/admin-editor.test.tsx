import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FIXTURE_CONTENT } from "@/components/dev/fixtures";

const saveProject = vi.fn();
vi.mock("@/lib/admin/actions", () => ({
  saveProject: (...a: unknown[]) => saveProject(...a),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
}));
// uploads need a browser Supabase client; not exercised here
vi.mock("@/lib/admin/upload", () => ({}));

const { ProjectEditor } = await import("@/components/admin/ProjectEditor");
const { categories, types } = FIXTURE_CONTENT;
const clientType = types.find((t) => t.requiresClientApproval)!;

beforeEach(() => {
  saveProject.mockReset();
  saveProject.mockResolvedValue({
    ok: true,
    data: { id: "00000000-0000-4000-8000-000000000001" },
  });
});

describe("ProjectEditor", () => {
  it("builds the slug from the title for a new project", () => {
    render(
      <ProjectEditor initial={null} categories={categories} types={types} />,
    );
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Sweet Crumbs Agent!" },
    });
    expect(screen.getByLabelText("Slug (web address)")).toHaveValue(
      "sweet-crumbs-agent",
    );
  });

  it("shows the client group for client types, with the approval checkbox", () => {
    render(
      <ProjectEditor initial={null} categories={categories} types={types} />,
    );
    expect(screen.queryByText("Client details")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Project type"), {
      target: { value: clientType.id },
    });
    expect(screen.getByText("Client details")).toBeInTheDocument();
    expect(
      screen.getByLabelText(/client approved showing this/i),
    ).not.toBeChecked();
  });

  it("refuses to publish a client project without approval (no save call)", async () => {
    render(
      <ProjectEditor initial={null} categories={categories} types={types} />,
    );
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Client Site" },
    });
    fireEvent.change(screen.getByLabelText("Project type"), {
      target: { value: clientType.id },
    });
    fireEvent.change(screen.getByLabelText("Primary category"), {
      target: { value: categories[0].id },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save & publish" }));
    expect(await screen.findByText(/can't publish yet/i)).toBeInTheDocument();
    expect(saveProject).not.toHaveBeenCalled();
  });

  it("saves a draft and reports it", async () => {
    render(
      <ProjectEditor initial={null} categories={categories} types={types} />,
    );
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Draft One" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByText(/saved as a draft/i)).toBeInTheDocument();
    expect(saveProject).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Draft One",
        slug: "draft-one",
        published: false,
      }),
    );
  });

  it("shows field errors from the server", async () => {
    saveProject.mockResolvedValue({
      ok: false,
      error: "Some fields need attention.",
      fieldErrors: { slug: "Lowercase letters, numbers and dashes only" },
    });
    render(
      <ProjectEditor initial={null} categories={categories} types={types} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(
      await screen.findByText("Lowercase letters, numbers and dashes only"),
    ).toBeInTheDocument();
  });

  it("previews the cards live and always shows the upload privacy hint", () => {
    render(
      <ProjectEditor initial={null} categories={categories} types={types} />,
    );
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Preview Me" },
    });
    expect(screen.getAllByText("Preview Me").length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getAllByText(/blur client and customer data/i).length,
    ).toBeGreaterThan(0);
  });
});
