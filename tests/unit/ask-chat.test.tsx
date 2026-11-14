import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AskChat, STARTERS } from "@/components/ask/AskChat";

const ndjson = (events: object[]) =>
  new Response(events.map((e) => JSON.stringify(e) + "\n").join(""), {
    status: 200,
  });

afterEach(() => vi.restoreAllMocks());

describe("AskChat", () => {
  it("shows starter questions and streams an answer with sources", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      ndjson([
        {
          t: "sources",
          sources: [{ title: "Sentinel", url: "/work/sentinel" }],
        },
        { t: "token", v: "Sentinel detects " },
        { t: "token", v: "violence." },
        { t: "done", answered: true, sources: 1 },
      ]),
    );
    render(<AskChat />);
    fireEvent.click(screen.getByRole("button", { name: STARTERS[2] }));

    await screen.findByText("Sentinel detects violence.");
    const link = await screen.findByRole("link", { name: "Sentinel" });
    expect(link).toHaveAttribute("href", "/work/sentinel");
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body).toEqual({ question: STARTERS[2] });
  });

  it("submits typed questions and clears the box", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      ndjson([
        { t: "token", v: "Hi." },
        { t: "done", answered: true, sources: 0 },
      ]),
    );
    render(<AskChat />);
    const input = screen.getByLabelText(/ask a question/i);
    fireEvent.change(input, { target: { value: "Who is Rafay?" } });
    fireEvent.submit(input.closest("form")!);
    await screen.findByText("Hi.");
    expect(input).toHaveValue("");
  });

  it("explains a rate limit and an unavailable assistant", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockResolvedValueOnce(
      Response.json({ error: "Slow down a little." }, { status: 429 }),
    );
    render(<AskChat />);
    fireEvent.click(screen.getByRole("button", { name: STARTERS[0] }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Slow down a little.",
    );

    fetchMock.mockResolvedValueOnce(
      Response.json({ error: "unavailable" }, { status: 503 }),
    );
    fireEvent.click(screen.getByRole("button", { name: STARTERS[1] }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/isn't available/i),
    );
  });

  it("does not send an empty question", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(<AskChat />);
    expect(screen.getByRole("button", { name: "Ask" })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
