/**
 * Extended button variants for JobTrackr-specific use cases
 */
import { buttonVariants } from "@/components/ui/button";
import { cva } from "class-variance-authority";

export const jobStatusButtonVariants = cva("", {
  variants: {
    status: {
      saved: "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100",
      applied: "bg-blue-100 text-blue-900 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-100",
      referred: "bg-indigo-100 text-indigo-900 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-100",
      interviewing: "bg-purple-100 text-purple-900 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-100",
      offered: "bg-green-100 text-green-900 hover:bg-green-200 dark:bg-green-900 dark:text-green-100",
      rejected: "bg-red-100 text-red-900 hover:bg-red-200 dark:bg-red-900 dark:text-red-100",
    },
  },
  defaultVariants: {
    status: "saved",
  },
});

export { buttonVariants };
