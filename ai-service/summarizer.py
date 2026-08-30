import re


def summarize(text: str) -> str:
    from assistant import _llm

    llm = _llm(
        "Summarize into a short 'Key Points' bullet list. No fluff.",
        text or "",
    )
    if llm:
        return llm
    blob = (text or "").replace("\n", ". ")
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", blob) if len(s.strip()) > 20]
    if not sentences:
        return "Key Points\n- Nothing substantial to extract."
    keywords = re.compile(
        r"deadline|must|need|pending|friday|tomorrow|api|review|test|interview",
        re.I,
    )
    scored = sorted(
        sentences,
        key=lambda s: len(keywords.findall(s)) + min(len(s), 140) / 140,
        reverse=True,
    )
    top = scored[:5]
    return "Key Points\n" + "\n".join(f"- {s}" for s in top)