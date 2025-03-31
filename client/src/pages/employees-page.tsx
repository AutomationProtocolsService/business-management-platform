import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2,
  UserCircle,
  Mail,
  Phone,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date-utils";
import EmployeeForm from "@/components/forms/employee-form";

export default function EmployeesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch employees and related user data
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["/api/employees"],
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  // Delete employee mutation
  const deleteEmployee = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/employees/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Employee deleted",
        description: "Employee record has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle employee creation success
  const handleEmployeeCreated = () => {
    setIsCreateDialogOpen(false);
    toast({
      title: "Employee created",
      description: "Employee record has been created successfully."
    });
  };

  // Filter employees by search query
  const filteredEmployees = employees.filter((employee: any) => {
    // Check if employee has a user account
    const user = employee.userId 
      ? users.find((u: any) => u.id === employee.userId) 
      : null;
    
    if (!user) return true; // Include employees without user accounts
    
    // Search by position, department, or user name
    return (
      (employee.position && employee.position.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (employee.department && employee.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.fullName && user.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  // Get user data by employee's userId
  const getUserByEmployeeId = (userId: number | undefined) => {
    if (!userId) return null;
    return users.find((user: any) => user.id === userId);
  };

  // Get initials from user name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="h-full">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Employees</h2>
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <div className="relative">
            <Input 
              type="text" 
              placeholder="Search employees..." 
              className="pl-10 pr-4 py-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" />
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                New Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Employee</DialogTitle>
                <DialogDescription>
                  Fill in the details to create a new employee record.
                </DialogDescription>
              </DialogHeader>
              <EmployeeForm onSuccess={handleEmployeeCreated} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Employee</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Position</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Department</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Hire Date</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Contact</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-right font-medium text-xs uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No employees found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee: any) => {
                      const user = getUserByEmployeeId(employee.userId);
                      return (
                        <TableRow key={employee.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="flex items-center">
                              <Avatar className="h-8 w-8 mr-2">
                                <AvatarFallback className="bg-primary-600 text-white">
                                  {user ? getInitials(user.fullName) : "??"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-sm text-gray-900">
                                  {user ? user.fullName : `Employee #${employee.id}`}
                                </div>
                                {user && <div className="text-xs text-gray-500">{user.username}</div>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-900">{employee.position || "—"}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-900">{employee.department || "—"}</div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {employee.hireDate ? formatDate(employee.hireDate, "MMM dd, yyyy") : "—"}
                          </TableCell>
                          <TableCell>
                            {user && (
                              <div className="flex flex-col">
                                <div className="flex items-center text-xs text-gray-500">
                                  <Mail className="h-3 w-3 mr-1" />
                                  {user.email}
                                </div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {employee.terminationDate ? (
                              <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">Terminated</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                  <Link href={`/employees/${employee.id}`}>
                                    <div className="w-full flex items-center">
                                      <UserCircle className="h-4 w-4 mr-2" /> View Profile
                                    </div>
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/employees/${employee.id}/edit`}>
                                    <div className="w-full flex items-center">
                                      <Edit className="h-4 w-4 mr-2" /> Edit
                                    </div>
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/timesheets?employeeId=${employee.id}`}>
                                    <div className="w-full flex items-center">
                                      <Clock className="h-4 w-4 mr-2" /> View Timesheets
                                    </div>
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedEmployeeId(employee.id);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this employee record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedEmployeeId && deleteEmployee.mutate(selectedEmployeeId)}
              disabled={deleteEmployee.isPending}
            >
              {deleteEmployee.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
