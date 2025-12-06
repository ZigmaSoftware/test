import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { desktopApi } from "@/api";
import { Input } from "@/components/ui/input";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "./selects";
import { getEncryptedRoute } from "@/utils/routeCache";

const { encAdmins, encUserScreen } = getEncryptedRoute();
const ENC_LIST_PATH = `/${encAdmins}/${encUserScreen}`;

interface PermissionSet {
  all: boolean;
  add: boolean;
  update: boolean;
  list: boolean;
  delete: boolean;
  view: boolean;
  print: boolean;
}

interface FormData {
  mainscreen: string;
  screen_name: string;
  folder_name: string;
  order_no: number | string;
  icon: string;
  description: string;
  is_active: boolean;
  permissions: PermissionSet;
}

export default function UserScreenForm() {
  const { id: unique_id } = useParams();        // FIXED: use unique_id
  const isEdit = Boolean(unique_id && unique_id !== "new");
  const navigate = useNavigate();

  const [mainScreens, setMainScreens] = useState<any[]>([]);
  const [formData, setFormData] = useState<FormData>({
    mainscreen: "",
    screen_name: "",
    folder_name: "",
    order_no: "",
    icon: "",
    description: "",
    is_active: true,
    permissions: {
      all: false,
      add: false,
      update: false,
      list: false,
      delete: false,
      view: false,
      print: false,
    },
  });

  /* ---------------------------------------------------
     Load Main Screens + Load UserScreen if Editing
  ---------------------------------------------------- */
  useEffect(() => {
    const load = async () => {
      try {
        // Load main screens with unique_id
        const main = await desktopApi.get("mainuserscreen/");
        const data = Array.isArray(main.data) ? main.data : main.data.results || [];

        setMainScreens(
          data
            .filter((m: any) => m.is_active && !m.is_delete)
            .map((m: any) => ({
              value: m.unique_id,   // FIXED: unique_id
              label: m.mainscreen,
            }))
        );

        // Editing? Load existing data
        if (isEdit) {
          const res = await desktopApi.get(`userscreens/${unique_id}/`); // FIXED
          const d = res.data;

          setFormData({
            mainscreen: d.mainscreen, // unique_id from backend
            screen_name: d.screen_name ?? "",
            folder_name: d.folder_name ?? "",
            order_no: d.order_no ?? "",
            icon: d.icon ?? "",
            description: d.description ?? "",
            is_active: d.is_active,
            permissions: d.permissions,
          });
        }
      } catch (err) {
        console.error("Fetch failed:", err);
        Swal.fire("Error", "Failed to load initial data", "error");
      }
    };

    load();
  }, [unique_id]);

  /* ---------------------------------------------------
     Handle Permission Changes
  ---------------------------------------------------- */
  const handlePermissionChange = (perm: keyof PermissionSet) => {
    if (perm === "all") {
      const newVal = !formData.permissions.all;
      const updated: PermissionSet = {
        all: newVal,
        add: newVal,
        update: newVal,
        list: newVal,
        delete: newVal,
        view: newVal,
        print: newVal,
      };
      setFormData((prev) => ({ ...prev, permissions: updated }));
    } else {
      const updated = {
        ...formData.permissions,
        [perm]: !formData.permissions[perm],
      };

      updated.all = Object.entries(updated)
        .filter(([k]) => k !== "all")
        .every(([_, v]) => v);

      setFormData((prev) => ({ ...prev, permissions: updated }));
    }
  };

  /* ---------------------------------------------------
     Submit (Create + Update)
  ---------------------------------------------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      mainscreen: formData.mainscreen,  // FIXED: send unique_id
      screen_name: formData.screen_name.trim(),
      folder_name: formData.folder_name.trim(),
      order_no: Number(formData.order_no) || 1,
      icon: formData.icon.trim(),
      description: formData.description.trim(),
      is_active: Boolean(formData.is_active),
      permissions: formData.permissions,
    };

    try {
      if (isEdit) {
        await desktopApi.put(`userscreens/${unique_id}/`, payload); // FIXED
        Swal.fire("Updated!", "", "success");
      } else {
        await desktopApi.post("userscreens/", payload); // FIXED
        Swal.fire("Added!", "", "success");
      }

      navigate(ENC_LIST_PATH);
    } catch (err: any) {
      console.error("Save failed:", err);
      Swal.fire("Error", JSON.stringify(err.response?.data || err), "error");
    }
  };

  /* ---------------------------------------------------
     UI RENDER — unchanged (original UI)
  ---------------------------------------------------- */
  return (
    <ComponentCard title={isEdit ? "Edit User Screen" : "Add User Screen"}>
      <form onSubmit={handleSubmit}>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div>
            <Label>Main Screen</Label>
            <Select
              required
              value={formData.mainscreen}
              onChange={(val) => setFormData({ ...formData, mainscreen: val })}
              options={mainScreens}
            />
          </div>

          <div>
            <Label>Screen Name</Label>
            <Input
              required
              value={formData.screen_name}
              onChange={(e) => setFormData({ ...formData, screen_name: e.target.value })}
            />
          </div>

          <div>
            <Label>Folder Name</Label>
            <Input
              value={formData.folder_name}
              onChange={(e) => setFormData({ ...formData, folder_name: e.target.value })}
            />
          </div>

          <div>
            <Label>Order No</Label>
            <Input
              type="number"
              value={formData.order_no}
              onChange={(e) => setFormData({ ...formData, order_no: e.target.value })}
            />
          </div>

          <div>
            <Label>Icon</Label>
            <Input
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
            />
          </div>

          <div>
            <Label>Description</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <Label>Status</Label>
            <select
              value={formData.is_active ? "true" : "false"}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.value === "true" })
              }
              className="border rounded px-3 py-2 w-full"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

        </div>

        <div className="mt-4">
          <Label>Permissions</Label>
          <div className="flex flex-wrap gap-4 mt-2">
            {Object.keys(formData.permissions).map((perm) => (
              <label key={perm} className="flex items-center gap-2 border rounded px-3 py-1">
                <input
                  type="checkbox"
                  checked={formData.permissions[perm as keyof PermissionSet]}
                  onChange={() => handlePermissionChange(perm as keyof PermissionSet)}
                  className="accent-green-600"
                />
                {perm.toUpperCase()}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">
            {isEdit ? "Update" : "Save"}
          </button>

          <button
            type="button"
            onClick={() => navigate(ENC_LIST_PATH)}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Cancel
          </button>
        </div>

      </form>
    </ComponentCard>
  );
}
