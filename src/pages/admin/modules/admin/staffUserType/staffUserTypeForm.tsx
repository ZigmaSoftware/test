import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { desktopApi } from "@/api";
import { getEncryptedRoute } from "@/utils/routeCache";

export default function StaffUserTypeForm() {
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const { id: unique_id } = useParams();
  const isEdit = Boolean(unique_id);

  const navigate = useNavigate();
  const { encAdmins, encStaffUserType } = getEncryptedRoute();
  const ENC_LIST_PATH = `/${encAdmins}/${encStaffUserType}`;

  // Fetch existing data on edit
  useEffect(() => {
    if (!isEdit) return;

    desktopApi
      .get(`staffusertypes/${unique_id}/`)
      .then((res) => {
        setName(res.data.name);
        setIsActive(res.data.is_active);
      })
      .catch(() => {
        Swal.fire({
          icon: "error",
          title: "Failed to load user type",
        });
      });
  }, [unique_id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEdit) {
        // Update ONLY status
        await desktopApi.patch(`staffusertypes/${unique_id}/`, {
          is_active: isActive,
        });

        Swal.fire({
          icon: "success",
          title: "Updated successfully!",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        // CREATE
        await desktopApi.post("staffusertypes/", {
          name,
          is_active: isActive,
        });

        Swal.fire({
          icon: "success",
          title: "Added successfully!",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      navigate(ENC_LIST_PATH);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Duplicate Staff User Type",
        text: "Name already exists or validation failed.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f9fafb] min-h-screen p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border">

        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEdit ? "Edit User Type" : "Add User Type"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Staff User Type Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Staff User Type Name <span className="text-red-500">*</span>
              </label>

              <select
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isEdit}   // important fix
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">Select a user type</option>
                <option value="admin">Admin</option>
                <option value="operator">Operator</option>
                <option value="driver">Driver</option>
                <option value="user">User</option>
              </select>

            </div>

            {/* Active Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Active Status <span className="text-red-500">*</span>
              </label>

              <select
                value={isActive ? "Active" : "Inactive"}
                onChange={(e) => setIsActive(e.target.value === "Active")}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>

            <button
              type="button"
              onClick={() => navigate(ENC_LIST_PATH)}
              className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600"
            >
              Cancel
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
