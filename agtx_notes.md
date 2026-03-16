# Notes

curl -fsSL https://raw.githubusercontent.com/fynnfluegge/agtx/main/install.sh | bash
agtx # interactive mode
agtx -g # Dashboard mode
agtx --experimental. # autonomous agent mode


⏺ ★ Insight ─────────────────────────────────────
  agtx is a CLI tool (by fynnfluegge) that orchestrates Claude Code agents using git worktrees for
  isolation. It creates a .agtx/ directory with a kanban board (board.md), skills, and worktrees
  where agents work independently. Think of it as a project manager layer on top of Claude Code.
  ─────────────────────────────────────────────────

  State of the agtx application

  Not done — it's only finished planning. Here's what happened:

  1. agtx was initialized in ex_2_agtx_basic/ and created a worktree (4c0261ab-Say-Hello)
  2. A planning/orchestration pass ran — it read the PRD, SDD, AGENTS.md, and all 5 OpenSpec specs,
  then produced a kanban board (board.md) with 12 stories
  3. Zero implementation was done — all 12 stories sit in the Backlog column. No stories are in
  Running, Review, or Done.

  The worktree contains a full copy of the repo with the existing ex_1_foundry_basic code (which was
   built separately), but no new code was written by agtx.

  The 12 planned stories (all Backlog):

  ┌───────┬───────────────────────────────┬─────────┐
  │   #   │             Story             │ Status  │
  ├───────┼───────────────────────────────┼─────────┤
  │ 01    │ Game Types & Config Constants │ Backlog │
  ├───────┼───────────────────────────────┼─────────┤
  │ 02    │ Game Service (Core Logic)     │ Backlog │
  ├───────┼───────────────────────────────┼─────────┤
  │ 03    │ Keyboard Input Handler        │ Backlog │
  ├───────┼───────────────────────────────┼─────────┤
  │ 04    │ Touch Input Handler           │ Backlog │
  ├───────┼───────────────────────────────┼─────────┤
  │ 05    │ Color Constants               │ Backlog │
  ├───────┼───────────────────────────────┼─────────┤
  │ 06    │ Canvas Renderer               │ Backlog │
  ├───────┼───────────────────────────────┼─────────┤
  │ 07    │ App Wiring & Module Barrels   │ Backlog │
  ├───────┼───────────────────────────────┼─────────┤
  │ 08-12 │ All test stories              │ Backlog │
  └───────┴───────────────────────────────┴─────────┘

  The execute.md confirms: "No code was implemented — this was a documentation/planning task."

  To actually build the snake game via agtx, you'd need to run agtx again (likely agtx
  --experimental for autonomous mode) to move stories from Backlog → Running → Done.