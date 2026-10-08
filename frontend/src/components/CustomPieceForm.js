import React, { useState } from "react";
import { DAY_MS } from "../lib/productDisplay";

// The form a customer fills in for a custom silver piece, shared by the
// product page (when adding to the cart) and the cart (when editing).

export const EMPTY_SPEC = {
  preferredWeight: "",
  height: "",
  width: "",
  length: "",
  unit: "inch",
  design: "",
  designNotes: "",
  requiredBy: "",
};

const OTHER_DESIGN = "__other__";
const str = (v) => (v === undefined || v === null ? "" : String(v));

// Saved specification (from the cart) -> form values
export function specToValues(spec = {}) {
  const size = spec.size || {};
  return {
    preferredWeight: str(spec.preferredWeight),
    height: str(size.height),
    width: str(size.width),
    length: str(size.length),
    unit: size.unit || "inch",
    design: spec.design || "",
    designNotes: spec.designNotes || "",
    requiredBy: spec.requiredBy ? String(spec.requiredBy).slice(0, 10) : "",
  };
}

// Form values -> the customSpecification the API expects
export function valuesToSpec(values) {
  return {
    preferredWeight: Number(values.preferredWeight),
    size: {
      height: values.height || undefined,
      width: values.width || undefined,
      length: values.length || undefined,
      unit: values.unit,
    },
    design: values.design.trim() || undefined,
    designNotes: values.designNotes.trim() || undefined,
    requiredBy: values.requiredBy || undefined,
  };
}

// Mirrors the backend's checks so the customer sees problems right away.
// Returns an object of field -> message (empty when valid).
export function validateCustomPiece(product, values) {
  const e = {};
  const options = product.customOptions || {};
  const designOptions = options.designOptions || [];
  const allowCustomDesign = options.allowCustomDesign !== false;

  const { min, max } = product.weightRange || {};
  const w = Number(values.preferredWeight);
  if (values.preferredWeight === "") e.preferredWeight = "Please choose a weight";
  else if (Number.isNaN(w) || w < min || w > max) e.preferredWeight = `Weight must be between ${min} and ${max} tola`;

  const { minHeight, maxHeight, unit } = options.sizeRange || {};
  const h = Number(values.height);
  if (values.height !== "" && ((minHeight != null && h < minHeight) || (maxHeight != null && h > maxHeight)))
    e.height = `Height must be between ${minHeight ?? 0} and ${maxHeight ?? "any"} ${unit || "inch"}`;

  if (!allowCustomDesign && designOptions.length && !designOptions.includes(values.design)) e.design = "Please choose a design";
  else if (!values.design.trim() && !values.designNotes.trim()) e.design = "Please choose or describe the design you want";

  const minDays = options.productionTime?.minDays;
  if (values.requiredBy && minDays != null && new Date(values.requiredBy).getTime() < Date.now() + minDays * DAY_MS)
    e.requiredBy = `We need at least ${minDays} days to make this piece`;

  return e;
}

// Price for one piece at the given silver rate, or null if it can't be worked out
export function estimateCustomPrice(product, values, silverRate) {
  const weight = Number(values.preferredWeight);
  if (!silverRate || !weight) return null;
  return silverRate * weight + (product.makingCost || 0);
}

const labelClass = "block text-sm font-medium mb-1";
const labelStyle = { color: "var(--dark-gray)" };
const errorText = (msg) => msg && <p className="text-red-600 text-xs mt-1">{msg}</p>;

/**
 * Fields for a custom piece. Controlled: pass `values`, `errors` and
 * `onChange(field, value)`. Give it a `key` that changes with the product so
 * the design dropdown resets.
 */
export function CustomPieceFields({ product, values, errors = {}, onChange, idPrefix = "custom" }) {
  const options = product.customOptions || {};
  const designOptions = options.designOptions || [];
  const allowCustomDesign = options.allowCustomDesign !== false;
  const time = options.productionTime;

  // Which dropdown entry is selected; "other" means the free-text box is used
  const [designChoice, setDesignChoice] = useState(() => {
    if (!values.design) return designOptions.length ? "" : OTHER_DESIGN;
    return designOptions.includes(values.design) ? values.design : OTHER_DESIGN;
  });

  const field = (name) => (e) => onChange(name, e.target.value);
  const id = (name) => `${idPrefix}-${name}`;
  const invalid = (name) => (errors[name] ? "border-red-500" : "");

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={id("weight")} className={labelClass} style={labelStyle}>
          Weight (tola) *
        </label>
        <input
          id={id("weight")}
          type="number"
          step="any"
          min={product.weightRange?.min}
          max={product.weightRange?.max}
          value={values.preferredWeight}
          onChange={field("preferredWeight")}
          placeholder={`${product.weightRange?.min} to ${product.weightRange?.max}`}
          className={`input-field w-full ${invalid("preferredWeight")}`}
        />
        {errorText(errors.preferredWeight)}
      </div>

      <div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {["height", "width", "length"].map((f) => (
            <div key={f}>
              <label htmlFor={id(f)} className={`${labelClass} capitalize`} style={labelStyle}>
                {f}
              </label>
              <input
                id={id(f)}
                type="number"
                step="any"
                min={0}
                value={values[f]}
                onChange={field(f)}
                className={`input-field w-full ${invalid(f)}`}
              />
            </div>
          ))}
          <div>
            <label htmlFor={id("unit")} className={labelClass} style={labelStyle}>
              Unit
            </label>
            <select id={id("unit")} value={values.unit} onChange={field("unit")} className="input-field w-full">
              <option value="inch">inch</option>
              <option value="cm">cm</option>
            </select>
          </div>
        </div>
        {errorText(errors.height)}
      </div>

      <div>
        <label htmlFor={id("design")} className={labelClass} style={labelStyle}>
          Design *
        </label>
        {designOptions.length > 0 && (
          <select
            id={id("design")}
            value={designChoice}
            onChange={(e) => {
              setDesignChoice(e.target.value);
              onChange("design", e.target.value === OTHER_DESIGN ? "" : e.target.value);
            }}
            className={`input-field w-full ${invalid("design")}`}
          >
            <option value="">Choose a design</option>
            {designOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
            {allowCustomDesign && <option value={OTHER_DESIGN}>My own design (describe it)</option>}
          </select>
        )}
        {designChoice === OTHER_DESIGN && (
          <input
            id={designOptions.length ? id("design-text") : id("design")}
            aria-label="Describe the design"
            value={values.design}
            onChange={field("design")}
            placeholder="e.g. Medicine Buddha seated on a lotus"
            className={`input-field w-full ${designOptions.length ? "mt-2" : ""} ${invalid("design")}`}
          />
        )}
        {errorText(errors.design)}
      </div>

      <div>
        <label htmlFor={id("notes")} className={labelClass} style={labelStyle}>
          Details for the craftsman (optional)
        </label>
        <textarea
          id={id("notes")}
          rows={3}
          value={values.designNotes}
          onChange={field("designNotes")}
          placeholder="Pose, ornaments, finish, engraving..."
          className="input-field w-full resize-none"
        />
      </div>

      <div>
        <label htmlFor={id("required-by")} className={labelClass} style={labelStyle}>
          Needed by (optional)
        </label>
        <input
          id={id("required-by")}
          type="date"
          value={values.requiredBy}
          onChange={field("requiredBy")}
          min={new Date(Date.now() + (time?.minDays || 0) * DAY_MS).toISOString().slice(0, 10)}
          className={`input-field w-full ${invalid("requiredBy")}`}
        />
        {errorText(errors.requiredBy)}
      </div>
    </div>
  );
}
