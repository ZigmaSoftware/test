import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { desktopApi } from "@/api";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { Input } from "@/components/ui/input";
import { getEncryptedRoute } from "@/utils/routeCache";

const { encAdmins, encMainUserScreen } = getEncryptedRoute();
const LIST_PATH = `/${encAdmins}/${encMainUserScreen}`;

export default function MainUserScreenForm() {
  const [mainscreen, setMainScreen] = useState("");
  const [is_active, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const { id: unique_id } = useParams();
  const isEdit = Boolean(unique_id);
  const navigate = useNavigate();

  useEffect(() => {
    if (isEdit) {
      desktopApi
        .get(`mainuserscreen/${unique_id}/`)
        .then((res) => {
          setMainScreen(res.data.mainscreen);
          setIsActive(res.data.is_active);
        })
        .catch(() => Swal.fire("Error", "Invalid record", "error"));
    }
  }, [unique_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = { mainscreen, is_active };

    try {
      if (isEdit) {
        await desktopApi.put(`mainuserscreen/${unique_id}/`, payload);
        Swal.fire("Updated!", "", "success");
      } else {
        await desktopApi.post("mainuserscreen/", payload);
        Swal.fire("Created!", "", "success");
      }

      navigate(LIST_PATH);
    } catch (err: any) {
      const msg =
        typeof err?.response?.data === "object"
          ? Object.entries(err.response.data)
              .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
              .join("\n")
          : "Save failed";

      Swal.fire("Error", msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ComponentCard title={isEdit ? "Edit Main User Screen" : "Add Main User Screen"}>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div>
            <Label>Main Screen</Label>
            <Input
              value={mainscreen}
              required
              onChange={(e) => setMainScreen(e.target.value)}
            />
          </div>

          <div>
            <Label>Status</Label>
            <Select
              value={is_active ? "true" : "false"}
              onChange={(v) => setIsActive(v === "true")}
              options={[
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="submit"
            disabled={loading}
            className="bg-green-custom text-white px-4 py-2 rounded"
          >
            {loading ? "Saving..." : isEdit ? "Update" : "Save"}
          </button>

          <button
            type="button"
            onClick={() => navigate(LIST_PATH)}
            className="bg-red-400 text-white px-4 py-2 rounded"
          >
            Cancel
          </button>
        </div>
      </form>
    </ComponentCard>
  );
}
