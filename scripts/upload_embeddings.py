"""
Script to chunk portfolio.json and upload embeddings to Pinecone.

Preserves original text while creating logical, standalone chunks with metadata.
"""

import json
import os
import re
from typing import List, Dict, Any
from openai import OpenAI
from pinecone import Pinecone, ServerlessSpec


# Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT", "us-east-1")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "portfolio-embeddings")

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSION = 512  # Using smaller dimension for cost efficiency


def load_portfolio_json(file_path: str = "data/portfolio.json") -> Dict[str, Any]:
    """Load portfolio JSON file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (text or "").strip().lower()).strip("-")


def create_chunks(portfolio_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Combined, voice-preserving chunks per your spec.
    - Bio/Intro
    - Current role overview
    - Major projects (each project)
    - Healthcare roles (each role)
    - VertiGals leadership (single)
    - Personal projects (each)
    - Pets (single)
    - Creative pursuits: music, writing, visual_arts (three)
    - Technical skills (single)
    """
    chunks: List[Dict[str, Any]] = []

    about = portfolio_data.get("about_me", {})
    work = portfolio_data.get("work_experience", {})
    healthcare = portfolio_data.get("healthcare_background", {})
    volunteer = portfolio_data.get("volunteer_leadership", {})
    projects = portfolio_data.get("personal_projects", {})
    skills = portfolio_data.get("skills_and_interests", {})

    # 1) Bio/Intro
    bio_intro = "\n\n".join(filter(None, [about.get("intro"), about.get("background")]))
    if bio_intro.strip():
        chunks.append({
            "id": "bio-intro",
            "content": bio_intro,
            "type": "bio",
            "metadata": {"section": "about_me", "subsections": ["intro", "background"]}
        })

    # 2) Current role overview
    current_job = (work.get("current_job") or {}) if isinstance(work, dict) else {}
    role_overview_parts = [
        about.get("current_role"),
        current_job.get("what_i_do"),
        current_job.get("daily_variety"),
    ]
    role_overview = "\n\n".join(filter(None, role_overview_parts))
    if role_overview.strip():
        chunks.append({
            "id": "current-role-overview",
            "content": role_overview,
            "type": "current_role",
            "metadata": {
                "section": "work_experience",
                "company": current_job.get("company"),
                "team": current_job.get("team"),
            },
        })

    # 3) Major projects (each as a complete story)
    for proj in (current_job.get("major_projects") or []):
        if not isinstance(proj, dict):
            continue
        name = proj.get("name", "")
        content_parts = [
            name,
            proj.get("story"),
            proj.get("collaboration"),
            proj.get("scope"),
            proj.get("impact"),
            proj.get("what_i_learned"),
        ]
        content = "\n\n".join([p for p in content_parts if p])
        if content.strip():
            chunks.append({
                "id": f"work_project-{slugify(name) or 'unnamed'}",
                "content": content,
                "type": "work_project",
                "metadata": {
                    "section": "work_experience",
                    "company": current_job.get("company"),
                    "project_name": name,
                },
            })

    # 4) Healthcare roles (each role)
    if isinstance(healthcare, dict):
        for key, role in healthcare.items():
            if not isinstance(role, dict):
                continue
            header = " ".join(filter(None, [role.get("role") or role.get("title"), "at", role.get("organization")]))
            body_fields = [
                role.get("duration"),
                role.get("department"),
                role.get("what_i_did"),
                role.get("populations_served"),
                role.get("specialization"),
                role.get("adaptive_strategies"),
                role.get("documentation_balance"),
                role.get("key_skills_developed"),
                role.get("documentation_challenges"),
                role.get("personal_systems"),
                role.get("first_programming_spark"),
                role.get("why_it_matters"),
                role.get("story"),
                role.get("scope"),
                role.get("key_insight"),
                role.get("connection_to_current_work"),
                role.get("lasting_impact"),
            ]
            content = "\n\n".join(filter(None, [header] + body_fields))
            if content.strip():
                chunks.append({
                    "id": f"healthcare-{slugify(key)}",
                    "content": content,
                    "type": "healthcare_background",
                    "metadata": {"section": "healthcare_background", "role_key": key},
                })

    # 5) VertiGals leadership (single chunk)
    nsv = (volunteer.get("north_shore_vertigals") or {}) if isinstance(volunteer, dict) else {}
    if isinstance(nsv, dict) and nsv:
        initiatives = nsv.get("major_initiatives") or []
        initiatives_text = "\n".join(
            [f"- {i.get('name', '')}: {i.get('description', '')}" for i in initiatives if isinstance(i, dict)]
        )
        parts = [
            f"{nsv.get('role', nsv.get('title', ''))} @ {nsv.get('organization', '')}",
            nsv.get("duration"),
            nsv.get("mission"),
            nsv.get("leadership_approach"),
            nsv.get("impact"),
            nsv.get("current_reach"),
            "Major Initiatives:\n" + initiatives_text if initiatives_text else None,
        ]
        content = "\n\n".join([p for p in parts if p])
        if content.strip():
            chunks.append({
                "id": "volunteer-vertigals",
                "content": content,
                "type": "volunteer",
                "metadata": {"section": "volunteer_leadership", "organization": nsv.get("organization")},
            })

    # 6) Personal projects (each)
    if isinstance(projects, dict):
        for key, proj in projects.items():
            if not isinstance(proj, dict):
                continue
            name = proj.get("name") or key
            details_blocks = []
            # Flatten nested dicts like development_process, ai_tool_insights, etc.
            for k, v in proj.items():
                if k == "name":
                    continue
                if isinstance(v, dict):
                    nested_lines = []
                    for nk, nv in v.items():
                        if isinstance(nv, list):
                            nested_lines.append(f"{nk.replace('_',' ').title()}: {', '.join(map(str, nv))}")
                        else:
                            nested_lines.append(str(nv))
                    details_blocks.append("\n".join(nested_lines))
                elif isinstance(v, list):
                    details_blocks.append(f"{k.replace('_',' ').title()}: {', '.join(map(str, v))}")
                else:
                    details_blocks.append(str(v))
            content = "\n\n".join([name] + [b for b in details_blocks if b])
            if content.strip():
                chunks.append({
                    "id": f"personal_project-{slugify(name)}",
                    "content": content,
                    "type": "personal_project",
                    "metadata": {"section": "personal_projects", "key": key, "name": name},
                })

    # 7) Pets (single chunk)
    home_life = skills.get("home_life", {}) if isinstance(skills, dict) else {}
    pets = (home_life.get("pets") or {}) if isinstance(home_life, dict) else {}
    if isinstance(pets, dict) and pets:
        lines = [f"{k.replace('_',' ').title()}: {v}" for k, v in pets.items()]
        content = "\n\n".join(lines)
        chunks.append({
            "id": "personal-pets",
            "content": content,
            "type": "personal",
            "metadata": {"section": "skills_and_interests", "subsection": "home_life.pets"},
        })

    # 8) Creative pursuits: music, writing, visual_arts (three chunks)
    creative = skills.get("creative_pursuits", {}) if isinstance(skills, dict) else {}
    if isinstance(creative, dict):
        # music
        music = creative.get("music", {})
        if isinstance(music, dict) and music:
            music_parts = [music.get("story"),
                           f"Styles: {', '.join(music.get('styles', []))}" if isinstance(music.get('styles'), list) else None,
                           music.get("collaboration")]
            content = "\n\n".join([p for p in music_parts if p])
            if content.strip():
                chunks.append({
                    "id": "creative-music",
                    "content": content,
                    "type": "creative",
                    "metadata": {"section": "skills_and_interests", "subsection": "creative_pursuits.music"},
                })
        # writing
        writing = creative.get("writing", {})
        if isinstance(writing, dict) and writing:
            writing_parts = [writing.get("approach"), writing.get("what_i_love"), writing.get("current_focus")]
            content = "\n\n".join([p for p in writing_parts if p])
            if content.strip():
                chunks.append({
                    "id": "creative-writing",
                    "content": content,
                    "type": "creative",
                    "metadata": {"section": "skills_and_interests", "subsection": "creative_pursuits.writing"},
                })
        # visual arts
        visual = creative.get("visual_arts", {})
        if isinstance(visual, dict) and visual:
            visual_parts = [visual.get("drawing"), visual.get("jewelry_making"), visual.get("portfolio_design_inspiration")]
            content = "\n\n".join([p for p in visual_parts if p])
            if content.strip():
                chunks.append({
                    "id": "creative-visual-arts",
                    "content": content,
                    "type": "creative",
                    "metadata": {"section": "skills_and_interests", "subsection": "creative_pursuits.visual_arts"},
                })

    # 9) Technical skills (programming)
    programming = skills.get("programming", {}) if isinstance(skills, dict) else {}
    if isinstance(programming, dict) and programming:
        prog_lines: List[str] = []
        for k in ["daily_drivers", "backend_experience", "ai_tools", "learning_queue", "expertise_areas"]:
            vals = programming.get(k)
            if isinstance(vals, list) and vals:
                prog_lines.append(f"{k.replace('_',' ').title()}: {', '.join(map(str, vals))}")
        for k in ["languages_i_dislike", "workspace_setup"]:
            val = programming.get(k)
            if val:
                prog_lines.append(f"{k.replace('_',' ').title()}: {val}")
        content = "\n\n".join(prog_lines)
        if content.strip():
            chunks.append({
                "id": "skills-programming",
                "content": content,
                "type": "skills",
                "metadata": {"section": "skills_and_interests", "subsection": "programming"},
            })

    return chunks


