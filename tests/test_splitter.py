from rag.splitter import LegalTextSplitter


def test_legal_text_splitter_splits_on_indian_law_headers() -> None:
    text = """
CHAPTER I
Preliminary
Section 1: Title and extent of operation of the Code. This Act shall be called the Indian Penal Code.
Section 2: Punishment of offences committed within India. Every person shall be liable to punishment under this Code.
Article 21
No person shall be deprived of his life or personal liberty except according to procedure established by law.
""".strip()

    splitter = LegalTextSplitter(chunk_size=500, chunk_overlap=0)
    chunks = splitter.split_text(text)

    assert len(chunks) == 4

    assert chunks[0].startswith("CHAPTER I")
    assert "Preliminary" in chunks[0]

    assert chunks[1].startswith("Section 1")
    assert "Title and extent of operation of the Code" in chunks[1]

    assert chunks[2].startswith("Section 2")
    assert "Punishment of offences committed within India" in chunks[2]

    assert chunks[3].startswith("Article 21")
    assert "personal liberty" in chunks[3]
