import { List } from "@refinedev/antd";
import { Alert, Button, Select, Space, Table, Typography } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { StatusChip } from "../../components/StatusChip";
import { formatSupabaseError } from "../../utility/formatSupabaseError";
import {
  REPORT_STATUSES,
  mostBlocked,
  personLabel,
  reportChipKind,
  reportStatusLabel,
  sortReportsForQueue,
} from "../../utility/moderation";
import { supabaseClient } from "../../utility/supabaseClient";
import { usePeople } from "./people";

export type ReportRow = {
  id: string;
  reporter_id: string;
  target_kind: "user" | "message";
  target_id: string;
  reason: string;
  status: string;
  created_at: string;
};

const MAX_ROWS = 500;

/**
 * Reports from the Buddies screens. Open reports come first. Reading and
 * moving a report is limited to owner / admin staff by the database; anyone
 * else sees an empty queue.
 */
export function ReportList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("active");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: loadError } = await supabaseClient
      .from("reports")
      .select("id, reporter_id, target_kind, target_id, reason, status, created_at")
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS);
    if (loadError) {
      setError(formatSupabaseError(loadError, "Could not load reports."));
      setRows([]);
    } else {
      setError(null);
      setRows((data ?? []) as ReportRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const filtered = rows.filter((row) =>
      filter === "all"
        ? true
        : filter === "active"
          ? row.status === "open" || row.status === "reviewing"
          : row.status === filter,
    );
    return sortReportsForQueue(filtered);
  }, [rows, filter]);

  const people = usePeople(
    visible.flatMap((row) =>
      row.target_kind === "user" ? [row.reporter_id, row.target_id] : [row.reporter_id],
    ),
  );
  const openCount = rows.filter((row) => row.status === "open").length;

  return (
    <List
      title={`Reports${openCount > 0 ? ` (${openCount} open)` : ""}`}
      headerButtons={
        <Space>
          <Select
            value={filter}
            onChange={setFilter}
            style={{ width: 200 }}
            options={[
              { value: "active", label: "Open and reviewing" },
              { value: "all", label: "Everything" },
              ...REPORT_STATUSES.map((status) => ({
                value: status,
                label: reportStatusLabel(status),
              })),
            ]}
          />
          <Button onClick={() => void load()}>Refresh</Button>
        </Space>
      }
    >
      {error ? (
        <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />
      ) : null}
      <Table<ReportRow>
        dataSource={visible}
        rowKey="id"
        loading={loading}
        scroll={{ x: true }}
        pagination={{ pageSize: 20 }}
        locale={{ emptyText: "No reports here." }}
        onRow={(record) => ({
          onClick: () => navigate(`/moderation/reports/${record.id}`),
          style: { cursor: "pointer" },
        })}
      >
        <Table.Column<ReportRow>
          title="Status"
          dataIndex="status"
          render={(status: string) => (
            <StatusChip kind={reportChipKind(status)}>{reportStatusLabel(status)}</StatusChip>
          )}
        />
        <Table.Column<ReportRow>
          title="About"
          dataIndex="target_kind"
          render={(kind: string, record) =>
            kind === "message"
              ? "A message"
              : personLabel(people[record.target_id], record.target_id)
          }
        />
        <Table.Column<ReportRow>
          title="Reason"
          dataIndex="reason"
          render={(reason: string) => (
            <Typography.Paragraph
              style={{ marginBottom: 0, maxWidth: 360 }}
              ellipsis={{ rows: 2 }}
            >
              {reason}
            </Typography.Paragraph>
          )}
        />
        <Table.Column<ReportRow>
          title="Reported by"
          dataIndex="reporter_id"
          render={(id: string) => personLabel(people[id], id)}
        />
        <Table.Column<ReportRow>
          title="When"
          dataIndex="created_at"
          render={(value: string) => new Date(value).toLocaleString()}
        />
        <Table.Column<ReportRow>
          title=""
          dataIndex="id"
          fixed="right"
          width={90}
          render={(id: string) => (
            <Button size="small" onClick={() => navigate(`/moderation/reports/${id}`)}>
              Review
            </Button>
          )}
        />
      </Table>
    </List>
  );
}

type BlockRow = {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
};

/**
 * Who members have blocked. Blocks are private to the person who made them,
 * so this is a staff-only signal: someone blocked by many members is worth a
 * look even if nobody has filed a report.
 */
export function BlockList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<BlockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data, error: loadError } = await supabaseClient
        .from("blocks")
        .select("id, blocker_id, blocked_id, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (loadError) {
        setError(formatSupabaseError(loadError, "Could not load blocks."));
      } else {
        setRows((data ?? []) as BlockRow[]);
      }
      setLoading(false);
    })();
  }, []);

  const top = useMemo(() => mostBlocked(rows, 10), [rows]);
  const people = usePeople([
    ...top.map((entry) => entry.id),
    ...rows.slice(0, 100).flatMap((row) => [row.blocker_id, row.blocked_id]),
  ]);

  return (
    <List title="Blocks" headerButtons={null}>
      {error ? (
        <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />
      ) : null}
      <Typography.Title level={5}>Blocked by the most members</Typography.Title>
      <Table
        dataSource={top}
        rowKey="id"
        loading={loading}
        pagination={false}
        locale={{ emptyText: "Nobody has been blocked yet." }}
        style={{ marginBottom: 24 }}
      >
        <Table.Column<{ id: string; count: number }>
          title="Member"
          dataIndex="id"
          render={(id: string) => personLabel(people[id], id)}
        />
        <Table.Column<{ id: string; count: number }>
          title="Blocked by"
          dataIndex="count"
          render={(count: number) => `${count} ${count === 1 ? "member" : "members"}`}
        />
        <Table.Column<{ id: string; count: number }>
          title="Searchable"
          dataIndex="id"
          render={(id: string) =>
            people[id]?.is_buddy_discoverable ? (
              <StatusChip kind="warning">Yes</StatusChip>
            ) : (
              <StatusChip kind="inactive">No</StatusChip>
            )
          }
        />
        <Table.Column<{ id: string; count: number }>
          title=""
          dataIndex="id"
          width={120}
          render={(id: string) => (
            <Button size="small" onClick={() => navigate(`/moderation/people/${id}`)}>
              Open
            </Button>
          )}
        />
      </Table>

      <Typography.Title level={5}>Latest blocks</Typography.Title>
      <Table<BlockRow>
        dataSource={rows.slice(0, 100)}
        rowKey="id"
        loading={loading}
        scroll={{ x: true }}
        pagination={{ pageSize: 20 }}
        locale={{ emptyText: "No blocks." }}
      >
        <Table.Column<BlockRow>
          title="Blocked by"
          dataIndex="blocker_id"
          render={(id: string) => personLabel(people[id], id)}
        />
        <Table.Column<BlockRow>
          title="Blocked"
          dataIndex="blocked_id"
          render={(id: string) => personLabel(people[id], id)}
        />
        <Table.Column<BlockRow>
          title="When"
          dataIndex="created_at"
          render={(value: string) => new Date(value).toLocaleString()}
        />
      </Table>
    </List>
  );
}
