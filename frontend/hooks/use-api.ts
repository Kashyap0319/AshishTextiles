'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export function useList(resource: string, params: Record<string, string> = {}) {
  const queryString = new URLSearchParams(params).toString()
  return useQuery({
    queryKey: [resource, params],
    queryFn: () => api.get(`/${resource}?${queryString}`).then((r) => r.data),
  })
}

export function useDetail(resource: string, id: string | number | null) {
  return useQuery({
    queryKey: [resource, id],
    queryFn: () => api.get(`/${resource}/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreate(resource: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api.post(`/${resource}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [resource] }),
  })
}

export function useUpdate(resource: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string | number; [key: string]: any }) =>
      api.put(`/${resource}/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [resource] }),
  })
}

export function useDelete(resource: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string | number) => api.delete(`/${resource}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [resource] }),
  })
}
