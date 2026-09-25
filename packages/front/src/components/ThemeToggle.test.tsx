import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "./ThemeToggle";

beforeEach(() => {
  document.documentElement.setAttribute("data-theme", "dark");
  localStorage.clear();
});

describe("ThemeToggle", () => {
  it("alterna el tema en el <html> y lo persiste en localStorage", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const btn = screen.getByRole("button");

    await user.click(btn);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("theme")).toBe("light");

    await user.click(btn);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });
});
