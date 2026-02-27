"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  Search,
  Plus,
  X,
  Package,
  CheckCircle2,
  Clock,
  Wrench,
  Archive,
  Edit3,
  Trash2,
  Upload,
} from "lucide-react";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";
import type {
  EquipmentRow,
  EquipmentStats,
  EquipmentStatus,
  EquipmentType,
} from "@/lib/queries/equipment";
import type { CompanyMember } from "@/lib/queries/tickets";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function getUserName(
  user: { id: string; full_name: string; email: string } | null | undefined
): string {
  if (!user) return "--";
  return user.full_name || user.email || "Unknown";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface EquipmentInventoryClientProps {
  equipment: EquipmentRow[];
  stats: EquipmentStats;
  members: CompanyMember[];
  projects: { id: string; name: string }[];
  userId: string;
  companyId: string;
  linkedJEs?: Record<string, { id: string; entry_number: string }[]>;
}

const equipmentImportColumns: ImportColumn[] = [
  { key: "name", label: "Name", required: true },
  { key: "equipment_type", label: "Type", required: true },
  { key: "make", label: "Make", required: false },
  { key: "model", label: "Model", required: false },
  { key: "serial_number", label: "Serial Number", required: false },
  { key: "purchase_cost", label: "Purchase Cost", required: false, type: "number" },
  { key: "hourly_rate", label: "Hourly Rate", required: false, type: "number" },
  { key: "purchase_date", label: "Purchase Date", required: false, type: "date" },
  { key: "useful_life_months", label: "Useful Life (Months)", required: false, type: "number" },
  { key: "salvage_value", label: "Salvage Value", required: false, type: "number" },
  { key: "depreciation_start_date", label: "Depreciation Start Date", required: false, type: "date" },
];

const equipmentSampleData = [
  { name: "CAT 320 Excavator", equipment_type: "excavator", make: "Caterpillar", model: "320", serial_number: "CAT320-001", purchase_cost: "185000", hourly_rate: "125", purchase_date: "2024-01-15" },
  { name: "Genie GS-2632", equipment_type: "scaffold", make: "Genie", model: "GS-2632", serial_number: "GEN-2632-005", purchase_cost: "32000", hourly_rate: "45", purchase_date: "2024-06-01" },
];

export default function EquipmentInventoryClient({
  equipment,
  stats,
  members,
  projects,
  userId,
  companyId,
  linkedJEs = {},
}: EquipmentInventoryClientProps) {
  const router = useRouter();
  const t = useTranslations("equipment");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const STATUS_LABELS: Record<EquipmentStatus, string> = {
    available: t("statusAvailable"),
    in_use: t("statusInUse"),
    maintenance: t("statusMaintenance"),
    retired: t("statusRetired"),
  };

  const EQUIPMENT_TYPES: { value: EquipmentType; label: string }[] = [
    { value: "excavator", label: t("typeExcavator") },
    { value: "loader", label: t("typeLoader") },
    { value: "crane", label: t("typeCrane") },
    { value: "truck", label: t("typeTruck") },
    { value: "generator", label: t("typeGenerator") },
    { value: "compressor", label: t("typeCompressor") },
    { value: "scaffold", label: t("typeScaffold") },
    { value: "tools", label: t("typeTools") },
    { value: "other", label: t("typeOther") },
  ];

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString(dateLocale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatDateShort(dateStr: string | null) {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString(dateLocale, {
      month: "short",
      day: "numeric",
    });
  }

  // Import modal state
  const [showImport, setShowImport] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    equipment_type: "" as string,
    make: "",
    model: "",
    serial_number: "",
    purchase_date: "",
    purchase_cost: "",
    hourly_rate: "",
    useful_life_months: "",
    salvage_value: "",
    depreciation_start_date: "",
  });

  // Detail / Edit / Delete modal state
  const [selectedItem, setSelectedItem] = useState<EquipmentRow | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Filtered equipment
  const filtered = useMemo(() => {
    let result = equipment;

    if (statusFilter !== "all") {
      result = result.filter((e) => e.status === statusFilter);
    }

    if (typeFilter !== "all") {
      result = result.filter((e) => e.equipment_type === typeFilter);
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(term) ||
          (e.make && e.make.toLowerCase().includes(term)) ||
          (e.model && e.model.toLowerCase().includes(term)) ||
          (e.serial_number && e.serial_number.toLowerCase().includes(term))
      );
    }

    return result;
  }, [equipment, statusFilter, typeFilter, search]);

  // Create handler
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          equipment_type: formData.equipment_type,
          make: formData.make || undefined,
          model: formData.model || undefined,
          serial_number: formData.serial_number || undefined,
          purchase_date: formData.purchase_date || undefined,
          purchase_cost: formData.purchase_cost ? Number(formData.purchase_cost) : undefined,
          hourly_rate: formData.hourly_rate ? Number(formData.hourly_rate) : undefined,
          useful_life_months: formData.useful_life_months ? Number(formData.useful_life_months) : undefined,
          salvage_value: formData.salvage_value ? Number(formData.salvage_value) : undefined,
          depreciation_start_date: formData.depreciation_start_date || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("errorCreateEquipment"));
      }

      setFormData({
        name: "",
        equipment_type: "",
        make: "",
        model: "",
        serial_number: "",
        purchase_date: "",
        purchase_cost: "",
        hourly_rate: "",
        useful_life_months: "",
        salvage_value: "",
        depreciation_start_date: "",
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : t("errorCreateEquipment"));
    } finally {
      setCreating(false);
    }
  }

  // Open detail modal
  function openDetail(item: EquipmentRow) {
    setSelectedItem(item);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  // Close detail modal
  function closeDetail() {
    setSelectedItem(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  // Enter edit mode
  function startEditing() {
    if (!selectedItem) return;
    setEditData({
      name: selectedItem.name,
      equipment_type: selectedItem.equipment_type,
      make: selectedItem.make || "",
      model: selectedItem.model || "",
      serial_number: selectedItem.serial_number || "",
      status: selectedItem.status,
      purchase_date: selectedItem.purchase_date || "",
      purchase_cost: selectedItem.purchase_cost ?? "",
      hourly_rate: selectedItem.hourly_rate ?? "",
      useful_life_months: selectedItem.useful_life_months ?? "",
      salvage_value: selectedItem.salvage_value ?? "",
      depreciation_start_date: selectedItem.depreciation_start_date || "",
    });
    setIsEditing(true);
    setSaveError("");
  }

  // Cancel edit
  function cancelEditing() {
    setIsEditing(false);
    setEditData({});
    setSaveError("");
  }

  // Save edits
  async function handleSave() {
    if (!selectedItem) return;
    setSaving(true);
    setSaveError("");

    try {
      const payload: Record<string, unknown> = {};
      if (editData.name !== selectedItem.name) payload.name = editData.name;
      if (editData.equipment_type !== selectedItem.equipment_type)
        payload.equipment_type = editData.equipment_type;
      if (editData.make !== (selectedItem.make || ""))
        payload.make = editData.make || null;
      if (editData.model !== (selectedItem.model || ""))
        payload.model = editData.model || null;
      if (editData.serial_number !== (selectedItem.serial_number || ""))
        payload.serial_number = editData.serial_number || null;
      if (editData.status !== selectedItem.status)
        payload.status = editData.status;
      if (editData.purchase_date !== (selectedItem.purchase_date || ""))
        payload.purchase_date = editData.purchase_date || null;
      if (String(editData.purchase_cost) !== String(selectedItem.purchase_cost ?? ""))
        payload.purchase_cost = editData.purchase_cost ? Number(editData.purchase_cost) : null;
      if (String(editData.hourly_rate) !== String(selectedItem.hourly_rate ?? ""))
        payload.hourly_rate = editData.hourly_rate ? Number(editData.hourly_rate) : null;
      if (String(editData.useful_life_months) !== String(selectedItem.useful_life_months ?? ""))
        payload.useful_life_months = editData.useful_life_months ? Number(editData.useful_life_months) : null;
      if (String(editData.salvage_value) !== String(selectedItem.salvage_value ?? ""))
        payload.salvage_value = editData.salvage_value ? Number(editData.salvage_value) : null;
      if (editData.depreciation_start_date !== (selectedItem.depreciation_start_date || ""))
        payload.depreciation_start_date = editData.depreciation_start_date || null;

      if (Object.keys(payload).length === 0) {
        setIsEditing(false);
        return;
      }

      const res = await fetch(`/api/equipment/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("errorUpdateEquipment"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t("errorUpdateEquipment"));
    } finally {
      setSaving(false);
    }
  }

  // Delete handler
  async function handleDelete() {
    if (!selectedItem) return;
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch(`/api/equipment/${selectedItem.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("errorDeleteEquipment"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t("errorDeleteEquipment"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="equipment-page">
      {/* Header */}
      <div className="equipment-header">
        <div>
          <h2>{t("equipmentInventory")}</h2>
          <p className="equipment-header-sub">
            {t("itemsTotal", { count: stats.total })}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            {t("importCsv")}
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            {t("addEquipment")}
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="equipment-stats">
        <div className="equipment-stat-card stat-available">
          <div className="equipment-stat-icon">
            <CheckCircle2 size={20} />
          </div>
          <div className="equipment-stat-info">
            <span className="equipment-stat-value">{stats.available}</span>
            <span className="equipment-stat-label">{t("statusAvailable")}</span>
          </div>
        </div>
        <div className="equipment-stat-card stat-in-use">
          <div className="equipment-stat-icon">
            <Clock size={20} />
          </div>
          <div className="equipment-stat-info">
            <span className="equipment-stat-value">{stats.in_use}</span>
            <span className="equipment-stat-label">{t("statusInUse")}</span>
          </div>
        </div>
        <div className="equipment-stat-card stat-maintenance">
          <div className="equipment-stat-icon">
            <Wrench size={20} />
          </div>
          <div className="equipment-stat-info">
            <span className="equipment-stat-value">{stats.maintenance}</span>
            <span className="equipment-stat-label">{t("statusMaintenance")}</span>
          </div>
        </div>
        <div className="equipment-stat-card stat-retired">
          <div className="equipment-stat-icon">
            <Archive size={20} />
          </div>
          <div className="equipment-stat-info">
            <span className="equipment-stat-value">{stats.retired}</span>
            <span className="equipment-stat-label">{t("statusRetired")}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="equipment-filters">
        <div className="equipment-search">
          <Search size={16} className="equipment-search-icon" />
          <input
            type="text"
            placeholder={t("searchEquipment")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="equipment-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as EquipmentStatus | "all")}
        >
          <option value="all">{t("allStatus")}</option>
          {(Object.keys(STATUS_LABELS) as EquipmentStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <select
          className="equipment-filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">{t("allTypes")}</option>
          {EQUIPMENT_TYPES.map((t_item) => (
            <option key={t_item.value} value={t_item.value}>
              {t_item.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="equipment-empty">
          <div className="equipment-empty-icon">
            <Package size={28} />
          </div>
          {equipment.length === 0 ? (
            <>
              <h3>{t("noEquipmentYet")}</h3>
              <p>{t("addFirstEquipment")}</p>
              <button className="btn-primary" onClick={() => setShowCreate(true)}>
                <Plus size={16} />
                {t("addEquipment")}
              </button>
            </>
          ) : (
            <>
              <h3>{t("noMatchingEquipment")}</h3>
              <p>{t("tryAdjustingSearch")}</p>
            </>
          )}
        </div>
      ) : (
        <div className="equipment-table-wrap">
          <table className="equipment-table">
            <thead>
              <tr>
                <th>{t("columnName")}</th>
                <th>{t("columnType")}</th>
                <th>{t("columnMakeModel")}</th>
                <th>{t("columnSerialNumber")}</th>
                <th>{t("columnStatus")}</th>
                <th>{t("labelCurrentProject")}</th>
                <th>{t("labelAssignedTo")}</th>
                <th>{t("labelNextMaintenance")}</th>
                <th>Cost</th>
                <th>JE</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => openDetail(item)}
                  className="equipment-table-row"
                >
                  <td className="equipment-name-cell">{item.name}</td>
                  <td className="equipment-type-cell">
                    {EQUIPMENT_TYPES.find((t_item) => t_item.value === item.equipment_type)?.label ??
                      item.equipment_type}
                  </td>
                  <td className="equipment-makemodel-cell">
                    {[item.make, item.model].filter(Boolean).join(" ") || "--"}
                  </td>
                  <td className="equipment-serial-cell">
                    {item.serial_number || "--"}
                  </td>
                  <td>
                    <span className={`equipment-status-badge status-${item.status}`}>
                      {STATUS_LABELS[item.status] ?? item.status}
                    </span>
                  </td>
                  <td className="equipment-project-cell">
                    {item.project?.name || "--"}
                  </td>
                  <td className="equipment-assignee-cell">
                    {getUserName(item.assignee)}
                  </td>
                  <td className="equipment-date-cell">
                    {formatDateShort(item.next_maintenance_date)}
                  </td>
                  <td className="amount-col">
                    {item.purchase_cost ? formatCurrency(item.purchase_cost) : "--"}
                  </td>
                  <td>
                    {linkedJEs[item.id]?.length ? (
                      linkedJEs[item.id].map((je) => (
                        <Link
                          key={je.id}
                          href={`/financial/general-ledger?entry=${je.entry_number}`}
                          className="je-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {je.entry_number}
                        </Link>
                      ))
                    ) : (
                      <span style={{ color: "var(--muted)" }}>--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImport && (
        <ImportModal
          entityName="Equipment"
          columns={equipmentImportColumns}
          sampleData={equipmentSampleData}
          onImport={async (rows) => {
            const res = await fetch("/api/import", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ entity: "equipment", rows }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Import failed");
            router.refresh();
            return { success: data.success, errors: data.errors };
          }}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Create Equipment Modal */}
      {showCreate && (
        <div className="equipment-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="equipment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="equipment-modal-header">
              <h3>{t("addNewEquipment")}</h3>
              <button
                className="equipment-modal-close"
                onClick={() => setShowCreate(false)}
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="equipment-form-error">{createError}</div>
            )}

            <form onSubmit={handleCreate} className="equipment-form">
              <div className="equipment-form-group">
                <label className="equipment-form-label">{t("labelNameRequired")}</label>
                <input
                  type="text"
                  className="equipment-form-input"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={t("placeholderEquipmentName")}
                  required
                />
              </div>

              <div className="equipment-form-row">
                <div className="equipment-form-group">
                  <label className="equipment-form-label">{t("labelTypeRequired")}</label>
                  <select
                    className="equipment-form-select"
                    value={formData.equipment_type}
                    onChange={(e) =>
                      setFormData({ ...formData, equipment_type: e.target.value })
                    }
                    required
                  >
                    <option value="">{t("selectType")}</option>
                    {EQUIPMENT_TYPES.map((t_item) => (
                      <option key={t_item.value} value={t_item.value}>
                        {t_item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="equipment-form-group">
                  <label className="equipment-form-label">{t("labelSerialNumber")}</label>
                  <input
                    type="text"
                    className="equipment-form-input"
                    value={formData.serial_number}
                    onChange={(e) =>
                      setFormData({ ...formData, serial_number: e.target.value })
                    }
                    placeholder={t("placeholderSerialNumber")}
                  />
                </div>
              </div>

              <div className="equipment-form-row">
                <div className="equipment-form-group">
                  <label className="equipment-form-label">{t("labelMake")}</label>
                  <input
                    type="text"
                    className="equipment-form-input"
                    value={formData.make}
                    onChange={(e) =>
                      setFormData({ ...formData, make: e.target.value })
                    }
                    placeholder={t("placeholderManufacturer")}
                  />
                </div>
                <div className="equipment-form-group">
                  <label className="equipment-form-label">{t("labelModel")}</label>
                  <input
                    type="text"
                    className="equipment-form-input"
                    value={formData.model}
                    onChange={(e) =>
                      setFormData({ ...formData, model: e.target.value })
                    }
                    placeholder={t("placeholderModelName")}
                  />
                </div>
              </div>

              <div className="equipment-form-row">
                <div className="equipment-form-group">
                  <label className="equipment-form-label">{t("labelPurchaseDate")}</label>
                  <input
                    type="date"
                    className="equipment-form-input"
                    value={formData.purchase_date}
                    onChange={(e) =>
                      setFormData({ ...formData, purchase_date: e.target.value })
                    }
                  />
                </div>
                <div className="equipment-form-group">
                  <label className="equipment-form-label">{t("labelPurchaseCostDollar")}</label>
                  <input
                    type="number"
                    className="equipment-form-input"
                    value={formData.purchase_cost}
                    onChange={(e) =>
                      setFormData({ ...formData, purchase_cost: e.target.value })
                    }
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="equipment-form-group">
                <label className="equipment-form-label">{t("labelHourlyRateDollar")}</label>
                <input
                  type="number"
                  className="equipment-form-input"
                  value={formData.hourly_rate}
                  onChange={(e) =>
                    setFormData({ ...formData, hourly_rate: e.target.value })
                  }
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Depreciation Fields */}
              <div className="equipment-form-row">
                <div className="equipment-form-group">
                  <label className="equipment-form-label">Useful Life (Months)</label>
                  <input
                    type="number"
                    className="equipment-form-input"
                    value={formData.useful_life_months}
                    onChange={(e) =>
                      setFormData({ ...formData, useful_life_months: e.target.value })
                    }
                    placeholder="e.g. 60"
                    min="1"
                    step="1"
                  />
                </div>
                <div className="equipment-form-group">
                  <label className="equipment-form-label">Salvage Value ($)</label>
                  <input
                    type="number"
                    className="equipment-form-input"
                    value={formData.salvage_value}
                    onChange={(e) =>
                      setFormData({ ...formData, salvage_value: e.target.value })
                    }
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="equipment-form-group">
                <label className="equipment-form-label">Depreciation Start Date</label>
                <input
                  type="date"
                  className="equipment-form-input"
                  value={formData.depreciation_start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, depreciation_start_date: e.target.value })
                  }
                />
              </div>

              <div className="equipment-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreate(false)}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating || !formData.name.trim() || !formData.equipment_type}
                >
                  {creating ? t("adding") : t("addEquipment")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail / Edit / Delete Modal */}
      {selectedItem && (
        <div className="equipment-modal-overlay" onClick={closeDetail}>
          <div className="equipment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="equipment-modal-header">
              <h3>
                {isEditing ? t("editName", { name: selectedItem.name }) : selectedItem.name}
              </h3>
              <button className="equipment-modal-close" onClick={closeDetail}>
                <X size={18} />
              </button>
            </div>

            {saveError && (
              <div className="equipment-form-error">{saveError}</div>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
              <div
                className="equipment-modal-overlay"
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  position: "absolute",
                  zIndex: 1000,
                  borderRadius: "inherit",
                }}
              >
                <div
                  className="equipment-modal"
                  onClick={(e) => e.stopPropagation()}
                  style={{ maxWidth: 440 }}
                >
                  <div className="equipment-modal-header">
                    <h3>{t("deleteEquipment")}</h3>
                    <button
                      className="equipment-modal-close"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div style={{ padding: "1rem 1.5rem" }}>
                    <p>
                      {t("confirmDeleteEquipment", { name: selectedItem.name })}
                    </p>
                  </div>
                  <div className="equipment-form-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={saving}
                    >
                      {t("cancel")}
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ backgroundColor: "var(--color-danger, #dc2626)" }}
                      onClick={handleDelete}
                      disabled={saving}
                    >
                      {saving ? t("deleting") : t("delete")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Read-only detail */}
            {!isEditing && (
              <div style={{ padding: "1.25rem", pointerEvents: showDeleteConfirm ? "none" : "auto" }}>
                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("columnName")}</label>
                    <div className="detail-value">{selectedItem.name}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("columnType")}</label>
                    <div className="detail-value">
                      {EQUIPMENT_TYPES.find((t_item) => t_item.value === selectedItem.equipment_type)?.label ??
                        selectedItem.equipment_type}
                    </div>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("labelMake")}</label>
                    <div className="detail-value">{selectedItem.make || "--"}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("labelModel")}</label>
                    <div className="detail-value">{selectedItem.model || "--"}</div>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("labelSerialNumber")}</label>
                    <div className="detail-value">{selectedItem.serial_number || "--"}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("columnStatus")}</label>
                    <div className="detail-value">
                      <span className={`equipment-status-badge status-${selectedItem.status}`}>
                        {STATUS_LABELS[selectedItem.status] ?? selectedItem.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("labelCurrentProject")}</label>
                    <div className="detail-value">{selectedItem.project?.name || "--"}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("labelAssignedTo")}</label>
                    <div className="detail-value">{getUserName(selectedItem.assignee)}</div>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("labelPurchaseDate")}</label>
                    <div className="detail-value">{formatDate(selectedItem.purchase_date)}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("labelPurchaseCost")}</label>
                    <div className="detail-value">{formatCurrency(selectedItem.purchase_cost)}</div>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("labelHourlyRate")}</label>
                    <div className="detail-value">
                      {selectedItem.hourly_rate ? `${formatCurrency(selectedItem.hourly_rate)}/hr` : "--"}
                    </div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("labelTotalHours")}</label>
                    <div className="detail-value">{selectedItem.total_hours ?? "--"}</div>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("labelLastMaintenance")}</label>
                    <div className="detail-value">{formatDate(selectedItem.last_maintenance_date)}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("labelNextMaintenance")}</label>
                    <div className="detail-value">{formatDate(selectedItem.next_maintenance_date)}</div>
                  </div>
                </div>

                {/* Depreciation Section */}
                {selectedItem.useful_life_months && selectedItem.useful_life_months > 0 && (
                  (() => {
                    const cost = selectedItem.purchase_cost ?? 0;
                    const salvage = selectedItem.salvage_value ?? 0;
                    const depreciableAmount = cost - salvage;
                    const monthlyDep = depreciableAmount / selectedItem.useful_life_months;
                    const startDate = selectedItem.depreciation_start_date
                      ? new Date(selectedItem.depreciation_start_date)
                      : null;
                    const monthsElapsed = startDate
                      ? Math.max(0, Math.floor((Date.now() - startDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000)))
                      : 0;
                    const cappedMonths = Math.min(monthsElapsed, selectedItem.useful_life_months);
                    const accumulated = Math.min(monthlyDep * cappedMonths, depreciableAmount);
                    const bookValue = cost - accumulated;
                    const pct = depreciableAmount > 0 ? (accumulated / depreciableAmount) * 100 : 0;

                    return (
                      <div style={{ marginTop: "16px", padding: "12px", background: "var(--surface)", borderRadius: "8px" }}>
                        <label className="detail-label" style={{ fontWeight: 600, marginBottom: "8px", display: "block" }}>
                          Depreciation (Straight-Line)
                        </label>
                        <div className="detail-row">
                          <div className="detail-group">
                            <label className="detail-label">Monthly</label>
                            <div className="detail-value">{formatCurrency(monthlyDep)}</div>
                          </div>
                          <div className="detail-group">
                            <label className="detail-label">Accumulated</label>
                            <div className="detail-value">{formatCurrency(accumulated)}</div>
                          </div>
                        </div>
                        <div className="detail-row">
                          <div className="detail-group">
                            <label className="detail-label">Book Value</label>
                            <div className="detail-value" style={{ fontWeight: 600 }}>{formatCurrency(bookValue)}</div>
                          </div>
                          <div className="detail-group">
                            <label className="detail-label">Depreciated</label>
                            <div className="detail-value">{pct.toFixed(1)}% ({cappedMonths} of {selectedItem.useful_life_months} mo)</div>
                          </div>
                        </div>
                        <div style={{ height: 6, background: "var(--border)", borderRadius: 3, marginTop: 8 }}>
                          <div style={{ height: "100%", borderRadius: 3, width: `${Math.min(100, pct)}%`, background: pct >= 90 ? "var(--color-red)" : pct >= 70 ? "var(--color-amber)" : "var(--color-green)", transition: "width 0.3s" }} />
                        </div>
                      </div>
                    );
                  })()
                )}

                <div className="ticket-form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ color: "var(--color-danger, #dc2626)" }}
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 size={16} />
                    {t("delete")}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={closeDetail}
                  >
                    {t("close")}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={startEditing}
                  >
                    <Edit3 size={16} />
                    {t("edit")}
                  </button>
                </div>
              </div>
            )}

            {/* Edit view */}
            {isEditing && (
              <div className="equipment-form">
                <div className="equipment-form-row">
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">{t("labelNameRequired")}</label>
                    <input
                      type="text"
                      className="equipment-form-input"
                      value={(editData.name as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">{t("labelTypeRequired")}</label>
                    <select
                      className="equipment-form-select"
                      value={(editData.equipment_type as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, equipment_type: e.target.value })
                      }
                    >
                      {EQUIPMENT_TYPES.map((t_item) => (
                        <option key={t_item.value} value={t_item.value}>
                          {t_item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="equipment-form-row">
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">{t("labelMake")}</label>
                    <input
                      type="text"
                      className="equipment-form-input"
                      value={(editData.make as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, make: e.target.value })
                      }
                    />
                  </div>
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">{t("labelModel")}</label>
                    <input
                      type="text"
                      className="equipment-form-input"
                      value={(editData.model as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, model: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="equipment-form-row">
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">{t("labelSerialNumber")}</label>
                    <input
                      type="text"
                      className="equipment-form-input"
                      value={(editData.serial_number as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, serial_number: e.target.value })
                      }
                    />
                  </div>
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">{t("columnStatus")}</label>
                    <select
                      className="equipment-form-select"
                      value={(editData.status as string) || "available"}
                      onChange={(e) =>
                        setEditData({ ...editData, status: e.target.value })
                      }
                    >
                      {(Object.keys(STATUS_LABELS) as EquipmentStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="equipment-form-row">
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">{t("labelPurchaseDate")}</label>
                    <input
                      type="date"
                      className="equipment-form-input"
                      value={(editData.purchase_date as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, purchase_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">{t("labelPurchaseCostDollar")}</label>
                    <input
                      type="number"
                      className="equipment-form-input"
                      value={String(editData.purchase_cost ?? "")}
                      onChange={(e) =>
                        setEditData({ ...editData, purchase_cost: e.target.value })
                      }
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="equipment-form-group">
                  <label className="equipment-form-label">{t("labelHourlyRateDollar")}</label>
                  <input
                    type="number"
                    className="equipment-form-input"
                    value={String(editData.hourly_rate ?? "")}
                    onChange={(e) =>
                      setEditData({ ...editData, hourly_rate: e.target.value })
                    }
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Depreciation Fields */}
                <div className="equipment-form-row">
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Useful Life (Months)</label>
                    <input
                      type="number"
                      className="equipment-form-input"
                      value={String(editData.useful_life_months ?? "")}
                      onChange={(e) =>
                        setEditData({ ...editData, useful_life_months: e.target.value })
                      }
                      min="1"
                      step="1"
                    />
                  </div>
                  <div className="equipment-form-group">
                    <label className="equipment-form-label">Salvage Value ($)</label>
                    <input
                      type="number"
                      className="equipment-form-input"
                      value={String(editData.salvage_value ?? "")}
                      onChange={(e) =>
                        setEditData({ ...editData, salvage_value: e.target.value })
                      }
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="equipment-form-group">
                  <label className="equipment-form-label">Depreciation Start Date</label>
                  <input
                    type="date"
                    className="equipment-form-input"
                    value={(editData.depreciation_start_date as string) || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, depreciation_start_date: e.target.value })
                    }
                  />
                </div>

                <div className="equipment-form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={cancelEditing}
                    disabled={saving}
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={saving || !(editData.name as string)?.trim()}
                  >
                    {saving ? t("saving") : t("saveChanges")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
