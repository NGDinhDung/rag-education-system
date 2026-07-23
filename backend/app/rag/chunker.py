import re

from langchain_text_splitters import RecursiveCharacterTextSplitter


def split_document(
    text: str,
    chunk_size: int = 800,
    chunk_overlap: int = 150,
) -> list[dict]:
    """
    Chia văn bản thành các chunk và trích xuất page number.

    Trả về list[dict] với keys: 'content', 'page_number'
    """

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=[
            "\n\n",
            "\n",
            " ",
            "",
        ],
    )

    chunks = splitter.split_text(text)

    result = []
    current_page = 1
    for chunk in chunks:
        # Tìm page number từ marker [Trang X] trong chunk
        page_matches = re.findall(
            r"\[Trang\s+(\d+)\]",
            chunk,
        )

        if page_matches:
            current_page = int(page_matches[0])

        result.append({
            "content": chunk,
            "page_number": current_page,
        })

    return result