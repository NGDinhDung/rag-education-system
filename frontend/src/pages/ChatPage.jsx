import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Bot,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  FileText,
  LoaderCircle,
  MessageSquareText,
  Send,
  User,
  X,
} from "lucide-react";

import ReactMarkdown from "react-markdown";

import axiosClient from "../api/axiosClient";
import AppLayout from "../components/AppLayout";
import ChatSidebar from "../components/ChatSidebar";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();


const createWelcomeMessage = () => ({
  id: crypto.randomUUID(),
  role: "assistant",
  content:
    "Xin chào! Hãy chọn tài liệu hoặc để chế độ tất cả tài liệu, sau đó đặt câu hỏi.",
  sources: [],
  createdAt: new Date().toISOString(),
  responseTime: null,
  chunkCount: 0,
  documentCount: 0,
  model: null,
  temperature: null,
});


const sanitizeDomId = (value) =>
  String(value).replace(
    /[^a-zA-Z0-9-_]/g,
    "-"
  );


function ChatPage() {
  const [documents, setDocuments] =
    useState([]);

  const [
    selectedDocumentId,
    setSelectedDocumentId,
  ] = useState("");

  const [
    activeSessionId,
    setActiveSessionId,
  ] = useState(null);

  const [
    sessionRefreshKey,
    setSessionRefreshKey,
  ] = useState(0);

  const [question, setQuestion] =
    useState("");

  const [messages, setMessages] = useState([
    createWelcomeMessage(),
  ]);

  const [
    loadingDocuments,
    setLoadingDocuments,
  ] = useState(true);

  const [
    loadingSession,
    setLoadingSession,
  ] = useState(false);

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    copiedMessageId,
    setCopiedMessageId,
  ] = useState(null);

  const [
    highlightedSourceId,
    setHighlightedSourceId,
  ] = useState(null);

  const messagesEndRef = useRef(null);

  const pdfBlobUrlRef = useRef(null);

  const [pdfViewer, setPdfViewer] = useState({
    open: false,
    loading: false,
    url: "",
    title: "",
    documentId: null,
    error: "",
  });

  const [pdfPageNumber, setPdfPageNumber] = useState(1);
  const [pdfNumPages, setPdfNumPages] = useState(null);


  // =====================================================
  // TẢI DANH SÁCH TÀI LIỆU
  // =====================================================

  useEffect(() => {
    const fetchDocuments = async () => {
      setLoadingDocuments(true);
      setError("");

      try {
        const response =
          await axiosClient.get("/documents");

        const items =
          response.data?.documents ??
          response.data ??
          [];

        setDocuments(
          Array.isArray(items)
            ? items
            : []
        );
      } catch (requestError) {
        setError(
          requestError.response?.data?.detail ||
            "Không thể tải danh sách tài liệu."
        );
      } finally {
        setLoadingDocuments(false);
      }
    };

    fetchDocuments();
  }, []);


  // =====================================================
  // TỰ ĐỘNG CUỘN XUỐNG CUỐI
  // =====================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [
    messages,
    sending,
    loadingSession,
  ]);


  // =====================================================
  // DỌN URL PDF KHI RỜI TRANG
  // =====================================================

  useEffect(() => {
    return () => {
      if (pdfBlobUrlRef.current) {
        URL.revokeObjectURL(
          pdfBlobUrlRef.current
        );

        pdfBlobUrlRef.current = null;
      }
    };
  }, []);


  // =====================================================
  // ĐỊNH DẠNG THỜI GIAN
  // =====================================================

  const formatMessageTime = (value) => {
    if (!value) {
      return "";
    }

    const parsedDate = new Date(value);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "";
    }

    return parsedDate.toLocaleTimeString(
      "vi-VN",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };


  // =====================================================
  // LẤY TÊN TÀI LIỆU TỪ DANH SÁCH
  // =====================================================

  const getDocumentNameFromList = (
    documentId
  ) => {
    if (documentId == null) {
      return null;
    }

    const matchedDocument =
      documents.find(
        (item) =>
          Number(item.id) ===
          Number(documentId)
      );

    if (!matchedDocument) {
      return null;
    }

    return (
      matchedDocument.title ||
      matchedDocument.filename ||
      matchedDocument.original_filename ||
      matchedDocument.original_file_name ||
      null
    );
  };


  // =====================================================
  // LẤY TÊN TÀI LIỆU TỪ NGUỒN
  // =====================================================

  const getSourceDocumentName = (
    source
  ) => {
    const backendName =
      source.document_title ||
      source.document_filename ||
      source.original_file_name ||
      source.original_filename ||
      source.filename ||
      source.title;

    if (
      backendName &&
      String(backendName).trim()
    ) {
      return String(
        backendName
      ).trim();
    }

    const frontendName =
      getDocumentNameFromList(
        source.document_id
      );

    if (frontendName) {
      return frontendName;
    }

    if (
      source.document_id != null
    ) {
      return `Tài liệu ${source.document_id}`;
    }

    return "Tài liệu không xác định";
  };


  // =====================================================
  // CHUẨN HÓA DANH SÁCH NGUỒN
  // =====================================================

  const normalizeSources = (
    sources
  ) => {
    if (!Array.isArray(sources)) {
      return [];
    }

    return sources.map(
      (source, index) => ({
        ...source,

        source_number:
          source.source_number ??
          source.sourceNumber ??
          index + 1,

        document_id:
          source.document_id ??
          source.documentId ??
          null,

        document_title:
          source.document_title ??
          source.documentTitle ??
          null,

        document_filename:
          source.document_filename ??
          source.documentFilename ??
          source.original_file_name ??
          source.original_filename ??
          source.filename ??
          null,

        chunk_id:
          source.chunk_id ??
          source.chunkId ??
          null,

        chunk_index:
          source.chunk_index ??
          source.chunkIndex ??
          null,

        page_number:
          source.page_number ??
          source.pageNumber ??
          null,

        vector_id:
          source.vector_id ??
          source.vectorId ??
          null,

        content:
          source.content ??
          source.text ??
          "",

        score:
          source.score ??
          source.similarity_score ??
          source.similarityScore ??
          null,
      })
    );
  };


  // =====================================================
  // CHUẨN HÓA DANH SÁCH TIN NHẮN
  // =====================================================

  const normalizeMessages = (
    items
  ) => {
    if (!Array.isArray(items)) {
      return [];
    }

    return items.map((message) => {
      const normalizedSources =
        normalizeSources(
          message.sources
        );

      const calculatedDocumentCount =
        new Set(
          normalizedSources
            .map(
              (source) =>
                source.document_id
            )
            .filter(
              (documentId) =>
                documentId != null
            )
        ).size;

      return {
        id:
          message.id ??
          message.message_id ??
          crypto.randomUUID(),

        role:
          message.role === "user"
            ? "user"
            : "assistant",

        content:
          message.content ?? "",

        sources:
          normalizedSources,

        createdAt:
          message.created_at ??
          message.createdAt ??
          null,

        isError:
          message.is_error ??
          message.isError ??
          false,

        responseTime:
          message.response_time_seconds ??
          message.responseTime ??
          null,

        chunkCount:
          message.chunk_count ??
          message.chunkCount ??
          normalizedSources.length,

        documentCount:
          message.document_count ??
          message.documentCount ??
          calculatedDocumentCount,

        model:
          message.model ??
          null,

        temperature:
          message.temperature ??
          null,
      };
    });
  };


  // =====================================================
  // TẠO ID DUY NHẤT CHO NGUỒN
  // =====================================================

  const getSourceElementId = (
    messageId,
    sourceNumber
  ) =>
    `source-${sanitizeDomId(
      messageId
    )}-${sourceNumber}`;


  // =====================================================
  // CHUYỂN TRÍCH DẪN THÀNH MARKDOWN LINK
  // =====================================================

  const createCitationMarkdown = (
    content,
    messageId
  ) => {
    if (!content) {
      return "";
    }

    const safeMessageId =
      sanitizeDomId(messageId);

    let convertedContent =
      String(content);

    convertedContent =
      convertedContent.replace(
        /\[Nguồn\s+(\d+)\]/gi,
        (_, sourceNumber) =>
          `[Nguồn ${sourceNumber}]` +
          `(#source-${safeMessageId}` +
          `-${sourceNumber})`
      );

    convertedContent =
      convertedContent.replace(
        /(?<!Nguồn\s)\[(\d+)\](?!\()/g,
        (_, sourceNumber) =>
          `[${sourceNumber}]` +
          `(#source-${safeMessageId}` +
          `-${sourceNumber})`
      );

    return convertedContent;
  };


  // =====================================================
  // XỬ LÝ KHI NHẤN TRÍCH DẪN
  // =====================================================

  const handleCitationClick = (event, href, message) => {
    if (!href || !href.startsWith("#source-")) {
      return;
    }
    event.preventDefault();

    const sourceId = href.slice(1);
    const parts = href.split("-");
    const sourceNumber = parseInt(parts[parts.length - 1], 10);
    
    const source = message?.sources?.find(
      s => s.source_number === sourceNumber || s.sourceNumber === sourceNumber
    );

    if (source && source.document_id != null) {
      const pageNum = Number(source.page_number) > 0 ? Number(source.page_number) : 1;
      setPdfPageNumber(pageNum);
      
      if (!pdfViewer.open || pdfViewer.documentId !== source.document_id) {
        handleOpenSourceDocument(source);
      }
    } else {
      const sourceElement = document.getElementById(sourceId);
      if (!sourceElement) {
        setError("Không tìm thấy nguồn tham khảo tương ứng.");
        return;
      }

      if (sourceElement.tagName.toLowerCase() === "details") {
        sourceElement.open = true;
      }

      setHighlightedSourceId(sourceId);
      sourceElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      window.setTimeout(() => {
        setHighlightedSourceId((currentId) =>
          currentId === sourceId ? null : currentId
        );
      }, 2200);
    }
  };


  // =====================================================
  // CHỌN CUỘC TRÒ CHUYỆN
  // =====================================================

  const handleSelectSession = async (
    sessionId
  ) => {
    if (
      sending ||
      loadingSession
    ) {
      return;
    }

    setActiveSessionId(sessionId);
    setLoadingSession(true);
    setError("");
    setCopiedMessageId(null);
    setHighlightedSourceId(null);

    try {
      const response =
        await axiosClient.get(
          `/chat/sessions/${sessionId}`
        );

      const loadedMessages =
        normalizeMessages(
          response.data?.messages
        );

      setMessages(
        loadedMessages.length > 0
          ? loadedMessages
          : [
              createWelcomeMessage(),
            ]
      );
    } catch (requestError) {
      const detail =
        requestError.response?.data
          ?.detail ||
        "Không thể tải nội dung cuộc trò chuyện.";

      setError(detail);

      setMessages([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            `Đã xảy ra lỗi: ${detail}`,
          sources: [],
          isError: true,
          createdAt:
            new Date().toISOString(),
          responseTime: null,
          chunkCount: 0,
          documentCount: 0,
          model: null,
          temperature: null,
        },
      ]);
    } finally {
      setLoadingSession(false);
    }
  };


  // =====================================================
  // TẠO CUỘC TRÒ CHUYỆN MỚI
  // =====================================================

  const handleCreateNewChat = () => {
    if (sending) {
      return;
    }

    setActiveSessionId(null);
    setQuestion("");
    setError("");
    setCopiedMessageId(null);
    setHighlightedSourceId(null);

    setMessages([
      createWelcomeMessage(),
    ]);
  };


  // =====================================================
  // XÓA CUỘC TRÒ CHUYỆN
  // =====================================================

  const handleDeleteSession = (
    deletedSessionId
  ) => {
    if (
      Number(activeSessionId) ===
      Number(deletedSessionId)
    ) {
      handleCreateNewChat();
    }
  };


  // =====================================================
  // SAO CHÉP CÂU TRẢ LỜI
  // =====================================================

  const handleCopyMessage = async (
    messageId,
    content
  ) => {
    try {
      await navigator.clipboard.writeText(
        content || ""
      );

      setCopiedMessageId(
        messageId
      );

      window.setTimeout(() => {
        setCopiedMessageId(null);
      }, 1800);
    } catch {
      setError(
        "Trình duyệt không cho phép sao chép nội dung."
      );
    }
  };


  // =====================================================
  // GỬI CÂU HỎI
  // =====================================================

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    const trimmedQuestion =
      question.trim();

    if (
      !trimmedQuestion ||
      sending ||
      loadingSession
    ) {
      return;
    }

    setError("");

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedQuestion,
      sources: [],
      createdAt:
        new Date().toISOString(),
      responseTime: null,
      chunkCount: 0,
      documentCount: 0,
      model: null,
      temperature: null,
    };

    setMessages(
      (currentMessages) => [
        ...currentMessages,
        userMessage,
      ]
    );

    setQuestion("");
    setSending(true);

    try {
      const payload = {
        question:
          trimmedQuestion,

        document_id:
          selectedDocumentId
            ? Number(
                selectedDocumentId
              )
            : null,

        conversation_id:
          activeSessionId
            ? Number(
                activeSessionId
              )
            : null,

        limit: 5,
      };

      const response =
        await axiosClient.post(
          "/chat",
          payload
        );

      const returnedSessionId =
        response.data
          ?.conversation_id ??
        response.data?.session_id ??
        response.data
          ?.chat_session_id ??
        null;

      if (returnedSessionId) {
        setActiveSessionId(
          Number(
            returnedSessionId
          )
        );
      }

      const normalizedSources =
        normalizeSources(
          response.data?.sources
        );

      const assistantMessage = {
        id:
          response.data
            ?.message_id ??
          crypto.randomUUID(),

        role: "assistant",

        content:
          response.data?.answer ||
          "Không nhận được câu trả lời từ hệ thống.",

        sources:
          normalizedSources,

        responseTime:
          response.data
            ?.response_time_seconds ??
          null,

        chunkCount:
          response.data
            ?.chunk_count ??
          normalizedSources.length,

        documentCount:
          response.data
            ?.document_count ??
          new Set(
            normalizedSources
              .map(
                (source) =>
                  source.document_id
              )
              .filter(
                (documentId) =>
                  documentId != null
              )
          ).size,

        model:
          response.data?.model ??
          null,

        temperature:
          response.data
            ?.temperature ??
          null,

        createdAt:
          new Date().toISOString(),

        isError: false,
      };

      setMessages(
        (currentMessages) => [
          ...currentMessages,
          assistantMessage,
        ]
      );

      setSessionRefreshKey(
        (currentKey) =>
          currentKey + 1
      );
    } catch (requestError) {
      const detail =
        requestError.response?.data
          ?.detail ||
        "Không thể xử lý câu hỏi.";

      setError(detail);

      setMessages(
        (currentMessages) => [
          ...currentMessages,
          {
            id:
              crypto.randomUUID(),

            role:
              "assistant",

            content:
              `Đã xảy ra lỗi: ${detail}`,

            sources: [],

            isError: true,

            createdAt:
              new Date().toISOString(),

            responseTime: null,
            chunkCount: 0,
            documentCount: 0,
            model: null,
            temperature: null,
          },
        ]
      );
    } finally {
      setSending(false);
    }
  };


  // =====================================================
  // NHẤN ENTER ĐỂ GỬI
  // =====================================================

  const handleKeyDown = (
    event
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      handleSubmit(event);
    }
  };


  // =====================================================
  // MỞ TÀI LIỆU NGUỒN
  // =====================================================

  const handleOpenSourceDocument = async (
    source
  ) => {
    const documentId =
      source.document_id;

    if (documentId == null) {
      setError(
        "Nguồn này không có thông tin tài liệu."
      );
      return;
    }

    const documentTitle =
      getSourceDocumentName(source);

    const parsedPageNumber =
      Number(source.page_number);

    const pageNumber =
      Number.isFinite(parsedPageNumber) &&
      parsedPageNumber > 0
        ? parsedPageNumber
        : 1;

    setPdfPageNumber(pageNumber);

    setPdfViewer({
      open: true,
      loading: true,
      url: "",
      title: documentTitle,
      documentId,
      error: "",
    });

    try {
      const response =
        await axiosClient.get(
          `/documents/${documentId}/file`,
          {
            responseType: "blob",
          }
        );

      const contentType =
        response.headers?.[
          "content-type"
        ] ||
        response.data?.type ||
        "";

      const isPdf =
        contentType.includes(
          "application/pdf"
        ) ||
        documentTitle
          .toLowerCase()
          .endsWith(".pdf");

      const blob = new Blob(
        [response.data],
        {
          type:
            contentType ||
            "application/octet-stream",
        }
      );

      if (pdfBlobUrlRef.current) {
        URL.revokeObjectURL(
          pdfBlobUrlRef.current
        );
      }

      const blobUrl =
        URL.createObjectURL(blob);

      pdfBlobUrlRef.current =
        blobUrl;

      if (!isPdf) {
        const downloadLink =
          document.createElement("a");

        downloadLink.href =
          blobUrl;

        downloadLink.download =
          documentTitle ||
          "tai-lieu";

        document.body.appendChild(
          downloadLink
        );

        downloadLink.click();
        downloadLink.remove();

        window.setTimeout(() => {
          if (
            pdfBlobUrlRef.current ===
            blobUrl
          ) {
            URL.revokeObjectURL(
              blobUrl
            );

            pdfBlobUrlRef.current =
              null;
          }
        }, 1000);

        setPdfViewer({
          open: false,
          loading: false,
          url: "",
          title: "",
          documentId: null,
          error: "",
        });

        return;
      }

      setPdfViewer({
        open: true,
        loading: false,
        url: blobUrl,
        title: documentTitle,
        documentId,
        error: "",
      });
    } catch (requestError) {
      let detail =
        "Không thể mở tài liệu nguồn.";

      const responseData =
        requestError.response?.data;

      if (
        responseData instanceof Blob
      ) {
        try {
          const errorText =
            await responseData.text();

          const parsedError =
            JSON.parse(errorText);

          detail =
            parsedError.detail ||
            detail;
        } catch {
          // Giữ thông báo mặc định.
        }
      } else if (
        typeof responseData?.detail ===
        "string"
      ) {
        detail =
          responseData.detail;
      }

      setPdfViewer(
        (current) => ({
          ...current,
          loading: false,
          error: detail,
        })
      );
    }
  };


  // =====================================================
  // ĐÓNG PDF VIEWER
  // =====================================================

  const handleClosePdfViewer = () => {
    if (pdfBlobUrlRef.current) {
      URL.revokeObjectURL(
        pdfBlobUrlRef.current
      );

      pdfBlobUrlRef.current = null;
    }

    setPdfViewer({
      open: false,
      loading: false,
      url: "",
      title: "",
      documentId: null,
      error: "",
    });
  };


  // =====================================================
  // MỞ PDF TRONG TAB MỚI
  // =====================================================

  const handleOpenPdfNewTab = () => {
    if (!pdfViewer.url) {
      return;
    }

    window.open(
      pdfViewer.url,
      "_blank",
      "noopener,noreferrer"
    );
  };


  return (
    <AppLayout>
      <div className="chat-workspace">
        <ChatSidebar
          activeSessionId={
            activeSessionId
          }
          refreshKey={
            sessionRefreshKey
          }
          onCreateNewChat={
            handleCreateNewChat
          }
          onSelectSession={
            handleSelectSession
          }
          onDeleteSession={
            handleDeleteSession
          }
        />


        <section className="chat-page">
          <header className="chat-header">
            <div>
              <p className="page-eyebrow">
                Trợ lý học tập AI
              </p>

              <h1>
                Hỏi đáp tài liệu
              </h1>

              <p>
                Đặt câu hỏi và nhận câu
                trả lời dựa trên nội dung
                tài liệu đã tải lên.
              </p>
            </div>


            <div className="document-select-wrapper">
              <label htmlFor="chat-document">
                Tài liệu tìm kiếm
              </label>

              <div className="select-box">
                <FileText size={18} />

                <select
                  id="chat-document"
                  value={
                    selectedDocumentId
                  }
                  onChange={(event) =>
                    setSelectedDocumentId(
                      event.target.value
                    )
                  }
                  disabled={
                    loadingDocuments ||
                    sending ||
                    loadingSession
                  }
                >
                  <option value="">
                    Tất cả tài liệu
                  </option>

                  {documents.map(
                    (
                      documentItem
                    ) => (
                      <option
                        key={
                          documentItem.id
                        }
                        value={
                          documentItem.id
                        }
                      >
                        {documentItem.title ||
                          documentItem.filename ||
                          documentItem.original_filename ||
                          documentItem.original_file_name ||
                          `Tài liệu ${documentItem.id}`}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  size={17}
                />
              </div>
            </div>
          </header>


          {error && (
            <div className="page-message error-message">
              {error}
            </div>
          )}


          <section className="chat-card">
            <div className="chat-messages">
              {loadingSession ? (
                <div className="session-loading">
                  <LoaderCircle
                    size={24}
                    className="spin"
                  />

                  <span>
                    Đang tải cuộc trò
                    chuyện...
                  </span>
                </div>
              ) : (
                <>
                  {messages.map(
                    (message) => {
                      const citationContent =
                        createCitationMarkdown(
                          message.content,
                          message.id
                        );

                      const messageTime =
                        formatMessageTime(
                          message.createdAt
                        );

                      return (
                        <article
                          key={
                            message.id
                          }
                          className={`chat-message ${
                            message.role ===
                            "user"
                              ? "user-message"
                              : "assistant-message"
                          }`}
                        >
                          <div className="message-avatar">
                            {message.role ===
                            "user" ? (
                              <User
                                size={20}
                              />
                            ) : (
                              <Bot
                                size={20}
                              />
                            )}
                          </div>


                          <div className="message-content">
                            <div className="message-heading">
                              <strong>
                                {message.role ===
                                "user"
                                  ? "Bạn"
                                  : "RAG Assistant"}
                              </strong>

                              {messageTime && (
                                <span className="message-time">
                                  {
                                    messageTime
                                  }
                                </span>
                              )}
                            </div>


                            <div
                              className={
                                message.isError
                                  ? "message-text error-text"
                                  : "message-text"
                              }
                            >
                              {message.role ===
                              "assistant" ? (
                                <ReactMarkdown
                                  components={{
                                    a({
                                      href,
                                      children,
                                      ...props
                                    }) {
                                      const isCitation =
                                        href?.startsWith(
                                          "#source-"
                                        );

                                      if (
                                        isCitation
                                      ) {
                                        return (
                                          <a
                                            {...props}
                                            href={
                                              href
                                            }
                                            className="citation-link"
                                            onClick={(event) =>
                                              handleCitationClick(
                                                event,
                                                href,
                                                message
                                              )
                                            }
                                            title="Xem nguồn tham khảo"
                                          >
                                            {
                                              children
                                            }
                                          </a>
                                        );
                                      }

                                      return (
                                        <a
                                          {...props}
                                          href={
                                            href
                                          }
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          {
                                            children
                                          }
                                        </a>
                                      );
                                    },
                                  }}
                                >
                                  {
                                    citationContent
                                  }
                                </ReactMarkdown>
                              ) : (
                                <p>
                                  {
                                    message.content
                                  }
                                </p>
                              )}
                            </div>


                            {message.role ===
                              "assistant" &&
                              !message.isError && (
                                <div className="message-footer">
                                  <div className="message-metadata">
                                    {message.responseTime !=
                                      null && (
                                      <span>
                                        ⏱{" "}
                                        {Number(
                                          message.responseTime
                                        ).toFixed(
                                          2
                                        )}{" "}
                                        giây
                                      </span>
                                    )}

                                    <span>
                                      🧩{" "}
                                      {message.chunkCount ??
                                        message
                                          .sources
                                          ?.length ??
                                        0}{" "}
                                      chunks
                                    </span>

                                    <span>
                                      📚{" "}
                                      {message.documentCount ??
                                        0}{" "}
                                      tài liệu
                                    </span>

                                    {message.model && (
                                      <span>
                                        🤖{" "}
                                        {
                                          message.model
                                        }
                                      </span>
                                    )}

                                    {message.temperature !=
                                      null && (
                                      <span>
                                        🌡{" "}
                                        {Number(
                                          message.temperature
                                        ).toFixed(
                                          1
                                        )}
                                      </span>
                                    )}
                                  </div>


                                  <div className="message-actions">
                                    <button
                                      type="button"
                                      className="copy-message-button"
                                      onClick={() =>
                                        handleCopyMessage(
                                          message.id,
                                          message.content
                                        )
                                      }
                                      title="Sao chép câu trả lời"
                                    >
                                      {copiedMessageId ===
                                      message.id ? (
                                        <>
                                          <Check
                                            size={
                                              15
                                            }
                                          />
                                          Đã sao
                                          chép
                                        </>
                                      ) : (
                                        <>
                                          <Copy
                                            size={
                                              15
                                            }
                                          />
                                          Sao chép
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              )}


                            {Array.isArray(
                              message.sources
                            ) &&
                              message.sources
                                .length >
                                0 && (
                                <div className="message-sources">
                                  <h4>
                                    <FileText
                                      size={
                                        17
                                      }
                                    />
                                    Nguồn tham
                                    khảo
                                  </h4>

                                  <div className="sources-list">
                                    {message.sources.map(
                                      (
                                        source,
                                        index
                                      ) => {
                                        const score =
                                          Number(
                                            source.score
                                          );

                                        const sourceNumber =
                                          source.source_number ??
                                          index +
                                            1;

                                        const documentName =
                                          getSourceDocumentName(
                                            source
                                          );

                                        const sourceId =
                                          getSourceElementId(
                                            message.id,
                                            sourceNumber
                                          );

                                        const sourceClasses =
                                          [
                                            "source-card",
                                          ];

                                        if (
                                          highlightedSourceId ===
                                          sourceId
                                        ) {
                                          sourceClasses.push(
                                            "source-card-highlighted"
                                          );
                                        }

                                        return (
                                          <details
                                            id={
                                              sourceId
                                            }
                                            className={sourceClasses.join(
                                              " "
                                            )}
                                            key={
                                              source.vector_id ||
                                              source.id ||
                                              `${source.document_id}-${source.chunk_id}-${index}`
                                            }
                                          >
                                            <summary>
                                              <div>
                                                <strong>
                                                  Nguồn{" "}
                                                  {
                                                    sourceNumber
                                                  }
                                                </strong>

                                                <span>
                                                  {
                                                    documentName
                                                  }

                                                  {source.page_number != null ? (
                                                    <>
                                                      {" · "}
                                                      <button
                                                        type="button"
                                                        onClick={(e) => {
                                                          e.preventDefault();
                                                          e.stopPropagation();
                                                          setPdfPageNumber(Number(source.page_number));
                                                          if (!pdfViewer.open || pdfViewer.documentId !== source.document_id) {
                                                            handleOpenSourceDocument(source);
                                                          }
                                                        }}
                                                        style={{
                                                          background: 'none',
                                                          border: 'none',
                                                          color: 'var(--primary-color, #2563eb)',
                                                          textDecoration: 'underline',
                                                          cursor: 'pointer',
                                                          padding: 0,
                                                          font: 'inherit'
                                                        }}
                                                      >
                                                        Trang {source.page_number}
                                                      </button>
                                                    </>
                                                  ) : ""}

                                                  {source.chunk_index !=
                                                  null
                                                    ? ` · Chunk ${source.chunk_index}`
                                                    : ""}
                                                </span>
                                              </div>

                                              {Number.isFinite(
                                                score
                                              ) && (
                                                <span className="source-score">
                                                  {(
                                                    score *
                                                    100
                                                  ).toFixed(
                                                    1
                                                  )}
                                                  %
                                                </span>
                                              )}
                                            </summary>

                                            <div className="source-card-content">
                                              <p>
                                                {source.content ||
                                                  "Không có nội dung nguồn."}
                                              </p>

                                              {source.document_id !=
                                                null && (
                                                <button
                                                  type="button"
                                                  className="open-source-button"
                                                  onClick={() =>
                                                    handleOpenSourceDocument(
                                                      source
                                                    )
                                                  }
                                                >
                                                  <FileText
                                                    size={
                                                      16
                                                    }
                                                  />

                                                  {source.page_number !=
                                                  null
                                                    ? `Mở tài liệu tại trang ${source.page_number}`
                                                    : "Mở tài liệu"}
                                                </button>
                                              )}
                                            </div>
                                          </details>
                                        );
                                      }
                                    )}
                                  </div>
                                </div>
                              )}
                          </div>
                        </article>
                      );
                    }
                  )}


                  {sending && (
                    <article className="chat-message assistant-message">
                      <div className="message-avatar">
                        <Bot
                          size={20}
                        />
                      </div>

                      <div className="message-content">
                        <div className="message-heading">
                          <strong>
                            RAG Assistant
                          </strong>
                        </div>

                        <div className="typing-indicator">
                          <LoaderCircle
                            size={18}
                            className="spin"
                          />

                          Đang tìm kiếm
                          tài liệu và tạo
                          câu trả lời...
                        </div>
                      </div>
                    </article>
                  )}
                </>
              )}

              <div
                ref={messagesEndRef}
              />
            </div>


            <form
              className="chat-input-area"
              onSubmit={
                handleSubmit
              }
            >
              <div className="chat-input-box">
                <MessageSquareText
                  size={21}
                />

                <textarea
                  value={question}
                  onChange={(event) =>
                    setQuestion(
                      event.target.value
                    )
                  }
                  onKeyDown={
                    handleKeyDown
                  }
                  placeholder="Nhập câu hỏi về tài liệu..."
                  rows={1}
                  disabled={
                    sending ||
                    loadingSession
                  }
                />

                <button
                  type="submit"
                  disabled={
                    !question.trim() ||
                    sending ||
                    loadingSession
                  }
                  aria-label="Gửi câu hỏi"
                  title="Gửi câu hỏi"
                >
                  {sending ? (
                    <LoaderCircle
                      size={20}
                      className="spin"
                    />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </div>

              <p className="chat-hint">
                Nhấn Enter để gửi,
                Shift + Enter để xuống
                dòng.
              </p>
            </form>
          </section>
        </section>
      </div>


      {pdfViewer.open && (
        <div
          className="pdf-viewer-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Xem tài liệu PDF"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              handleClosePdfViewer();
            }
          }}
        >
          <section className="pdf-viewer-modal">
            <header className="pdf-viewer-header">
              <div>
                <span className="pdf-viewer-eyebrow">
                  Nguồn tham khảo
                </span>

                <h3>
                  {pdfViewer.title ||
                    "Tài liệu"}
                </h3>

                <p>
                  Trang {pdfPageNumber} {pdfNumPages ? `/ ${pdfNumPages}` : ""}
                </p>
              </div>

              <div className="pdf-viewer-actions">
                {pdfViewer.url && (
                  <button
                    type="button"
                    onClick={
                      handleOpenPdfNewTab
                    }
                    title="Mở trong tab mới"
                    aria-label="Mở PDF trong tab mới"
                  >
                    <ExternalLink
                      size={18}
                    />
                  </button>
                )}

                <button
                  type="button"
                  onClick={
                    handleClosePdfViewer
                  }
                  title="Đóng"
                  aria-label="Đóng trình xem PDF"
                >
                  <X size={20} />
                </button>
              </div>
            </header>

            <div className="pdf-viewer-body">
              {pdfViewer.loading && (
                <div className="pdf-viewer-status">
                  <LoaderCircle
                    size={28}
                    className="spin"
                  />

                  <span>
                    Đang tải tài liệu...
                  </span>
                </div>
              )}

              {!pdfViewer.loading &&
                pdfViewer.error && (
                  <div className="pdf-viewer-error">
                    <FileText
                      size={36}
                    />

                    <strong>
                      Không thể mở tài liệu
                    </strong>

                    <p>
                      {pdfViewer.error}
                    </p>
                  </div>
                )}

              {!pdfViewer.loading &&
                !pdfViewer.error &&
                pdfViewer.url && (
                  <div className="pdf-viewer-frame" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'auto', height: '100%', padding: '20px', background: '#f5f5f5' }}>
                    <Document
                      file={pdfViewer.url}
                      onLoadSuccess={({ numPages }) => setPdfNumPages(numPages)}
                      loading={
                        <div className="pdf-viewer-status">
                          <LoaderCircle size={28} className="spin" />
                          <span>Đang tải PDF...</span>
                        </div>
                      }
                    >
                      <Page pageNumber={pdfPageNumber} renderTextLayer={true} renderAnnotationLayer={true} />
                    </Document>
                    
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px', alignItems: 'center' }}>
                      <button 
                        onClick={() => setPdfPageNumber(p => Math.max(1, p - 1))}
                        disabled={pdfPageNumber <= 1}
                        style={{ padding: '5px 10px', cursor: 'pointer' }}
                      >
                        Trước
                      </button>
                      <span>Trang {pdfPageNumber} {pdfNumPages ? `/ ${pdfNumPages}` : ""}</span>
                      <button 
                        onClick={() => setPdfPageNumber(p => Math.min(pdfNumPages || p + 1, p + 1))}
                        disabled={pdfNumPages && pdfPageNumber >= pdfNumPages}
                        style={{ padding: '5px 10px', cursor: 'pointer' }}
                      >
                        Sau
                      </button>
                    </div>
                  </div>
                )}
            </div>
          </section>
        </div>
      )}
    </AppLayout>
  );
}


export default ChatPage;