def generate_embeddings(chunks: List[Dict[str, Any]], client: OpenAI) -> List[Dict[str, Any]]:
    """Generate embeddings for chunks using OpenAI."""
    # Filter out empty chunks
    valid_chunks = [chunk for chunk in chunks if chunk.get("content", "").strip()]
    
    if not valid_chunks:
        return []
    
    texts = [chunk["content"] for chunk in valid_chunks]
    
    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=texts,
        dimensions=EMBEDDING_DIMENSION
    )
    
    # Add embeddings to valid chunks
    for idx, chunk in enumerate(valid_chunks):
        chunk["embedding"] = response.data[idx].embedding
    
    return valid_chunks


def initialize_pinecone(index_name: str) -> Any:
    """Initialize Pinecone client and create/connect to index."""
    pc = Pinecone(api_key=PINECONE_API_KEY)
    
    # Check if index exists
    existing_indexes = [index.name for index in pc.list_indexes()]
    
    if index_name not in existing_indexes:
        print(f"Creating new index: {index_name}")
        pc.create_index(
            name=index_name,
            dimension=EMBEDDING_DIMENSION,
            metric="cosine",
            spec=ServerlessSpec(
                cloud="aws",
                region=PINECONE_ENVIRONMENT
            )
        )
    else:
        print(f"Connecting to existing index: {index_name}")
    
    return pc.Index(index_name)


