import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import { mobileAPI } from "@/api";

import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";

import { PencilIcon, TrashBinIcon } from "@/icons";
import { Switch } from "@/components/ui/switch";
import { getEncryptedRoute } from "@/utils/routeCache";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

export default function SubComplaintCategoryList() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainCatMap, setMainCatMap] = useState<Record<string, string>>({});

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    name: { value: null, matchMode: FilterMatchMode.STARTS_WITH }
  });

  const navigate = useNavigate();
  const { encCitizenGrivence, encSubComplaintCategory } = getEncryptedRoute();

  const NEW_PATH = `/${encCitizenGrivence}/${encSubComplaintCategory}/new`;
  const EDIT_PATH = (id: string) =>
    `/${encCitizenGrivence}/${encSubComplaintCategory}/${id}/edit`;

  const fetchData = async () => {
    try {
      const res = await mobileAPI.get("sub-category/");
      const data = res?.data?.data ?? res?.data?.results ?? res?.data ?? [];
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading sub categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    mobileAPI
      .get("main-category/")
      .then((res) => {
        const data = res?.data?.data ?? res?.data ?? [];
        if (Array.isArray(data)) {
          const map: Record<string, string> = {};
          data.forEach((m: any) => {
            const key = String(m.id ?? m.unique_id);
            map[key] = m.main_categoryName || m.name;
          });
          setMainCatMap(map);
        }
      })
      .catch(() => {
        setMainCatMap({});
      });
  }, []);

  const handleDelete = async (id: string) => {
    const confirmation = await Swal.fire({
      title: "Confirm Deletion",
      text: "This record will be permanently removed.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#d33"
    });

    if (!confirmation.isConfirmed) return;

    await mobileAPI.delete(`sub-category/${id}/`);

    Swal.fire({
      icon: "success",
      title: "Deleted Successfully",
      timer: 1500,
      showConfirmButton: false
    });

    fetchData();
  };

  const statusTemplate = (row: any) => {
    const updateStatus = async (value: boolean) => {
      const id = row.unique_id;
      const prev = row.is_active;
      // Optimistically update local state so row stays visible
      setRecords((records) =>
        records.map((r) => (r.unique_id === id ? { ...r, is_active: value } : r))
      );

      try {
        await mobileAPI.patch(`sub-category/${id}/`, {
          is_active: value,
          name: row.name,
          mainCategory: row.mainCategory,
        });
      } catch (err) {
        console.error("Failed to update status:", err);
        setRecords((records) =>
          records.map((r) => (r.unique_id === id ? { ...r, is_active: prev } : r))
        );
        Swal.fire("Error", "Failed to update status", "error");
      }
    };
    return <Switch checked={row.is_active} onCheckedChange={updateStatus} />;
  };

  const actionTemplate = (row: any) => (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() => navigate(EDIT_PATH(row.unique_id))}
        className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800"
      >
        <PencilIcon className="size-5" />
      </button>

      <button
        onClick={() => handleDelete(row.unique_id)}
        className="inline-flex items-center justify-center text-red-600 hover:text-red-800"
      >
        <TrashBinIcon className="size-5" />
      </button>
    </div>
  );

  const indexTemplate = (_: any, { rowIndex }: any) => rowIndex + 1;

  const onGlobalFilterChange = (e: any) => {
    const value = e.target.value;
    setGlobalFilterValue(value);
    setFilters({
      ...filters,
      global: { value, matchMode: FilterMatchMode.CONTAINS }
    });
  };

  const renderMainCategory = (row: any) =>
    row.mainCategory_name ||
    row.main_categoryName ||
    row.mainCategoryName ||
    row.mainCategory?.main_categoryName ||
    row.mainCategory?.name ||
    mainCatMap[String(row.mainCategory)] ||
    row.mainCategory ||
    "-";

  const header = (
    <div className="flex justify-between items-center">
      <div className="flex justify-end w-full">
        <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
          <i className="pi pi-search text-gray-500" />
          <InputText
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder="Search..."
            className="p-inputtext-sm !border-0 !shadow-none"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg shadow-lg p-6">

        {/* PAGE TITLE */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Sub Categories</h1>
            <p className="text-gray-500 text-sm">
              Manage all sub complaint category records
            </p>
          </div>

          <Button
            label="Add New"
            icon="pi pi-plus"
            className="!bg-gradient-to-r !from-[#0f5bd8] !to-[#013E7E] !border-none !text-white hover:!opacity-90"
            onClick={() => navigate(NEW_PATH)}
          />
        </div>

        {/* DATA TABLE */}
        <DataTable
          value={records}
          paginator
          rows={10}
          loading={loading}
          filters={filters}
          globalFilterFields={["name", "mainCategory_name"]}
          header={header}
          rowsPerPageOptions={[5, 10, 25, 50]}
          stripedRows
          showGridlines
          emptyMessage="No records found."
          className="p-datatable-sm"
        >
          <Column header="S.No" body={indexTemplate} style={{ width: "80px" }} />
          <Column field="name" header="Sub Category" sortable />
          <Column
            field="mainCategory_name"
            header="Main Category"
            sortable
            body={renderMainCategory}
          />
          <Column
            field="is_active"
            header="Status"
            body={statusTemplate}
            style={{ width: "150px" }}
          />
          <Column
            header="Actions"
            body={actionTemplate}
            style={{ width: "150px" }}
          />
        </DataTable>
      </div>
    </div>
  );
}
