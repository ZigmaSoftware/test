import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { getEncryptedRoute } from "@/utils/routeCache";
import { adminApi } from "@/helpers/admin";

const vehicleTypeApi = adminApi.vehicleTypes;

type VehicleTypeRecord = {
  unique_id?: string;
  vehicleType: string;
  description?: string;
  is_active?: boolean;
  is_delete?: boolean;
};

export default function VehicleTypeCreationForm() {
  const [vehicleType, setVehicleType] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [existingTypes, setExistingTypes] = useState<VehicleTypeRecord[]>([]);
  const navigate = useNavigate();


  const { encTransportMaster, encVehicleType } = getEncryptedRoute();
  const ENC_LIST_PATH = `/${encTransportMaster}/${encVehicleType}`;


  const { id } = useParams();
  const isEdit = Boolean(id);
  const resolveId = (item: VehicleTypeRecord) => item?.unique_id ?? "";
  const hasLoadedRef = useRef(false);

  // Fetch existing record if editing
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    vehicleTypeApi
      .list()
      .then((res) => {
        const data = Array.isArray(res) ? res : (res as any)?.results || [];
        setExistingTypes(data);
      })
      .catch(() => {
        console.warn("Failed to load vehicle type list for duplicate check");
      });

    if (isEdit) {
      vehicleTypeApi
        .get(id as string)
        .then((res) => {
          setVehicleType(res.vehicleType);
          setDescription(res.description || "");
          setIsActive(res.is_active);

        })
        .catch(() => {
          Swal.fire({
            icon: "error",
            title: "Failed to load vehicle type",
            text: "Something went wrong!",
          });
        });
    }
  }, [id, isEdit]);

  //  Submit logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedInput = vehicleType.trim().toLowerCase();
    const duplicate = existingTypes.find((v) => {
      const matchesName = v.vehicleType?.trim().toLowerCase() === normalizedInput;
      const sameRecord = isEdit && resolveId(v) === id;
      const deleted = v.is_delete === true;
      return matchesName && !sameRecord && !deleted;
    });

    if (duplicate) {
      Swal.fire({
        icon: "error",
        title: "Duplicate Vehicle Type",
        text: `"${vehicleType}" already exists. Please use a different name.`,
      });
      return;
    }

    setLoading(true);

    const payload = {
      vehicleType,
      description,
      is_active: isActive,
      is_delete: false,
    };
    console.log("Payload:", payload);

    try {
      if (isEdit) {
        await vehicleTypeApi.update(id as string, payload);
        Swal.fire({
          icon: "success",
          title: "Updated successfully!",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await vehicleTypeApi.create(payload);
        Swal.fire({
          icon: "success",
          title: "Added successfully!",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      navigate(ENC_LIST_PATH);
    } catch (error: any) {
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Something went wrong!";
      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text: detail,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f9fafb] min-h-screen p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEdit ? "Edit Vehicle Type" : "Add Vehicle Type"}
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vehicle Type Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle Type Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter vehicle type name"
                value={vehicleType}
                required
                onChange={(e) => setVehicleType(e.target.value)}
                className={`w-full px-3 py-2 border ${vehicleType.trim() === ""
                  ? "border-red-400 focus:ring-red-200"
                  : "border-green-400 focus:ring-green-200"
                  } rounded-sm focus:outline-none focus:ring-2`}
              />
            </div>

            {/* Active Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Active Status <span className="text-red-500">*</span>
              </label>
              <select
                value={isActive ? "Active" : "Inactive"}
                onChange={(e) => setIsActive(e.target.value === "Active")}
                className="w-full px-3 py-2 border border-green-400 rounded-sm focus:outline-none focus:ring-2 focus:ring-green-200"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Description */}
            <div className="">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                placeholder="Enter description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-green-200"
                rows={3}
              ></textarea>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-[#0f5bd8] to-[#013E7E] text-white font-medium px-6 py-2 rounded border-none hover:opacity-90 transition disabled:opacity-60"
            >
              {loading ? (isEdit ? "Updating..." : "Saving...") : isEdit ? "Update" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => navigate(ENC_LIST_PATH)}
              className="bg-[#cc4b4b] text-white font-medium px-6 py-2 rounded border-none hover:bg-[#b43d3d] transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