def upload_to_pinecone(chunks: List[Dict[str, Any]], index: Any, batch_size: int = 100):
    """Upload chunks with embeddings to Pinecone."""
    vectors = []
    
    for chunk in chunks:
        vectors.append({
            "id": chunk["id"],
            "values": chunk["embedding"],
            "metadata": {
                "content": chunk["content"],
                "type": chunk["type"],
                **chunk["metadata"]
            }
        })
    
    # Upload in batches
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i:i + batch_size]
        index.upsert(vectors=batch)
        print(f"Uploaded batch {i // batch_size + 1}: {len(batch)} vectors")


def main():
    """Main execution function."""
    print("Starting portfolio embedding upload process...")
    
    # Validate environment variables
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY environment variable not set")
    if not PINECONE_API_KEY:
        raise ValueError("PINECONE_API_KEY environment variable not set")
    
    # Initialize clients
    openai_client = OpenAI(api_key=OPENAI_API_KEY)
    
    # Load portfolio data
    print("Loading portfolio.json...")
    portfolio_data = load_portfolio_json()
    
    # Create chunks
    print("Creating chunks from portfolio data...")
    chunks = create_chunks(portfolio_data)
    print(f"Created {len(chunks)} chunks")
    
    # Generate embeddings
    print("Generating embeddings...")
    chunks_with_embeddings = generate_embeddings(chunks, openai_client)
    print(f"Generated embeddings for {len(chunks_with_embeddings)} chunks")
    
    # Initialize Pinecone
    print("Initializing Pinecone...")
    index = initialize_pinecone(PINECONE_INDEX_NAME)
    
    # Upload to Pinecone
    print("Uploading to Pinecone...")
    upload_to_pinecone(chunks_with_embeddings, index)
    
    print("✓ Upload complete!")
    print(f"Total chunks uploaded: {len(chunks)}")


if __name__ == "__main__":
    main()
