import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { desktopApi } from "@/api";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";

import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Switch } from "@/components/ui/switch";

type MainUserScreen = {
  unique_id: string;
  mainscreen: string;
  is_active: boolean;
};

export default function MainUserScreenList() {
  const [data, setData] = useState<MainUserScreen[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<any>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    mainscreen: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });
  const [search, setSearch] = useState("");

  const navigate = useNavigate();
  const { encAdmins, encMainUserScreen } = getEncryptedRoute();

  const NEW_PATH = `/${encAdmins}/${encMainUserScreen}/new`;
  const EDIT_PATH = (uid: string) =>
    `/${encAdmins}/${encMainUserScreen}/${uid}/edit`;

  const loadData = async () => {
    try {
      const res = await desktopApi.get("mainuserscreen/");
      setData(res.data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const deleteRecord = async (uid: string) => {
    const confirm = await Swal.fire({
      title: "Delete?",
      text: "This record will be permanently removed.",
      icon: "warning",
      showCancelButton: true,
    });

    if (!confirm.isConfirmed) return;

    try {
      await desktopApi.delete(`mainuserscreen/${uid}/`);
      Swal.fire("Deleted!", "", "success");
      loadData();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const toggleStatus = async (row: MainUserScreen, newValue: boolean) => {
    setData((prev) =>
      prev.map((x) =>
        x.unique_id === row.unique_id ? { ...x, is_active: newValue } : x
      )
    );

    try {
      await desktopApi.patch(`mainuserscreen/${row.unique_id}/`, {
        is_active: newValue,
      });
    } catch (err) {
      console.error("Status update failed");
      setData((prev) =>
        prev.map((x) =>
          x.unique_id === row.unique_id ? { ...x, is_active: !newValue } : x
        )
      );
    }
  };

  const header = (
    <div className="flex justify-end">
      <InputText
        value={search}
        onChange={(e) => {
          const val = e.target.value;
          setSearch(val);
          setFilters({
            ...filters,
            global: { value: val, matchMode: FilterMatchMode.CONTAINS },
          });
        }}
        placeholder="Search..."
      />
    </div>
  );

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6 bg-white rounded shadow">
      <div className="flex justify-between mb-6">
        <h2 className="text-xl font-bold">Main User Screens</h2>
        <Button
          label="Add New"
          className="p-button-success"
          icon="pi pi-plus"
          onClick={() => navigate(NEW_PATH)}
        />
      </div>

      <DataTable
        value={data}
        paginator
        rows={10}
        filters={filters}
        globalFilterFields={["mainscreen"]}
        header={header}
        showGridlines
        stripedRows
      >
        <Column
          header="S.No"
          body={(_, { rowIndex }) => rowIndex + 1}
          style={{ width: "80px" }}
        />

        <Column field="mainscreen" header="Main Screen" sortable />

        <Column
          header="Status"
          body={(row) => (
            <Switch checked={row.is_active} onCheckedChange={(v) => toggleStatus(row, v)} />
          )}
        />

        <Column
          header="Actions"
          body={(row) => (
            <div className="flex gap-2">
              <button onClick={() => navigate(EDIT_PATH(row.unique_id))}>
                <PencilIcon className="size-5 text-blue-600" />
              </button>
              <button onClick={() => deleteRecord(row.unique_id)}>
                <TrashBinIcon className="size-5 text-red-600" />
              </button>
            </div>
          )}
        />
      </DataTable>
    </div>
  );
}
