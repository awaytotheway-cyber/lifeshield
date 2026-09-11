import { List, useTable } from "@refinedev/antd";
import { Table } from "antd";

import { StatusChip, booleanActiveChip } from "../../components/StatusChip";

type ProfileRecord = {
  id: string;
  full_name?: string;
  sex?: string;
  date_of_birth?: string;
  onboarding_completed?: boolean;
  created_at?: string;
};

/**
 * Read-only patient list for support.
 * Full patient CRUD is intentionally out of scope for Day 2.
 */
export function ProfileList() {
  const { tableProps } = useTable({
    syncWithLocation: true,
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
  });

  return (
    <List title="Patients (read-only)">
      <Table {...tableProps} rowKey="id" scroll={{ x: true }}>
        <Table.Column dataIndex="full_name" title="Name" />
        <Table.Column dataIndex="sex" title="Sex" />
        <Table.Column dataIndex="date_of_birth" title="Date of birth" />
        <Table.Column
          dataIndex="onboarding_completed"
          title="Onboarding done"
          render={(value: boolean) => {
            const chip = booleanActiveChip(value);
            return (
              <StatusChip kind={chip.kind}>
                {value ? "Complete" : "In progress"}
              </StatusChip>
            );
          }}
        />
        <Table.Column dataIndex="id" title="User ID" width={280} />
        <Table.Column
          dataIndex="created_at"
          title="Joined"
          render={(value: string) =>
            value ? new Date(value).toLocaleString() : "—"
          }
        />
      </Table>
    </List>
  );
}

// Keep type exported for future show/detail screens.
export type { ProfileRecord };
