import { List } from "@refinedev/antd";
import { useGetIdentity, usePermissions } from "@refinedev/core";
import { Alert, Button, Space, Spin, Table, Typography } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { StatusChip } from "../../components/StatusChip";
import { canSignOffPlan } from "../../utility/canSignOffPlan";
import { formatSupabaseError } from "../../utility/formatSupabaseError";
import { supabaseClient } from "../../utility/supabaseClient";

type QueueRow = {
  user_id: string;
  full_name?: string | null;
  draft_count: number;
  latest_draft_at?: string;
};

type ProfileRow = {
  id: string;
  full_name?: string | null;
};

/**
 * Patients waiting for clinician review — anyone with at least one draft intervention.
 */
export function ReviewQueueList() {
  const navigate = useNavigate();
  const { data: role } = usePermissions<string>({});
  const { data: identity } = useGetIdentity<{ id: string; role?: string }>();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [maySignOff, setMaySignOff] = useState(false);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { data: draftRows, error: draftError } = await supabaseClient
        .from("interventions")
        .select("user_id, created_at")
        .eq("status", "draft")
        .order("created_at", { ascending: false });

      if (draftError) {
        throw draftError;
      }

      const byUser = new Map<string, { count: number; latest?: string }>();
      for (const row of draftRows ?? []) {
        const userId = row.user_id as string;
        if (!userId) {
          continue;
        }
        const existing = byUser.get(userId) ?? { count: 0, latest: undefined };
        existing.count += 1;
        if (!existing.latest || String(row.created_at) > existing.latest) {
          existing.latest = String(row.created_at);
        }
        byUser.set(userId, existing);
      }

      const userIds = [...byUser.keys()];
      if (userIds.length === 0) {
        setRows([]);
        return;
      }

      const { data: profiles, error: profileError } = await supabaseClient
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      if (profileError) {
        throw profileError;
      }

      const nameById = new Map<string, string | null>();
      for (const profile of (profiles ?? []) as ProfileRow[]) {
        nameById.set(profile.id, profile.full_name ?? null);
      }

      const queue: QueueRow[] = userIds.map((userId) => {
        const stats = byUser.get(userId)!;
        return {
          user_id: userId,
          full_name: nameById.get(userId) ?? null,
          draft_count: stats.count,
          latest_draft_at: stats.latest,
        };
      });

      queue.sort((a, b) =>
        String(b.latest_draft_at ?? "").localeCompare(String(a.latest_draft_at ?? "")),
      );

      setRows(queue);
    } catch (error) {
      setMessage(
        formatSupabaseError(
          error,
          "Could not load the review queue. Check your staff role and try again.",
        ),
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    void (async () => {
      const allowed = await canSignOffPlan(role, identity?.id);
      setMaySignOff(allowed);
    })();
  }, [role, identity?.id]);

  const subtitle = useMemo(() => {
    if (maySignOff) {
      return "Patients with draft plan items waiting for your review.";
    }
    return "You can read the queue. Approve and finalise buttons need owner/admin or a clinician with can sign off.";
  }, [maySignOff]);

  return (
    <List title="Review queue" canCreate={false}>
      <Typography.Paragraph type="secondary">{subtitle}</Typography.Paragraph>

      {!maySignOff ? (
        <Alert
          className="mb-4"
          type="info"
          showIcon
          message="View-only for your role"
          description="Ask an owner to set can_sign_off = true on your doctor row, or use an owner/admin account to approve plans."
        />
      ) : null}

      {message ? (
        <Alert className="mb-4" type="error" showIcon message={message} />
      ) : null}

      {loading ? (
        <div className="py-8 text-center">
          <Spin />
        </div>
      ) : (
        <Table<QueueRow>
          rowKey="user_id"
          dataSource={rows}
          pagination={{ pageSize: 20 }}
          locale={{ emptyText: "No patients waiting — every draft plan is reviewed." }}
        >
          <Table.Column
            title="Patient"
            render={(_, record) => record.full_name?.trim() || "Unnamed patient"}
          />
          <Table.Column
            title="Draft items"
            dataIndex="draft_count"
            render={(count: number) => (
              <StatusChip kind="draft">{count} draft</StatusChip>
            )}
          />
          <Table.Column
            title="Latest draft"
            dataIndex="latest_draft_at"
            render={(value: string) =>
              value ? new Date(value).toLocaleString() : "—"
            }
          />
          <Table.Column
            title="Actions"
            render={(_, record) => (
              <Space>
                <Button
                  type="primary"
                  onClick={() => {
                    navigate(`/review-queue/patient/${record.user_id}`);
                  }}
                >
                  Open review
                </Button>
              </Space>
            )}
          />
        </Table>
      )}

      <Button className="mt-4" onClick={() => void loadQueue()}>
        Refresh queue
      </Button>
    </List>
  );
}
