import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

/* ----------------------------- Catalog ----------------------------- */

export function useGames() {
  return useQuery({
    queryKey: ["games"],
    queryFn: async () => (await api.get("/games/")).data,
    staleTime: 60_000,
  });
}

export function useGame(slug) {
  return useQuery({
    queryKey: ["games", slug],
    queryFn: async () => (await api.get(`/games/${slug}/`)).data,
    enabled: !!slug,
  });
}

/* ------------------------------ Orders ----------------------------- */

export function useOrders({ poll = false } = {}) {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => (await api.get("/orders/")).data,
    // Poll while any order is mid-flight so the tracker updates live.
    refetchInterval: (query) => {
      if (!poll) return false;
      const data = query.state.data || [];
      const live = data.some((o) =>
        ["pending_payment", "verifying", "processing"].includes(o.status)
      );
      return live ? 4000 : false;
    },
  });
}

export function useOrder(id, { poll = false } = {}) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: async () => (await api.get(`/orders/${id}/`)).data,
    enabled: !!id,
    refetchInterval: (query) => {
      if (!poll) return false;
      const s = query.state.data?.status;
      return ["pending_payment", "verifying", "processing"].includes(s) ? 4000 : false;
    },
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.post("/orders/", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

/* -------------------------- Payment proofs ------------------------- */

export function useSubmitProof() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ order, image, submitted_note }) => {
      const form = new FormData();
      form.append("order", order);
      form.append("image", image);
      if (submitted_note) form.append("submitted_note", submitted_note);
      const { data } = await api.post("/payment-proofs/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["payment-proofs"] });
    },
  });
}

export function useProofs() {
  return useQuery({
    queryKey: ["payment-proofs"],
    queryFn: async () => (await api.get("/payment-proofs/")).data,
  });
}

export function useReviewProof() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, decision, reason }) => {
      const { data } = await api.post(`/payment-proofs/${id}/${decision}/`, { reason });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-proofs"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

/* ------------------------------ Wallet ----------------------------- */

export function useWallet() {
  return useQuery({
    queryKey: ["wallet", "me"],
    queryFn: async () => (await api.get("/wallet/me/")).data,
  });
}

export function useLedger() {
  return useQuery({
    queryKey: ["wallet", "ledger"],
    queryFn: async () => (await api.get("/wallet/ledger/")).data,
  });
}

export function useLookupPlayer(slug, player_id, zone_id) {
  return useQuery({
    queryKey: ["games", slug, "lookup", player_id, zone_id],
    queryFn: async () => {
      const params = { player_id };
      if (zone_id) params.zone_id = zone_id;
      const { data } = await api.get(`/games/${slug}/lookup/`, { params });
      return data;
    },
    enabled: !!slug && !!player_id && player_id.trim().length >= 4,
    retry: false,
    staleTime: 30_000,
  });
}

