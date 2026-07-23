import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  FileText,
  Gauge,
  Layers3,
  MessageSquareText,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import axiosClient from "../api/axiosClient";
import AppLayout from "../components/AppLayout";
import "./Dashboard.css";

const EMPTY_STATS = {
  documents: 0,
  chunks: 0,
  conversations: 0,
  questions: 0,
  model: "Chưa xác định",
  temperature: 0,
  questions_by_day: [],
  top_documents: [],
};

function StatCard({
  icon,
  label,
  value,
  description,
  accentClass,
}) {
  return (
    <article className={`dashboard-stat-card ${accentClass}`}>
      <div className="dashboard-stat-card-header">
        <div className="dashboard-stat-icon">{icon}</div>

        <span className="dashboard-stat-label">
          {label}
        </span>
      </div>

      <strong className="dashboard-stat-value">
        {value}
      </strong>

      <span className="dashboard-stat-description">
        {description}
      </span>
    </article>
  );
}

function DashboardPage() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = async (isRefresh = false) => {
    try {
      setError("");

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await axiosClient.get(
        "/dashboard/stats"
      );

      setStats({
        ...EMPTY_STATS,
        ...response.data,
        questions_by_day:
          response.data.questions_by_day || [],
        top_documents:
          response.data.top_documents || [],
      });
    } catch (requestError) {
      console.error(
        "Không thể tải Dashboard:",
        requestError
      );

      const message =
        requestError?.response?.data?.detail ||
        "Không thể tải dữ liệu Dashboard.";

      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const chartData = useMemo(() => {
    return stats.questions_by_day.map((item) => ({
      ...item,
      questions: Number(item.count || 0),
    }));
  }, [stats.questions_by_day]);

  const maxDocumentCount = useMemo(() => {
    if (!stats.top_documents.length) {
      return 1;
    }

    return Math.max(
      ...stats.top_documents.map((item) =>
        Number(item.count || 0)
      ),
      1
    );
  }, [stats.top_documents]);

  const averageChunksPerDocument = useMemo(() => {
    if (!stats.documents) {
      return 0;
    }

    return (
      stats.chunks / stats.documents
    ).toFixed(1);
  }, [stats.chunks, stats.documents]);

  const questionsPerConversation = useMemo(() => {
    if (!stats.conversations) {
      return 0;
    }

    return (
      stats.questions / stats.conversations
    ).toFixed(1);
  }, [stats.questions, stats.conversations]);

  if (loading) {
    return (
      <AppLayout>
        <div className="dashboard-loading-state">
          <div className="dashboard-spinner" />

          <h2>Đang tải Dashboard</h2>

          <p>
            Hệ thống đang tổng hợp dữ liệu của bạn...
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="dashboard-page">
        <header className="dashboard-header">
          <div>
            <div className="dashboard-eyebrow">
              <Sparkles size={16} />
              RAG Education Analytics
            </div>

            <h1>Dashboard</h1>

            <p>
              Theo dõi tài liệu, hội thoại và hiệu suất
              hệ thống hỏi đáp RAG.
            </p>
          </div>

          <button
            type="button"
            className="dashboard-refresh-button"
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={18}
              className={
                refreshing ? "is-spinning" : ""
              }
            />

            {refreshing
              ? "Đang cập nhật"
              : "Làm mới"}
          </button>
        </header>

        {error && (
          <div className="dashboard-error">
            <strong>Không thể tải dữ liệu.</strong>
            <span>{error}</span>
          </div>
        )}

        <section className="dashboard-stats-grid">
          <StatCard
            icon={<FileText size={24} />}
            label="Tài liệu"
            value={stats.documents}
            description="Tài liệu đã tải lên"
            accentClass="stat-blue"
          />

          <StatCard
            icon={<Layers3 size={24} />}
            label="Chunks"
            value={stats.chunks}
            description={`${averageChunksPerDocument} chunk / tài liệu`}
            accentClass="stat-purple"
          />

          <StatCard
            icon={<MessageSquareText size={24} />}
            label="Hội thoại"
            value={stats.conversations}
            description="Cuộc trò chuyện đã tạo"
            accentClass="stat-green"
          />

          <StatCard
            icon={<Gauge size={24} />}
            label="Câu hỏi"
            value={stats.questions}
            description={`${questionsPerConversation} câu / hội thoại`}
            accentClass="stat-orange"
          />
        </section>

        <section className="dashboard-main-grid">
          <article className="dashboard-panel dashboard-chart-panel">
            <div className="dashboard-panel-header">
              <div>
                <span className="dashboard-panel-kicker">
                  Hoạt động
                </span>

                <h2>Câu hỏi trong 7 ngày gần nhất</h2>

                <p>
                  Số câu hỏi người dùng gửi theo từng ngày.
                </p>
              </div>

              <div className="dashboard-total-chip">
                {stats.questions} câu hỏi
              </div>
            </div>

            <div className="dashboard-chart">
              {chartData.length > 0 ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <AreaChart
                    data={chartData}
                    margin={{
                      top: 16,
                      right: 8,
                      left: -20,
                      bottom: 0,
                    }}
                  >
                    <defs>
                      <linearGradient
                        id="questionsGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="currentColor"
                          stopOpacity={0.32}
                        />

                        <stop
                          offset="95%"
                          stopColor="currentColor"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="4 4"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                    />

                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                    />

                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        boxShadow:
                          "0 12px 30px rgba(15, 23, 42, 0.12)",
                      }}
                      formatter={(value) => [
                        `${value} câu`,
                        "Câu hỏi",
                      ]}
                      labelFormatter={(label) =>
                        `Ngày ${label}`
                      }
                    />

                    <Area
                      type="monotone"
                      dataKey="questions"
                      stroke="currentColor"
                      strokeWidth={3}
                      fill="url(#questionsGradient)"
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="dashboard-empty-state">
                  Chưa có dữ liệu câu hỏi.
                </div>
              )}
            </div>
          </article>

          <article className="dashboard-panel dashboard-model-panel">
            <div className="dashboard-model-icon">
              <Bot size={30} />
            </div>

            <span className="dashboard-panel-kicker">
              Cấu hình AI
            </span>

            <h2>Model đang hoạt động</h2>

            <div className="dashboard-model-name">
              {stats.model}
            </div>

            <div className="dashboard-model-info">
              <div>
                <span>Temperature</span>
                <strong>{stats.temperature}</strong>
              </div>

              <div>
                <span>Trạng thái</span>
                <strong className="dashboard-online">
                  Đang hoạt động
                </strong>
              </div>
            </div>

            <div className="dashboard-temperature">
              <div className="dashboard-temperature-header">
                <span>Mức sáng tạo</span>
                <strong>
                  {Math.round(
                    Number(stats.temperature || 0) * 100
                  )}
                  %
                </strong>
              </div>

              <div className="dashboard-temperature-track">
                <span
                  style={{
                    width: `${Math.min(
                      Math.max(
                        Number(
                          stats.temperature || 0
                        ) * 100,
                        4
                      ),
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </article>
        </section>

        <section className="dashboard-bottom-grid">
          <article className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div>
                <span className="dashboard-panel-kicker">
                  Nguồn dữ liệu
                </span>

                <h2>Tài liệu được trích dẫn nhiều nhất</h2>

                <p>
                  Xếp hạng dựa trên số lần tài liệu xuất
                  hiện trong nguồn trả lời.
                </p>
              </div>
            </div>

            <div className="dashboard-document-list">
              {stats.top_documents.length > 0 ? (
                stats.top_documents.map(
                  (document, index) => {
                    const percentage =
                      (Number(document.count || 0) /
                        maxDocumentCount) *
                      100;

                    return (
                      <div
                        className="dashboard-document-item"
                        key={document.document_id}
                      >
                        <div className="dashboard-document-rank">
                          {index + 1}
                        </div>

                        <div className="dashboard-document-content">
                          <div className="dashboard-document-header">
                            <span title={document.title}>
                              {document.title}
                            </span>

                            <strong>
                              {document.count} lượt
                            </strong>
                          </div>

                          <div className="dashboard-document-progress">
                            <span
                              style={{
                                width: `${percentage}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  }
                )
              ) : (
                <div className="dashboard-empty-state">
                  Chưa có tài liệu nào được trích dẫn.
                </div>
              )}
            </div>
          </article>

          <article className="dashboard-panel dashboard-summary-panel">
            <span className="dashboard-panel-kicker">
              Tổng quan
            </span>

            <h2>Hiệu suất hệ thống</h2>

            <div className="dashboard-summary-list">
              <div className="dashboard-summary-item">
                <span>Chunk trung bình mỗi tài liệu</span>
                <strong>
                  {averageChunksPerDocument}
                </strong>
              </div>

              <div className="dashboard-summary-item">
                <span>Câu hỏi mỗi hội thoại</span>
                <strong>
                  {questionsPerConversation}
                </strong>
              </div>

              <div className="dashboard-summary-item">
                <span>Tài liệu có thể truy xuất</span>
                <strong>{stats.documents}</strong>
              </div>

              <div className="dashboard-summary-item">
                <span>Tổng dữ liệu vector hóa</span>
                <strong>{stats.chunks}</strong>
              </div>
            </div>
          </article>
        </section>
      </div>
    </AppLayout>
  );
}

export default DashboardPage;