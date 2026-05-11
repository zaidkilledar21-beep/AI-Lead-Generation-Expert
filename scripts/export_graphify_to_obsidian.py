#!/usr/bin/env python3
"""
Export Graphify graph.json into Obsidian-friendly Markdown notes.

Usage:
  python scripts/export_graphify_to_obsidian.py --graph graphify-out/graph.json --out docs/obsidian-vault/10_Graphify

What it creates:
  docs/obsidian-vault/10_Graphify/
    Graphify Index.md
    Communities/
    Nodes/

Notes:
- This is a generated Obsidian layer. Keep curated notes separate.
- Re-run after `graphify extract` or `graphify update`.
- The script is intentionally schema-tolerant because Graphify JSON structures may vary by version.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


def load_graph(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("Expected graph.json root to be a JSON object.")
    return data


def find_collection(data: dict[str, Any], names: list[str]) -> list[Any]:
    for name in names:
        value = data.get(name)
        if isinstance(value, list):
            return value

    for container_name in ["graph", "data", "result"]:
        container = data.get(container_name)
        if isinstance(container, dict):
            for name in names:
                value = container.get(name)
                if isinstance(value, list):
                    return value

    return []


def first_value(obj: dict[str, Any], keys: list[str], default: str = "") -> str:
    for key in keys:
        value = obj.get(key)
        if value is not None and value != "":
            return str(value)
    return default


def node_id(node: dict[str, Any], index: int) -> str:
    return first_value(
        node,
        ["id", "key", "node_id", "uid", "name", "label", "title", "qualified_name", "path"],
        f"node-{index}",
    )


def node_label(node: dict[str, Any], fallback_id: str) -> str:
    return first_value(
        node,
        ["label", "name", "title", "qualified_name", "symbol", "path", "file", "filepath"],
        fallback_id,
    )


def node_type(node: dict[str, Any]) -> str:
    return first_value(node, ["type", "kind", "category", "node_type", "entity_type"], "Unknown")


def node_community(node: dict[str, Any]) -> str:
    return first_value(node, ["community", "community_id", "cluster", "group", "module"], "Unassigned")


def edge_source(edge: dict[str, Any]) -> str:
    return first_value(edge, ["source", "from", "src", "start", "source_id"])


def edge_target(edge: dict[str, Any]) -> str:
    return first_value(edge, ["target", "to", "dst", "end", "target_id"])


def edge_relation(edge: dict[str, Any]) -> str:
    return first_value(edge, ["relation", "type", "kind", "label", "edge_type"], "related_to")


def slugify(value: str, max_len: int = 90) -> str:
    value = value.replace("\\", "/")
    value = re.sub(r"[^A-Za-z0-9._()#@+ -]+", "-", value)
    value = re.sub(r"\s+", " ", value).strip()
    value = value.strip(". ")
    if not value:
        value = "untitled"
    return value[:max_len].rstrip(". ")


def unique_filename(base: str, used: set[str]) -> str:
    stem = slugify(base)
    candidate = f"{stem}.md"
    if candidate not in used:
        used.add(candidate)
        return candidate
    i = 2
    while True:
        candidate = f"{stem} {i}.md"
        if candidate not in used:
            used.add(candidate)
            return candidate
        i += 1


def md_escape(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", " ").strip()


def yaml_safe(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def wikilink(path_without_ext: str, label: str | None = None) -> str:
    if label and label != path_without_ext:
        return f"[[{path_without_ext}|{label}]]"
    return f"[[{path_without_ext}]]"


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.rstrip() + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--graph", required=True, help="Path to graphify-out/graph.json")
    parser.add_argument("--out", required=True, help="Output folder inside Obsidian vault")
    parser.add_argument("--max-edges", type=int, default=35, help="Max outgoing/incoming links to include per node note")
    args = parser.parse_args()

    graph_path = Path(args.graph)
    out_dir = Path(args.out)
    nodes_dir = out_dir / "Nodes"
    communities_dir = out_dir / "Communities"

    data = load_graph(graph_path)
    nodes_raw = find_collection(data, ["nodes", "vertices", "entities"])
    edges_raw = find_collection(data, ["edges", "links", "relations"])

    if not nodes_raw:
        raise ValueError("Could not find nodes in graph.json. Expected a list under nodes/vertices/entities.")

    nodes: dict[str, dict[str, Any]] = {}
    labels: dict[str, str] = {}
    note_paths: dict[str, str] = {}
    used_files: set[str] = set()

    for i, raw in enumerate(nodes_raw):
        if not isinstance(raw, dict):
            continue
        nid = node_id(raw, i)
        label = node_label(raw, nid)
        nodes[nid] = raw
        labels[nid] = label
        filename = unique_filename(label, used_files)
        note_paths[nid] = f"10_Graphify/Nodes/{filename[:-3]}"

    outgoing: dict[str, list[tuple[str, str]]] = defaultdict(list)
    incoming: dict[str, list[tuple[str, str]]] = defaultdict(list)

    for raw in edges_raw:
        if not isinstance(raw, dict):
            continue
        src = edge_source(raw)
        tgt = edge_target(raw)
        rel = edge_relation(raw)
        if src and tgt:
            outgoing[src].append((rel, tgt))
            incoming[tgt].append((rel, src))

    communities: dict[str, list[str]] = defaultdict(list)
    type_counter: Counter[str] = Counter()

    for nid, raw in nodes.items():
        communities[node_community(raw)].append(nid)
        type_counter[node_type(raw)] += 1

    top_types = "\n".join(f"- `{md_escape(k)}`: {v}" for k, v in type_counter.most_common(20))
    community_links = "\n".join(
        f"- [[10_Graphify/Communities/Community {slugify(str(comm))}|Community {comm}]] ({len(member_ids)} nodes)"
        for comm, member_ids in sorted(communities.items(), key=lambda item: str(item[0]))
    )

    index = f"""# Graphify Index

