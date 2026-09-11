import { useGetIdentity, usePermissions } from "@refinedev/core";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Input,
  Modal,
  Space,
  Spin,
  Table,
  Typography,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  StatusChip,
  interventionChipKind,
  interventionChipLabel,
} from "../../components/StatusChip";
import { canSignOffPlan } from "../../utility/canSignOffPlan";
import { formatSupabaseError } from "../../utility/formatSupabaseError";
import {
  buildReviewFlags,
  questionnaireSnapshotFromSections,
  type ReviewFlag,
} from "../../utility/reviewFlags";
import { signOffIntervention } from "../../utility/signOffIntervention";
import { supabaseClient } from "../../utility/supabaseClient";

type InterventionRow = {
  id: string;
  user_id: string;
  trigger_finding: string;
  plain_reason?: string | null;
  category: string;
  title: string;
  description?: string | null;
  clinical_basis?: string | null;
  status: string;
  clinician_interaction_check?: boolean;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at?: string;
};

type TestResultRow = {
  id: string;
  test_name: string;
  plain_name?: string | null;
  result_value?: string | null;
  result_unit?: string | null;
  reference_range?: string | null;
  flag?: string | null;
  reviewed_at?: string | null;
};

type ProfileRow = {
  id: string;
  full_name?: string | null;
  date_of_birth?: string | null;
  sex?: string | null;
};

function FlagBanner({ flag }: { flag: ReviewFlag }) {
  return (
    <Alert
      className="mb-3"
      type={flag.severity === "danger" ? "error" : "warning"}
      showIcon
      message={flag.title}
      description={flag.detail}
    />
  );
}

/**
 * Full clinician review for one patient: results, flags, interventions, finalise.
 */
