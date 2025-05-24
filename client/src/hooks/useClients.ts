import { useQuery } from "@tanstack/react-query";
import { Customer } from "@shared/schema";

export function useClients() {
  const { data = [], isLoading, error } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    refetchOnWindowFocus: false,
  });

  return {
    clients: data,
    isLoading,
    error,
  };
}