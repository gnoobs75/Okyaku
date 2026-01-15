import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Building2, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExportButton } from "@/components/ExportButton";
import { useApi } from "@/hooks/useApi";
import type { Contact, PaginatedResponse } from "@/types/crm";

const statusColors: Record<string, string> = {
  lead: "bg-blue-100 text-blue-800",
  prospect: "bg-yellow-100 text-yellow-800",
  customer: "bg-green-100 text-green-800",
  churned: "bg-red-100 text-red-800",
  other: "bg-gray-100 text-gray-800",
};

export function ContactsListPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { get, isLoading } = useApi<PaginatedResponse<Contact>>();

  const loadContacts = useCallback(async () => {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: "20",
    });
    if (search) {
      params.set("search", search);
    }
    const result = await get(`/contacts?${params}`);
    if (result) {
      setContacts(result.items);
      setTotal(result.total);
    }
  }, [get, page, search]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadContacts();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your contacts and leads
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton entityType="contacts" />
          <Link to="/contacts/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </Link>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Phone</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  No contacts found
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>
                    <Link
                      to={`/contacts/${contact.id}`}
                      className="font-medium hover:underline"
                    >
                      {contact.first_name} {contact.last_name}
                    </Link>
                    {contact.job_title && (
                      <p className="text-sm text-muted-foreground">
                        {contact.job_title}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {contact.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    {contact.company_name && (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {contact.company_name}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[contact.status]}>
                      {contact.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {contact.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {contact.phone}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of{" "}
            {total} contacts
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 20 >= total}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
