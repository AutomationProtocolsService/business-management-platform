import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2,
  UserCircle,
  Mail,
  Phone,
  Clock,
  Shield,
  X,
  Check
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/date-utils";
import EmployeeForm from "@/components/forms/employee-form";

export default function EmployeesPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [_, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Permissions management state
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isGrantPermissionFormOpen, setIsGrantPermissionFormOpen] = useState(false);
  const [selectedResourceType, setSelectedResourceType] = useState<string>("");
  const [selectedResourceId, setSelectedResourceId] = useState<string>("");
  const [selectedActions, setSelectedActions] = useState<string[]>([]);

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

  // Update user role mutation
  const updateUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      await apiRequest("PATCH", `/api/users/${userId}`, { role });
    },
    onSuccess: () => {
      toast({
        title: "User role updated",
        description: "User role has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setSelectedRole("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Grant permission mutation
  const grantPermission = useMutation({
    mutationFn: async (permissionData: { userId: number; resourceType: string; resourceId: string; actions: string[] }) => {
      await apiRequest("POST", "/api/admin/permissions", permissionData);
    },
    onSuccess: () => {
      toast({
        title: "Permission granted",
        description: "Permission has been granted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/permissions", selectedEmployee?.userId] });
      setIsGrantPermissionFormOpen(false);
      setSelectedResourceType("");
      setSelectedResourceId("");
      setSelectedActions([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Revoke permission mutation
  const revokePermission = useMutation({
    mutationFn: async (permissionId: number) => {
      await apiRequest("DELETE", `/api/admin/permissions/${permissionId}`);
    },
    onSuccess: () => {
      toast({
        title: "Permission revoked",
        description: "Permission has been revoked successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/permissions", selectedEmployee?.userId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch user permissions when modal is open
  const { data: userPermissions = [] } = useQuery({
    queryKey: ["/api/admin/permissions", selectedEmployee?.userId],
    enabled: !!selectedEmployee?.userId && isPermissionsDialogOpen,
  });

  // Fetch available projects for permission granting
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
    enabled: selectedResourceType === "project",
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
    
    // Get name from employee directly or from linked user account
    const employeeName = employee.fullName || (user?.fullName || '');
    
    // Search by name, position, department, email, or phone
    return (
      (employeeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (employee.position && employee.position.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (employee.department && employee.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (employee.email && employee.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (employee.phone && employee.phone.toLowerCase().includes(searchQuery.toLowerCase()))
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
                                  {employee.fullName ? getInitials(employee.fullName) : (user ? getInitials(user.fullName) : "??")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-sm text-gray-900">
                                  {employee.fullName || (user ? user.fullName : `Employee #${employee.id}`)}
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
                            <div className="flex flex-col">
                              {employee.email && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <Mail className="h-3 w-3 mr-1" />
                                  {employee.email}
                                </div>
                              )}
                              {employee.phone && (
                                <div className="flex items-center text-xs text-gray-500 mt-1">
                                  <Phone className="h-3 w-3 mr-1" />
                                  {employee.phone}
                                </div>
                              )}
                              {!employee.email && !employee.phone && user && user.email && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <Mail className="h-3 w-3 mr-1" />
                                  {user.email}
                                </div>
                              )}
                            </div>
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
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setLocation(`/timesheets/new?employeeId=${employee.id}`);
                                  }}
                                >
                                  <div className="w-full flex items-center">
                                    <Plus className="h-4 w-4 mr-2" /> Add Timesheet
                                  </div>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedEmployee({ ...employee, user });
                                    setIsPermissionsDialogOpen(true);
                                  }}
                                >
                                  <div className="w-full flex items-center">
                                    <Shield className="h-4 w-4 mr-2" /> Manage Permissions
                                  </div>
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

      {/* Manage Permissions Dialog */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Manage Permissions for {selectedEmployee?.user?.fullName || selectedEmployee?.fullName}
            </DialogTitle>
            <DialogDescription>
              Permission management interface will be implemented here.
            </DialogDescription>
          </DialogHeader>
          
          {/* Role Management Content */}
          {selectedEmployee?.user && (
            <div className="space-y-6">
              {/* Role Management Section */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="userRole" className="text-sm font-medium">
                    User Role
                  </Label>
                  <Select
                    value={selectedRole || selectedEmployee.user.role || 'employee'}
                    onValueChange={(newRole) => setSelectedRole(newRole)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-sm text-gray-600">
                  Current role: <span className="font-medium">{selectedEmployee.user.role || 'employee'}</span>
                </div>
              </div>

              {/* Fine-Grained Permissions Section */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium">Fine-Grained Permissions</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsGrantPermissionFormOpen(true)}
                  >
                    Grant New Permission
                  </Button>
                </div>

                {/* Existing Permissions List */}
                <div className="space-y-3 mb-4">
                  {userPermissions.length === 0 ? (
                    <p className="text-sm text-gray-500">No specific permissions granted yet.</p>
                  ) : (
                    userPermissions.map((permission: any) => (
                      <div key={permission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">
                            Can <strong>{permission.actions.join(", ")}</strong> access on{" "}
                            <strong>{permission.resourceType}: {permission.resourceName}</strong>
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => revokePermission.mutate(permission.id)}
                          disabled={revokePermission.isPending}
                        >
                          {revokePermission.isPending ? "Revoking..." : "Revoke"}
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                {/* Grant New Permission Form */}
                {isGrantPermissionFormOpen && (
                  <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
                    <h5 className="font-medium">Grant New Permission</h5>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label htmlFor="resourceType" className="text-sm font-medium">
                          Resource Type
                        </Label>
                        <Select
                          value={selectedResourceType}
                          onValueChange={setSelectedResourceType}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Select resource type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="project">Project</SelectItem>
                            <SelectItem value="report">Report</SelectItem>
                            <SelectItem value="department">Department</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedResourceType === "project" && (
                        <div>
                          <Label htmlFor="specificResource" className="text-sm font-medium">
                            Specific Project
                          </Label>
                          <Select
                            value={selectedResourceId}
                            onValueChange={setSelectedResourceId}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                            <SelectContent>
                              {projects.map((project: any) => (
                                <SelectItem key={project.id} value={project.id.toString()}>
                                  {project.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div>
                        <Label className="text-sm font-medium">Actions</Label>
                        <div className="mt-2 space-y-2">
                          {["View", "Edit", "Approve", "Comment", "Delete"].map((action) => (
                            <div key={action} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`action-${action.toLowerCase()}`}
                                checked={selectedActions.includes(action.toLowerCase())}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedActions([...selectedActions, action.toLowerCase()]);
                                  } else {
                                    setSelectedActions(selectedActions.filter(a => a !== action.toLowerCase()));
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                              <Label htmlFor={`action-${action.toLowerCase()}`} className="text-sm">
                                {action}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsGrantPermissionFormOpen(false);
                          setSelectedResourceType("");
                          setSelectedResourceId("");
                          setSelectedActions([]);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          if (selectedEmployee?.user && selectedResourceType && selectedResourceId && selectedActions.length > 0) {
                            grantPermission.mutate({
                              userId: selectedEmployee.user.id,
                              resourceType: selectedResourceType,
                              resourceId: selectedResourceId,
                              actions: selectedActions
                            });
                          }
                        }}
                        disabled={!selectedResourceType || !selectedResourceId || selectedActions.length === 0 || grantPermission.isPending}
                      >
                        {grantPermission.isPending ? "Granting..." : "Grant Permission"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsPermissionsDialogOpen(false);
                setSelectedEmployee(null);
                setSelectedRole("");
              }}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                if (selectedEmployee?.user && selectedRole && selectedRole !== selectedEmployee.user.role) {
                  updateUserRole.mutate({
                    userId: selectedEmployee.user.id,
                    role: selectedRole
                  });
                }
              }}
              disabled={!selectedRole || selectedRole === selectedEmployee?.user?.role || updateUserRole.isPending}
            >
              {updateUserRole.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
