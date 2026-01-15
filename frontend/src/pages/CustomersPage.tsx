import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Customers</h1>
        <p className="text-muted-foreground">
          Manage your customer relationships
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer List</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No customers yet. Customer management features will be added in future updates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