Tags: #graphify #generated #codex

Generated from: `{graph_path.as_posix()}`

## Summary

- Nodes: {len(nodes)}
- Edges: {len(edges_raw)}
- Communities: {len(communities)}

## Node types

{top_types or "- Unknown"}

## Communities

{community_links}

## Usage for Codex

Use this generated layer to shortlist relevant files/symbols before opening raw source.

Recommended prompt prefix:

```text
Read AGENTS.md, status.md, docs/obsidian-vault/00_Index/CRM Knowledge Graph Index.md, and docs/obsidian-vault/10_Graphify/Graphify Index.md first.

Use Graphify/Obsidian links to shortlist files before opening raw source.
Do not reread the whole repo.
```

## Important

This folder is generated. Curated project knowledge should stay in the main vault folders.
"""
    write(out_dir / "Graphify Index.md", index)

    for comm, member_ids in sorted(communities.items(), key=lambda item: str(item[0])):
        members = sorted(member_ids, key=lambda nid: labels.get(nid, nid).lower())
        rows = []
        for nid in members:
            raw = nodes[nid]
            label = labels[nid]
            ntype = node_type(raw)
            rows.append(f"- {wikilink(note_paths[nid], label)} — `{md_escape(ntype)}`")

        content = f"""# Community {comm}

Tags: #graphify #community #generated

## Members

{chr(10).join(rows) if rows else "- None"}

## Notes

Generated from Graphify community/cluster metadata.
"""
        write(communities_dir / f"Community {slugify(str(comm))}.md", content)

    for nid, raw in nodes.items():
        label = labels[nid]
        ntype = node_type(raw)
        comm = node_community(raw)

        relevant_fields = []
        for key in ["path", "file", "filepath", "source", "source_path", "qualified_name", "symbol", "summary", "description"]:
            if key in raw and raw[key] not in (None, ""):
                relevant_fields.append(f"- `{key}`: {md_escape(str(raw[key]))}")

        out_edges = outgoing.get(nid, [])[: args.max_edges]
        in_edges = incoming.get(nid, [])[: args.max_edges]

        out_lines = []
        for rel, tgt in out_edges:
            tgt_label = labels.get(tgt, tgt)
            tgt_path = note_paths.get(tgt)
            if tgt_path:
                out_lines.append(f"- `{md_escape(rel)}` → {wikilink(tgt_path, tgt_label)}")
            else:
                out_lines.append(f"- `{md_escape(rel)}` → `{md_escape(tgt)}`")

        in_lines = []
        for rel, src in in_edges:
            src_label = labels.get(src, src)
            src_path = note_paths.get(src)
            if src_path:
                in_lines.append(f"- {wikilink(src_path, src_label)} → `{md_escape(rel)}`")
            else:
                in_lines.append(f"- `{md_escape(src)}` → `{md_escape(rel)}`")

        content = f"""---
graphify_id: {yaml_safe(nid)}
graphify_type: {yaml_safe(ntype)}
graphify_community: {yaml_safe(str(comm))}
tags:
  - graphify
  - generated
---

# {label}

## Metadata

- Type: `{md_escape(ntype)}`
- Community: [[10_Graphify/Communities/Community {slugify(str(comm))}|Community {comm}]]

## Source fields

{chr(10).join(relevant_fields) if relevant_fields else "- No source fields exposed in graph metadata."}

## Outgoing relationships

{chr(10).join(out_lines) if out_lines else "- None recorded."}

## Incoming relationships

{chr(10).join(in_lines) if in_lines else "- None recorded."}

## Codex note

Use this node to identify likely source files/symbols. Read exact source files before editing.
"""
        write(nodes_dir / f"{note_paths[nid].split('/')[-1]}.md", content)

    print(f"Exported {len(nodes)} nodes, {len(edges_raw)} edges, and {len(communities)} communities to {out_dir}")


if __name__ == "__main__":
    main()
