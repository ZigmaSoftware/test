import { ChangeEvent, JSX, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "./tripsummary.css";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";

// ------------------------------
// TYPES
// ------------------------------
type RawVehicle = Record<string, any>;

type VehicleOption = {
  id: string;
  label: string;
};

interface HistoryRow {
  startTime: number;
  endTime: number;
  intLoc: string;
  finLoc: string;
  tripDistance: number;
  position: string;
  duration: number;
}

interface TripData {
  vehicleName?: string;
  startOdo?: number;
  endOdo?: number;
  totalTripLength?: number;
  moveCount?: number;
  parkCount?: number;
  idleCount?: number;
  historyConsilated?: HistoryRow[];
}

// ------------------------------
// STATUS ICONS
// ------------------------------
type VisualStatus = "moving" | "parked" | "idle";

const STATUS_ICONS: Record<VisualStatus, JSX.Element> = {
  moving: (
    <svg viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="22" fill="#d1fae5" />
      <path
        d="M16 26l16-12v7h9l-16 12v-7H16z"
        fill="#047857"
        stroke="#065f46"
        strokeWidth="1"
      />
    </svg>
  ),
  parked: (
    <svg viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="22" fill="#e0e7ff" />
      <path
        d="M12 26h24l4-8H8l4 8z"
        fill="#1d4ed8"
        stroke="#1e40af"
        strokeWidth="1"
      />
      <rect x="14" y="22" width="5" height="5" fill="#bfdbfe" />
      <rect x="29" y="22" width="5" height="5" fill="#bfdbfe" />
    </svg>
  ),
  idle: (
    <svg viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="22" fill="#fef3c7" />
      <rect x="16" y="14" width="6" height="20" rx="3" fill="#ca8a04" />
      <rect x="26" y="14" width="6" height="20" rx="3" fill="#ca8a04" />
    </svg>
  ),
};

// ------------------------------
// CONSTANTS
// ------------------------------
const TRACKING_API_URL =
  "https://api.vamosys.com/mobile/getGrpDataForTrustedClients?providerName=BLUEPLANET&fcode=VAM";

const FALLBACK_VEHICLES: VehicleOption[] = [
  { id: "UP16KT1737", label: "UP16KT1737" },
  { id: "UP16KT1738", label: "UP16KT1738" },
  { id: "UP16KT1739", label: "UP16KT1739" },
  { id: "UP16KT1740", label: "UP16KT1740" },
  { id: "UP16KT1741", label: "UP16KT1741" },
  { id: "UP16KT1742", label: "UP16KT1742" },
  { id: "UP16KT1907", label: "UP16KT1907" },
  { id: "UP16KT1908", label: "UP16KT1908" },
  { id: "UP16KT1910", label: "UP16KT1910" },
  { id: "UP16KT1911", label: "UP16KT1911" },
  { id: "UP16KT1912", label: "UP16KT1912" },
  { id: "UP16KT1913", label: "UP16KT1913" },
];

// ------------------------------
// HELPERS
// ------------------------------
const pad = (v: number) => String(v).padStart(2, "0");

const formatInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;

const computeInitialRange = () => {
  const to = new Date();
  const from = new Date(to.getTime() - 6 * 60 * 60 * 1000);
  return { from, to };
};

const normalizeVehicle = (record: RawVehicle): VehicleOption | null => {
  const candidate =
    record?.vehicleId ||
    record?.vehicle_id ||
    record?.vehicleNo ||
    record?.regNo ||
    record?.vehicle_number ||
    record?.VehicleNo;

  if (!candidate) return null;
  const val = String(candidate).trim();
  return val ? { id: val, label: val } : null;
};

// ------------------------------
// COMPONENT
// ------------------------------
export default function TripSummary() {
  const initialRange = useMemo(computeInitialRange, []);

  const [vehicles, setVehicles] = useState(FALLBACK_VEHICLES);
  const [vehicleId, setVehicleId] = useState(FALLBACK_VEHICLES[0].id);
  const [fromDate, setFromDate] = useState(formatInput(initialRange.from));
  const [toDate, setToDate] = useState(formatInput(initialRange.to));

  const [summary, setSummary] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(false);

  const [rosterError, setRosterError] = useState("");
  const [summaryError, setSummaryError] = useState("");

  const [globalFilterValue, setGlobalFilterValue] = useState("");

  const [filters, setFilters] = useState<any>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  // ------------------------------
  // LOAD VEHICLE LIST
  // ------------------------------
  useEffect(() => {
    let aborted = false;

    const loadVehicles = async () => {
      try {
        const resp = await fetch(TRACKING_API_URL);
        if (!resp.ok) throw new Error("Roster API error");

        const json = await resp.json();
        const list = Array.isArray(json) ? json : json?.data;

        const normalized =
          Array.isArray(list)
            ? list
                .map((rec) => normalizeVehicle(rec))
                .filter((x): x is VehicleOption => Boolean(x))
            : [];

        if (!aborted) {
          if (normalized.length) {
            setVehicles(normalized);
            setVehicleId(normalized[0].id);
          } else {
            setVehicles(FALLBACK_VEHICLES);
            setRosterError("No live vehicles. Using fallback list.");
          }
        }
      } catch (e) {
        if (!aborted) {
          setVehicles(FALLBACK_VEHICLES);
          setRosterError("Failed to load live vehicles.");
        }
      }
    };

    loadVehicles();
    return () => {
      aborted = true;
    };
  }, []);

  // ------------------------------
  // FETCH TRIP SUMMARY
  // ------------------------------
  const fetchSummary = async () => {
    if (!vehicleId) {
      setSummaryError("Select vehicle.");
      return;
    }

    const fromTs = new Date(fromDate).getTime();
    const toTs = new Date(toDate).getTime();

    if (fromTs >= toTs) {
      setSummaryError("Invalid date range.");
      return;
    }

    try {
      setLoading(true);
      setSummaryError("");

      const apiUrl = `https://gpsvtsprobend.vamosys.com/v2/getTripSummary?vehicleId=${vehicleId}&fromDateUTC=${fromTs}&toDateUTC=${toTs}&userId=NMCP2DISPOSAL&duration=0`;

      const resp = await fetch(apiUrl);
      const json = await resp.json();

      if (!json?.data) {
        setSummary(null);
        setSummaryError("No records found.");
        return;
      }

      setSummary(json.data);

      if (!json.data.historyConsilated?.length) {
        setSummaryError("No trip rows in range.");
      }
    } catch (err) {
      setSummary(null);
      setSummaryError("Trip summary fetch failed.");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------
  // EXPORT
  // ------------------------------
  const handleExport = () => {
    const rows = summary?.historyConsilated ?? [];

    if (!rows.length) {
      setSummaryError("No data to export.");
      return;
    }

    const xls = rows.map((row, i) => ({
      "S.No": i + 1,
      "Vehicle No": summary?.vehicleName || vehicleId,
      "Start Time": new Date(row.startTime).toLocaleString(),
      "Start Address": row.intLoc || "-",
      "End Time": new Date(row.endTime).toLocaleString(),
      "End Address": row.finLoc || "-",
      Position: row.position || "-",
      "Total Minutes": Math.floor((row.duration || 0) / 60000),
      Distance: row.tripDistance || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(xls);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Trip Summary");
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([out], { type: "application/octet-stream" }),
      `trip-summary-${vehicleId}-${Date.now()}.xlsx`
    );
  };

  // ------------------------------
  // FILTER LOGIC
  // ------------------------------
  const onGlobalFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters({
      ...filters,
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    });
    setGlobalFilterValue(value);
  };

  const trip = summary || {};
  const rows = trip.historyConsilated || [];

  // ------------------------------
  // JSX
  // ------------------------------
  return (
    <div className="trip-summary-shell">
      <div className="trip-summary-container">
        <div className="trip-summary-header">
          <h3>Trip Summary</h3>

          <button className="btn-excel" onClick={handleExport}>
            <i className="pi pi-download" /> Download
          </button>
        </div>

        {/* Filters */}
        <div className="filter-row">
          <div className="filter-field">
            <label>Vehicle</label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label>From</label>
            <input
              type="datetime-local"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div className="filter-field">
            <label>To</label>
            <input
              type="datetime-local"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <button className="btn-go" disabled={loading} onClick={fetchSummary}>
            {loading ? "Loading..." : "Go"}
          </button>
        </div>

        {rosterError && <div className="trip-inline-alert">{rosterError}</div>}
        {summaryError && (
          <div className="trip-inline-alert warning">{summaryError}</div>
        )}

        {/* SUMMARY */}
        <div className="summary-header">
          <p>
            <span>Vehicle No:</span> {trip.vehicleName || "-"}
          </p>
          <p>
            <span>Start Km:</span> {trip.startOdo ?? "-"}
          </p>
          <p>
            <span>End Km:</span> {trip.endOdo ?? "-"}
          </p>
          <p>
            <span>Trip Distance:</span> {trip.totalTripLength ?? "-"} km
          </p>
        </div>

        {/* STATUS CARDS */}
        <div className="status-cards">
          <div className="card moving">
            <div className="icon-wrap">{STATUS_ICONS.moving}</div>
            <div>
              <p>Moving</p>
              <strong>{trip.moveCount ?? "-"}</strong>
            </div>
          </div>

          <div className="card parked">
            <div className="icon-wrap">{STATUS_ICONS.parked}</div>
            <div>
              <p>Parked</p>
              <strong>{trip.parkCount ?? "-"}</strong>
            </div>
          </div>

          <div className="card idle">
            <div className="icon-wrap">{STATUS_ICONS.idle}</div>
            <div>
              <p>Idle</p>
              <strong>{trip.idleCount ?? "-"}</strong>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="trip-table-card">
          <DataTable
            value={rows}
            paginator
            rows={10}
            filters={filters}
            globalFilterFields={["intLoc", "finLoc", "position"]}
            header={
              <div className="flex justify-between items-center gap-3">
                <div className="text-lg font-semibold">Trip Records</div>

                <div className="flex items-center bg-white px-3 py-1 border rounded-md">
                  <i className="pi pi-search text-gray-500" />
                  <InputText
                    value={globalFilterValue}
                    onChange={onGlobalFilterChange}
                    placeholder="Search..."
                    className="p-inputtext-sm border-0 shadow-none"
                  />
                </div>
              </div>
            }
            emptyMessage="No trip records found."
            stripedRows
            showGridlines
            responsiveLayout="scroll"
          >
            <Column
              header="S.No"
              body={(_, { rowIndex }) => rowIndex + 1}
              style={{ width: "80px" }}
            />
            <Column
              header="Start Time"
              body={(r: HistoryRow) =>
                new Date(r.startTime).toLocaleString()
              }
              sortable
              style={{ minWidth: "170px" }}
            />
            <Column
              header="Start Address"
              body={(r: HistoryRow) => r.intLoc || "-"}
              style={{ minWidth: "180px" }}
            />
            <Column
              header="End Time"
              body={(r: HistoryRow) =>
                new Date(r.endTime).toLocaleString()
              }
              sortable
              style={{ minWidth: "170px" }}
            />
            <Column
              header="End Address"
              body={(r: HistoryRow) => r.finLoc || "-"}
              style={{ minWidth: "180px" }}
            />
            <Column
              header="Vehicle No"
              body={() => trip.vehicleName || vehicleId}
              style={{ minWidth: "140px" }}
            />
            <Column
              header="Position"
              body={(r: HistoryRow) => r.position || "-"}
              style={{ minWidth: "140px" }}
            />
            <Column
              header="Total Minutes"
              body={(r: HistoryRow) =>
                Math.floor((r.duration ?? 0) / 60000)
              }
              style={{ minWidth: "150px" }}
            />
            <Column
              header="Distance"
              body={(r: HistoryRow) => r.tripDistance ?? 0}
              style={{ minWidth: "120px" }}
            />
          </DataTable>
        </div>
      </div>
    </div>
  );
}
