import { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Customer } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useClients } from "@/hooks/useClients";

interface ClientComboboxProps {
  onClientSelect: (client: Customer | null) => void;
  selectedClient: Customer | null;
  onAddClient: (term: string) => void;
}

export function ClientCombobox({ 
  onClientSelect, 
  selectedClient, 
  onAddClient 
}: ClientComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { clients, isLoading } = useClients();
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Focus the input when the popover opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          data-testid="client-select"
        >
          {selectedClient
            ? selectedClient.name
            : "Select a client"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput 
            placeholder="Search clients..." 
            ref={inputRef}
            value={searchTerm}
            onValueChange={setSearchTerm}
            data-testid="client-search"
          />
          <CommandEmpty>
            {isLoading ? (
              <p className="py-3 text-center text-sm text-muted-foreground">Loading clients...</p>
            ) : (
              <>
                <p className="py-2 text-center text-sm text-muted-foreground">No client found.</p>
                {searchTerm.trim() !== "" && (
                  <CommandItem
                    onSelect={() => {
                      onAddClient(searchTerm);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2 cursor-pointer border-t"
                    data-testid="add-new-client"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add "<span className="font-medium">{searchTerm}</span>"</span>
                  </CommandItem>
                )}
              </>
            )}
          </CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-auto">
            {clients.map((client) => (
              <CommandItem
                key={client.id}
                value={client.name}
                onSelect={() => {
                  onClientSelect(client);
                  setOpen(false);
                }}
                className="flex items-center gap-2 cursor-pointer"
                data-testid={`client-option-${client.id}`}
              >
                <Check
                  className={cn(
                    "h-4 w-4",
                    selectedClient?.id === client.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col">
                  <span>{client.name}</span>
                  {client.email && (
                    <span className="text-xs text-muted-foreground">{client.email}</span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}