# /// script
# requires-python = ">=3.10"
# ///
"""Seed agtx project database from board.md.

Parses .agtx/board.md and inserts any stories not already present in the
agtx SQLite database for this project. Idempotent — safe to run repeatedly.

Usage:
    cd <project-root>
    uv run .agtx/seed_board.py
"""
import os
import platform
import re
import sqlite3
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

COLUMN_TO_STATUS = {
    "backlog": "backlog",
    "research": "research",
    "planning": "planning",
    "running": "running",
    "review": "review",
    "done": "done",
}


def find_agtx_data_dir() -> Path:
    if platform.system() == "Darwin":
        return Path.home() / "Library" / "Application Support" / "agtx"
    return Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share")) / "agtx"


def parse_board(board_path: Path) -> list[dict]:
    text = board_path.read_text()
    stories = []
    current_status = "backlog"

    for line in text.splitlines():
        # Column headers: ## Backlog, ## Done, etc.
        col_match = re.match(r"^##\s+(.+)$", line)
        if col_match:
            col_name = col_match.group(1).strip().lower()
            if col_name in COLUMN_TO_STATUS:
                current_status = COLUMN_TO_STATUS[col_name]
            continue

        # Story headers: ### STORY-01: Title
        story_match = re.match(r"^###\s+(.+)$", line)
        if story_match:
            stories.append({
                "title": story_match.group(1).strip(),
                "status": current_status,
                "description_lines": [],
            })
            continue

        # Description lines (everything between story headers)
        if stories:
            stories[-1]["description_lines"].append(line)

    # Join and clean up description text
    for story in stories:
        desc = "\n".join(story.pop("description_lines")).strip()
        # Strip bold markdown markers for cleaner storage
        desc = re.sub(r"\*\*(.+?)\*\*", r"\1", desc)
        story["description"] = desc

    return stories


def find_project_db(data_dir: Path, project_path: str) -> Path | None:
    """Match project path to its agtx database file.

    agtx stores one SQLite db per project under data_dir/projects/, but the
    filename is an opaque hash. We exploit the fact that projects in index.db
    and db files in the projects/ directory are created in the same order, so
    sorting both by creation time gives us a 1:1 positional mapping.
    """
    index_db = data_dir / "index.db"
    if not index_db.exists():
        return None

    con = sqlite3.connect(str(index_db))
    rows = con.execute(
        "SELECT id, path FROM projects ORDER BY last_opened"
    ).fetchall()
    con.close()

    if not rows:
        return None

    # Find our project's position in the registration order
    project_index = None
    for i, (_, path) in enumerate(rows):
        if path == project_path:
            project_index = i
            break

    if project_index is None:
        return None

    # Sort db files by creation time to match registration order
    projects_dir = data_dir / "projects"
    db_files = sorted(projects_dir.glob("*.db"), key=lambda p: p.stat().st_birthtime)

    if project_index < len(db_files):
        return db_files[project_index]

    return None


def seed(project_path: str) -> None:
    agtx_dir = Path(project_path) / ".agtx"
    board_path = agtx_dir / "board.md"

    if not board_path.exists():
        print(f"Error: {board_path} not found", file=sys.stderr)
        sys.exit(1)

    stories = parse_board(board_path)
    if not stories:
        print("No stories found in board.md")
        return

    data_dir = find_agtx_data_dir()
    db_path = find_project_db(data_dir, project_path)

    if not db_path:
        print(
            f"Error: No agtx project database found for {project_path}\n"
            "Run 'agtx' once first to initialize the project.",
            file=sys.stderr,
        )
        sys.exit(1)

    project_name = Path(project_path).name
    con = sqlite3.connect(str(db_path))

    existing = {
        row[0]
        for row in con.execute("SELECT title FROM tasks").fetchall()
    }

    inserted = 0
    skipped = 0
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    for story in stories:
        if story["title"] in existing:
            print(f"  skip: {story['title']}")
            skipped += 1
            continue

        con.execute(
            """INSERT INTO tasks
               (id, title, description, status, agent, project_id, plugin, created_at, updated_at, cycle)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                str(uuid.uuid4()).upper(),
                story["title"],
                story["description"],
                story["status"],
                "claude",
                project_name,
                "agtx",
                now,
                now,
                1,
            ),
        )
        print(f"  added: {story['title']} [{story['status']}]")
        inserted += 1

    con.commit()
    con.close()

    print(f"\nDone: {inserted} added, {skipped} skipped (already exist)")


if __name__ == "__main__":
    project_path = os.getcwd()
    print(f"Seeding agtx from: {project_path}/.agtx/board.md\n")
    seed(project_path)