export function ReviewQueuePatient() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { data: role } = usePermissions<string>({});
  const { data: identity } = useGetIdentity<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [interventions, setInterventions] = useState<InterventionRow[]>([]);
  const [results, setResults] = useState<TestResultRow[]>([]);
  const [flags, setFlags] = useState<ReviewFlag[]>([]);
  const [maySignOff, setMaySignOff] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<InterventionRow | null>(null);
  const [dosageNote, setDosageNote] = useState("");

  const draftCount = useMemo(
    () => interventions.filter((row) => row.status === "draft").length,
    [interventions],
  );

  const approvedCount = useMemo(
    () => interventions.filter((row) => row.status === "clinician_approved").length,
    [interventions],
  );

  const canFinalise = maySignOff && draftCount === 0 && approvedCount > 0;

  const loadPatient = useCallback(async () => {
    if (!userId) {
      return;
    }

    setLoading(true);
    setMessage(null);

    const loadErrors: string[] = [];
    let nextProfile: ProfileRow | null = null;
    let interventionRows: InterventionRow[] = [];
    let resultRows: TestResultRow[] = [];
    const sectionMap: Record<string, Record<string, unknown>> = {};

    const [profileRes, interventionRes, resultsRes, questionnaireRes] =
      await Promise.all([
        supabaseClient
          .from("profiles")
          .select("id, full_name, date_of_birth, sex")
          .eq("id", userId)
          .maybeSingle(),
        supabaseClient
          .from("interventions")
          .select(
            "id, user_id, trigger_finding, plain_reason, category, title, description, clinical_basis, status, clinician_interaction_check, approved_by, approved_at, created_at",
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: true }),
        supabaseClient
          .from("test_results")
          .select(
            "id, test_name, plain_name, result_value, result_unit, reference_range, flag, reviewed_at",
          )
          .eq("user_id", userId)
          .order("reviewed_at", { ascending: false }),
        supabaseClient
          .from("questionnaire_responses")
          .select("section, responses")
          .eq("user_id", userId),
      ]);

    if (profileRes.error) {
      loadErrors.push(
        `Profile: ${formatSupabaseError(
          profileRes.error,
          "Could not load patient profile.",
        )}`,
      );
    } else {
      nextProfile = (profileRes.data as ProfileRow | null) ?? null;
    }

    if (interventionRes.error) {
      loadErrors.push(
        `Interventions: ${formatSupabaseError(
          interventionRes.error,
          "Could not load interventions.",
        )}`,
      );
    } else {
      interventionRows = (interventionRes.data ?? []) as InterventionRow[];
    }

    if (resultsRes.error) {
      loadErrors.push(
        `Lab results: ${formatSupabaseError(
          resultsRes.error,
          "Could not load lab results.",
        )}`,
      );
    } else {
      resultRows = (resultsRes.data ?? []) as TestResultRow[];
    }

    if (questionnaireRes.error) {
      loadErrors.push(
        `Questionnaire: ${formatSupabaseError(
          questionnaireRes.error,
          "Could not load questionnaire answers.",
        )}`,
      );
    } else {
      for (const row of questionnaireRes.data ?? []) {
        if (row.section && row.responses) {
          sectionMap[String(row.section)] = row.responses as Record<
            string,
            unknown
          >;
        }
      }
    }

    const snapshot = questionnaireSnapshotFromSections(sectionMap);

    setProfile(nextProfile);
    setInterventions(interventionRows);
    setResults(resultRows);
    setFlags(buildReviewFlags(interventionRows, snapshot, resultRows));

    if (loadErrors.length > 0) {
      setMessage(loadErrors.join(" "));
    } else if (!nextProfile) {
      setMessage(
        "No profile row found for this user id. Check the patient exists and your staff role allows review access.",
      );
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void loadPatient();
  }, [loadPatient]);

  useEffect(() => {
    void (async () => {
      const allowed = await canSignOffPlan(role, identity?.id);
      setMaySignOff(allowed);
    })();
  }, [role, identity?.id]);

  const runAction = useCallback(
    async (
      action: "approve" | "decline" | "edit" | "finalise_plan",
      interventionId?: string,
      note?: string,
    ) => {
      if (!userId) {
        return;
      }

      setBusyId(interventionId ?? "finalise");
      setMessage(null);

      const outcome = await signOffIntervention({
        action,
        intervention_id: interventionId,
        patient_user_id: action === "finalise_plan" ? userId : undefined,
        dosage_note: note,
      });

      setBusyId(null);

      if (!outcome.ok) {
        setMessage(outcome.message);
        return;
      }

      await loadPatient();
    },
    [userId, loadPatient],
  );

  const openEdit = (row: InterventionRow) => {
    setEditRow(row);
    setDosageNote(row.description ?? "");
  };

  if (!userId) {
    return <Alert type="error" message="Missing patient id in the URL." />;
  }

  return (
    <div>
      <Space className="mb-4">
        <Button onClick={() => navigate("/review-queue")}>Back to queue</Button>
        <Typography.Title level={3} className="ls-page-title" style={{ margin: 0 }}>
          Review: {profile?.full_name?.trim() || "Patient"}
        </Typography.Title>
      </Space>

      {message ? (
        <Alert className="mb-4" type="error" showIcon message={message} />
      ) : null}

      {loading ? (
        <div className="py-12 text-center">
          <Spin size="large" />
        </div>
      ) : (
        <>
          <Card title="Patient" className="mb-4">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Name">
                {profile?.full_name?.trim() || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="User id">{userId}</Descriptions.Item>
              <Descriptions.Item label="Date of birth">
                {profile?.date_of_birth ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Sex">{profile?.sex ?? "—"}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="Safety flags (read first)" className="mb-4">
            {flags.length === 0 ? (
              <Typography.Text type="secondary">
                No iodine hard-stop or interaction flags for this patient right now.
              </Typography.Text>
            ) : (
              flags.map((flag) => <FlagBanner key={flag.title} flag={flag} />)
            )}
          </Card>

          <Card title="Lab results" className="mb-4">
            <Table<TestResultRow>
              rowKey="id"
              dataSource={results}
              pagination={false}
              size="small"
              locale={{ emptyText: "No lab results saved yet." }}
            >
              <Table.Column
                title="Plain name"
                dataIndex="plain_name"
                render={(value: string, row) => value || row.test_name}
              />
              <Table.Column title="Clinical test name" dataIndex="test_name" />
              <Table.Column
                title="Value"
                render={(_, row) =>
                  [row.result_value, row.result_unit].filter(Boolean).join(" ") ||
                  "—"
                }
              />
              <Table.Column title="Reference" dataIndex="reference_range" />
              <Table.Column
                title="Flag"
                dataIndex="flag"
                render={(value: string) => value || "—"}
              />
            </Table>
          </Card>

          <Card
            title="Plan interventions"
            extra={
              <Space>
                <StatusChip kind="draft">{draftCount} draft</StatusChip>
                <StatusChip kind="approved">{approvedCount} approved</StatusChip>
              </Space>
            }
            className="mb-4"
          >
            <Table<InterventionRow>
              rowKey="id"
              dataSource={interventions}
              pagination={false}
              size="small"
              locale={{ emptyText: "No interventions for this patient." }}
            >
              <Table.Column title="Title" dataIndex="title" />
              <Table.Column title="Category" dataIndex="category" />
              <Table.Column
                title="Plain reason"
                dataIndex="plain_reason"
                render={(value: string) => value || "—"}
              />
              <Table.Column
                title="Clinical basis"
                dataIndex="clinical_basis"
                render={(value: string, row) => value || row.trigger_finding}
              />
              <Table.Column
                title="Finding"
                dataIndex="trigger_finding"
                width={220}
              />
              <Table.Column
                title="Dosage note"
                dataIndex="description"
                render={(value: string) => value || "—"}
              />
              <Table.Column
                title="Status"
                dataIndex="status"
                render={(status: string) => (
                  <StatusChip kind={interventionChipKind(status)}>
                    {interventionChipLabel(status)}
                  </StatusChip>
                )}
              />
              <Table.Column<InterventionRow>
                title="Actions"
                render={(_, row: InterventionRow) => {
                  if (!maySignOff) {
                    return <Typography.Text type="secondary">View only</Typography.Text>;
                  }

                  const busy = busyId === row.id;
                  return (
                    <Space wrap>
                      {row.status === "draft" ? (
                        <>
                          <Button
                            type="primary"
                            size="small"
                            loading={busy}
                            onClick={() => void runAction("approve", row.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            danger
                            size="small"
                            loading={busy}
                            onClick={() => void runAction("decline", row.id)}
                          >
                            Decline
                          </Button>
                        </>
                      ) : null}
                      {row.status === "draft" ||
                      row.status === "clinician_approved" ? (
                        <Button
                          size="small"
                          loading={busy}
                          onClick={() => openEdit(row)}
                        >
                          Edit note
                        </Button>
                      ) : null}
                    </Space>
                  );
                }}
              />
            </Table>
          </Card>

          <Card title="Finalise plan">
            <Typography.Paragraph>
              When every draft item is approved or declined, press{" "}
              <strong>Finalise plan</strong>. That sets approved items to{" "}
              <StatusChip kind="active">Active</StatusChip> and unlocks store purchases on the
              patient&apos;s phone.
            </Typography.Paragraph>

            {!maySignOff ? (
              <Alert
                type="info"
                showIcon
                message="You need sign-off permission to finalise."
              />
            ) : null}

            {maySignOff && draftCount > 0 ? (
              <Alert
                className="mb-3"
                type="warning"
                showIcon
                message={`${draftCount} draft item(s) still need approve or decline.`}
              />
            ) : null}

            <Button
              type="primary"
              size="large"
              disabled={!canFinalise}
              loading={busyId === "finalise"}
              onClick={() => void runAction("finalise_plan")}
            >
              Finalise plan
            </Button>
          </Card>
        </>
      )}

      <Modal
        title="Edit dosage note"
        open={editRow !== null}
        onCancel={() => setEditRow(null)}
        onOk={() => {
          if (!editRow) {
            return;
          }
          void runAction("edit", editRow.id, dosageNote).then(() => {
            setEditRow(null);
          });
        }}
        okText="Save note"
      >
        <Typography.Paragraph type="secondary">
          Plain-language dosage or timing note the patient will see. This does not
          change the clinical basis.
        </Typography.Paragraph>
        <Input.TextArea
          rows={4}
          value={dosageNote}
          onChange={(event) => setDosageNote(event.target.value)}
          placeholder="e.g. Take with food in the morning — discuss timing with your clinician."
        />
      </Modal>
    </div>
  );
}
