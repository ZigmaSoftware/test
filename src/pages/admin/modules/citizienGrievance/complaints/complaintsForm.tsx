import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { desktopApi, mobileAPI } from "@/api";
import Swal from "sweetalert2";
import ComponentCard from "@/components/common/ComponentCard";
import Select from "@/components/form/Select";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { getEncryptedRoute } from "@/utils/routeCache";

const FILE_ICON =
  "https://cdn-icons-png.flaticon.com/512/337/337946.png"; // fallback for pdf/doc

export default function ComplaintAddForm() {
  const navigate = useNavigate();

  const { encCitizenGrivence, encComplaint } = getEncryptedRoute();

  const ENC_LIST_PATH = `/${encCitizenGrivence}/${encComplaint}`;

  const [customers, setCustomers] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [mainCategories, setMainCategories] = useState<any[]>([]);
  const [allSubCategories, setAllSubCategories] = useState<any[]>([]);
  const [filteredSubCategories, setFilteredSubCategories] = useState<any[]>([]);

  const [zone, setZone] = useState("");
  const [ward, setWard] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [mainCategory, setMainCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [details, setDetails] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isPreviewImage, setIsPreviewImage] = useState(false);

  const fetchCustomers = async () => {
    try {
      const res = await desktopApi.get("/customercreations/");
      setCustomers(res.data || []);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    }
  };

  useEffect(() => {
    fetchCustomers();
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
      setAllSubCategories(
        subs.filter((s: any) => s.is_delete !== true && s.is_active !== false)
      );
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!mainCategory) {
      setFilteredSubCategories([]);
      setSubCategory("");
      return;
    }

    const matchingSubs = allSubCategories.filter(
      (s: any) => String(s.mainCategory) === String(mainCategory)
    );

    setFilteredSubCategories(matchingSubs);

    const hasSelected = matchingSubs.some(
      (s: any) => String(s.id) === String(subCategory)
    );
    if (!hasSelected) setSubCategory("");
  }, [mainCategory, allSubCategories, subCategory]);

  const loadZones = async (cid: number, currentZoneId?: string) => {
    const res = await desktopApi.get(`/zones/?customer=${cid}`);
    const list = res.data || [];
    setZones(list);

    if (currentZoneId) {
      const exists = list.some((z: any) => String(z.id) === String(currentZoneId));
      if (!exists) setZone("");
    }
  };

  const loadWards = async (zid: number, preselectWardId?: string) => {
    const res = await desktopApi.get(`/wards/?zone=${zid}`);
    const list = res.data || [];
    setWards(list);

    if (preselectWardId) {
      const found = list.some((w: any) => String(w.id) === String(preselectWardId));
      setWard(found ? String(preselectWardId) : "");
    } else {
      setWard("");
    }
  };

  const onCustomerChange = (id: string) => {
    const c = customers.find((x) => String(x.id) === String(id));
    setCustomer(c);
    setContact(c?.contact_no || "");
    setAddress(
      c
        ? [
            c.building_no,
            c.street,
            c.area,
            c.city_name,
            c.district_name,
            c.state_name,
            c.pincode,
          ]
            .filter(Boolean)
            .join(", ")
        : ""
    );

    const zoneId = c?.zone || c?.zone_id || c?.zoneId;
    const wardId = c?.ward || c?.ward_id || c?.wardId;

    setZone(zoneId ? String(zoneId) : "");
    setWard(wardId ? String(wardId) : "");

    if (c?.id) {
      loadZones(c.id, zoneId ? String(zoneId) : undefined);
    }

    if (zoneId) {
      loadWards(Number(zoneId), wardId ? String(wardId) : undefined);
    } else {
      setWards([]);
    }
  };

  const isImageFile = (f: File) =>
    f.type.startsWith("image/") ||
    f.name.endsWith(".jpg") ||
    f.name.endsWith(".jpeg") ||
    f.name.endsWith(".png") ||
    f.name.endsWith(".webp");

  const uploadFile = (e: any) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);

    setFile(f);

    if (isImageFile(f)) {
      setIsPreviewImage(true);
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setIsPreviewImage(false);
      setPreviewUrl(FILE_ICON);
    }
  };

  const clearFile = () => {
    if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);

    setFile(null);
    setPreviewUrl("");
    setIsPreviewImage(false);

    const input = document.getElementById("uploadBox") as HTMLInputElement | null;
    if (input) input.value = "";
  };

  const save = async (e: any) => {
    e.preventDefault();

    if (!customer) {
      Swal.fire("Missing data", "Please select a customer.", "warning");
      return;
    }

    if (!mainCategory || !subCategory) {
      Swal.fire("Missing data", "Please select main and sub category.", "warning");
      return;
    }

    const selectedMain = mainCategories.find(
      (m: any) => String(m.id) === String(mainCategory)
    );
    const selectedSub = filteredSubCategories.find(
      (s: any) => String(s.id) === String(subCategory)
    );

    const detailParts = [
      selectedMain ? `Main: ${selectedMain.main_categoryName || selectedMain.name}` : "",
      selectedSub ? `Sub: ${selectedSub.name}` : "",
      details || "",
    ].filter(Boolean);

    const fd = new FormData();
    fd.append("customer", String(customer.id));
    if (zone) fd.append("zone", String(zone));
    if (ward) fd.append("ward", String(ward));
    fd.append("contact_no", contact);
    fd.append("address", address);
    fd.append(
      "main_category",
      selectedMain ? selectedMain.main_categoryName || selectedMain.name : ""
    );
    fd.append(
      "sub_category",
      selectedSub ? selectedSub.name : ""
    );
    fd.append("category", "OTHER"); // backend requires category
    fd.append("details", detailParts.join(" | "));
    if (file) fd.append("image", file);

    try {
      await desktopApi.post("/complaints/", fd);
      Swal.fire("Saved", "Complaint created successfully", "success");
      navigate(ENC_LIST_PATH);
    } catch {
      Swal.fire("Error", "Failed to save complaint", "error");
    }
  };

  return (
    <ComponentCard title="Add Complaint">
      <form onSubmit={save}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <Label>Customer *</Label>
            <Select
              value={customer?.id ? String(customer.id) : ""}
              required
              onChange={onCustomerChange}
              options={customers.map((c) => ({
                value: String(c.id),
                label: c.customer_name,
              }))}
            />
          </div>

          <div>
            <Label>Contact</Label>
            <Input value={contact} disabled />
          </div>

          <div className="md:col-span-2">
            <Label>Address</Label>
            <Input value={address} disabled />
          </div>

          <div>
            <Label>Zone *</Label>
            <Select
              required
              value={zone}
              disabled
              onChange={(v) => {
                setZone(v);
                loadWards(Number(v));
              }}
              options={zones.map((z) => ({ value: String(z.id), label: z.name }))}
            />
          </div>

          <div>
            <Label>Ward *</Label>
            <Select
              required
              value={ward}
              disabled
              onChange={(v) => setWard(v)}
              options={wards.map((w) => ({ value: String(w.id), label: w.name }))}
            />
          </div>

          <div>
            <Label>Main Category *</Label>
            <Select
              required
              value={mainCategory}
              onChange={(v) => setMainCategory(v)}
              options={mainCategories.map((m: any) => ({
                value: String(m.id),
                label: m.main_categoryName || m.name,
              }))}
            />
          </div>

          <div>
            <Label>Sub Category *</Label>
            <Select
              required
              disabled={!mainCategory}
              value={subCategory}
              onChange={(v) => setSubCategory(v)}
              options={filteredSubCategories.map((s: any) => ({
                value: String(s.id),
                label: s.name,
              }))}
              placeholder={mainCategory ? "Select a sub category" : "Select main category first"}
            />
          </div>

          <div className="md:col-span-2">
            <Label>Details *</Label>
            <Input
              required
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>

          {/* FILE UPLOAD */}
          <div className="md:col-span-1">
            <Label>Complaint File</Label>

            <input
              id="uploadBox"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
              onChange={uploadFile}
              className="hidden"
            />

            {/* Upload Box */}
            <div
              className="border border-gray-300 rounded flex flex-col items-center justify-center p-3 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all duration-200 w-60 h-32"
              onClick={() => document.getElementById("uploadBox")?.click()}
            >
              {previewUrl ? (
                <>
                  {isPreviewImage ? (
                    <img
                      src={previewUrl}
                      className="w-full h-full object-contain rounded"
                    />
                  ) : (
                    <img src={FILE_ICON} className="w-16 h-16 opacity-80" />
                  )}
                </>
              ) : (
                <>
                  <img src={FILE_ICON} className="w-10 h-10 opacity-60" />
                  <p className="text-gray-500 text-sm mt-1 text-center">
                    Drag & drop or click to upload
                  </p>
                </>
              )}
            </div>

            {/* PREVIEW + REMOVE BUTTONS */}
            {previewUrl && (
              <div className="flex items-center gap-3 mt-3">
                {/* Preview */}
                <button
                  type="button"
                  onClick={() => {
                    if (isPreviewImage) {
                      window.open(previewUrl, "_blank");
                    } else {
                      window.open(URL.createObjectURL(file!), "_blank");
                    }
                  }}
                  className="bg-gray-300 hover:bg-gray-200 text-white px-3 py-1 rounded text-sm"
                >
                  Preview
                </button>

                {/* Remove */}
                <button
                  type="button"
                  onClick={clearFile}
                  className="bg-red-400 hover:bg-red-300 text-white px-3 py-1 rounded text-sm"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button className="bg-gradient-to-r from-[#0f5bd8] to-[#013E7E] text-white px-4 py-2 rounded border-none hover:opacity-90 disabled:opacity-60 transition-colors">
            Save
          </button>
          <button
            type="button"
            onClick={() => navigate(ENC_LIST_PATH)}
            className="bg-[#cc4b4b] text-white px-4 py-2 rounded border-none hover:bg-[#b43d3d] transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </ComponentCard>
  );
}
