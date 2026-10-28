import { Show } from "@refinedev/antd";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Popconfirm,
  Select,
  Space,
  Spin,
  Typography,
  message,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { StatusChip } from "../../components/StatusChip";
import { formatSupabaseError } from "../../utility/formatSupabaseError";
import {
  REPORT_STATUSES,
  isReportStatus,
  otherReportsAbout,
  personLabel,
  reportChipKind,
  reportStatusLabel,
} from "../../utility/moderation";
import { supabaseClient } from "../../utility/supabaseClient";
import type { ReportRow } from "./index";
import { usePeople } from "./people";

type MessageRow = {
  id: string;
  connection_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type SubjectCounts = {
  reportsAgainst: number;
  blocksAgainst: number;
};

async function loadSubjectCounts(
  subjectId: string,
  exceptReportId: string | null,
): Promise<SubjectCounts> {
  const [reports, blocks] = await Promise.all([
    supabaseClient
      .from("reports")
      .select("id, target_id")
      .eq("target_kind", "user")
      .eq("target_id", subjectId),
    supabaseClient
      .from("blocks")
      .select("id", { count: "exact", head: true })
      .eq("blocked_id", subjectId),
  ]);
  return {
    reportsAgainst: otherReportsAbout(
      (reports.data ?? []) as { id: string; target_id: string }[],
      subjectId,
      exceptReportId ?? "",
    ),
    blocksAgainst: blocks.count ?? 0,
  };
}

/**
 * The person a report or a block is about: what members see of them, how many
 * other reports and blocks they have, and one action that takes effect at
 * once and can be undone by them: hiding them from search.
 */
function SubjectCard({
  subjectId,
  exceptReportId,
}: {
  subjectId: string;
  exceptReportId: string | null;
}) {
  const people = usePeople([subjectId]);
  const person = people[subjectId];
  const [counts, setCounts] = useState<SubjectCounts | null>(null);
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadSubjectCounts(subjectId, exceptReportId).then((value) => {
      if (!cancelled) setCounts(value);
    });
    return () => {
      cancelled = true;
    };
  }, [subjectId, exceptReportId]);

  const searchable = person?.is_buddy_discoverable === true && !hidden;

  const hideFromSearch = async () => {
    setBusy(true);
    const { error } = await supabaseClient
      .from("profiles")
      .update({ is_buddy_discoverable: false })
      .eq("id", subjectId);
    setBusy(false);
    if (error) {
      void message.error(formatSupabaseError(error, "Could not hide this member."));
      return;
    }
    setHidden(true);
    void message.success("They no longer appear in search. They can switch it back on themselves.");
  };

  return (
    <Card title="The member" size="small" style={{ marginTop: 16 }}>
      <Descriptions column={1} size="small">
        <Descriptions.Item label="Shown to others as">
          {personLabel(person, subjectId)}
        </Descriptions.Item>
        <Descriptions.Item label="Member id">
          <code style={{ fontSize: 11 }}>{subjectId}</code>
        </Descriptions.Item>
        <Descriptions.Item label="Searchable">
          {searchable ? (
            <StatusChip kind="warning">Yes</StatusChip>
          ) : (
            <StatusChip kind="inactive">No</StatusChip>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Other reports about them">
          {counts ? counts.reportsAgainst : "…"}
        </Descriptions.Item>
        <Descriptions.Item label="Members who blocked them">
          {counts ? counts.blocksAgainst : "…"}
        </Descriptions.Item>
      </Descriptions>
      {searchable ? (
        <Popconfirm
          title="Hide this member from search?"
          description="They can still use the app and any chats they already have. They can switch searchability back on."
          okText="Hide from search"
          onConfirm={() => void hideFromSearch()}
        >
          <Button danger loading={busy} style={{ marginTop: 12 }}>
            Hide from search
          </Button>
        </Popconfirm>
      ) : null}
    </Card>
  );
}

/** One report: what was said, the member, and a status to move it to. */
export function ReportDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportRow | null>(null);
  const [reported, setReported] = useState<MessageRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("open");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: loadError } = await supabaseClient
      .from("reports")
      .select("id, reporter_id, target_kind, target_id, reason, status, created_at")
      .eq("id", id)
      .maybeSingle();
    if (loadError || !data) {
      setError(
        loadError
          ? formatSupabaseError(loadError, "Could not load this report.")
          : "That report was not found, or you do not have access to it.",
      );
      setLoading(false);
      return;
    }
    const row = data as ReportRow;
    setReport(row);
    setStatus(row.status);
    if (row.target_kind === "message") {
      // Only the reported message is read, never the rest of the thread.
      const { data: msg } = await supabaseClient
        .from("chat_messages")
        .select("id, connection_id, sender_id, body, created_at")
        .eq("id", row.target_id)
        .maybeSingle();
      setReported((msg as MessageRow | null) ?? null);
    }
    setError(null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const subjectId =
    report?.target_kind === "user" ? report.target_id : (reported?.sender_id ?? null);
  const people = usePeople(report ? [report.reporter_id] : []);

  const save = async () => {
    if (!report || !isReportStatus(status)) return;
    setSaving(true);
    const { error: saveError } = await supabaseClient
      .from("reports")
      .update({ status })
      .eq("id", report.id);
    setSaving(false);
    if (saveError) {
      void message.error(formatSupabaseError(saveError, "Could not save the status."));
      return;
    }
    setReport({ ...report, status });
    void message.success("Status saved.");
  };

  return (
    <Show
      title="Report"
      isLoading={loading}
      headerButtons={<Button onClick={() => navigate("/moderation/reports")}>Back to reports</Button>}
    >
      {error ? <Alert type="error" showIcon message={error} /> : null}
      {loading && !report ? <Spin /> : null}
      {report ? (
        <>
          <Card size="small" title="What was reported">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Status">
                <StatusChip kind={reportChipKind(report.status)}>
                  {reportStatusLabel(report.status)}
                </StatusChip>
              </Descriptions.Item>
              <Descriptions.Item label="About">
                {report.target_kind === "message" ? "A message" : "A member"}
              </Descriptions.Item>
              <Descriptions.Item label="Reason given">
                <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>
                  {report.reason}
                </Typography.Paragraph>
              </Descriptions.Item>
              <Descriptions.Item label="Reported by">
                {personLabel(people[report.reporter_id], report.reporter_id)}
              </Descriptions.Item>
              <Descriptions.Item label="When">
                {new Date(report.created_at).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>
            {report.target_kind === "message" ? (
              reported ? (
                <Card
                  size="small"
                  type="inner"
                  title={`The message, sent ${new Date(reported.created_at).toLocaleString()}`}
                  style={{ marginTop: 12 }}
                >
                  <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>
                    {reported.body}
                  </Typography.Paragraph>
                </Card>
              ) : (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginTop: 12 }}
                  message="The message could not be found. It may have been deleted with the account."
                />
              )
            ) : null}
          </Card>

          <Card size="small" title="Decision" style={{ marginTop: 16 }}>
            <Space>
              <Select
                value={status}
                onChange={setStatus}
                style={{ width: 200 }}
                options={REPORT_STATUSES.map((value) => ({
                  value,
                  label: reportStatusLabel(value),
                }))}
              />
              <Button
                type="primary"
                loading={saving}
                disabled={status === report.status}
                onClick={() => void save()}
              >
                Save status
              </Button>
            </Space>
          </Card>

          {subjectId ? <SubjectCard subjectId={subjectId} exceptReportId={report.id} /> : null}
        </>
      ) : null}
    </Show>
  );
}

/** A member reached from the blocks list, with the same facts and action. */
export function PersonDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  return (
    <Show
      title="Member"
      headerButtons={<Button onClick={() => navigate("/moderation/blocks")}>Back to blocks</Button>}
    >
      <SubjectCard subjectId={id} exceptReportId={null} />
    </Show>
  );
}
