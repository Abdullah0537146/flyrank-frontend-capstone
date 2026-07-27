import { useState } from "react";
import { Check, AlertCircle, Loader2 } from "lucide-react";

const initialValues = {
  name: "Alex Rivera",
  email: "alex.rivera@example.com",
};

function validate({ name, email }) {
  const errors = {};

  if (!name.trim()) {
    errors.name = "Name can't be empty.";
  } else if (name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters.";
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.trim()) {
    errors.email = "Email can't be empty.";
  } else if (!emailPattern.test(email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  return errors;
}

export default function UserSettingsForm() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | saving | saved

  const isDirty =
    values.name !== initialValues.name || values.email !== initialValues.email;

  function handleChange(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setStatus("idle");
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus("saving");
    // Simulate an async save; replace with your real API call.
    await new Promise((resolve) => setTimeout(resolve, 900));
    setStatus("saved");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-sm p-6 mt-10">
        <h1 className="text-lg font-semibold text-slate-900">Profile settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Update the name and email associated with your account.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Name
            </label>
            <input
              id="name"
              type="text"
              value={values.name}
              onChange={(e) => handleChange("name", e.target.value)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "name-error" : undefined}
              className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-offset-0 ${
                errors.name
                  ? "border-red-300 focus:ring-red-200"
                  : "border-slate-300 focus:ring-slate-300"
              }`}
              placeholder="Your full name"
            />
            {errors.name && (
              <p
                id="name-error"
                className="mt-1.5 flex items-center gap-1 text-xs text-red-600"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={values.email}
              onChange={(e) => handleChange("email", e.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-offset-0 ${
                errors.email
                  ? "border-red-300 focus:ring-red-200"
                  : "border-slate-300 focus:ring-slate-300"
              }`}
              placeholder="you@example.com"
            />
            {errors.email && (
              <p
                id="email-error"
                className="mt-1.5 flex items-center gap-1 text-xs text-red-600"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errors.email}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={!isDirty || status === "saving"}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {status === "saving" && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              {status === "saving" ? "Saving..." : "Save changes"}
            </button>

            {status === "saved" && (
              <span className="flex items-center gap-1 text-sm text-emerald-600">
                <Check className="w-4 h-4" />
                Saved
              </span>
            )}
            {!isDirty && status === "idle" && (
              <span className="text-sm text-slate-400">No changes yet</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}