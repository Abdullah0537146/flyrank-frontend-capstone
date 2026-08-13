import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

export const settingsSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters."),
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Enter a valid email address."),
});

/**
 * SettingsForm
 *
 * @param {Object} props
 * @param {{ fullName: string, email: string }} [props.defaultValues]
 * @param {(data: { fullName: string, email: string }) => Promise<void>} [props.onSave]
 *   Called with validated form data on submit. If it throws/rejects, an
 *   error alert is shown instead of the success alert. Defaults to a
 *   simulated network call if not provided.
 */
export default function SettingsForm({
  defaultValues = { fullName: "", email: "" },
  onSave,
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(settingsSchema),
    defaultValues,
    mode: "onBlur",
  });

  const [submitStatus, setSubmitStatus] = useState(null); // null | "success" | "error"

  async function onSubmit(data) {
    setSubmitStatus(null);
    try {
      if (onSave) {
        await onSave(data);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
      setSubmitStatus("success");
      reset(data);
    } catch (err) {
      setSubmitStatus("error");
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h1 className="text-lg font-semibold text-slate-900">Profile settings</h1>
      <p className="text-sm text-slate-500 mt-1">
        Update your full name and email address.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-6 space-y-5"
      >
        <div>
          <label
            htmlFor="fullName"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            {...register("fullName")}
            aria-invalid={errors.fullName ? "true" : "false"}
            aria-describedby={errors.fullName ? "fullName-error" : undefined}
            className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 ${
              errors.fullName
                ? "border-red-300 focus:ring-red-200"
                : "border-slate-300 focus:ring-slate-300"
            }`}
          />
          {errors.fullName && (
            <p
              id="fullName-error"
              role="alert"
              className="mt-1.5 text-xs text-red-600"
            >
              {errors.fullName.message}
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
            autoComplete="email"
            {...register("email")}
            aria-invalid={errors.email ? "true" : "false"}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 ${
              errors.email
                ? "border-red-300 focus:ring-red-200"
                : "border-slate-300 focus:ring-slate-300"
            }`}
          />
          {errors.email && (
            <p
              id="email-error"
              role="alert"
              className="mt-1.5 text-xs text-red-600"
            >
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="pt-1">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? "Saving..." : "Save changes"}
          </button>
        </div>

        {submitStatus === "success" && (
          <div
            role="status"
            className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700"
          >
            Settings saved successfully.
          </div>
        )}
        {submitStatus === "error" && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700"
          >
            Something went wrong while saving. Please try again.
          </div>
        )}
      </form>
    </div>
  );
}