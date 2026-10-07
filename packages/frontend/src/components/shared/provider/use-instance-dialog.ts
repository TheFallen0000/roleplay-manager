import { useCallback, useState } from "react"

import type { ProviderInstance } from "@workspace/shared/types/provider-instance"

export interface InstanceDialogState {
  open: boolean
  mode: "create" | "edit"
  editingInstance: ProviderInstance | null
}

export function useInstanceDialog() {
  const [state, setState] = useState<InstanceDialogState>({
    open: false,
    mode: "create",
    editingInstance: null,
  })

  const openCreate = useCallback(() => {
    setState({ open: true, mode: "create", editingInstance: null })
  }, [])

  const openEdit = useCallback((instance: ProviderInstance) => {
    setState({ open: true, mode: "edit", editingInstance: instance })
  }, [])

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, open: false, editingInstance: null }))
  }, [])

  return { state, openCreate, openEdit, close }
}
