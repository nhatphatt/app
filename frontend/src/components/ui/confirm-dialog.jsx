import * as React from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Trash2, Info, X, ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"

const variants = {
  danger: {
    icon: Trash2,
    iconBg: "bg-red-100 dark:bg-red-950",
    iconColor: "text-red-600 dark:text-red-400",
    ringColor: "ring-red-600/20",
    actionClass: "bg-red-600 hover:bg-red-700 focus-visible:ring-red-600 text-white shadow-lg shadow-red-600/25",
    accentBar: "from-red-500 to-rose-600",
  },
  warning: {
    icon: ShieldAlert,
    iconBg: "bg-amber-100 dark:bg-amber-950",
    iconColor: "text-amber-600 dark:text-amber-400",
    ringColor: "ring-amber-600/20",
    actionClass: "bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-600 text-white shadow-lg shadow-amber-600/25",
    accentBar: "from-amber-500 to-orange-600",
  },
  info: {
    icon: Info,
    iconBg: "bg-blue-100 dark:bg-blue-950",
    iconColor: "text-blue-600 dark:text-blue-400",
    ringColor: "ring-blue-600/20",
    actionClass: "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-600 text-white shadow-lg shadow-blue-600/25",
    accentBar: "from-blue-500 to-indigo-600",
  },
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title = "Xác nhận",
  description = "Bạn có chắc chắn muốn thực hiện hành động này?",
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  variant = "danger",
  onConfirm,
  loading = false,
}) {
  const v = variants[variant] || variants.danger
  const Icon = v.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl gap-0">
        {/* Accent bar */}
        <div className={cn("h-1.5 w-full bg-gradient-to-r", v.accentBar)} />


        {/* Content */}
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={cn(
              "flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full ring-8",
              v.iconBg,
              v.ringColor
            )}>
              <Icon className={cn("h-6 w-6", v.iconColor)} />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0 pt-0.5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                {title}
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {description}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 mt-2 bg-gray-50 dark:bg-gray-900/50 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange?.(false)}
            disabled={loading}
            className="rounded-xl px-5"
          >
            {cancelText}
          </Button>
          <Button
            onClick={() => onConfirm?.()}
            disabled={loading}
            className={cn("rounded-xl px-5 transition-all duration-200", v.actionClass)}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Đang xử lý...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {confirmText}
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
