import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { desktopApi } from "@/api";
import { Input } from "@/components/ui/input";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { getEncryptedRoute } from "@/utils/routeCache";

type DropdownItem = { id: number; name?: string; property_name?: string; sub_property_name?: string; currency?: string };

interface CustomerFormData {
  customer_name: string;
  contact_no: string;
  building_no: string;
  street: string;
  area: string;
  pincode: string;
  latitude: string;
  longitude: string;
  id_proof_type: string;
  id_no: string;
  is_deleted: boolean;
  is_active: boolean;
  ward: string;
  zone: string;
  city: string;
  district: string;
  state: string;
  country: string;
  property: string;
  sub_property: string;
}

interface DropdownsState {
  wards: DropdownItem[];
  zones: DropdownItem[];
  cities: DropdownItem[];
  districts: DropdownItem[];
  states: DropdownItem[];
  countries: DropdownItem[];
  properties: DropdownItem[];
  subProperties: DropdownItem[];
}

function CustomerCreationForm() {
  const [formData, setFormData] = useState<CustomerFormData>({
    customer_name: "",
    contact_no: "",
    building_no: "",
    street: "",
    area: "",
    pincode: "",
    latitude: "",
    longitude: "",
    id_proof_type: "",
    id_no: "",
    is_deleted: false,
    is_active: true,
    ward: "",
    zone: "",
    city: "",
    district: "",
    state: "",
    country: "",
    property: "",
    sub_property: "",
  });

  const [dropdowns, setDropdowns] = useState<DropdownsState>({
    wards: [],
    zones: [],
    cities: [],
    districts: [],
    states: [],
    countries: [],
    properties: [],
    subProperties: [],
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { encCustomerMaster, encCustomerCreation } = getEncryptedRoute();
  const ENC_LIST_PATH = `/${encCustomerMaster}/${encCustomerCreation}`;

  const { id } = useParams();
  const isEdit = Boolean(id);

  // Generic handler for field updates
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // Fetch dropdown data (wards, zones, etc.)
  const fetchDropdowns = async () => {
    try {
      const [
        wardsRes,
        zonesRes,
        citiesRes,
        districtsRes,
        statesRes,
        countriesRes,
        propertiesRes,
        subPropsRes,
      ] = await Promise.all([
        desktopApi.get("wards/"),
        desktopApi.get("zones/"),
        desktopApi.get("cities/"),
        desktopApi.get("districts/"),
        desktopApi.get("states/"),
        desktopApi.get("countries/"),
        desktopApi.get("properties/"),
        desktopApi.get("subproperties/"),
      ]);

      setDropdowns({
        wards: wardsRes.data,
        zones: zonesRes.data,
        cities: citiesRes.data,
        districts: districtsRes.data,
        states: statesRes.data,
        countries: countriesRes.data,
        properties: propertiesRes.data,
        subProperties: subPropsRes.data,
      });
    } catch (error) {
      console.error("Dropdown fetch failed:", error);
    }
  };

  // Load dropdowns + edit data
  useEffect(() => {
    fetchDropdowns();

    if (isEdit && id) {
      desktopApi
        .get(`customercreations/${id}/`)
        .then((res) => {
          const d = res.data;

          // Map backend *_id fields into our local select values
          setFormData({
            customer_name: d.customer_name || "",
            contact_no: d.contact_no || "",
            building_no: d.building_no || "",
            street: d.street || "",
            area: d.area || "",
            pincode: d.pincode || "",
            latitude: d.latitude || "",
            longitude: d.longitude || "",
            id_proof_type: d.id_proof_type || "",
            id_no: d.id_no || "",
            is_deleted: d.is_deleted ?? false,
            is_active: d.is_active ?? true,

            ward: d.ward_id ? String(d.ward_id) : "",
            zone: d.zone_id ? String(d.zone_id) : "",
            city: d.city_id ? String(d.city_id) : "",
            district: d.district_id ? String(d.district_id) : "",
            state: d.state_id ? String(d.state_id) : "",
            country: d.country_id ? String(d.country_id) : "",
            property: d.property_id ? String(d.property_id) : "",
            sub_property: d.sub_property_id ? String(d.sub_property_id) : "",
          });
        })
        .catch((err) => {
          console.error("Error loading customer:", err);
          Swal.fire({
            icon: "error",
            title: "Failed to load customer",
            text: err.response?.data?.detail || "Something went wrong!",
          });
        });
    }
  }, [id, isEdit]);

  // Handle save with validation + mapping
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const {
      customer_name,
      contact_no,
      building_no,
      street,
      area,
      pincode,
      latitude,
      longitude,
      id_proof_type,
      id_no,
      ward,
      zone,
      city,
      district,
      state,
      country,
      property,
      sub_property,
    } = formData;

    // Required fields check
    if (
      !customer_name ||
      !contact_no ||
      !building_no ||
      !street ||
      !area ||
      !pincode ||
      !latitude ||
      !longitude ||
      !id_proof_type ||
      !id_no ||
      !ward ||
      !zone ||
      !city ||
      !district ||
      !state ||
      !country ||
      !property ||
      !sub_property
    ) {
      Swal.fire({
        icon: "warning",
        title: "Missing Required Fields",
        text: "Please fill all mandatory fields — customer name, contact, location, address, and ID details are required.",
      });
      return;
    }

    // Contact number format
    if (!/^\d{10}$/.test(contact_no)) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Contact Number",
        text: "Contact number must be exactly 10 digits.",
      });
      return;
    }

    // Pincode validation
    if (!/^\d{6}$/.test(pincode)) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Pincode",
        text: "Pincode must be exactly 6 digits.",
      });
      return;
    }

    // Latitude/Longitude validation
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (
      isNaN(lat) ||
      isNaN(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Coordinates",
        text: "Please enter valid latitude and longitude values.",
      });
      return;
    }

    setLoading(true);

    const toId = (v: any) =>
      v === null || v === undefined || v === "" ? null : Number(v);

    const payload: any = {
      customer_name,
      contact_no,
      building_no,
      street,
      area,
      pincode,
      latitude,
      longitude,
      id_proof_type,
      id_no,
      is_deleted: formData.is_deleted ?? false,
      is_active: formData.is_active ?? true,
      ward_id: toId(ward),
      zone_id: toId(zone),
      city_id: toId(city),
      district_id: toId(district),
      state_id: toId(state),
      country_id: toId(country),
      property_id: toId(property),
      sub_property_id: toId(sub_property),
    };

    try {
      if (isEdit && id) {
        await desktopApi.put(`customercreations/${id}/`, payload);
        Swal.fire({
          icon: "success",
          title: "Customer updated successfully!",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await desktopApi.post("customercreations/", payload);
        Swal.fire({
          icon: "success",
          title: "Customer added successfully!",
          timer: 1500,
          showConfirmButton: false,
        });
      }
      navigate(ENC_LIST_PATH);
    } catch (error: any) {
      console.error("Save failed:", error);
      const serverData = error?.response?.data;
      const pretty = serverData
        ? typeof serverData === "string"
          ? serverData
          : JSON.stringify(serverData, null, 2)
        : "Unknown server error";

      Swal.fire({
        icon: "error",
        title: "Save failed",
        html: `<pre style="text-align:left;white-space:pre-wrap">${pretty}</pre>`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ComponentCard
      title={isEdit ? "Edit Customer Creation" : "Add Customer Creation"}
    >
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Basic Details */}
          <div>
            <Label htmlFor="customer_name">Customer Name *</Label>
            <Input
              id="customer_name"
              type="text"
              required
              value={formData.customer_name}
              onChange={handleChange}
              placeholder="Enter customer name"
            />
          </div>

          <div>
            <Label htmlFor="contact_no">Contact No *</Label>
            <Input
              id="contact_no"
              type="text"
              required
              value={formData.contact_no}
              onChange={handleChange}
              placeholder="Enter contact number"
            />
          </div>

          <div>
            <Label htmlFor="building_no">Building No *</Label>
            <Input
              id="building_no"
              type="text"
              required
              value={formData.building_no}
              onChange={handleChange}
              placeholder="Enter building number"
            />
          </div>

          <div>
            <Label htmlFor="street">Street *</Label>
            <Input
              id="street"
              type="text"
              required
              value={formData.street}
              onChange={handleChange}
              placeholder="Enter street"
            />
          </div>

          <div>
            <Label htmlFor="area">Area *</Label>
            <Input
              id="area"
              type="text"
              required
              value={formData.area}
              onChange={handleChange}
              placeholder="Enter area"
            />
          </div>

          <div>
            <Label htmlFor="pincode">Pincode *</Label>
            <Input
              id="pincode"
              type="text"
              required
              value={formData.pincode}
              onChange={handleChange}
              placeholder="Enter pincode"
            />
          </div>

          <div>
            <Label htmlFor="latitude">Latitude *</Label>
            <Input
              id="latitude"
              type="text"
              required
              value={formData.latitude}
              onChange={handleChange}
              placeholder="Enter latitude"
            />
          </div>

          <div>
            <Label htmlFor="longitude">Longitude *</Label>
            <Input
              id="longitude"
              type="text"
              required
              value={formData.longitude}
              onChange={handleChange}
              placeholder="Enter longitude"
            />
          </div>

          {/* ID Proof Section */}
          <div>
            <Label htmlFor="id_proof_type">ID Proof Type *</Label>
            <Select
              id="id_proof_type"
              value={formData.id_proof_type}
              required
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, id_proof_type: String(val) }))
              }
              options={[
                { value: "AADHAAR", label: "Aadhaar" },
                { value: "VOTER_ID", label: "Voter ID" },
                { value: "PAN_CARD", label: "PAN Card" },
                { value: "DL", label: "Driving License" },
                { value: "PASSPORT", label: "Passport" },
              ]}
            />
          </div>

          <div>
            <Label htmlFor="id_no">ID Number *</Label>
            <Input
              id="id_no"
              type="text"
              required
              value={formData.id_no}
              onChange={handleChange}
              placeholder="Enter ID number"
            />
          </div>

          {/* Dropdowns for Relations */}
          <div>
            <Label htmlFor="ward">Ward *</Label>
            <Select
              id="ward"
              required
              value={formData.ward}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, ward: String(val) }))
              }
              options={dropdowns.wards.map((w) => ({
                value: w.id,
                label: w.name || "",
              }))}
            />
          </div>

          <div>
            <Label htmlFor="zone">Zone *</Label>
            <Select
              id="zone"
              required
              value={formData.zone}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, zone: String(val) }))
              }
              options={dropdowns.zones.map((z) => ({
                value: z.id,
                label: z.name || "",
              }))}
            />
          </div>

          <div>
            <Label htmlFor="city">City *</Label>
            <Select
              id="city"
              required
              value={formData.city}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, city: String(val) }))
              }
              options={dropdowns.cities.map((c) => ({
                value: c.id,
                label: c.name || "",
              }))}
            />
          </div>

          <div>
            <Label htmlFor="district">District *</Label>
            <Select
              id="district"
              required
              value={formData.district}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, district: String(val) }))
              }
              options={dropdowns.districts.map((d) => ({
                value: d.id,
                label: d.name || "",
              }))}
            />
          </div>

          <div>
            <Label htmlFor="state">State *</Label>
            <Select
              id="state"
              required
              value={formData.state}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, state: String(val) }))
              }
              options={dropdowns.states.map((s) => ({
                value: s.id,
                label: s.name || "",
              }))}
            />
          </div>

          <div>
            <Label htmlFor="country">Country *</Label>
            <Select
              id="country"
              required
              value={formData.country}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, country: String(val) }))
              }
              options={dropdowns.countries.map((c) => ({
                value: c.id,
                label: `${c.name || ""}${c.currency ? ` (${c.currency})` : ""}`,
              }))}
            />
          </div>

          <div>
            <Label htmlFor="property">Property *</Label>
            <Select
              id="property"
              required
              value={formData.property}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, property: String(val) }))
              }
              options={dropdowns.properties.map((p) => ({
                value: p.id,
                label: p.property_name || "",
              }))}
            />
          </div>

          <div>
            <Label htmlFor="sub_property">Sub Property *</Label>
            <Select
              id="sub_property"
              required
              value={formData.sub_property}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, sub_property: String(val) }))
              }
              options={dropdowns.subProperties.map((sp) => ({
                value: sp.id,
                label: sp.sub_property_name || "",
              }))}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="submit"
            disabled={loading}
            className="bg-green-custom text-white px-4 py-2 rounded disabled:opacity-50 transition-colors"
          >
            {loading
              ? isEdit
                ? "Updating..."
                : "Saving..."
              : isEdit
              ? "Update"
              : "Save"}
          </button>
          <button
            type="button"
            onClick={() => navigate(ENC_LIST_PATH)}
            className="bg-red-400 text-white px-4 py-2 rounded hover:bg-red-500"
          >
            Cancel
          </button>
        </div>
      </form>
    </ComponentCard>
  );
}

export default CustomerCreationForm;
