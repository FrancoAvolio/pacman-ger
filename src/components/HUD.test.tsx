import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useGameStore } from "../store/gameStore";
import { HUD } from "./HUD";

describe("HUD", () => {
  it("renders score, high score, lives, level, and audio control", () => {
    useGameStore.setState({
      score: 120,
      highScore: 3_400,
      lives: 2,
      level: 2,
      status: "playing",
      muted: false,
    });
    render(<HUD />);
    expect(screen.getByText("000120")).toBeInTheDocument();
    expect(screen.getByText("003400")).toBeInTheDocument();
    expect(screen.getByLabelText("2 vidas").children).toHaveLength(2);
    expect(screen.getByLabelText("Nivel 2")).toHaveTextContent("Level 2");
    expect(
      screen.getByRole("button", { name: "Silenciar sonido" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("toggles mute from the persistent HUD control", async () => {
    const user = userEvent.setup();
    useGameStore.setState({ status: "playing", muted: false });
    render(<HUD />);

    await user.click(screen.getByRole("button", { name: "Silenciar sonido" }));
    expect(useGameStore.getState().muted).toBe(true);
    expect(
      screen.getByRole("button", { name: "Activar sonido" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("continues or restarts from the pause overlay", async () => {
    const user = userEvent.setup();
    useGameStore.setState({ status: "paused", score: 200, lives: 2 });
    const { rerender } = render(<HUD />);
    expect(screen.getByRole("heading", { name: "PAUSA" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(useGameStore.getState().status).toBe("playing");

    useGameStore.setState({ status: "paused" });
    rerender(<HUD />);
    await user.click(screen.getByRole("button", { name: "Reiniciar" }));
    expect(useGameStore.getState()).toMatchObject({
      status: "playing",
      score: 0,
      lives: 3,
    });
  });

  it("shows the completed level briefly and automatically prepares the next one", () => {
    const timer = vi.spyOn(window, "setTimeout");
    useGameStore.setState({
      status: "level-complete",
      level: 1,
      score: 2_210,
      lives: 2,
    });
    render(<HUD />);
    expect(screen.getByRole("heading", { name: "COMPLETO" })).toBeVisible();
    expect(screen.getByText("002210 puntos")).toBeVisible();
    expect(screen.getAllByText("Level 1")).toHaveLength(2);

    expect(timer).toHaveBeenCalledWith(expect.any(Function), 1_450);
    const completeTransition = timer.mock.calls[0][0] as () => void;
    act(() => completeTransition());
    expect(useGameStore.getState()).toMatchObject({
      status: "level-ready",
      level: 2,
      score: 2_210,
      lives: 2,
    });
  });

  it("lets the player continue from the next-level ready screen", async () => {
    const user = userEvent.setup();
    useGameStore.setState({ status: "level-ready", level: 2 });
    render(<HUD />);
    expect(
      screen.getByRole("heading", { name: "READY, GERAL?" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(useGameStore.getState().status).toBe("playing");
  });

  it("shows the exact final copy and starts a clean new campaign", async () => {
    const user = userEvent.setup();
    useGameStore.setState({
      status: "campaign-complete",
      level: 3,
      score: 4_500,
      lives: 1,
    });
    render(<HUD />);
    expect(screen.getByRole("heading", { name: "GERAL WINS ♡" })).toBeVisible();
    expect(screen.getByText("Gracias por jugar.")).toBeVisible();
    expect(screen.queryByText(/VÍA LIBRE/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Nueva partida" }));
    expect(useGameStore.getState()).toMatchObject({
      status: "playing",
      level: 1,
      score: 0,
      lives: 3,
    });
  });

  it("renders the ticket score feedback after collection", () => {
    useGameStore.setState({
      status: "playing",
      ticketPhase: "collected",
      ticketCollectionId: 4,
    });
    render(<HUD />);
    expect(screen.getByRole("status")).toHaveTextContent("+1000 · TICKET");
  });

  it("shows game over and allows a clean restart", async () => {
    const user = userEvent.setup();
    useGameStore.setState({ status: "game-over", score: 500, lives: 0 });
    render(<HUD />);
    expect(
      screen.getByRole("heading", { name: "TE CAISTE GERAL" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Intentar de nuevo" }));
    expect(useGameStore.getState()).toMatchObject({
      status: "playing",
      score: 0,
      lives: 3,
    });
  });
});
