import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { FilterMatchMode } from "primereact/api";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import type { DataTableFilterMeta } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";

import { desktopApi, mobileAPI } from "@/api";
import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

type Complaint = {
  id: number;
  unique_id: string;
  customer_name: string;
  contact_no: string;
  category: string;
  details: string;
  zone_name: string;
  ward_name: string;
  address: string;
  image_url?: string;
  close_image_url?: string;
  status: string;
  action_remarks?: string;
  created: string;
  complaint_closed_at?: string | null;
  mainCategory?: string | number;
  subCategory?: string | number;
  main_categoryName?: string;
  sub_categoryName?: string;
};

const FILE_ICON =
  "https://cdn-icons-png.flaticon.com/512/337/337946.png";

export default function ComplaintsList() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [mainCategories, setMainCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<any>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const navigate = useNavigate();
  const { encCitizenGrivence, encComplaint } = getEncryptedRoute();

  const ENC_NEW_PATH = `/${encCitizenGrivence}/${encComplaint}/new`;
  const ENC_EDIT_PATH = (id: number) => `/${encCitizenGrivence}/${encComplaint}/${id}/edit`;

  const fetchData = async () => {
    try {
      const res = await desktopApi.get("/complaints/");
      setComplaints(res.data);
    } catch {
      Swal.fire("Error", "Unable to load complaints", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchCategories = async () => {
    try {
      const [mainRes, subRes] = await Promise.all([
        mobileAPI.get("main-category/"),
        mobileAPI.get("sub-category/"),
      ]);

      const mains = Array.isArray(mainRes.data)
        ? mainRes.data
        : mainRes.data?.data || [];
      const subs = Array.isArray(subRes.data)
        ? subRes.data
        : subRes.data?.data || [];

      setMainCategories(
        mains.filter((m: any) => m.is_delete !== true && m.is_active !== false)
      );
      setSubCategories(
        subs.filter((s: any) => s.is_delete !== true && s.is_active !== false)
      );
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const formatDT = (d: string | null | undefined) => {
    if (!d) return "-";

    const dt = new Date(d);

    const day = String(dt.getDate()).padStart(2, "0");
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const year = dt.getFullYear();

    let hours = dt.getHours();
    const minutes = String(dt.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;
    hours = hours ? hours : 12;

    return (
      <>
        {`${day}-${month}-${year}`}
        <br />
        {`${hours}.${minutes} ${ampm}`}
      </>
    );
  };

  const isImage = (url: string) => {
    const lower = url.toLowerCase();
    return (
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".png") ||
      lower.endsWith(".webp")
    );
  };

  const openFile = (fileUrl: string) => {
    if (!fileUrl) return;

    if (isImage(fileUrl)) {
      setModalImage(fileUrl);
    } else {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
    }
  };

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  const extractFromDetails = (
    details: string | undefined,
    label: "Main" | "Sub"
  ) => {
    if (!details) return "";

    const parts = details.split("|").map((p) => p.trim());
    const match = parts.find((p) =>
      p.toLowerCase().startsWith(`${label.toLowerCase()}:`)
    );

    if (!match) return "";

    const [, value] = match.split(":");
    return value?.trim() || "";
  };

  const getMainCategoryName = (row: Complaint) => {
    const r: any = row;
    const mainName =
      r.main_categoryName ||
      r.mainCategoryName ||
      r.main_category_name ||
      r.mainCategory_name;

    const mainId = r.mainCategory ?? r.main_category ?? r.main_category_id;
    const mainFromList = mainCategories.find(
      (m: any) => String(m.id) === String(mainId)
    );

    return (
      mainName ||
      mainFromList?.main_categoryName ||
      mainFromList?.name ||
      extractFromDetails(r.details, "Main") ||
      ""
    );
  };

  const getSubCategoryName = (row: Complaint) => {
    const r: any = row;
    const subName =
      r.sub_categoryName ||
      r.subCategoryName ||
      r.sub_category_name ||
      r.subCategory_name;

    const subId = r.subCategory ?? r.sub_category ?? r.sub_category_id;
    const subFromList = subCategories.find(
      (s: any) => String(s.id) === String(subId)
    );

    return (
      subName ||
      subFromList?.name ||
      extractFromDetails(r.details, "Sub") ||
      ""
    );
  };

  const categoryTemplate = (row: Complaint) => {
    const mainName = getMainCategoryName(row);
    const subName = getSubCategoryName(row);

    if (mainName && subName) return `${mainName} / ${subName}`;
    if (mainName) return mainName;
    if (subName) return subName;

    return cap(row.category) || "-";
  };

  const descriptionTemplate = (row: Complaint) => {
    const parts = (row.details || "")
      .split("|")
      .map((p) => p.trim())
      .filter(
        (p) =>
          p &&
          !p.toLowerCase().startsWith("main:") &&
          !p.toLowerCase().startsWith("sub:")
      );

    if (!parts.length) return "-";
    return parts.join(" | ");
  };

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters({
      ...filters,
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    });
    setGlobalFilterValue(value);
  };

  const tableHeader = (
    <div className="flex justify-end w-full">
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder="Search complaints..."
          className="p-inputtext-sm !border-0 !shadow-none"
        />
      </div>
    </div>
  );

  const rowExpansionTemplate = (data: Complaint) => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex flex-col gap-2 md:flex-row">
        <div className="w-full md:w-1/4 font-semibold">Close Image :</div>
        <div className="space-y-2">
          {data.close_image_url ? (
            <button onClick={() => openFile(data.close_image_url!)}>
              <img
                src={
                  isImage(data.close_image_url!)
                    ? data.close_image_url!
                    : FILE_ICON
                }
                className="w-40 h-20 rounded border object-cover"
              />
            </button>
          ) : (
            "-"
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 md:flex-row">
        <div className="w-full md:w-1/4 font-semibold">Action Remarks :</div>
        <div>{data.action_remarks || "-"}</div>
      </div>

      {data.status !== "CLOSED" && (
        <div className="flex justify-start">
          <div className="w-full md:w-1/4 font-semibold">Action :</div>
          <button
            className="text-blue-600 flex items-center gap-2 border px-4 py-1 rounded"
            onClick={() => navigate(ENC_EDIT_PATH(data.id))}
          >
            <PencilIcon className="size-5" />
          </button>
        </div>
      )}
    </div>
  );

  const indexTemplate = (_: Complaint, options: { rowIndex?: number }) =>
    (options.rowIndex ?? 0) + 1;

  const imageTemplate = (row: Complaint) => (
    <div className="text-center">
      {row.image_url ? (
        <button onClick={() => openFile(row.image_url!)}>
          <img
            src={isImage(row.image_url!) ? row.image_url! : FILE_ICON}
            className="w-28 h-16 object-cover rounded border"
          />
        </button>
      ) : (
        "-"
      )}
    </div>
  );

  const closureTemplate = (row: Complaint) => (
    <div className="flex flex-col text-sm">
      <span>{formatDT(row.complaint_closed_at)}</span>
      <span className="font-semibold text-gray-700">{row.status}</span>
    </div>
  );

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 flex justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Complaints</h1>
            <p className="text-gray-500 text-sm">
              Manage all citizen grievance complaints
            </p>
          </div>

          <Button
            label="Add Complaint"
            icon="pi pi-plus"
            className="!bg-gradient-to-r !from-[#0f5bd8] !to-[#013E7E] !border-none !text-white hover:!opacity-90"
            onClick={() => navigate(ENC_NEW_PATH)}
          />
        </div>

        <div className="rounded-lg p-3">
          <DataTable
            value={complaints}
            dataKey="id"
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            filters={filters}
            globalFilterFields={[
              "unique_id",
              "customer_name",
              "contact_no",
              "category",
              "main_categoryName",
              "sub_categoryName",
              "mainCategoryName",
              "subCategoryName",
              "zone_name",
              "ward_name",
              "address",
              "status",
            ]}
            header={tableHeader}
            emptyMessage="No complaints found."
            responsiveLayout="scroll"
            className="p-datatable-sm"
            expandedRows={expandedRows}
            onRowToggle={(e) => setExpandedRows(e.data)}
            rowExpansionTemplate={rowExpansionTemplate}
            showGridlines
            stripedRows
          >
            <Column expander style={{ width: "3rem" }} />
            <Column header="S.No" body={indexTemplate} style={{ width: "90px" }} />
            <Column
              header="Comp Created"
              body={(row: Complaint) => formatDT(row.created)}
              style={{ minWidth: "160px" }}
            />
            <Column
              field="unique_id"
              header="CG No"
              sortable
              style={{ minWidth: "140px" }}
            />
            <Column
              field="contact_no"
              header="Comp Ph No"
              sortable
              style={{ minWidth: "140px" }}
            />
            <Column
              header="Main / Sub Category"
              body={categoryTemplate}
              style={{ minWidth: "160px" }}
            />
            <Column
              header="Zone / Ward"
              body={(row: Complaint) => `${row.zone_name}/${row.ward_name}`}
              style={{ minWidth: "140px" }}
            />
            <Column field="address" header="Location" />
            <Column header="Description" body={descriptionTemplate} />
            <Column header="Image" body={imageTemplate} />
            <Column header="Comp Closure / Status" body={closureTemplate} />
          </DataTable>
        </div>
      </div>

      {modalImage && (
        <div className="fixed inset-0 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white p-4 rounded shadow relative">
            <button
              className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded"
              onClick={() => setModalImage(null)}
            >
              X
            </button>

            <img src={modalImage} className="w-[400px] h-[400px] rounded" />
          </div>
        </div>
      )}
    </div>
  );
}
