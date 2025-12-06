import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { desktopApi } from "@/api";
import Swal from "sweetalert2";

import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { PencilIcon, TrashBinIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";

type StaffUserType = {
  id: number;
  unique_id: string;
  name: string;
  is_active: boolean;
};

export default function StaffUserTypeList() {
  const [staffUserTypes, setStaffUserTypes] = useState<StaffUserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState("");

  const navigate = useNavigate();
  const { encAdmins, encStaffUserType } = getEncryptedRoute();

  const ENC_NEW_PATH = `/${encAdmins}/${encStaffUserType}/new`;
  const ENC_EDIT_PATH = (uid: string) =>
    `/${encAdmins}/${encStaffUserType}/${uid}/edit`;

  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });

  const fetchStaffUserTypes = async () => {
    try {
      const res = await desktopApi.get("staffusertypes/");
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setStaffUserTypes(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffUserTypes();
  }, []);

  // Reload when page regains focus (after editing)
  useEffect(() => {
    const onFocus = () => fetchStaffUserTypes();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const handleDelete = async (uid: string) => {
    const confirm = await Swal.fire({
      title: "Delete?",
      text: "This item will be removed permanently.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
    });

    if (!confirm.isConfirmed) return;

    await desktopApi.delete(`staffusertypes/${uid}/`);

    setStaffUserTypes((prev) => prev.filter((x) => x.unique_id !== uid));

    Swal.fire({
      icon: "success",
      title: "Deleted successfully!",
      timer: 1500,
      showConfirmButton: false,
    });
  };

  const statusTemplate = (row: StaffUserType) => {
    const updateStatus = async (value: boolean) => {
      await desktopApi.patch(`staffusertypes/${row.unique_id}/`, {
        is_active: value,
      });

      setStaffUserTypes((prev) =>
        prev.map((x) =>
          x.unique_id === row.unique_id ? { ...x, is_active: value } : x
        )
      );
    };

    return <Switch checked={row.is_active} onCheckedChange={updateStatus} />;
  };

  const actionTemplate = (row: StaffUserType) => (
    <div className="flex gap-2 justify-center">
      <button
        className="text-blue-600 hover:text-blue-800"
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
      >
        <PencilIcon className="size-5" />
      </button>

      <button
        className="text-red-600 hover:text-red-800"
        onClick={() => handleDelete(row.unique_id)}
      >
        <TrashBinIcon className="size-5" />
      </button>
    </div>
  );

  const header = (
    <div className="flex justify-end items-center">
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilterValue}
          onChange={(e) => {
            setGlobalFilterValue(e.target.value);
            setFilters({
              ...filters,
              global: { value: e.target.value, matchMode: FilterMatchMode.CONTAINS },
            });
          }}
          placeholder="Search..."
          className="p-inputtext-sm !border-0 !shadow-none"
        />
      </div>
    </div>
  );

  const indexTemplate = (_, { rowIndex }) => rowIndex + 1;

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg shadow-lg p-6">

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">
              Staff User Types
            </h1>
            <p className="text-gray-500">Manage staff user type records</p>
          </div>

          <Button
            label="Add Staff User Type"
            icon="pi pi-plus"
            className="p-button-success"
            onClick={() => navigate(ENC_NEW_PATH)}
          />
        </div>

        <DataTable
          value={staffUserTypes}
          paginator
          rows={10}
          loading={loading}
          rowsPerPageOptions={[5, 10, 25, 50]}
          filters={filters}
          globalFilterFields={["name"]}
          header={header}
          stripedRows
          showGridlines
          className="p-datatable-sm"
          emptyMessage="No records found."
        >
          <Column header="S.No" body={indexTemplate} style={{ width: "80px" }} />
          <Column field="name" header="Staff User Type" sortable style={{ minWidth: "200px" }} />
          <Column header="Status" body={statusTemplate} style={{ width: "150px" }} />
          <Column header="Actions" body={actionTemplate} style={{ width: "150px" }} />
        </DataTable>

      </div>
    </div>
  );
}
